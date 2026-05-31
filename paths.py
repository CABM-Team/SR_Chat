"""
统一路径配置模块
定义所有资源文件的路径常量
"""

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

STATIC_DIR = os.path.join(BASE_DIR, 'static')
RESOURCES_DIR = os.path.join(BASE_DIR, 'res')
STORAGE_DIR = os.path.join(BASE_DIR, 'storage')

AVATARS_DIR = os.path.join(STATIC_DIR, 'avatars')
BUBBLES_DIR = os.path.join(RESOURCES_DIR, 'bubbles')

BASE_URL = ''

AVATARS_URL = f'{BASE_URL}/static/avatars'

DEFAULT_CONTACTS = [
    {'id': 1, 'name': '丹恒', 'avatar': f'{AVATARS_URL}/丹恒.webp'},
    {'id': 2, 'name': '姬子', 'avatar': f'{AVATARS_URL}/姬子.webp'},
    {'id': 3, 'name': '瓦尔特', 'avatar': f'{AVATARS_URL}/瓦尔特.webp'},
    {'id': 4, 'name': '银狼', 'avatar': f'{AVATARS_URL}/银狼.webp'},
    {'id': 5, 'name': '三月七', 'avatar': f'{AVATARS_URL}/三月七.webp'},
]

DEFAULT_SETTINGS = {
    'theme': 'default',
    'displayNickname': False,
    'notifications': True,
    'soundEffects': True,
    'bubble_style': 'default',
    'avatar': None,
}

def get_resource_path(relative_path):
    """获取资源文件的绝对路径"""
    return os.path.join(RESOURCES_DIR, relative_path)

def get_static_path(relative_path):
    """获取静态文件的绝对路径"""
    return os.path.join(STATIC_DIR, relative_path)

def get_user_storage_path(username):
    """获取用户存储目录的绝对路径"""
    return os.path.join(STORAGE_DIR, username)

def get_resource_url(relative_path):
    """获取资源文件的URL路径"""
    if relative_path.startswith('/'):
        return relative_path
    return f'{BASE_URL}/{relative_path}'

def create_user_storage(username):
    """为用户创建个人存储目录"""
    user_dir = get_user_storage_path(username)
    subdirs = ['conversations', 'settings', 'uploads']
    for subdir in subdirs:
        path = os.path.join(user_dir, subdir)
        if not os.path.exists(path):
            os.makedirs(path, exist_ok=True)
    return user_dir