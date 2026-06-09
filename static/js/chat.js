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

// ==================== 分页渲染状态 ====================
const MESSAGE_BATCH_SIZE = 50;
let startRenderIdx = 0;
let isLoadingMore = false;

/**
 * 渲染单条文本消息（带气泡框）
 */
function renderTextBubble(text, index, isMe) {
    const alignClass = isMe ? 'message-container--align-right' : '';
    const avatarSrc = isMe
        ? (userAvatar || `data:text/html,<div style="width:40px;height:40px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-size:18px;border-radius:50%;">${currentUsername ? currentUsername[0].toUpperCase() : '我'}</div>`)
        : currentContact.avatar;
    const bubbleClass = getBubbleClassName();
    const recallBtn = isMe
        ? `<button class="recall-btn" data-msg-index="${index}" title="撤回">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
            </svg>
        </button>`
        : '';

    return `
        <div class="message-container ${alignClass}" data-msg-index="${index}">
            <div class="avatar">
                ${isMe && !userAvatar
                    ? avatarSrc
                    : `<img src="${avatarSrc}" alt="${isMe ? '我' : currentContact.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='${isMe ? (currentUsername ? currentUsername[0].toUpperCase() : '我') : currentContact.name[0]}';">`}
            </div>
            <div class="message-content-wrapper">
                <div class="user-name">${isMe ? (currentUsername || '你') : currentContact.name}</div>
                <div class="msg-content-container ${bubbleClass}">
                    <div class="message-content">${escapeHtml(text)}</div>
                    ${recallBtn}
                </div>
            </div>
        </div>
    `;
}

/**
 * 渲染表情包消息（无气泡框）
 */
function renderEmojiBubble(emojiName, emojiUrl, index) {
    return `
        <div class="message-container" data-msg-index="${index}" data-emoji="true">
            <div class="avatar">
                <img src="${currentContact.avatar}" alt="${currentContact.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='${currentContact.name[0]}';">
            </div>
            <div class="message-content-wrapper">
                <div class="user-name">${escapeHtml(currentContact.name)}</div>
                <div class="emoji-container">
                    <img src="${emojiUrl}" alt="${emojiName}" class="emoji-image" data-emoji-name="${emojiName}">
                </div>
            </div>
        </div>
    `;
}

/**
 * 渲染时间戳
 */
function renderTimestampHtml(timestamp) {
    return `<div class="message__timestamp">${timestamp}</div>`;
}

// ==================== UI 渲染函数 ====================

// 渲染联系人列表
function renderContactList(contacts) {
    const listContainer = document.getElementById('contactList');
    const contactsToRender = contacts || contactsData;
    listContainer.innerHTML = contactsToRender.map(contact => {
        const formattedTime = formatContactTime(contact.lastTime);
        
        // 分句后取最后一段作为预览
        const preview = contact.preview || '';
        console.log(preview);
        const segments = splitText(preview);
        let displayPreview = preview;
        if (segments.length > 0) {
            console.log(segments);
            const lastSegment = segments[segments.length - 1];
            displayPreview = isEmojiMarker(lastSegment) ? '[表情]' : lastSegment;
        }
        
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
                    <div class="contact-preview">${escapeHtml(displayPreview)}</div>
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

// ==================== 分页渲染 ====================

/**
 * 构建指定范围内的消息 HTML 元素
 * @param {number} startIdx - 起始消息索引（含）
 * @param {number} endIdx - 结束消息索引（不含）
 * @param {number} contactId - 联系人ID
 * @param {string|null} prevTimestamp - 上一条消息的时间戳（用于判断是否显示时间）
 * @returns {Promise<{elements: string[], lastTimestamp: string|null}>}
 */
async function _buildMessageElements(startIdx, endIdx, contactId, prevTimestamp) {
    const msgList = messages[contactId];
    let lastDisplayedTime = prevTimestamp;
    const elements = [];

    for (let i = startIdx; i < endIdx; i++) {
        const msg = msgList[i];
        const isMe = msg.isMe;

        const showTime = formatMessageTime(msg.timestamp, lastDisplayedTime);
        if (showTime) {
            elements.push(renderTimestampHtml(showTime));
            lastDisplayedTime = msg.timestamp;
        }

        let segments;
        if (isMe) {
            segments = [msg.content];
        } else {
            segments = splitText(msg.content);
        }
        let lastIsMe = isMe;

        for (let j = 0; j < segments.length; j++) {
            const segment = segments[j];

            if (isEmojiMarker(segment)) {
                const emojiName = extractEmojiName(segment);
                const emojiUrl = await getEmojiUrl(contactId, emojiName);
                if (emojiUrl) {
                    elements.push(renderEmojiBubble(emojiName, emojiUrl, i));
                    lastIsMe = false;
                }
            } else {
                elements.push(renderTextBubble(segment, i, lastIsMe));
                lastIsMe = isMe;
            }
        }
    }

    return { elements, lastTimestamp: lastDisplayedTime };
}

function renderLoadMoreIndicator() {
    return `<div class="load-more-indicator" id="loadMoreIndicator">
        <button class="load-more-btn" id="loadMoreBtn">加载更多消息</button>
    </div>`;
}

// 渲染消息（分句显示，每个句子/表情独立气泡，分批渲染）
async function renderMessages(contactId) {
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
        startRenderIdx = 0;
        return;
    }

    const msgList = messages[contactId];
    startRenderIdx = Math.max(0, msgList.length - MESSAGE_BATCH_SIZE);

    // 获取上一条消息的时间戳用于时间显示判断
    let prevTimestamp = null;
    if (startRenderIdx > 0) {
        prevTimestamp = msgList[startRenderIdx - 1].timestamp;
    }

    const { elements } = await _buildMessageElements(startRenderIdx, msgList.length, contactId, prevTimestamp);

    let html = '';
    if (startRenderIdx > 0) {
        html += renderLoadMoreIndicator();
    }
    html += elements.join('');

    messagesContainer.innerHTML = html;

    // 等待所有表情包图片加载完成
    const emojiImages = messagesContainer.querySelectorAll('.emoji-image');
    if (emojiImages.length > 0) {
        const imagePromises = Array.from(emojiImages).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.addEventListener('load', resolve);
                img.addEventListener('error', resolve);
            });
        });
        await Promise.all(imagePromises);
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * 加载更多历史消息（向上滚动时触发）
 */
async function loadMoreMessages() {
    if (isLoadingMore || !currentContact) return;

    const contactId = currentContact.id;
    const msgList = messages[contactId] || [];

    if (startRenderIdx <= 0) return;

    isLoadingMore = true;

    // 更新加载指示器状态
    const loadIndicator = document.getElementById('loadMoreIndicator');
    if (loadIndicator) {
        loadIndicator.innerHTML = '<span class="load-more-text">正在从流光忆庭获取记忆...</span>';
    }

    const messagesContainer = document.getElementById('chatMessages');
    const prevScrollHeight = messagesContainer.scrollHeight;
    const prevScrollTop = messagesContainer.scrollTop;

    const newStartIdx = Math.max(0, startRenderIdx - MESSAGE_BATCH_SIZE);

    let prevTimestamp = null;
    if (newStartIdx > 0) {
        prevTimestamp = msgList[newStartIdx - 1].timestamp;
    }

    const { elements } = await _buildMessageElements(newStartIdx, startRenderIdx, contactId, prevTimestamp);

    // 移除旧的加载指示器
    if (loadIndicator) {
        loadIndicator.remove();
    }

    // 构建新 HTML
    let newHtml = '';
    if (newStartIdx > 0) {
        newHtml += renderLoadMoreIndicator();
    }
    newHtml += elements.join('');

    // 插入到容器顶部
    messagesContainer.insertAdjacentHTML('afterbegin', newHtml);

    // 保持滚动位置不变
    const newScrollHeight = messagesContainer.scrollHeight;
    messagesContainer.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);

    startRenderIdx = newStartIdx;
    isLoadingMore = false;
}

// 显示错误提示
function showErrorMessage(contactId, errorMsg) {
    if (currentContact && currentContact.id !== contactId) return;
    
    const messagesContainer = document.getElementById('chatMessages');
    const tipsHtml = `<div class="message__tips">${escapeHtml(errorMsg)}</div>`;
    messagesContainer.insertAdjacentHTML('beforeend', tipsHtml);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 将联系人移到列表顶部并更新时间和预览（显示分句后的最后一段）
function moveContactToTop(contactId, preview) {
    const index = contactsData.findIndex(c => c.id === contactId);
    if (index === -1) return;

    const contact = contactsData.splice(index, 1)[0];
    contact.lastTime = new Date().toISOString();

    // 分句后取最后一段作为预览
    const segments = splitText(preview);
    if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        console.log(lastSegment);
        contact.preview = isEmojiMarker(lastSegment) ? '[表情]' : lastSegment;
    } else {
        contact.preview = preview;
    }

    contactsData.unshift(contact);

    renderContactList();

    if (currentContact) {
        const activeItem = document.querySelector(`.recent-contact-item[data-id="${currentContact.id}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }
}

/**
 * 逐句展示回复（用于角色回复，每句独立气泡）
 * @param {string} replyContent - 完整回复内容
 * @param {number} contactId - 联系人ID
 */
async function displayReplyProgressive(replyContent, contactId) {
    const messagesContainer = document.getElementById('chatMessages');
    const msgIndex = messages[contactId].length - 1;
    const segments = splitText(replyContent);

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        if (currentContact && currentContact.id !== contactId) break;

        // 统一显示打字动画气泡
        const typingBubble = `
            <div class="message-container" data-msg-index="${msgIndex}">
                <div class="avatar">
                    <img src="${currentContact.avatar}" alt="${currentContact.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='${currentContact.name[0]}';">
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
        messagesContainer.insertAdjacentHTML('beforeend', typingBubble);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // 计算等待时间
        let waitTime = 1.0;
        if (isEmojiMarker(segment)) {
            // 表情包：随机 1.0~3.0 秒
            waitTime = 1.0 + Math.random() * 2.0;
        } else if (i < segments.length - 1) {
            // 文本：根据下一句字数（0~20字 → 2.0~4.0 秒）
            const nextSegment = segments[i + 1];
            if (nextSegment && nextSegment.text) {
                const textLength = Math.min(20, Math.max(0, nextSegment.text.length));
                waitTime = 2.0 + (textLength / 20) * 2.0;
            }
        }

        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));

        if (currentContact && currentContact.id !== contactId) break;

        // 替换为实际内容
        const tempElement = messagesContainer.lastElementChild;
        if (tempElement) {
            let actualBubble;
            if (isEmojiMarker(segment)) {
                    const emojiName = extractEmojiName(segment);
                    const emojiUrl = await getEmojiUrl(contactId, emojiName);
                    if (emojiUrl) {
                        actualBubble = renderEmojiBubble(emojiName, emojiUrl, msgIndex);
                    } else {
                        // 表情不存在，移除加载指示器
                        tempElement.remove();
                        continue;
                    }
                } else {
                actualBubble = renderTextBubble(segment, msgIndex, false);
            }
            if (actualBubble) {
                tempElement.outerHTML = actualBubble;
                // 延迟滚动，等待 DOM 更新和图片渲染
                setTimeout(() => {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }, 50);
            }
        }

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

    // 重新渲染所有消息
    await renderMessages(contactId);
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
                // 使用逐句展示（每句独立气泡）
                await displayReplyProgressive(result.reply, contactId);
            }

            // 更新联系人预览（使用原始回复内容）
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

    // 滚动加载更多消息
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.addEventListener('scroll', () => {
        if (messagesContainer.scrollTop < 100 && !isLoadingMore && startRenderIdx > 0) {
            loadMoreMessages();
        }
    });

    // 加载更多按钮（事件委托）
    messagesContainer.addEventListener('click', (e) => {
        if (e.target.closest('#loadMoreBtn')) {
            loadMoreMessages();
        }
    });

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