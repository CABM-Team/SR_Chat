import os
import json
from datetime import datetime
from paths import get_user_storage_path, DEFAULT_SETTINGS, STORAGE_DIR

class StorageManager:
    """用户数据存储管理器"""
    
    def __init__(self, username):
        self.username = username
        self.user_dir = get_user_storage_path(username)
        self.conversations_dir = os.path.join(self.user_dir, 'conversations')
        self.settings_dir = os.path.join(self.user_dir, 'settings')
        
        self._ensure_directories()
    
    def _ensure_directories(self):
        """确保用户目录结构存在"""
        for dir_path in [self.user_dir, self.conversations_dir, self.settings_dir]:
            if not os.path.exists(dir_path):
                os.makedirs(dir_path, exist_ok=True)
    
    def _get_conversation_file(self, contact_id):
        """获取联系人对话文件路径"""
        return os.path.join(self.conversations_dir, f'contact_{contact_id}.json')
    
    def _get_settings_file(self):
        """获取设置文件路径"""
        return os.path.join(self.settings_dir, 'config.json')
    
    def save_message(self, contact_id, message):
        """
        保存消息到对话记录
        
        Args:
            contact_id: 联系人ID
            message: 消息字典，包含 content, isMe, timestamp 字段
        """
        conversation_file = self._get_conversation_file(contact_id)
        
        messages = []
        if os.path.exists(conversation_file):
            with open(conversation_file, 'r', encoding='utf-8') as f:
                messages = json.load(f)
        
        messages.append(message)
        
        with open(conversation_file, 'w', encoding='utf-8') as f:
            json.dump(messages, f, ensure_ascii=False, indent=2)
    
    def get_messages(self, contact_id):
        """
        获取联系人对话记录
        
        Args:
            contact_id: 联系人ID
        
        Returns:
            list: 消息列表
        """
        conversation_file = self._get_conversation_file(contact_id)
        
        if not os.path.exists(conversation_file):
            return []
        
        with open(conversation_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def clear_messages(self, contact_id):
        """清除联系人对话记录"""
        conversation_file = self._get_conversation_file(contact_id)
        
        if os.path.exists(conversation_file):
            os.remove(conversation_file)
    
    def get_all_conversations(self):
        """获取所有对话记录"""
        if not os.path.exists(self.conversations_dir):
            return {}
        
        conversations = {}
        for filename in os.listdir(self.conversations_dir):
            if filename.endswith('.json') and filename.startswith('contact_'):
                contact_id = int(filename.replace('contact_', '').replace('.json', ''))
                file_path = os.path.join(self.conversations_dir, filename)
                with open(file_path, 'r', encoding='utf-8') as f:
                    conversations[contact_id] = json.load(f)
        
        return conversations
    
    def save_setting(self, key, value):
        """保存设置项"""
        settings = self.get_settings()
        settings[key] = value
        self.save_settings(settings)
    
    def get_setting(self, key, default=None):
        """获取设置项"""
        settings = self.get_settings()
        return settings.get(key, default)
    
    def save_settings(self, settings):
        """保存所有设置"""
        settings_file = self._get_settings_file()
        
        with open(settings_file, 'w', encoding='utf-8') as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
    
    def get_settings(self):
        """获取所有设置"""
        settings_file = self._get_settings_file()
        
        if not os.path.exists(settings_file):
            return self._get_default_settings()
        
        with open(settings_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _get_default_settings(self):
        """获取默认设置"""
        return DEFAULT_SETTINGS.copy()
    
    def export_data(self):
        """导出用户所有数据"""
        return {
            'username': self.username,
            'conversations': self.get_all_conversations(),
            'settings': self.get_settings(),
            'export_time': datetime.now().isoformat()
        }
    
    def import_data(self, data):
        """导入用户数据"""
        if 'conversations' in data:
            for contact_id, messages in data['conversations'].items():
                conversation_file = self._get_conversation_file(int(contact_id))
                with open(conversation_file, 'w', encoding='utf-8') as f:
                    json.dump(messages, f, ensure_ascii=False, indent=2)
        
        if 'settings' in data:
            self.save_settings(data['settings'])

def get_user_storage(username):
    """获取用户存储管理器实例"""
    return StorageManager(username)

def delete_user_data(username):
    """删除用户所有数据（谨慎使用）"""
    import shutil
    user_dir = os.path.join('storage', username)
    
    if os.path.exists(user_dir):
        shutil.rmtree(user_dir)
        return True
    return False

def get_all_users():
    """获取所有用户列表"""
    storage_dir = 'storage'
    
    if not os.path.exists(storage_dir):
        return []
    
    users = []
    for item in os.listdir(storage_dir):
        user_dir = os.path.join(storage_dir, item)
        if os.path.isdir(user_dir):
            users.append(item)
    
    return users