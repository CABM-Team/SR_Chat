"""
消息提示词构建模块
"""
import os
import glob
from datetime import datetime

from paths import DEFAULT_CONTACTS

# 启动时加载 emoji_list
EMOJI_LIST_BY_NAME = {}

def _load_emoji_lists():
    """启动时加载所有角色的 emoji 列表"""
    emoji_base = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'emoji')
    for char_dir in os.listdir(emoji_base):
        char_path = os.path.join(emoji_base, char_dir)
        if os.path.isdir(char_path):
            emojis = []
            for webp_file in glob.glob(os.path.join(char_path, '*.webp')):
                emoji_name = os.path.splitext(os.path.basename(webp_file))[0]
                emojis.append(emoji_name)
            EMOJI_LIST_BY_NAME[char_dir] = ','.join(emojis)

_load_emoji_lists()

def _get_emoji_list_for_contact(contact_id: int) -> str:
    """根据 contact_id 获取对应角色的 emoji_list"""
    for c in DEFAULT_CONTACTS:
        if c['id'] == contact_id:
            char_name = c.get('name', '')
            return EMOJI_LIST_BY_NAME.get(char_name, '')
    return ''

def build_system_prompt_by_id(contact_id: int, storage) -> str:
    """
    根据 contact_id 构建系统提示词

    Args:
        contact_id: 联系人ID
        storage: 用户存储对象（用于获取 user_identity）

    Returns:
        系统提示词
    """
    contact_prompt = ''
    for c in DEFAULT_CONTACTS:
        if c['id'] == contact_id:
            contact_prompt = c.get('prompt', '')
            break

    user_identity = storage.get_contact_identity(contact_id)
    emoji_list = _get_emoji_list_for_contact(contact_id)

    return build_system_prompt(contact_prompt, user_identity, emoji_list)


def build_system_prompt(
    contact_prompt: str,
    user_identity: str = "",
    emoji_list: str = ""
) -> str:
    """
    构建系统提示词

    Args:
        contact_prompt: 联系人的提示词配置
        user_identity: 用户身份信息
        emoji_list: 可用表情列表

    Returns:
        系统提示词
    """
    # 格式化当前时间
    now = datetime.now()
    weekday_names = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
    current_time_str = f"{now.year}年{now.month}月{now.day}日，{weekday_names[now.weekday()]}，{now.strftime('%H:%M')}"

    return f"""
## 你的身份
{contact_prompt}

## 用户身份
{user_identity or '开拓者'}

## 当前时间
{current_time_str}

## 聊天规则
- 你正在线上发消息聊天，因此不要包含动作神态描写，避免使用括号。
- 语气自然，像真人朋友聊天。
- 句子简短，避免长复合句。如果内容较长，拆成多个短句。
- 以中文句号/感叹号/问号作为自然停顿点，方便系统逐句发送。

## 表情包使用规则
你可以在消息中使用【表情名】的形式发送表情包，可用表情如下：
```
{emoji_list}
```
不要过度使用。建议**每2-3句话最多用一个表情包**，也可以完全不用。
"""