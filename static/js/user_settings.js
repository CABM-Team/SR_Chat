// user_settings.js - 用户设置逻辑

let currentUserSettings = {
    avatar: null,
    bubble: 'default'
};

async function loadUserSettings() {
    try {
        const response = await fetch(`${API_BASE}/user/settings`);
        
        if (!response.ok) {
            throw new Error('获取用户设置失败');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            currentUserSettings.avatar = result.data.avatar || localStorage.getItem('userAvatar');
            currentUserSettings.bubble = result.data.bubble_style || 'default';
        }
        
        updateUserHeader();
        updateSettingsModal();
        
    } catch (error) {
        console.error('加载用户设置失败:', error);
        currentUserSettings.avatar = localStorage.getItem('userAvatar');
        updateUserHeader();
        updateSettingsModal();
    }
}

function updateUserHeader() {
    const userNameEl = document.getElementById('userNameHeader');
    const userAvatarImgEl = document.getElementById('userAvatarImg');
    
    if (userNameEl) {
        userNameEl.textContent = currentUsername || '用户';
    }
    
    if (userAvatarImgEl) {
        if (currentUserSettings.avatar) {
            userAvatarImgEl.src = currentUserSettings.avatar;
            userAvatarImgEl.style.display = 'block';
        } else {
            userAvatarImgEl.style.display = 'none';
        }
        
        userAvatarImgEl.onerror = function() {
            this.style.display = 'none';
            this.parentElement.textContent = currentUsername ? currentUsername[0].toUpperCase() : '用';
        };
    }
}

function updateSettingsModal() {
    const settingsAvatarImg = document.getElementById('settingsAvatarImg');
    const currentBubbleName = document.getElementById('currentBubbleName');
    
    if (settingsAvatarImg) {
        if (currentUserSettings.avatar) {
            settingsAvatarImg.src = currentUserSettings.avatar;
            settingsAvatarImg.style.display = 'block';
        } else {
            settingsAvatarImg.style.display = 'none';
        }
        
        settingsAvatarImg.onerror = function() {
            this.style.display = 'none';
            this.parentElement.textContent = currentUsername ? currentUsername[0].toUpperCase() : '用';
        };
    }
    
    if (currentBubbleName) {
        currentBubbleName.textContent = getBubbleDisplayName(currentUserSettings.bubble);
    }
}

function getBubbleDisplayName(bubbleStyle) {
    const bubbleNames = {
        'default': '默认',
        'bubbleStyle1': '星体培养皿',
        'bubbleStyle2': '兔子在哪里？',
        'bubbleStyle3': '次元扑满',
        'bubbleStyle4': '怪物酒馆',
        'bubbleStyle5': '影城逐梦记',
        'bubbleStyle6': '光阴莫负'
    };
    
    return bubbleNames[bubbleStyle] || bubbleStyle;
}

function openUserSettings() {
    const modal = document.getElementById('userSettingsModal');
    if (modal) {
        modal.classList.add('active');
        updateSettingsModal();
    }
}

function closeUserSettings() {
    const modal = document.getElementById('userSettingsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
        const response = await fetch(`${API_BASE}/auth/upload_avatar`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('上传头像失败');
        }
        
        const result = await response.json();
        
        if (result.success && result.avatar_url) {
            currentUserSettings.avatar = result.avatar_url;
            userAvatar = result.avatar_url;
            
            localStorage.setItem('userAvatar', userAvatar);
            
            await saveUserSettings();
            
            updateUserHeader();
            updateSettingsModal();
            
            if (typeof renderMessages === 'function' && currentContact) {
                renderMessages(currentContact.id);
            }
            
            alert('头像上传成功！');
        }
        
    } catch (error) {
        console.error('上传头像失败:', error);
        alert('头像上传失败，请重试');
    }
}

async function saveUserSettings() {
    try {
        const response = await fetch(`${API_BASE}/user/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                avatar: currentUserSettings.avatar,
                bubble_style: currentUserSettings.bubble
            })
        });
        
        if (!response.ok) {
            throw new Error('保存设置失败');
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('用户设置已保存');
        }
        
    } catch (error) {
        console.error('保存用户设置失败:', error);
    }
}

async function handleLogout() {
    if (!confirm('确定要退出登录吗？')) return;

    try {
        await fetch('/api/auth/logout', {
            method: 'POST'
        });
    } finally {
        localStorage.clear();
        window.location.replace('/login');
    }
}

function setupUserSettingsEvents() {
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const settingsModal = document.getElementById('userSettingsModal');
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    const changeBubbleBtn = document.getElementById('changeBubbleBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openUserSettings();
        });
    }
    
    const userHeader = document.getElementById('userHeader');
    if (userHeader) {
        userHeader.addEventListener('click', () => {
            openUserSettings();
        });
    }
    
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeUserSettings);
    }
    
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                closeUserSettings();
            }
        });
    }
    
    if (changeAvatarBtn && avatarInput) {
        changeAvatarBtn.addEventListener('click', () => {
            avatarInput.click();
        });
        
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (!file.type.startsWith('image/')) {
                    alert('请选择图片文件');
                    return;
                }
                
                if (file.size > 5 * 1024 * 1024) {
                    alert('图片大小不能超过5MB');
                    return;
                }
                
                uploadAvatar(file);
            }
        });
    }
    
    if (changeBubbleBtn) {
        changeBubbleBtn.addEventListener('click', () => {
            if (typeof openBubbleSelector === 'function') {
                openBubbleSelector();
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeUserSettings();
            if (typeof closeBubbleSelector === 'function') {
                closeBubbleSelector();
            }
        }
    });
}

function initUserSettings() {
    if (currentUsername) {
        loadUserSettings();
    }
    setupUserSettingsEvents();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUserSettings);
} else {
    initUserSettings();
}