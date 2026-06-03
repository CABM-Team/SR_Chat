import os
import logging
import json
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

MAX_CONTEXT_MESSAGES = 14

def _get_headers():
    api_key = os.getenv('LLM_API_KEY', '')
    if not api_key:
        raise ValueError('请在 .env 文件中配置 LLM_API_KEY')
    return {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }


def _build_messages(system_prompt, conversation_history):
    messages = [{'role': 'system', 'content': system_prompt}]
    print(system_prompt)
    recent = conversation_history[-MAX_CONTEXT_MESSAGES:]
    for msg in recent:
        role = 'assistant' if not msg.get('isMe', True) else 'user'
        messages.append({'role': role, 'content': msg.get('content', '')})
    return messages


def chat(system_prompt, conversation_history, user_message):
    model = os.getenv('LLM_MODEL')
    base_url = os.getenv('LLM_BASE_URL', '')
    
    if not base_url:
        raise ValueError('请在 .env 文件中配置 LLM_BASE_URL')
    
    # 构建完整的 API URL
    api_url = base_url.rstrip('/') + '/chat/completions'
    
    try:
        headers = _get_headers()
        messages = _build_messages(system_prompt, conversation_history)
        messages.append({'role': 'user', 'content': user_message})

        payload = {
            'model': model,
            'messages': messages,
            'stream': False,
            'temperature': 0.8,
            'max_tokens': 1024,
            'enable_thinking': False
        }

        response = requests.post(api_url, headers=headers, json=payload, timeout=120)
        response.raise_for_status()  # 检查 HTTP 错误
        
        result = response.json()
        reply = result['choices'][0]['message']['content']
        return {'success': True, 'reply': reply}
        
    except requests.exceptions.Timeout:
        logger.error('LLM 请求超时')
        return {'success': False, 'error': '请求超时'}
    except requests.exceptions.ConnectionError:
        logger.error('LLM 连接失败')
        return {'success': False, 'error': '连接失败'}
    except requests.exceptions.HTTPError as e:
        logger.error(f'LLM HTTP 错误: {e}')
        return {'success': False, 'error': f'HTTP错误: {e.response.status_code}'}
    except (KeyError, json.JSONDecodeError) as e:
        logger.error(f'LLM 响应解析失败: {e}')
        return {'success': False, 'error': '响应解析失败'}
    except Exception as e:
        logger.error(f'LLM 请求失败: {e}')
        return {'success': False, 'error': str(e)}
