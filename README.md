
# LuminaDrive - 个人专属智能图床

LuminaDrive 是一款为高级开发者设计的个人图床应用。它集成了 Gemini AI 视觉分析功能，支持自定义域名、多级目录结构和个性化 URL Slug。

## 🌟 核心特性

- **多级目录支持**：上传时通过 `pathPrefix` 自动在服务器创建文件夹，如 `img/2025/travel`。
- **AI 智能标签**：自动分析图片内容，生成标题、描述。
- **自定义 URL Slug**：支持手动指定文件名，URL 更美观。
- **VPS 友好**：配套 Node.js 后端，轻松部署在自建服务器。

## 🚀 VPS 部署步骤

### 1. 环境准备
确保您的 VPS 已安装 Node.js (v18+) 和 Nginx。

### 2. 部署后端 (API)
```bash
# 在 VPS 上创建目录
mkdir -p /var/www/lumina-drive
cd /var/www/lumina-drive

# 复制 server.js 和 package.json 到此处
npm install

# 启动后端 (建议使用 PM2 守护进程)
npm install -g pm2
pm2 start server.js --name "lumina-api"
```

### 3. 部署前端
将打包后的 `index.html`, `index.tsx`, `types.ts` 等文件放入 `/var/www/lumina-drive/public`。

### 4. Nginx 配置
这是实现自定义域名的关键。编辑 `/etc/nginx/sites-available/lumina`：

```nginx
server {
    listen 80;
    server_name pic.wildsalt.me;

    # 1. 静态资源 (图片查看)
    location /img/ {
        alias /var/www/lumina-drive/storage/img/;
        autoindex off;
        expires 30d;
    }

    # 2. 前端界面
    location / {
        root /var/www/lumina-drive/public;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 3. 后端 API 转发
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🛠️ 常见问题

**Q: 文件夹会自动建立吗？**
A: **是的**。后端程序使用 `fs.mkdirSync(..., { recursive: true })`。无论您输入多少级目录（如 `a/b/c/d`），系统都会在上传第一张图片时自动创建整个路径。

**Q: 如何修改上传限制？**
A: 修改 `server.js` 中的 `limits: { fileSize: ... }` 即可。
