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
function renderContactList(contacts) {
    const listContainer = document.getElementById('contactList');
    const contactsToRender = contacts || contactsData;

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
            selectContact(contactId);
        });
    });
}

// 选择联系人
async function selectContact(contactId) {
    document.querySelectorAll('.recent-contact-item').forEach(item => {
        item.classList.remove('active');
    });

    const selectedItem = document.querySelector(`.recent-contact-item[data-id="${contactId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }

    currentContact = contactsData.find(c => c.id === contactId);

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

    console.log('选择联系人后，检查是否需要切换到移动端视图');
    if (isMobileView()) {
        console.log('是移动端，开始切换视图');
        showMobileChatView();
    } else {
        console.log('不是移动端，保持原有布局');
    }
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

        const recallBtn = isMe ? `
                    <button class="recall-btn" data-msg-index="${i}" title="撤回">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
                        </svg>
                    </button>` : '';

        messageElements.push(`
            <div class="message-container ${alignClass}" data-msg-index="${i}">
                <div class="avatar">
                    ${isMe && !userAvatar ? avatarSrc : `<img src="${avatarSrc}" alt="${isMe ? '我' : currentContact.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='${isMe ? (currentUsername ? currentUsername[0].toUpperCase() : '我') : currentContact.name[0]}';">`}
                </div>
                <div class="message-content-wrapper">
                    <div class="user-name">${isMe ? (currentUsername || '你') : currentContact.name}</div>
                    <div class="msg-content-container ${bubbleClass}">
                        <div class="message-content">${escapeHtml(msg.content)}</div>
                        ${recallBtn}
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

// 将联系人移到列表顶部并更新时间和预览
function moveContactToTop(contactId, preview) {
    const index = contactsData.findIndex(c => c.id === contactId);
    if (index === -1) return;

    const contact = contactsData.splice(index, 1)[0];
    contact.lastTime = new Date().toISOString();
    contact.preview = preview;
    contactsData.unshift(contact);

    renderContactList();

    if (currentContact) {
        const activeItem = document.querySelector(`.recent-contact-item[data-id="${currentContact.id}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }
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

    const contactName = currentContact.name;

    try {
        const result = await sendMessageAPI(contactId, contactName, content);

        const isStillViewing = currentContact && currentContact.id === contactId;

        removeTypingIndicator(contactId);

        if (result && result.success && result.reply) {
            const replyMessage = {
                content: result.reply,
                isMe: false,
                timestamp: result.timestamp || new Date().toISOString()
            };

            messages[contactId].push(replyMessage);
            if (isStillViewing) {
                renderMessages(contactId);
            }
            moveContactToTop(contactId, result.reply);
        } else if (result && result.error) {
            if (isStillViewing) {
                showErrorMessage(contactId, result.error);
            }
        }
    } catch (error) {
        console.error('发送消息时出错:', error);
        removeTypingIndicator(contactId);
        const isStillViewing = currentContact && currentContact.id === contactId;
        if (isStillViewing) {
            showErrorMessage(contactId, '连接失败，无法获取AI回复');
        }
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

async function handleRecallMessage(e) {
    const btn = e.target.closest('.recall-btn');
    if (!btn) return;
    if (!currentContact) return;

    const msgIndex = parseInt(btn.dataset.msgIndex);
    const contactId = currentContact.id;
    const msgList = messages[contactId];
    if (!msgList || msgIndex < 0 || msgIndex >= msgList.length) return;

    const msgContent = msgList[msgIndex].content;
    const totalToRecall = msgList.length - msgIndex;
    const confirmed = confirm(`确定要撤回此条消息及之后的 ${totalToRecall-1} 条消息吗？`);
    if (!confirmed) return;

    const result = await recallMessageAPI(contactId, msgIndex);
    if (result && result.success) {
        messages[contactId] = msgList.slice(0, msgIndex);
        const input = document.getElementById('messageInput');
        if (msgContent) {
            input.value = msgContent;
        }
        renderMessages(contactId);
    }
}

// 加载初始数据
async function loadInitialData() {
    const data = await loadUserContacts();
    contactsData = data;
    renderContactList(contactsData);
}

// ==================== 事件监听 ====================

// 移动端视图切换
function isMobileView() {
    const isMobile = window.innerWidth <= 768;
    console.log('视口宽度:', window.innerWidth, '是否是移动端:', isMobile);
    return isMobile;
}

function showMobileContactList() {
    const aside = document.querySelector('.two-col-layout__aside');
    const main = document.querySelector('.two-col-layout__main');
    
    if (aside) {
        aside.classList.remove('hidden-mobile');
    }
    if (main) {
        main.classList.add('hidden-mobile');
    }
}

function showMobileChatView() {
    const aside = document.querySelector('.two-col-layout__aside');
    const main = document.querySelector('.two-col-layout__main');
    
    if (aside) {
        aside.classList.add('hidden-mobile');
    }
    if (main) {
        main.classList.remove('hidden-mobile');
    }
}

function handleBackToContacts() {
    if (isMobileView()) {
        showMobileContactList();
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
    
    document.getElementById('chatMenuBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleChatMenu();
    });

    document.getElementById('saveIdentityBtn').addEventListener('click', handleSaveIdentity);

    document.getElementById('clearChatBtn').addEventListener('click', handleClearChat);

    document.getElementById('chatMessages').addEventListener('click', handleRecallMessage);

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

    document.getElementById('backToContactsBtn').addEventListener('click', handleBackToContacts);

    window.addEventListener('resize', () => {
        if (!isMobileView()) {
            const aside = document.querySelector('.two-col-layout__aside');
            const main = document.querySelector('.two-col-layout__main');
            if (aside) {
                aside.classList.remove('hidden-mobile');
            }
            if (main) {
                main.classList.remove('hidden-mobile');
            }
        }
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