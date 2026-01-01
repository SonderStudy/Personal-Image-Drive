
# LuminaDrive - 个人专属智能图床

## 🛠️ 部署与排错指南

### 1. 解决端口占用 (EADDRINUSE)
如果您看到 `address already in use` 错误，说明旧的进程没关掉：
```bash
# 查看哪个进程占用了 3001 端口
lsof -i :3001

# 直接强行杀死占用该端口的进程
fuser -k 3001/tcp
```

### 2. 文件夹权限
确保您的文件夹权限正确，否则 Node.js 无法创建子目录：
```bash
# 给予当前目录及其子目录读写权限
sudo chmod -R 777 /var/www/Personal-Image-Drive
```

### 3. Nginx 配置建议
如果您直接把文件放在 `/var/www/Personal-Image-Drive` 根目录（没有 `public` 文件夹），请修改 Nginx 配置：

```nginx
server {
    listen 80;
    server_name pic.wildsalt.me;

    # 1. 静态图片访问 (直接由 Nginx 处理)
    location /img/ {
        alias /var/www/Personal-Image-Drive/storage/img/;
        autoindex off;
        expires 30d;
    }

    # 2. 前端界面与 API 转发
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 50M; # 必须！否则大图上传会报 500
    }
}
```

### 4. 查看日志
如果依然 500，请查看 Node 后端的实时输出：
```bash
# 如果使用 PM2
pm2 logs lumina-drive

# 如果直接运行
node server.js
```
