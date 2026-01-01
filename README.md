# WildSaltDrive 部署手册 (V4.2 增强版)

### 🔐 如何修改访问密码？
应用默认密码为 `WildSalt2025`。建议通过以下方式修改：

#### 方法 A：使用 .env 文件 (推荐)
1. 在项目根目录创建文件 `.env`。
2. 写入内容：`AUTH_KEY=你的新密码`
3. **使配置生效**：
   - **方案 1 (Node.js 20.6+ 内置支持)**:
     ```bash
     pm2 start server.js --name lumina --node-args="--env-file=.env"
     ```
   - **方案 2 (通用方式，手动指定并保存)**:
     ```bash
     AUTH_KEY="你的新密码" pm2 restart lumina --update-env
     pm2 save
     ```

#### 方法 B：直接通过 PM2 环境变量启动
如果你不想创建文件，直接运行：
```bash
AUTH_KEY="你的私密密钥" pm2 start server.js --name lumina --save
```

### 📦 常用 PM2 命令
- **查看运行状态**：`pm2 status`
- **查看实时日志**（查看是否使用了默认密码）：`pm2 logs lumina`
- **停止应用**：`pm2 stop lumina`
- **重启并刷新环境**：`pm2 restart lumina --update-env`

### 🛠 常见问题排查
1. **密码没生效**：PM2 会缓存第一次启动时的环境变量。修改 `.env` 后，必须使用 `--update-env` 参数重启，或者 `pm2 delete lumina` 后重新 `start`。
2. **无法复制直链**：确保你的域名已开启 HTTPS。浏览器出于安全考虑，只允许在安全环境下访问剪贴板。
3. **文件权限**：确保存储目录可读写 `chmod -R 755 storage`。

### 📁 开发者提示
默认端口为 `3003`，如需修改请在 `server.js` 中调整。