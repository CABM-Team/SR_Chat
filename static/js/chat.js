const API_BASE = 'http://localhost:5000/api';

let currentContact = null;
let messages = {};
let currentUsername = null;
let userAvatar = null;

async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/check_session`);

        if (!response.ok) {
            // 不要立即跳转，先检查是否是网络问题
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
        // 网络错误时不跳转，显示错误提示
        return false;
    }
}

// 添加防重复跳转的标志
let isRedirecting = false;

function redirectToLogin() {
    if (isRedirecting) return;
    if (window.location.pathname === '/login') return;
    
    isRedirecting = true;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userAvatar');
    window.location.href = '/login';
}

async function loadUserContacts() {
    try {
        const response = await fetch(`${API_BASE}/contacts`);

        if (response.status === 401) {
            const data = await response.json();
            if (data.require_login) {
                window.location.href = '/login';
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

async function loadUserMessages(contactId) {
    try {
        const response = await fetch(`${API_BASE}/get_messages/${contactId}`);

        if (response.status === 401) {
            const data = await response.json();
            if (data.require_login) {
                window.location.href = '/login';
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

function init() {
    checkAuth().then(isAuthenticated => {
        if (isAuthenticated) {
            setupEventListeners();
            loadInitialData();
        }
    });
}

async function loadInitialData() {
    const contactsData = await loadUserContacts();
    renderContactList(contactsData);
}

function renderContactList(contactsData) {
    const listContainer = document.getElementById('contactList');
    const contactsToRender = contactsData;

    listContainer.innerHTML = contactsToRender.map(contact => `
        <div class="recent-contact-item" data-id="${contact.id}">
            <div class="avatar">
                <img src="${contact.avatar}" alt="${contact.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='${contact.name[0]}';">
            </div>
           <div class="contact-info">
                <div class="contact-name-row">
                    <span class="contact-name">${contact.name}</span>
                    <span class="contact-time">${contact.lastTime || ''}</span>
                </div>
                <div class="contact-preview">${contact.preview || ''}</div>
            </div>
        </div>
    `).join('');

    listContainer.querySelectorAll('.recent-contact-item').forEach(item => {
        item.addEventListener('click', () => {
            const contactId = parseInt(item.dataset.id);
            selectContact(contactId, contactsToRender);
        });
    });
}

async function selectContact(contactId, contactsToRender) {
    document.querySelectorAll('.recent-contact-item').forEach(item => {
        item.classList.remove('active');
    });

    const selectedItem = document.querySelector(`.recent-contact-item[data-id="${contactId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }

    currentContact = (contactsToRender).find(c => c.id === contactId);

    document.getElementById('chatTitle').innerHTML = `<span>${currentContact.name}</span>`;

    const userMessages = await loadUserMessages(contactId);
    messages[contactId] = userMessages;

    renderMessages(contactId);
}

function renderMessages(contactId) {
    const messagesContainer = document.getElementById('chatMessages');

    if (!messages[contactId]) {
        messages[contactId] = [];
    }

    if (messages[contactId].length === 0) {
        messagesContainer.innerHTML = `
            <div class="empty-state">
                <p>开始和 ${currentContact.name} 的对话吧</p>
            </div>
        `;
        return;
    }

    const messageGroups = groupMessagesByTime(messages[contactId]);

    const userAvatarSrc = userAvatar || (currentUsername ? currentUsername[0].toUpperCase() : '我');

    messagesContainer.innerHTML = messageGroups.map(group => {
        if (group.type === 'timestamp') {
            return `<div class="message__timestamp">${group.time}</div>`;
        } else {
            const isMe = group.isMe;
            const alignClass = isMe ? 'message-container--align-right' : '';

            const avatarSrc = isMe ? (userAvatar || `data:text/html,<div style="width:40px;height:40px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-size:18px;border-radius:50%;">${currentUsername ? currentUsername[0].toUpperCase() : '我'}</div>`) : currentContact.avatar;

            return `
                <div class="message-container ${alignClass}">
                    <div class="avatar">
                        ${isMe && !userAvatar ? avatarSrc : `<img src="${avatarSrc}" alt="${isMe ? '我' : currentContact.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='${isMe ? (currentUsername ? currentUsername[0].toUpperCase() : '我') : currentContact.name[0]}';">`}
                    </div>
                    <div class="message-content-wrapper">
                        <div class="user-name">${isMe ? (currentUsername || '我') : currentContact.name}</div>
                        <div class="msg-content-container">
                            <div class="message-content">${escapeHtml(group.content)}</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();

    if (!content) return;
    if (!currentContact) {
        alert('请先选择一个聊天对象');
        return;
    }

    const contactId = currentContact.id;

    if (!messages[contactId]) {
        messages[contactId] = [];
    }

    const userMessage = {
        content: content,
        isMe: true,
        timestamp: new Date().toISOString()
    };

    messages[contactId].push(userMessage);

    input.value = '';

    renderMessages(contactId);

    try {
        const response = await fetch(`${API_BASE}/send_message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contact_id: contactId,
                contact_name: currentContact.name,
                message: content
            })
        });

        if (response.status === 401) {
            const data = await response.json();
            if (data.require_login) {
                alert('请先登录');
                window.location.href = '/login';
                return;
            }
        }

        if (response.ok) {
            const data = await response.json();

            if (data.reply) {
                const replyMessage = {
                    content: data.reply,
                    isMe: false,
                    timestamp: data.timestamp || new Date().toISOString()
                };

                messages[contactId].push(replyMessage);

                setTimeout(() => {
                    renderMessages(contactId);
                }, 500);
            }
        } else {
            console.error('发送消息失败:', response.statusText);
        }
    } catch (error) {
        console.error('发送消息时出错:', error);
        
        setTimeout(() => {
            const replyMessage = {
                content: '【测试回复】收到消息: ' + content,
                isMe: false,
                timestamp: new Date().toISOString()
            };
            
            messages[contactId].push(replyMessage);
            renderMessages(contactId);
        }, 500);
    }
}

function setupEventListeners() {
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    
    document.getElementById('messageInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    document.querySelectorAll('.func-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('功能按钮点击:', btn.title);
        });
    });
    
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('工具栏按钮点击:', btn.textContent);
        });
    });
}

document.addEventListener('DOMContentLoaded', init);