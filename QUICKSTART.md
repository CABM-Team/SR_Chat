# 星穹铁道聊天系统 Web版 - 快速开始指南

## 🎮 功能特点

- ✅ 仿《崩坏：星穹铁道》角色短信风格的 Web 聊天界面
- ✅ 预设多个聊天对象（丹恒、姬子、瓦尔特、银狼、三月七）
- ✅ 实时消息收发
- ✅ Python Flask 后端 API
- ✅ 消息自动回复功能（测试用）
- ✅ 完全响应式设计
- ✅ 支持自定义头像图片
- ✅ 自动降级显示（无图片时显示文字首字）

## 🖼️ 头像设置

### 准备头像图片

需要为每个角色准备头像图片，放置在 `avatars/` 目录：

```
avatars/
├── 丹恒.webp    # 丹恒的头像
├── 姬子.webp   # 姬子的头像
├── 瓦尔特.webp # 瓦尔特的头像
├── 银狼.webp   # 银狼的头像
├── 三月七.webp # 三月七的头像
└── me.webp     # 您自己的头像
```

**推荐尺寸**: 200x200 像素（支持 WebP、PNG、JPG 格式）

### 降级方案

如果暂时没有头像图片，系统会自动降级显示角色名字的首字：
- 丹恒 → 显示 "丹"
- 姬子 → 显示 "姬"
- 等等...

这样即使没有准备图片，界面也能正常显示！

## 🚀 快速启动

### 1. 安装依赖

确保已安装 Python 3.7+，然后安装 Flask：

```bash
pip install -r requirements.txt
```

或者手动安装：

```bash
pip install Flask==3.0.0 flask-cors==4.0.0
```

### 2. 启动后端服务

在项目根目录运行：

```bash
python app.py
```

成功启动后会看到：

```
==================================================
🚀 星穹铁道聊天系统 API 服务启动中...
==================================================
服务地址: http://localhost:5000
API文档: http://localhost:5000/
==================================================
```

### 3. 启动前端页面

有多种方式打开前端页面：

**方式一：直接打开 HTML 文件**

双击 `index.html` 文件，或在浏览器中打开：

```
file:///d:/SW_awa/sr_chat/index.html
```

**方式二：使用 Python 简易服务器**

```bash
cd d:\SW_awa\sr_chat
python -m http.server 8000
```

然后在浏览器访问：`http://localhost:8000`

**方式三：使用 VS Code Live Server**

如果你使用 VS Code，可以安装 Live Server 扩展，然后右键 `index.html` 选择 "Open with Live Server"

## 📡 API 接口说明

### 1. 获取联系人列表

```
GET /api/contacts
```

响应示例：
```json
{
  "success": true,
  "data": [
    {"id": 1, "name": "丹恒", "avatar": "丹", "preview": "...", "lastTime": "18:30"}
  ]
}
```

### 2. 发送消息

```
POST /api/send_message
Content-Type: application/json

{
  "contact_id": 1,
  "contact_name": "丹恒",
  "message": "你好"
}
```

响应示例：
```json
{
  "success": true,
  "reply": "【自动回复】收到你的消息了：你好",
  "contact_id": 1,
  "timestamp": "2024-01-01T12:00:00"
}
```

### 3. 获取聊天记录

```
GET /api/get_messages/<contact_id>
```

### 4. 清除聊天记录

```
POST /api/clear_messages/<contact_id>
```

### 5. 健康检查

```
GET /api/health
```

## 🎯 使用方法

1. **选择聊天对象**：在左侧列表点击任意联系人
2. **发送消息**：在底部输入框输入文字，点击发送按钮或按 Enter 键
3. **查看回复**：消息发送后会自动收到一条测试回复
4. **切换聊天**：点击不同的联系人切换聊天窗口

## 🔧 自定义配置

### 修改预设联系人

编辑 `chat.js` 文件中的 `contacts` 数组：

```javascript
const contacts = [
    { id: 1, name: '丹恒', avatar: '丹', preview: '最后一杯了...', lastTime: '18:30' },
    // 添加更多联系人...
];
```

### 修改自动回复内容

编辑 `app.py` 文件中的 `get_fixed_reply` 函数：

```python
def get_fixed_reply(contact_name, message):
    fixed_replies = [
        f"【自动回复】收到你的消息了：{message}",
        # 添加更多回复...
    ]
    import random
    return random.choice(fixed_replies)
```

### 修改背景模糊度

编辑 `styles.css` 中的 `filter` 属性：

```css
filter: blur(0px) brightness(100%);
```

- `blur(0px)`: 背景模糊程度，0 为不模糊
- `brightness(100%)`: 背景亮度，100% 为正常

## 📁 项目结构

```
sr_chat/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── chat.js            # 前端逻辑
├── app.py             # Python Flask 后端
├── requirements.txt   # Python 依赖
├── res/               # 图片资源
│   ├── background.jpg
│   ├── StarRailFont.ttf
│   ├── icon.png
│   ├── icon_tip.svg
│   ├── img_header.png
│   └── bubbles/       # 气泡样式
├── README.md          # 原项目说明
└── IMAGES.md          # 图片素材清单
```

## ⚠️ 注意事项

1. **CORS 跨域**：已配置 flask-cors，允许跨域请求
2. **后端端口**：默认使用 5000 端口，如需修改请编辑 `app.py` 中的 `app.run()`
3. **消息存储**：消息暂时存储在内存中，重启服务后会清除
4. **字体加载**：如果字体无法加载，请确保 `res/StarRailFont.ttf` 文件存在

## 🎨 界面预览

界面完全仿照《崩坏：星穹铁道》的短信风格，包括：

- 赛博朋克风格深色背景
- 圆角气泡消息框
- 左侧金色消息（自己发送）
- 右侧浅色消息（对方发送）
- 自动隐藏的工具栏
- 装饰性角落图片

## 🐛 常见问题

### Q: 消息发送失败？
A: 确保 Flask 后端已启动并运行在 http://localhost:5000

### Q: 背景图片不显示？
A: 检查 `res/background.jpg` 文件是否存在，以及 `index.html` 中的路径是否正确

### Q: 字体显示异常？
A: 确保 `res/StarRailFont.ttf` 文件存在，或在 `styles.css` 中注释掉字体相关样式

## 📝 后续扩展建议

如果你想进一步开发这个项目，可以考虑：

1. **接入真实 AI**：将 `app.py` 中的固定回复替换为 AI 对话 API
2. **添加数据库**：使用 SQLite 或 MySQL 持久化聊天记录
3. **用户认证**：添加登录注册功能
4. **实时通信**：使用 WebSocket 实现实时消息推送
5. **更多样式**：添加更多气泡样式和主题

## 🎉 完成！

现在你应该可以正常运行这个仿星穹铁道风格的聊天系统了！有任何问题欢迎随时问 Neko 喵~ (≧▽≦)