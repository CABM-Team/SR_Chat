// chat_main.js - 主要UI逻辑

// ==================== UI 渲染函数 ====================

// 渲染联系人列表
function renderContactList(contactsData) {
    const listContainer = document.getElementById('contactList');
    const contactsToRender = contactsData;

    listContainer.innerHTML = contactsToRender.map(contact => {
        const formattedTime = formatContactTime(contact.lastTime);
        return `
            <div class="recent-contact-item" data-id="${contact.id}">
                <div class="avatar">
                    <img src="${contact.avatar}" alt="${contact.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='${contact.name[0]}';">
                </div>
                <div class="contact-info">
                    <div class="contact-name-row">
                        <span class="contact-name">${escapeHtml(contact.name)}</span>
                        <span class="contact-time">${formattedTime}</span>
                    </div>
                    <div class="contact-preview">${escapeHtml(contact.preview || '')}</div>
                </div>
            </div>
        `;
    }).join('');

    listContainer.querySelectorAll('.recent-contact-item').forEach(item => {
        item.addEventListener('click', () => {
            const contactId = parseInt(item.dataset.id);
            selectContact(contactId, contactsToRender);
        });
    });
}

// 选择联系人
async function selectContact(contactId, contactsToRender) {
    document.querySelectorAll('.recent-contact-item').forEach(item => {
        item.classList.remove('active');
    });

    const selectedItem = document.querySelector(`.recent-contact-item[data-id="${contactId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }

    currentContact = contactsToRender.find(c => c.id === contactId);

    document.getElementById('chatTitle').innerHTML = `<span>${currentContact.name}</span>`;

    const userMessages = await loadUserMessages(contactId);
    messages[contactId] = userMessages;

    renderMessages(contactId);
}

// 渲染消息
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

    const userAvatarSrc = userAvatar || (currentUsername ? currentUsername[0].toUpperCase() : '我');
    
    let lastDisplayedTime = null;
    let messageElements = [];

    for (let i = 0; i < messages[contactId].length; i++) {
        const msg = messages[contactId][i];
        const isMe = msg.isMe;
        const alignClass = isMe ? 'message-container--align-right' : '';
        
        const avatarSrc = isMe ? (userAvatar || `data:text/html,<div style="width:40px;height:40px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-size:18px;border-radius:50%;">${currentUsername ? currentUsername[0].toUpperCase() : '我'}</div>`) : currentContact.avatar;
        
        // 检查是否需要显示时间
        const showTime = formatMessageTime(msg.timestamp, lastDisplayedTime);
        if (showTime) {
            messageElements.push(`
                <div class="message__timestamp">${showTime}</div>
            `);
            lastDisplayedTime = msg.timestamp;
        }
        
        messageElements.push(`
            <div class="message-container ${alignClass}">
                <div class="avatar">
                    ${isMe && !userAvatar ? avatarSrc : `<img src="${avatarSrc}" alt="${isMe ? '我' : currentContact.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='${isMe ? (currentUsername ? currentUsername[0].toUpperCase() : '我') : currentContact.name[0]}';">`}
                </div>
                <div class="message-content-wrapper">
                    <div class="user-name">${isMe ? (currentUsername || '你') : currentContact.name}</div>
                    <div class="msg-content-container">
                        <div class="message-content">${escapeHtml(msg.content)}</div>
                    </div>
                </div>
            </div>
        `);
    }
    
    messagesContainer.innerHTML = messageElements.join('');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 发送消息
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
        const result = await sendMessageAPI(contactId, currentContact.name, content);

        if (result && result.reply) {
            const replyMessage = {
                content: result.reply,
                isMe: false,
                timestamp: result.timestamp || new Date().toISOString()
            };

            messages[contactId].push(replyMessage);

            setTimeout(() => {
                renderMessages(contactId);
            }, 500);
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

// 加载初始数据
async function loadInitialData() {
    const contactsData = await loadUserContacts();
    renderContactList(contactsData);
}

// ==================== 事件监听 ====================

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

// 初始化应用
function init() {
    checkAuth().then(isAuthenticated => {
        if (isAuthenticated) {
            setupEventListeners();
            loadInitialData();
        }
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);