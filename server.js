const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const esbuild = require('esbuild');

const app = express();
const PORT = 3003;
const STORAGE_ROOT = path.join(__dirname, 'storage');

// 确保基础目录存在
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

app.use(cors());
app.use(express.json());

// 实时转译 TSX (生产环境下建议预编译，但为了保持您的架构灵活性，此处保留高性能转译)
app.use((req, res, next) => {
  if (req.path.endsWith('.tsx') || req.path.endsWith('.ts')) {
    const filePath = path.join(__dirname, req.path);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const result = esbuild.transformSync(content, {
          loader: req.path.endsWith('.tsx') ? 'tsx' : 'ts',
          format: 'esm',
          target: 'es2020',
          jsx: 'transform'
        });
        res.setHeader('Content-Type', 'application/javascript');
        return res.send(result.code);
      } catch (e) {
        return res.status(500).send(`Transpilation Error: ${e.message}`);
      }
    }
  }
  next();
});

// 安全路径处理函数
const sanitizePath = (p) => p.replace(/\.\./g, '').replace(/[\\:]/g, '/').replace(/\/+/g, '/').replace(/^\//, '');

// 配置 Multer 磁盘存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const rawPrefix = req.body.pathPrefix || 'uploads';
    const safePrefix = sanitizePath(rawPrefix);
    const targetDir = path.join(STORAGE_ROOT, safePrefix);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const rawSlug = req.body.slug;
    const ext = path.extname(file.originalname);
    // 如果没有指定 slug，使用时间戳
    const finalName = rawSlug 
      ? (rawSlug.endsWith(ext) ? sanitizePath(rawSlug) : sanitizePath(rawSlug) + ext)
      : (Date.now() + ext);
    cb(null, finalName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB 限制
});

// 1. 上传接口
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: '未接收到文件' });

  // 物理存储路径转为网络访问路径
  const relativePath = req.file.path.replace(STORAGE_ROOT, '').replace(/\\/g, '/');
  const publicUrl = `/storage${relativePath}`;

  res.json({
    success: true,
    url: publicUrl,
    path: relativePath,
    filename: req.file.filename
  });
});

// 2. 静态资源转发 (Node 端备份，生产环境建议由 Nginx 处理)
app.use('/storage', express.static(STORAGE_ROOT));
app.use(express.static(__dirname));

// 3. SPA 路由回退
app.get('*', (req, res) => {
  if (req.path.includes('.')) return res.status(404).end();
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🚀 LuminaDrive 核心已启动
  ---------------------------------
  端口: ${PORT}
  存储: ${STORAGE_ROOT}
  模式: 生产环境部署
  ---------------------------------
  `);
});