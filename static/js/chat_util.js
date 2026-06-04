// chat_util.js - 工具函数和常量

const API_BASE = '/chat';

// 全局变量
let currentContact = null;
let messages = {};
let currentUsername = null;
let userAvatar = null;
let isRedirecting = false;
let contactsData = [];

// ==================== 工具函数 ====================

// HTML转义函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 格式化消息时间（精确到分钟）
function formatMessageTime(timestamp, prevTimestamp = null) {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // 检查是否需要显示时间（距离上一条消息是否超过5分钟）
    if (prevTimestamp) {
        const prevDate = new Date(prevTimestamp);
        const diffMinutes = (date - prevDate) / 1000 / 60;
        if (diffMinutes < 5) {
            return null; // 不显示时间
        }
    }
    
    // 格式化时间部分
    const timeStr = date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    
    // 今天
    if (msgDate.getTime() === today.getTime()) {
        return timeStr;
    }
    // 昨天
    else if (msgDate.getTime() === yesterday.getTime()) {
        return `昨天 ${timeStr}`;
    }
    // 今年
    else if (date.getFullYear() === now.getFullYear()) {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}/${day} ${timeStr}`;
    }
    // 不是今年
    else {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}/${month}/${day} ${timeStr}`;
    }
}

// 格式化侧边列表的时间
function formatContactTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // 今天：显示时分
    if (msgDate.getTime() === today.getTime()) {
        return date.toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    }
    // 昨天：显示"昨天"
    else if (msgDate.getTime() === yesterday.getTime()) {
        return '昨天';
    }
    // 今年：显示月/日
    else if (date.getFullYear() === now.getFullYear()) {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}/${day}`;
    }
    // 不是今年：显示年/月/日
    else {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}/${month}/${day}`;
    }
}

// 按时间分组消息
function groupMessagesByTime(msgList) {
    const groups = [];
    let lastDate = '';
    
    msgList.forEach(msg => {
        const msgDate = new Date(msg.timestamp);
        const dateStr = msgDate.toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        if (dateStr !== lastDate) {
            groups.push({ type: 'timestamp', time: dateStr });
            lastDate = dateStr;
        }
        
        groups.push({
            type: 'message',
            content: msg.content,
            isMe: msg.isMe,
            timestamp: msg.timestamp
        });
    });
    
    return groups;
}

// 跳转到登录页
function redirectToLogin() {
    if (isRedirecting) return;
    if (window.location.pathname === '/login') return;
    
    isRedirecting = true;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userAvatar');
    window.location.href = '/login';
}

// ==================== API 请求函数 ====================

// 检查认证状态
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/check_session`);

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                redirectToLogin();
            }
            return false;
        }

        const data = await response.json();

        if (!data.success || !data.logged_in) {
            redirectToLogin();
            return false;
        }

        currentUsername = data.username;
        userAvatar = data.avatar_url;

        localStorage.setItem('currentUser', currentUsername);
        localStorage.setItem('userAvatar', userAvatar || '');

        return true;
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

// 加载用户联系人列表
async function loadUserContacts() {
    try {
        const response = await fetch(`${API_BASE}/contacts`);

        if (response.status === 401) {
            const data = await response.json();
            if (data.require_login) {
                redirectToLogin();
                return;
            }
        }

        if (!response.ok) {
            throw new Error('获取联系人失败');
        }

        const data = await response.json();

        if (data.success && data.data) {
            return data.data;
        } else {
            throw new Error(data.error || '获取联系人失败');
        }
    } catch (error) {
        console.error('加载联系人失败:', error);
        return [];
    }
}

// 加载用户消息
async function loadUserMessages(contactId) {
    try {
        const response = await fetch(`${API_BASE}/get_messages/${contactId}`);

        if (response.status === 401) {
            const data = await response.json();
            if (data.require_login) {
                redirectToLogin();
                return [];
            }
        }

        if (!response.ok) {
            throw new Error('获取消息失败');
        }

        const data = await response.json();

        if (data.success && data.data) {
            return data.data;
        } else {
            return [];
        }
    } catch (error) {
        console.error('加载消息失败:', error);
        return [];
    }
}

// 发送消息
async function sendMessageAPI(contactId, contactName, content) {
    const response = await fetch(`${API_BASE}/send_message`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contact_id: contactId,
            contact_name: contactName,
            message: content
        })
    });

    if (response.status === 401) {
        const data = await response.json();
        if (data.require_login) {
            alert('请先登录');
            redirectToLogin();
            return null;
        }
    }

    const data = await response.json();
    if (response.ok) {
        return data;
    } else {
        console.error('发送消息失败:', response.statusText);
        return data;
    }
}

async function getContactIdentity(contactId) {
    try {
        const response = await fetch(`${API_BASE}/contact_identity/${contactId}`);
        if (response.ok) {
            const data = await response.json();
            return data.success ? data.identity : '';
        }
    } catch (error) {
        console.error('获取身份设定失败:', error);
    }
    return '';
}

async function saveContactIdentity(contactId, identity) {
    try {
        const response = await fetch(`${API_BASE}/contact_identity/${contactId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity })
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('保存身份设定失败:', error);
    }
    return null;
}

async function clearMessagesAPI(contactId) {
    try {
        const response = await fetch(`${API_BASE}/clear_messages/${contactId}`, {
            method: 'POST'
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('清空对话失败:', error);
    }
    return null;
}

async function recallMessageAPI(contactId, messageIndex) {
    try {
        const response = await fetch(`${API_BASE}/recall_message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contact_id: contactId,
                message_index: messageIndex
            })
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('撤回消息失败:', error);
    }
    return null;
}