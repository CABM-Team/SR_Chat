const API_BASE = 'http://localhost:5000/api';

const contacts = [
    { id: 1, name: '丹恒', avatar: 'avatars/丹恒.webp', preview: '最后一杯了，喝完就走', lastTime: '18:30' },
    { id: 2, name: '姬子', avatar: 'avatars/姬子.webp', preview: '你的咖啡，谢谢', lastTime: '17:45' },
    { id: 3, name: '瓦尔特', avatar: 'avatars/瓦尔特.webp', preview: '冷静点，别冲动', lastTime: '16:20' },
    { id: 4, name: '银狼', avatar: 'avatars/银狼.webp', preview: '这波稳了', lastTime: '昨天' },
    { id: 5, name: '三月七', avatar: 'avatars/三月七.webp', preview: '相机准备好了！', lastTime: '昨天' }
];

let currentContact = null;
let messages = {};

function init() {
    renderContactList();
    setupEventListeners();
}

function renderContactList() {
    const listContainer = document.getElementById('contactList');
    listContainer.innerHTML = contacts.map(contact => `
        <div class="recent-contact-item" data-id="${contact.id}">
            <div class="avatar">
                <img src="${contact.avatar}" alt="${contact.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='${contact.name[0]}';">
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.name}</div>
                <div class="contact-preview">${contact.preview}</div>
            </div>
        </div>
    `).join('');

    listContainer.querySelectorAll('.recent-contact-item').forEach(item => {
        item.addEventListener('click', () => {
            const contactId = parseInt(item.dataset.id);
            selectContact(contactId);
        });
    });
}

function selectContact(contactId) {
    document.querySelectorAll('.recent-contact-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const selectedItem = document.querySelector(`.recent-contact-item[data-id="${contactId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }
    
    currentContact = contacts.find(c => c.id === contactId);
    
    document.getElementById('chatTitle').innerHTML = `<span>${currentContact.name}</span>`;
    
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
    
    messagesContainer.innerHTML = messageGroups.map(group => {
        if (group.type === 'timestamp') {
            return `<div class="message__timestamp">${group.time}</div>`;
        } else {
            const isMe = group.isMe;
            const alignClass = isMe ? 'message-container--align-right' : '';
            
            return `
                <div class="message-container ${alignClass}">
                    <div class="avatar">
                        <img src="${isMe ? 'avatars/me.webp' : currentContact.avatar}" alt="${isMe ? '我' : currentContact.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='${isMe ? '我' : currentContact.name[0]}';">
                    </div>
                    <div class="message-content-wrapper">
                        <div class="user-name">${isMe ? '我' : currentContact.name}</div>
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
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.reply) {
                const replyMessage = {
                    content: data.reply,
                    isMe: false,
                    timestamp: new Date().toISOString()
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