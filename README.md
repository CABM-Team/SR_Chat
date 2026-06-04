# 🌌 星穹铁道 AI 对话

一个基于《崩坏：星穹铁道》角色的 AI 对话网站，支持与多位角色进行沉浸式聊天。
> 立即体验：https://cabm.shasnow.top
## ✨ 功能特性

- 🤖 **AI 对话** - 与星穹铁道角色进行自然语言交流
- 👥 **多位角色** - 支持丹恒、姬子、瓦尔特、银狼、三月七、希儿、克拉拉、云璃、花火、遐蝶、昔涟、流萤、卡芙卡、爻光、风瑾、忘归人、知更鸟、黄泉、黑天鹅等众多角色
- 💬 **表情包系统** - 每个角色都有独特的表情包互动
- 🎨 **聊天气泡样式** - 多种精美气泡样式可选
- 💾 **对话记录** - 自动保存与每个角色的聊天记录
- 👤 **用户系统** - 完整的登录注册功能
- ⚙️ **个性化设置** - 可自定义用户身份设定、界面样式偏好等

## 🛠️ 技术栈

- **后端**: Flask (Python)
- **前端**: HTML + CSS + JavaScript
- **AI**: OpenAI API
- **存储**: JSON 文件存储

## 🚀 快速开始

### 环境要求

- Python 3.8+
- OpenAI API Key

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd sr_chat
   ```

2. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

3. **配置环境变量**
   复制 `.env.example` 为 `.env`，并配置你的 OpenAI API Key：
   ```env
   OPENAI_API_KEY=your_api_key_here
   OPENAI_BASE_URL=https://api.openai.com/v1  # 可选，自定义 API 地址
   OPENAI_MODEL=gpt-4o-mini  # 可选，指定模型
   ```

4. **启动服务**
   ```bash
   # Windows
   双击启动.bat

   # 或手动启动
   python app.py
   ```

5. **访问网站**
   打开浏览器访问 `http://localhost:5000`

## 📁 项目结构

```
sr_chat/
├── app.py              # Flask 主应用
├── auth.py             # 用户认证模块
├── contacts.json       # 角色配置
├── storage.py          # 数据存储管理
├── llm.py              # OpenAI API 调用
├── prompt.py           # Prompt 构建
├── safety.py           # 安全过滤
├── emoji.py            # 表情包系统
├── paths.py            # 路径配置
├── requirements.txt    # Python 依赖
├── static/             # 静态资源
│   ├── avatars/        # 角色头像
│   ├── emoji/          # 角色表情包
│   ├── css/            # 样式文件
│   ├── js/             # 前端脚本
│   ├── index.html      # 主页面
│   └── login.html      # 登录页面
└── storage/            # 用户数据存储目录
```

## 🎮 使用指南

### 开始聊天
1. 注册/登录账号
2. 在角色列表中选择想要聊天的角色
3. 在输入框中输入内容发送消息
4. AI 会以对应角色的性格和语气回复

### 角色表情包
- 在聊天界面可以查看和使用角色的专属表情包
- 部分表情包需要满足特定条件解锁

### 个性化设置
- 点击设置按钮进入设置页面
- 可以自定义用户身份设定，让 AI 更了解你
- 选择喜欢的聊天气泡样式

## ⚙️ 配置说明

### 角色管理
编辑 `contacts.json` 可以添加、修改或删除聊天角色。每个角色包含：
- `id`: 唯一标识
- `name`: 角色名称
- `avatar_filename`: 头像文件名
- `prompt`: 角色设定（AI 行为准则）

### 聊天气泡样式
在 `static/css/res/bubbles/` 目录下可以查看和添加气泡样式。

### 安全过滤
`safety.py` 中的 `check_safety()` 函数用于对用户输入和 AI 输出进行安全过滤，可根据需要调整。

## 📝 注意事项

- 请妥善保管你的 OpenAI API Key，不要泄露给他人
- 用户数据存储在 `storage/` 目录下
- 建议定期备份重要对话记录

## 📄 License

本项目仅供学习交流使用，请勿用于商业用途。《崩坏：星穹铁道》及相关角色版权归 miHoYo 所有。