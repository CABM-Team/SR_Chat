from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
import logging
from datetime import datetime
from functools import wraps
import os

from auth import auth_bp
from storage import get_user_storage
from paths import DEFAULT_CONTACTS
from llm import chat as llm_chat

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
@app.route('/chat/contacts', methods=['GET'])
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

@app.route('/chat/send_message', methods=['POST'])
@login_required
def send_message():
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
        
        current_time = datetime.now().isoformat()
        
        user_message = {
            'content': message_text,
            'isMe': True,
            'timestamp': current_time
        }
        storage.save_message(contact_id, user_message)
        
        contact_prompt = ''
        for c in DEFAULT_CONTACTS:
            if c['id'] == contact_id:
                contact_prompt = c.get('prompt', '')
                break

        user_identity = storage.get_contact_identity(contact_id)
        if user_identity:
            contact_prompt += f'\n用户是{user_identity}'
        
        contact_prompt+="\n你正在线上发消息聊天，因此请避免包含动作神态等。"
        
        conversation_history = storage.get_messages(contact_id)
        
        result = llm_chat(contact_prompt, conversation_history, message_text)
        
        if result['success']:
            reply_content = result['reply']
            reply_message = {
                'content': reply_content,
                'isMe': False,
                'timestamp': datetime.now().isoformat()
            }
            storage.save_message(contact_id, reply_message)
            
            return jsonify({
                'success': True,
                'reply': reply_content,
                'contact_id': contact_id,
                'timestamp': reply_message['timestamp']
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error'],
                'contact_id': contact_id
            })
        
    except Exception as e:
        logger.error(f"处理消息时出错: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/chat/get_messages/<int:contact_id>', methods=['GET'])
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

@app.route('/chat/clear_messages/<int:contact_id>', methods=['POST'])
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

@app.route('/chat/recall_message', methods=['POST'])
@login_required
def recall_message():
    """撤回消息：删除指定索引及其之后的所有消息"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '请求数据不能为空'}), 400

        contact_id = data.get('contact_id')
        message_index = data.get('message_index')

        if contact_id is None or message_index is None:
            return jsonify({'success': False, 'error': '缺少参数'}), 400

        username = get_current_user()
        storage = get_user_storage(username)
        storage.delete_messages_from(contact_id, int(message_index))
        logger.info(f"用户 {username} 撤回了联系人 {contact_id} 从索引 {message_index} 开始的消息")

        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"撤回消息失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/chat/contact_identity/<int:contact_id>', methods=['GET'])
@login_required
def get_contact_identity(contact_id):
    """获取指定联系人的用户身份设定"""
    try:
        username = get_current_user()
        storage = get_user_storage(username)
        identity = storage.get_contact_identity(contact_id)
        return jsonify({
            'success': True,
            'identity': identity
        })
    except Exception as e:
        logger.error(f"获取身份设定失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/chat/contact_identity/<int:contact_id>', methods=['POST'])
@login_required
def save_contact_identity(contact_id):
    """保存指定联系人的用户身份设定"""
    try:
        username = get_current_user()
        storage = get_user_storage(username)
        data = request.get_json()
        identity = data.get('identity', '') if data else ''
        storage.save_contact_identity(contact_id, identity)
        return jsonify({
            'success': True,
            'message': '身份设定已保存'
        })
    except Exception as e:
        logger.error(f"保存身份设定失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/chat/user/settings', methods=['GET'])
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

@app.route('/chat/user/settings', methods=['POST'])
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

@app.route('/chat/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'success': True,
        'status': 'running',
        'timestamp': datetime.now().isoformat()
    }), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
