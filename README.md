
# LuminaDrive - 个人专属智能图床

LuminaDrive 是一款为高级开发者设计的个人图床前端应用。它集成了 Gemini AI 视觉分析功能，支持自定义域名、多级目录结构和个性化 URL Slug。

## 🌟 核心特性

- **多级目录支持**：自由定义存储路径，如 `img/2025/vacation`。
- **AI 智能标签**：自动分析图片内容，生成标题、描述和 SEO 标签。
- **自定义 URL Slug**：不再使用随机字符串，支持手动指定易于记忆的文件名。
- **一键提取**：直接生成直连链接与 Markdown 引用代码。
- **响应式设计**：深色模式 UI，完美适配移动端与桌面端。

## 🛠️ 技术栈

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **AI**: Google Gemini 3 Flash (Multi-modal)
- **Deployment**: 适配 VPS + Nginx 环境

## 🚀 部署到 VPS

### 1. 环境准备
确保您的 VPS 已安装：
- **Node.js** (v18+)
- **Nginx** (用于反向代理和静态资源服务)

### 2. 构建前端
在本地或服务器执行构建：
```bash
# 安装依赖 (建议使用 npm 或 yarn)
npm install

# 编译项目
npm run build
```

### 3. 配置 Nginx
为了让自定义路径（如 `pic.wildsalt.me/img/2025/xxx`）生效，您需要配置 Nginx 静态服务。

```nginx
server {
    listen 80;
    server_name pic.wildsalt.me;

    # 图床文件实际存储路径
    root /var/www/lumina-drive/storage;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 允许上传大文件
    client_max_body_size 20M;

    # 设置缓存
    location ~* \.(jpg|jpeg|png|gif|webp)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

## 📝 开发者备注

本项目目前主要实现前端逻辑与 URL 生成引擎。对于 VPS 上的持久化存储，您需要配合一个简单的后端 API（如 Express.js）来接收上传的 Buffer 并将其写入磁盘。

### 后端文件夹自动创建示例 (Node.js):
```javascript
const fs = require('fs');
const path = require('path');

function saveImage(buffer, pathPrefix, slug) {
    const fullPath = path.join(__dirname, 'storage', pathPrefix);
    // 自动创建多级文件夹
    if (!fs.existsSync(fullPath)){
        fs.mkdirSync(fullPath, { recursive: true });
    }
    fs.writeFileSync(path.join(fullPath, slug), buffer);
}
```

## 📄 许可证
MIT
