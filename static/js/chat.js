// chat_main.js - 主要UI逻辑

// ==================== 工具函数 ====================

function getBubbleClassName() {
    const bubbleStyle = currentUserSettings && currentUserSettings.bubble ? currentUserSettings.bubble : 'default';
    
    const bubbleClasses = {
        'default': '',
        'bubbleStyle1': 'bubble-style1',
        'bubbleStyle2': 'bubble-style2',
        'bubbleStyle3': 'bubble-style3',
        'bubbleStyle4': 'bubble-style4',
        'bubbleStyle5': 'bubble-style5',
        'bubbleStyle6': 'bubble-style6'
    };
    
    return bubbleClasses[bubbleStyle] || '';
}

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

    closeChatMenu();

    const identityInput = document.getElementById('identityInput');
    if (identityInput) {
        const identity = await getContactIdentity(contactId);
        identityInput.value = identity;
    }

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
        
        const bubbleClass = getBubbleClassName();
        
        messageElements.push(`
            <div class="message-container ${alignClass}">
                <div class="avatar">
                    ${isMe && !userAvatar ? avatarSrc : `<img src="${avatarSrc}" alt="${isMe ? '我' : currentContact.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='${isMe ? (currentUsername ? currentUsername[0].toUpperCase() : '我') : currentContact.name[0]}';">`}
                </div>
                <div class="message-content-wrapper">
                    <div class="user-name">${isMe ? (currentUsername || '你') : currentContact.name}</div>
                    <div class="msg-content-container ${bubbleClass}">
                        <div class="message-content">${escapeHtml(msg.content)}</div>
                    </div>
                </div>
            </div>
        `);
    }
    
    messagesContainer.innerHTML = messageElements.join('');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 显示错误提示
function showErrorMessage(contactId, errorMsg) {
    if (currentContact && currentContact.id !== contactId) return;
    
    const messagesContainer = document.getElementById('chatMessages');
    const tipsHtml = `<div class="message__tips">${escapeHtml(errorMsg)}</div>`;
    messagesContainer.insertAdjacentHTML('beforeend', tipsHtml);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 发送消息
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
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

    sendBtn.disabled = true;
    sendBtn.classList.add('send-msg--disabled');
    input.disabled = true;

    renderMessages(contactId);
    showTypingIndicator(contactId);

    try {
        const result = await sendMessageAPI(contactId, currentContact.name, content);

        removeTypingIndicator(contactId);

        if (result && result.success && result.reply) {
            const replyMessage = {
                content: result.reply,
                isMe: false,
                timestamp: result.timestamp || new Date().toISOString()
            };

            messages[contactId].push(replyMessage);
            renderMessages(contactId);
        } else if (result && result.error) {
            showErrorMessage(contactId, result.error);
        }
    } catch (error) {
        console.error('发送消息时出错:', error);
        removeTypingIndicator(contactId);
        showErrorMessage(contactId, '连接失败，无法获取AI回复');
    } finally {
        sendBtn.disabled = false;
        sendBtn.classList.remove('send-msg--disabled');
        input.disabled = false;
        input.focus();
    }
}

function showTypingIndicator(contactId) {
    const messagesContainer = document.getElementById('chatMessages');
    if (currentContact && currentContact.id !== contactId) return;

    const typingHtml = `
        <div class="message-container" id="typingIndicator">
            <div class="avatar">
                <img src="${currentContact.avatar}" alt="${currentContact.name}">
            </div>
            <div class="message-content-wrapper">
                <div class="user-name">${escapeHtml(currentContact.name)}</div>
                <div class="msg-content-container">
                    <div class="typing-dots">
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                    </div>
                </div>
            </div>
        </div>
    `;
    messagesContainer.insertAdjacentHTML('beforeend', typingHtml);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator(contactId) {
    if (currentContact && currentContact.id !== contactId) return;
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function toggleChatMenu() {
    const dropdown = document.getElementById('chatMenuDropdown');
    dropdown.classList.toggle('open');
}

function closeChatMenu() {
    const dropdown = document.getElementById('chatMenuDropdown');
    dropdown.classList.remove('open');
}

async function handleSaveIdentity() {
    if (!currentContact) return;
    const input = document.getElementById('identityInput');
    const identity = input.value.trim();
    const result = await saveContactIdentity(currentContact.id, identity);
    if (result && result.success) {
        const btn = document.getElementById('saveIdentityBtn');
        btn.textContent = '已保存';
        setTimeout(() => { btn.textContent = ' 保存 '; }, 1200);
    }
}

async function handleClearChat() {
    if (!currentContact) return;
    const confirmed = confirm(`确定要清空与「${currentContact.name}」的所有对话记录吗？此操作不可撤销。`);
    if (!confirmed) return;
    const result = await clearMessagesAPI(currentContact.id);
    if (result && result.success) {
        messages[currentContact.id] = [];
        renderMessages(currentContact.id);
        closeChatMenu();
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
    
    document.getElementById('chatMenuBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleChatMenu();
    });

    document.getElementById('saveIdentityBtn').addEventListener('click', handleSaveIdentity);

    document.getElementById('clearChatBtn').addEventListener('click', handleClearChat);

    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('chatMenuDropdown');
        const btn = document.getElementById('chatMenuBtn');
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            closeChatMenu();
        }
    });

    document.querySelectorAll('.func-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('功能按钮点击:', btn.title);
        });
    });
}

// 初始化应用
function init() {
    checkAuth().then(isAuthenticated => {
        if (isAuthenticated) {
            setupEventListeners();
            loadInitialData();
            
            if (typeof initUserSettings === 'function') {
                initUserSettings();
            }
            
            if (typeof initBubbleSelector === 'function') {
                initBubbleSelector();
            }
        }
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);