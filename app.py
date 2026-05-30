from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

contacts_db = {
    1: {'id': 1, 'name': '丹恒', 'avatar': 'avatars/丹恒.webp'},
    2: {'id': 2, 'name': '姬子', 'avatar': 'avatars/姬子.webp'},
    3: {'id': 3, 'name': '瓦尔特', 'avatar': 'avatars/瓦尔特.webp'},
    4: {'id': 4, 'name': '银狼', 'avatar': 'avatars/银狼.webp'},
    5: {'id': 5, 'name': '三月七', 'avatar': 'avatars/三月七.webp'}
}

conversation_history = {}

@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    """获取所有聊天对象列表"""
    try:
        contacts_list = [
            {
                'id': contact['id'],
                'name': contact['name'],
                'avatar': contact['avatar'],
                'preview': get_last_message_preview(contact['id']),
                'lastTime': get_last_message_time(contact['id'])
            }
            for contact in contacts_db.values()
        ]
        
        logger.info(f"获取联系人列表: {len(contacts_list)} 个联系人")
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

def get_last_message_preview(contact_id):
    """获取最后一条消息的预览"""
    if contact_id in conversation_history and conversation_history[contact_id]:
        last_msg = conversation_history[contact_id][-1]
        content = last_msg.get('content', '')
        return content[:30] + '...' if len(content) > 30 else content
    return ''

def get_last_message_time(contact_id):
    """获取最后消息时间"""
    if contact_id in conversation_history and conversation_history[contact_id]:
        last_msg = conversation_history[contact_id][-1]
        timestamp = last_msg.get('timestamp', '')
        if timestamp:
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                return dt.strftime('%H:%M')
            except:
                return ''
    return ''

@app.route('/api/send_message', methods=['POST'])
def send_message():
    """
    接收消息并返回固定回复
    请求格式:
    {
        "contact_id": 1,
        "contact_name": "丹恒",
        "message": "用户发送的消息内容"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': '请求数据不能为空'
            }), 400
        
        contact_id = data.get('contact_id')
        contact_name = data.get('contact_name', '未知')
        message = data.get('message', '')
        
        if not message:
            return jsonify({
                'success': False,
                'error': '消息内容不能为空'
            }), 400
        
        if not contact_id:
            return jsonify({
                'success': False,
                'error': '联系人ID不能为空'
            }), 400
        
        logger.info(f"收到来自 {contact_name}(ID:{contact_id}) 的消息: {message}")
        
        if contact_id not in conversation_history:
            conversation_history[contact_id] = []
        
        conversation_history[contact_id].append({
            'content': message,
            'isMe': True,
            'timestamp': datetime.now().isoformat()
        })
        
        fixed_reply = get_fixed_reply(contact_name, message)
        
        conversation_history[contact_id].append({
            'content': fixed_reply,
            'isMe': False,
            'timestamp': datetime.now().isoformat()
        })
        
        logger.info(f"回复 {contact_name}: {fixed_reply}")
        
        return jsonify({
            'success': True,
            'reply': fixed_reply,
            'contact_id': contact_id,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"处理消息时出错: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def get_fixed_reply(contact_name, message):
    """
    生成固定回复消息
    可以根据需要修改这个函数来实现不同的回复逻辑
    """
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
def get_messages(contact_id):
    """获取与指定联系人的聊天记录"""
    try:
        messages = conversation_history.get(contact_id, [])
        
        logger.info(f"获取联系人 {contact_id} 的消息记录: {len(messages)} 条")
        
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
def clear_messages(contact_id):
    """清除与指定联系人的聊天记录"""
    try:
        if contact_id in conversation_history:
            conversation_history[contact_id] = []
            logger.info(f"已清除联系人 {contact_id} 的聊天记录")
        else:
            conversation_history[contact_id] = []
        
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

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'success': True,
        'status': 'running',
        'timestamp': datetime.now().isoformat(),
        'total_contacts': len(contacts_db),
        'total_conversations': len(conversation_history)
    })

@app.route('/', methods=['GET'])
def index():
    """主页"""
    return '''
    <html>
        <head><title>星穹铁道聊天 API</title></head>
        <body>
            <h1>🚀 星穹铁道聊天系统 API</h1>
            <p>API服务正在运行中...</p>
            <h2>可用接口:</h2>
            <ul>
                <li>GET /api/contacts - 获取联系人列表</li>
                <li>POST /api/send_message - 发送消息并获取回复</li>
                <li>GET /api/get_messages/<contact_id> - 获取消息记录</li>
                <li>POST /api/clear_messages/<contact_id> - 清除聊天记录</li>
                <li>GET /api/health - 健康检查</li>
            </ul>
        </body>
    </html>
    '''

if __name__ == '__main__':
    logger.info("=" * 50)
    logger.info("🚀 星穹铁道聊天系统 API 服务启动中...")
    logger.info("=" * 50)
    logger.info("服务地址: http://localhost:5000")
    logger.info("API文档: http://localhost:5000/")
    logger.info("=" * 50)
    
    app.run(host='0.0.0.0', port=5000, debug=True)