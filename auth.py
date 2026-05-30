from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import os
import json
from datetime import datetime
from paths import create_user_storage

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def get_users_db():
    """获取用户数据库文件路径"""
    users_file = os.path.join('storage', 'users.json')
    if not os.path.exists('storage'):
        os.makedirs('storage', exist_ok=True)
    if not os.path.exists(users_file):
        with open(users_file, 'w', encoding='utf-8') as f:
            json.dump({}, f)
    return users_file

def load_users():
    """加载用户数据"""
    users_file = get_users_db()
    with open(users_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_users(users):
    """保存用户数据"""
    users_file = get_users_db()
    with open(users_file, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

@auth_bp.route('/register', methods=['POST'])
def register():
    """用户注册"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': '请求数据不能为空'
            }), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
        avatar_url = data.get('avatar_url', '')
        
        if not username:
            return jsonify({
                'success': False,
                'error': '用户名不能为空'
            }), 400
        
        if len(username) < 3 or len(username) > 20:
            return jsonify({
                'success': False,
                'error': '用户名长度需要在3-20个字符之间'
            }), 400
        
        if not password:
            return jsonify({
                'success': False,
                'error': '密码不能为空'
            }), 400
        
        if len(password) < 6:
            return jsonify({
                'success': False,
                'error': '密码长度不能少于6位'
            }), 400
        
        if password != confirm_password:
            return jsonify({
                'success': False,
                'error': '两次密码输入不一致'
            }), 400
        
        users = load_users()
        
        if username in users:
            return jsonify({
                'success': False,
                'error': '用户名已存在'
            }), 400
        
        password_hash = generate_password_hash(password)
        
        users[username] = {
            'username': username,
            'password_hash': password_hash,
            'avatar_url': avatar_url,
            'created_at': datetime.now().isoformat(),
            'last_login': None
        }
        
        save_users(users)
        
        user_dir = create_user_storage(username)
        
        # 只保存前端相关的设置，背景已由CSS处理
        default_settings = {
            'theme': 'default',
            'displayNickname': False,
            'notifications': True,
            'soundEffects': True
        }
        with open(os.path.join(user_dir, 'settings', 'config.json'), 'w', encoding='utf-8') as f:
            json.dump(default_settings, f, ensure_ascii=False, indent=2)
        
        current_app.logger.info(f"用户注册成功: {username}")
        
        return jsonify({
            'success': True,
            'message': '注册成功',
            'username': username
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"注册失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'注册失败: {str(e)}'
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """用户登录"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': '请求数据不能为空'
            }), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username:
            return jsonify({
                'success': False,
                'error': '用户名不能为空'
            }), 400
        
        if not password:
            return jsonify({
                'success': False,
                'error': '密码不能为空'
            }), 400
        
        users = load_users()
        
        if username not in users:
            return jsonify({
                'success': False,
                'error': '用户名或密码错误'
            }), 401
        
        user = users[username]
        
        if not check_password_hash(user['password_hash'], password):
            return jsonify({
                'success': False,
                'error': '用户名或密码错误'
            }), 401
        
        users[username]['last_login'] = datetime.now().isoformat()
        save_users(users)
        
        session['user_id'] = username
        session['username'] = username
        session.permanent = True
        
        avatar_url = user.get('avatar_url', '')
        
        current_app.logger.info(f"用户登录成功: {username}")
        
        return jsonify({
            'success': True,
            'message': '登录成功',
            'username': username,
            'avatar_url': avatar_url
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"登录失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'登录失败: {str(e)}'
        }), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """用户登出"""
    try:
        username = session.get('username')
        session.clear()
        
        current_app.logger.info(f"用户登出: {username}")
        
        return jsonify({
            'success': True,
            'message': '登出成功'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"登出失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@auth_bp.route('/check_session', methods=['GET'])
def check_session():
    """检查登录状态"""
    user_id = session.get('user_id')
    username = session.get('username')
    
    if user_id and username:
        users = load_users()
        if username in users:
            user = users[username]
            return jsonify({
                'success': True,
                'logged_in': True,
                'username': username,
                'avatar_url': user.get('avatar_url', '')
            }), 200
    
    return jsonify({
        'success': True,
        'logged_in': False
    }), 200

@auth_bp.route('/update_avatar', methods=['POST'])
def update_avatar():
    """更新用户头像"""
    try:
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'error': '请先登录'
            }), 401
        
        data = request.get_json()
        avatar_url = data.get('avatar_url', '')
        
        username = session['username']
        users = load_users()
        
        if username in users:
            users[username]['avatar_url'] = avatar_url
            save_users(users)
            
            current_app.logger.info(f"用户更新头像: {username}")
            
            return jsonify({
                'success': True,
                'message': '头像更新成功',
                'avatar_url': avatar_url
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': '用户不存在'
            }), 404
            
    except Exception as e:
        current_app.logger.error(f"更新头像失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@auth_bp.route('/get_user_info', methods=['GET'])
def get_user_info():
    """获取当前用户信息"""
    try:
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'error': '请先登录'
            }), 401
        
        username = session['username']
        users = load_users()
        
        if username in users:
            user = users[username]
            return jsonify({
                'success': True,
                'username': username,
                'avatar_url': user.get('avatar_url', ''),
                'created_at': user.get('created_at', ''),
                'last_login': user.get('last_login', '')
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': '用户不存在'
            }), 404
            
    except Exception as e:
        current_app.logger.error(f"获取用户信息失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@auth_bp.route('/upload_avatar', methods=['POST'])
def upload_avatar():
    """上传并处理头像"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': '请求数据不能为空'
            }), 400
        
        username = data.get('username')
        image_data = data.get('image_data')
        
        if not username or not image_data:
            return jsonify({
                'success': False,
                'error': '用户名和头像数据不能为空'
            }), 400
        
        import base64
        from utils.avatar import process_avatar
        from io import BytesIO
        
        image_data = image_data.split(',')[1] if ',' in image_data else image_data
        image_bytes = base64.b64decode(image_data)
        image_file = BytesIO(image_bytes)
        
        avatar_url = process_avatar(image_file, username)
        
        users = load_users()
        if username in users:
            users[username]['avatar_url'] = avatar_url
            save_users(users)
        
        current_app.logger.info(f"用户上传头像: {username}")
        
        return jsonify({
            'success': True,
            'message': '头像上传成功',
            'avatar_url': avatar_url
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"头像上传失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500