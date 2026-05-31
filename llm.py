import os
import logging
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

MAX_CONTEXT_MESSAGES = 50

def _get_client():
    api_key = os.getenv('LLM_API_KEY', '')
    base_url = os.getenv('LLM_BASE_URL', '')
    if not api_key or not base_url:
        raise ValueError('请在 .env 文件中配置 LLM_API_KEY 和 LLM_BASE_URL')
    return OpenAI(api_key=api_key, base_url=base_url)


def _build_messages(system_prompt, conversation_history):
    messages = [{'role': 'system', 'content': system_prompt}]
    recent = conversation_history[-MAX_CONTEXT_MESSAGES:]
    for msg in recent:
        role = 'assistant' if not msg.get('isMe', True) else 'user'
        messages.append({'role': role, 'content': msg.get('content', '')})
    return messages


def chat(system_prompt, conversation_history, user_message):
    model = os.getenv('LLM_MODEL', 'gpt-3.5-turbo')
    try:
        client = _get_client()
        messages = _build_messages(system_prompt, conversation_history)
        messages.append({'role': 'user', 'content': user_message})

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            stream=False,
        )
        reply = response.choices[0].message.content
        return {'success': True, 'reply': reply}
    except Exception as e:
        logger.error(f'LLM 请求失败: {e}')
        return {'success': False, 'error': str(e)}
