// bubble_selector.js - 聊天气泡选择器

const BUBBLE_PATH = 'static/css/res/bubbles';

let bubbleStyles = [];

async function loadBubbleStyles() {
    try {
        const response = await fetch(`${BUBBLE_PATH}/bubbles.json`);
        
        if (!response.ok) {
            throw new Error('加载气泡样式失败');
        }
        
        bubbleStyles = await response.json();
        
        const defaultBubble = {
            name: '默认',
            value: 'default',
            preview: null
        };
        
        bubbleStyles = [defaultBubble, ...bubbleStyles.map(bubble => ({
            name: bubble.name,
            value: bubble.imgPath ? bubble.imgPath.replace('bubbleStyle', 'bubbleStyle').replace('.svg', '').replace('/', '') : bubble.imgPath,
            preview: bubble.imgPath ? `${BUBBLE_PATH}/${bubble.imgPath}` : null,
            fullData: bubble
        }))];
        
    } catch (error) {
        console.error('加载气泡样式失败:', error);
    }
}

function renderBubbleList() {
    const bubbleList = document.getElementById('bubbleList');
    
    if (!bubbleList) {
        return;
    }
    
    bubbleList.innerHTML = bubbleStyles.map(bubble => `
        <div class="bubble-item ${currentUserSettings.bubble === bubble.value || currentUserSettings.bubble === bubble.name ? 'selected' : ''}" 
             data-bubble="${bubble.value}"
             data-name="${bubble.name}">
            <div class="bubble-item__preview">
                ${bubble.preview ? 
                    `<img src="${bubble.preview}" alt="${bubble.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'color:white;text-align:center;line-height:60px;\\'>${bubble.name}</div>'">` :
                    `<div style="color: white; text-align: center; line-height: 60px;">${bubble.name}</div>`
                }
            </div>
            <div class="bubble-item__name">${bubble.name}</div>
        </div>
    `).join('');
    
    bubbleList.querySelectorAll('.bubble-item').forEach(item => {
        item.addEventListener('click', () => {
            selectBubble(item.dataset.bubble, item.dataset.name);
        });
    });
}

async function selectBubble(bubbleValue, bubbleName) {
    currentUserSettings.bubble = bubbleValue;
    
    await saveUserSettings();
    
    applyBubbleStyle(bubbleValue);
    
    updateBubbleSelectionUI(bubbleValue);
    
    const currentBubbleName = document.getElementById('currentBubbleName');
    if (currentBubbleName) {
        currentBubbleName.textContent = bubbleName;
    }
    
    closeBubbleSelector();
}

function updateBubbleSelectionUI(selectedBubble) {
    const bubbleItems = document.querySelectorAll('.bubble-item');
    bubbleItems.forEach(item => {
        if (item.dataset.bubble === selectedBubble) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function applyBubbleStyle(bubbleStyle) {
    const messages = document.querySelectorAll('.message-container--align-right');
    
    messages.forEach(msg => {
        const msgContent = msg.querySelector('.msg-content-container');
        if (!msgContent) return;
        
        msgContent.className = 'msg-content-container';
        
        if (bubbleStyle && bubbleStyle !== 'default') {
            const bubbleClassMap = {
                'bubbleStyle1': 'bubble-style1',
                'bubbleStyle2': 'bubble-style2',
                'bubbleStyle3': 'bubble-style3',
                'bubbleStyle4': 'bubble-style4',
                'bubbleStyle5': 'bubble-style5',
                'bubbleStyle6': 'bubble-style6'
            };
            
            if (bubbleClassMap[bubbleStyle]) {
                msgContent.classList.add(bubbleClassMap[bubbleStyle]);
            }
        }
    });
}

function openBubbleSelector() {
    const modal = document.getElementById('bubbleSelectorModal');
    if (modal) {
        modal.classList.add('active');
        renderBubbleList();
    }
}

function closeBubbleSelector() {
    const modal = document.getElementById('bubbleSelectorModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function setupBubbleSelectorEvents() {
    const closeBtn = document.getElementById('closeBubbleSelectorBtn');
    const modal = document.getElementById('bubbleSelectorModal');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeBubbleSelector);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeBubbleSelector();
            }
        });
    }
}

async function initBubbleSelector() {
    await loadBubbleStyles();
    setupBubbleSelectorEvents();
    
    if (currentUserSettings.bubble && currentUserSettings.bubble !== 'default') {
        setTimeout(() => {
            applyBubbleStyle(currentUserSettings.bubble);
        }, 500);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBubbleSelector);
} else {
    initBubbleSelector();
}