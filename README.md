# WildSaltDrive 部署手册 (V4.2 增强版)

### 🔐 如何修改访问密码？
应用默认密码为 `WildSalt2025`。强烈建议通过以下方式修改：

#### 方法 A：使用 .env 文件 (推荐)
1. 在项目根目录创建文件 `.env`。
2. 写入以下内容：
   ```env
   AUTH_KEY=你的私密密钥
   ```
3. 重新运行程序。Node.js 20.6.0+ 可以直接识别，或在启动命令中指定。

#### 方法 B：使用 PM2 (生产环境推荐)
如果你使用 PM2 部署，可以直接传递环境变量：
```bash
AUTH_KEY="你的私密密钥" pm2 start server.js --name wildsalt
```

### 📦 快速部署
1. **安装环境**：`npm install`
2. **运行服务**：`npm start`

### 🛠 常见问题排查
1. **无法复制直链**：确保你的域名已开启 HTTPS。浏览器出于安全考虑，只允许在安全环境下访问剪贴板。
2. **502 Bad Gateway**：检查端口 3003 是否被占用或防火墙是否放行。
3. **PWA 安装失败**：确保 manifest.json 和 sw.js 在根目录且能正常访问。

### 📁 文件权限
```bash
# 确保 storage 目录可写
chmod -R 755 storage
```