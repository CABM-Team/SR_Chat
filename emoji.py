"""
emoji 表情包管理模块
"""
import os
import glob
from flask import jsonify

# emoji 列表缓存
EMOJI_LIST_BY_NAME = {}
# emoji 文件路径缓存
EMOJI_PATH_BY_NAME = {}


def _load_emoji_lists():
    """启动时加载所有角色的 emoji 列表和路径"""
    emoji_base = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'emoji')

    if not os.path.exists(emoji_base):
        return

    for char_dir in os.listdir(emoji_base):
        char_path = os.path.join(emoji_base, char_dir)
        if os.path.isdir(char_path):
            emojis = []
            emoji_paths = {}
            for webp_file in glob.glob(os.path.join(char_path, '*.webp')):
                emoji_name = os.path.splitext(os.path.basename(webp_file))[0]
                emojis.append(emoji_name)
                # 存储相对路径
                emoji_paths[emoji_name] = f'static/emoji/{char_dir}/{os.path.basename(webp_file)}'

            EMOJI_LIST_BY_NAME[char_dir] = ','.join(emojis)
            EMOJI_PATH_BY_NAME[char_dir] = emoji_paths


# 启动时加载
_load_emoji_lists()


def get_emoji_list_for_contact(contact_id: int) -> dict:
    """
    根据 contact_id 获取对应角色的 emoji 列表

    Args:
        contact_id: 联系人ID

    Returns:
        包含 emoji 列表的字典
    """
    from paths import DEFAULT_CONTACTS

    for c in DEFAULT_CONTACTS:
        if c['id'] == contact_id:
            char_name = c.get('name', '')
            emoji_list = EMOJI_LIST_BY_NAME.get(char_name, '')
            return {
                'contact_id': contact_id,
                'contact_name': char_name,
                'emojis': emoji_list.split(',') if emoji_list else []
            }
    return {
        'contact_id': contact_id,
        'contact_name': '',
        'emojis': []
    }


def get_emoji_path(contact_id: int, emoji_name: str) -> str:
    """
    根据 contact_id 和 emoji_name 获取表情包路径

    Args:
        contact_id: 联系人ID
        emoji_name: 表情名称

    Returns:
        表情包相对路径，如果不存在返回空字符串
    """
    from paths import DEFAULT_CONTACTS

    for c in DEFAULT_CONTACTS:
        if c['id'] == contact_id:
            char_name = c.get('name', '')
            emoji_paths = EMOJI_PATH_BY_NAME.get(char_name, {})
            return emoji_paths.get(emoji_name, '')
    return ''


def check_emoji_exists(contact_id: int, emoji_name: str) -> bool:
    """
    检查表情包是否存在

    Args:
        contact_id: 联系人ID
        emoji_name: 表情名称

    Returns:
        是否存在
    """
    path = get_emoji_path(contact_id, emoji_name)
    if not path:
        return False

    # 检查文件是否存在
    full_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), path)
    return os.path.exists(full_path)


def get_emoji_api(contact_id: int):
    """
    获取角色表情包 API

    Args:
        contact_id: 联系人ID

    Returns:
        JSON 响应
    """
    emoji_info = get_emoji_list_for_contact(contact_id)

    if not emoji_info['emojis']:
        return jsonify({
            'success': False,
            'error': f'联系人 {contact_id} 没有表情包'
        }), 404

    return jsonify({
        'success': True,
        'data': emoji_info
    })


def get_single_emoji_api(contact_id: int, emoji_name: str):
    """
    获取单个表情包路径 API

    Args:
        contact_id: 联系人ID
        emoji_name: 表情名称

    Returns:
        JSON 响应
    """
    emoji_path = get_emoji_path(contact_id, emoji_name)

    if not emoji_path:
        return jsonify({
            'success': False,
            'error': f'表情包 {emoji_name} 不存在'
        }), 404

    return jsonify({
        'success': True,
        'data': {
            'contact_id': contact_id,
            'emoji_name': emoji_name,
            'emoji_url': f'/{emoji_path}'
        }
    })