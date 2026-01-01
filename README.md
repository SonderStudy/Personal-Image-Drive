# LuminaDrive 部署手册 (V3.1 稳定版)

### 📦 快速部署
1. **安装环境**：`npm install`
2. **运行服务**：`pm2 start server.js --name lumina`

### 🛠 常见问题排查

#### 1. 点击复制按钮“跳转”或显示一堆文字
*   **原因**：这通常是因为浏览器禁用了 `navigator.clipboard`（通常发生在非 HTTPS 环境下），或者旧代码中的全局事件冲突。
*   **修复**：当前 V3.1 版本已增加显式事件传递和 `document.execCommand` 兼容性方案，请确保覆盖所有文件。

#### 2. Nginx 502 错误
*   执行 `pm2 logs lumina`。
*   如果提示 `EADDRINUSE`，说明 3003 端口被占用，请先 `fuser -k 3003/tcp`。
*   确保 Nginx `proxy_pass` 指向 `http://127.0.0.1:3003`。

#### 3. HTTPS 建议
*   剪贴板 API 在 HTTPS 下体验最佳。建议使用 `acme.sh` 或 `Certbot` 为域名申请证书。

### 📁 文件权限
```bash
# 确保 storage 目录可写
chmod -R 755 storage
```