from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
import logging
from datetime import datetime
from functools import wraps
import os

from auth import auth_bp
from storage import get_user_storage
from paths import DEFAULT_CONTACTS

app = Flask(__name__)
CORS(app)

app.secret_key = 'sr_chat_secret_key_2024'
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True
app.permanent_session_lifetime = 86400 * 7

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app.register_blueprint(auth_bp)

def login_required(f):
    """登录验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'error': '请先登录',
                'require_login': True
            }), 401
        return f(*args, **kwargs)
    return decorated_function

def get_current_user():
    """获取当前登录用户"""
    return session.get('username')

@app.route('/')
def index():
    """首页"""
    return app.send_static_file('index.html')

@app.route('/login')
def login_page():
    """登录页面"""
    return app.send_static_file('login.html')

# 修改 app.py 中的 get_contacts 函数
@app.route('/api/contacts', methods=['GET'])
@login_required
def get_contacts():
    """获取所有聊天对象列表"""
    try:
        username = get_current_user()
        storage = get_user_storage(username)
        
        contacts_list = []
        for contact in DEFAULT_CONTACTS:
            messages = storage.get_messages(contact['id'])
            preview = ''
            last_time = ''      # 前端显示用的格式化时间
            last_raw_timestamp = ''  # 完整的原始时间戳，用于前端格式化
            
            if messages:
                last_msg = messages[-1]
                content = last_msg.get('content', '')
                preview = content[:30] + '...' if len(content) > 30 else content
                
                timestamp = last_msg.get('timestamp', '')
                if timestamp:
                    try:
                        # 解析时间戳
                        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        # 存储完整的原始时间戳（ISO格式）
                        last_raw_timestamp = timestamp
                        # 保留一个格式化的时间用于旧版兼容
                        last_time = dt.strftime('%H:%M')
                    except Exception as e:
                        logger.error(f"解析时间戳失败: {timestamp}, 错误: {e}")
            
            contacts_list.append({
                'id': contact['id'],
                'name': contact['name'],
                'avatar': contact['avatar'],
                'preview': preview,
                'lastTime': last_raw_timestamp,  # 改为返回完整时间戳
                'lastTimeFormatted': last_time   # 可选：保留格式化版本
            })
        
        # 按最后消息时间降序排序（最近的在上）
        contacts_list.sort(key=lambda x: x['lastTime'], reverse=True)
        
        logger.info(f"用户 {username} 获取联系人列表: {len(contacts_list)} 个联系人")
        return jsonify({
            'success': True,
            'data': contacts_list
        })
    except Exception as e:
        logger.error(f"获取联系人列表失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/send_message', methods=['POST'])
@login_required
def send_message():
    """接收消息并返回固定回复"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': '请求数据不能为空'
            }), 400
        
        contact_id = data.get('contact_id')
        contact_name = data.get('contact_name', '未知')
        message_text = data.get('message', '')
        
        if not message_text:
            return jsonify({
                'success': False,
                'error': '消息内容不能为空'
            }), 400
        
        if not contact_id:
            return jsonify({
                'success': False,
                'error': '联系人ID不能为空'
            }), 400
        
        username = get_current_user()
        storage = get_user_storage(username)
        
        logger.info(f"用户 {username} 收到来自 {contact_name}(ID:{contact_id}) 的消息: {message_text}")
        
        current_time = datetime.now().isoformat()
        
        user_message = {
            'content': message_text,
            'isMe': True,
            'timestamp': current_time
        }
        storage.save_message(contact_id, user_message)
        
        fixed_reply = get_fixed_reply(contact_name, message_text)
        
        reply_message = {
            'content': fixed_reply,
            'isMe': False,
            'timestamp': datetime.now().isoformat()
        }
        storage.save_message(contact_id, reply_message)
        
        logger.info(f"用户 {username} 收到 {contact_name} 的回复: {fixed_reply}")
        
        return jsonify({
            'success': True,
            'reply': fixed_reply,
            'contact_id': contact_id,
            'timestamp': reply_message['timestamp']
        })
        
    except Exception as e:
        logger.error(f"处理消息时出错: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def get_fixed_reply(contact_name, message):
    """生成固定回复消息"""
    fixed_replies = [
        f"【自动回复】收到你的消息了：{message}",
        f"【测试消息】这是来自 {contact_name} 对话的自动回复",
        f"【Demo】你发送了：{message[:20]}...",
        f"【星穹铁道】仙舟联盟已收到你的信息",
        f"【系统提示】消息 '{message}' 已收到",
    ]
    
    import random
    return random.choice(fixed_replies)

@app.route('/api/get_messages/<int:contact_id>', methods=['GET'])
@login_required
def get_messages(contact_id):
    """获取与指定联系人的聊天记录"""
    try:
        username = get_current_user()
        storage = get_user_storage(username)
        
        messages = storage.get_messages(contact_id)
        
        logger.info(f"用户 {username} 获取联系人 {contact_id} 的消息记录: {len(messages)} 条")
        
        return jsonify({
            'success': True,
            'data': messages,
            'count': len(messages)
        })
    except Exception as e:
        logger.error(f"获取消息记录失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/clear_messages/<int:contact_id>', methods=['POST'])
@login_required
def clear_messages(contact_id):
    """清除与指定联系人的聊天记录"""
    try:
        username = get_current_user()
        storage = get_user_storage(username)
        
        storage.clear_messages(contact_id)
        logger.info(f"用户 {username} 已清除联系人 {contact_id} 的聊天记录")
        
        return jsonify({
            'success': True,
            'message': f'已清除联系人 {contact_id} 的聊天记录'
        })
    except Exception as e:
        logger.error(f"清除消息记录失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/user/settings', methods=['GET'])
@login_required
def get_user_settings():
    """获取当前用户设置"""
    try:
        username = get_current_user()
        storage = get_user_storage(username)
        
        settings = storage.get_settings()
        
        return jsonify({
            'success': True,
            'data': settings
        }), 200
        
    except Exception as e:
        logger.error(f"获取用户设置失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/user/settings', methods=['POST'])
@login_required
def save_user_settings():
    """保存用户设置"""
    try:
        username = get_current_user()
        storage = get_user_storage(username)
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': '请求数据不能为空'
            }), 400
        
        for key, value in data.items():
            storage.save_setting(key, value)
        
        logger.info(f"用户 {username} 保存设置成功")
        
        return jsonify({
            'success': True,
            'message': '设置已保存'
        }), 200
        
    except Exception as e:
        logger.error(f"保存用户设置失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/storage/<path:filename>')
def serve_storage_file(filename):
    """提供storage目录下的静态文件"""
    try:
        storage_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'storage')
        return send_from_directory(storage_dir, filename)
    except Exception as e:
        logger.error(f"提供文件失败: {filename}, 错误: {str(e)}")
        return jsonify({
            'success': False,
            'error': '文件不存在'
        }), 404

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'success': True,
        'status': 'running',
        'timestamp': datetime.now().isoformat()
    }), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
