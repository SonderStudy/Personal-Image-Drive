
# LuminaDrive 部署与维护手册

### 🛠 故障排查 (500 Error / 端口占用)

如果服务无法启动或上传报错，请按以下步骤重置：

#### 第一步：清理进程
```bash
sudo fuser -k 3001/tcp
pm2 delete lumina-drive || true
```

#### 第二步：更新代码与权限
```bash
git pull
npm install
# 确保 Node.js 有权限写入存储目录
sudo chmod -R 777 /var/www/Personal-Image-Drive/storage
```

#### 第三步：启动并验证
```bash
pm2 start server.js --name lumina-drive
pm2 logs lumina-drive
```

### 🌍 Nginx 推荐配置
请确保 `/etc/nginx/sites-enabled/pic.wildsalt.me` 中的 `root` 指向正确：

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    client_max_body_size 50M; # 必须增加上传大小限制
}

location /img/ {
    alias /var/www/Personal-Image-Drive/storage/img/;
    expires 30d;
}
```
