let selectedAvatar = null;
let avatarData = null;

document.addEventListener('DOMContentLoaded', function() {
    initAuthTabs();
    initLoginForm();
    initRegisterForm();
    initAvatarUpload();
    checkExistingSession();
});

function initAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));

            this.classList.add('active');
            document.getElementById(`${targetTab}Form`).classList.add('active');

            clearMessage();
        });
    });
}

function initLoginForm() {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            showMessage('请填写所有必填项', 'error');
            return;
        }

        const btn = this.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = '登录中...';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                showMessage('登录成功！正在跳转...', 'success');
                localStorage.setItem('currentUser', username);
                localStorage.setItem('userAvatar', data.avatar_url || '');
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 500);
            } else {
                showMessage(data.error || '登录失败', 'error');
            }
        } catch (error) {
            showMessage('网络错误，请重试', 'error');
            console.error('Login error:', error);
        } finally {
            btn.disabled = false;
            btn.textContent = '登录';
        }
    });
}

function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!username || !password || !confirmPassword) {
            showMessage('请填写所有必填项', 'error');
            return;
        }

        if (username.length < 3 || username.length > 20) {
            showMessage('用户名长度需要在3-20个字符之间', 'error');
            return;
        }

        if (password.length < 6) {
            showMessage('密码长度不能少于6位', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showMessage('两次密码输入不一致', 'error');
            return;
        }

        const btn = this.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = '注册中...';

        try {
            let avatarUrl = '';

            if (avatarData) {
                avatarUrl = await uploadAvatar(username);
            }

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    password,
                    confirm_password: confirmPassword,
                    avatar_url: avatarUrl
                })
            });

            const data = await response.json();

            if (data.success) {
                showMessage('注册成功！正在跳转...', 'success');
                localStorage.setItem('currentUser', username);
                localStorage.setItem('userAvatar', avatarUrl);
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 500);
            } else {
                showMessage(data.error || '注册失败', 'error');
            }
        } catch (error) {
            showMessage('网络错误，请重试', 'error');
            console.error('Register error:', error);
        } finally {
            btn.disabled = false;
            btn.textContent = '注册';
        }
    });
}

function initAvatarUpload() {
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatarPreview');

    avatarInput.addEventListener('change', function(e) {
        const file = e.target.files[0];

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showMessage('请选择图片文件', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showMessage('图片大小不能超过10MB', 'error');
            return;
        }

        selectedAvatar = file;

        const reader = new FileReader();
        reader.onload = function(e) {
            avatarPreview.innerHTML = `<img src="${e.target.result}" alt="头像预览">`;
            avatarPreview.classList.add('has-image');

            document.getElementById('cancelAvatarBtn').style.display = 'inline-block';
        };
        reader.readAsDataURL(file);

        cropAndResizeImage(file);
    });
}

function cropAndResizeImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const size = 200;
            canvas.width = size;
            canvas.height = size;

            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;

            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

            avatarData = canvas.toDataURL('image/webp', 0.85);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function uploadAvatar(username) {
    if (!avatarData) return '';

    try {
        const response = await fetch('/api/auth/upload_avatar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                image_data: avatarData
            })
        });

        const data = await response.json();

        if (data.success) {
            return data.avatar_url;
        } else {
            console.error('Avatar upload failed:', data.error);
            return '';
        }
    } catch (error) {
        console.error('Avatar upload error:', error);
        return '';
    }
}

function cancelAvatar() {
    selectedAvatar = null;
    avatarData = null;

    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatarPreview');

    avatarInput.value = '';
    avatarPreview.innerHTML = '<span class="avatar-placeholder">点击上传头像</span>';
    avatarPreview.classList.remove('has-image');

    document.getElementById('cancelAvatarBtn').style.display = 'none';
}

async function checkExistingSession() {
    try {
        const response = await fetch('/api/auth/check_session');
        const data = await response.json();

        if (data.success && data.logged_in) {
            localStorage.setItem('currentUser', data.username);
            localStorage.setItem('userAvatar', data.avatar_url || '');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('authMessage');
    messageDiv.textContent = message;
    messageDiv.className = `auth-message ${type}`;

    setTimeout(() => {
        clearMessage();
    }, 5000);
}

function clearMessage() {
    const messageDiv = document.getElementById('authMessage');
    messageDiv.textContent = '';
    messageDiv.className = 'auth-message';
}