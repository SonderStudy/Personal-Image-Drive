# LuminaDrive 部署与维护手册 (V3 生产版)

### 🚀 快速启动
1. **安装依赖**
   ```bash
   npm install express multer cors esbuild
   ```
2. **权限配置 (关键)**
   确保 VPS 上的 Node.js 进程有权创建文件夹：
   ```bash
   mkdir storage
   chmod -R 755 storage
   ```
3. **启动服务**
   ```bash
   pm2 start server.js --name lumina
   ```

### 🌍 Nginx 优化配置
为了极致的加载速度，建议让 Nginx 直接处理 `/storage` 路径，绕过 Node.js：

```nginx
server {
    listen 80;
    server_name pic.yourdomain.com;

    # 后端 API 转发
    location /api/ {
        proxy_pass http://127.0.0.1:3003;
        client_max_body_size 50M;
    }

    # 静态图片由 Nginx 直接读取 (性能最高)
    location /storage/ {
        alias /var/www/Personal-Image-Drive/storage/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # 前端页面转发
    location / {
        proxy_pass http://127.0.0.1:3003;
    }
}
```

### 📦 备份建议
定期备份 `storage/` 文件夹即可迁移所有图片。由于历史记录存储在浏览器的 `localStorage` 中，建议在需要多端同步时，手动导出存储的 JSON。