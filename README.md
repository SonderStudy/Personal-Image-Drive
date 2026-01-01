# LuminaDrive 部署手册 (V3 生产修复版)

### 📦 第一步：环境准备
确保您的 VPS 已安装 Node.js (v16+) 和 PM2。

1. **上传代码**到 VPS 目录（例如 `/var/www/lumina`）。
2. **安装依赖** (这步最重要)：
   ```bash
   npm install
   ```

### 🚀 第二步：启动应用
使用 PM2 管理进程，确保崩溃自动重启：
```bash
pm2 start server.js --name lumina
pm2 save
```

### 🛠 第三步：排查 502 错误
如果您看到 502，请按顺序执行：

1. **检查应用状态**：
   ```bash
   pm2 status
   ```
   如果状态不是 `online`，查看日志：`pm2 logs lumina`。

2. **本地连通性测试**：
   在 VPS 终端执行：
   ```bash
   curl http://127.0.0.1:3003/api/health
   ```
   如果返回 `{"status":"ok"}`，说明 Node 应用正常，问题在 Nginx。

3. **Nginx 配置修复**：
   请确保 `proxy_pass` 指向的端口与 `server.js` 一致（默认 3003）。
   ```nginx
   server {
       listen 80;
       server_name 您的域名;

       location / {
           proxy_pass http://127.0.0.1:3003;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # 建议 Nginx 直接处理静态文件
       location /storage/ {
           alias /var/www/lumina/storage/; # 改为您代码的实际绝对路径
           expires 30d;
       }
   }
   ```

### 📁 权限说明
如果上传失败，请执行：
```bash
sudo chown -R www-data:www-data /var/www/lumina/storage
chmod -R 755 /var/www/lumina/storage
```