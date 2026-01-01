const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const esbuild = require('esbuild');

const app = express();
const PORT = 3003;
const STORAGE_ROOT = path.join(__dirname, 'storage');

// 1. 核心目录与权限检查
try {
  if (!fs.existsSync(STORAGE_ROOT)) {
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
    console.log('✅ Created storage directory:', STORAGE_ROOT);
  }
} catch (err) {
  console.error('❌ Failed to create storage directory. Check permissions:', err.message);
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// 2. 运行时 TSX 转译中间件
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
        console.error('TSX Transpilation Error:', e.message);
        return res.status(500).send(`Transpilation Error: ${e.message}`);
      }
    }
  }
  next();
});

// 3. 安全路径处理
const sanitizePath = (p) => p.replace(/\.\./g, '').replace(/[\\:]/g, '/').replace(/\/+/g, '/').replace(/^\//, '');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const safePrefix = sanitizePath(req.body.pathPrefix || 'uploads');
    const targetDir = path.join(STORAGE_ROOT, safePrefix);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const finalName = req.body.slug 
      ? (req.body.slug.endsWith(ext) ? sanitizePath(req.body.slug) : sanitizePath(req.body.slug) + ext)
      : (Date.now() + ext);
    cb(null, finalName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } 
});

// 4. API 路由
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'File not received' });
  const relativePath = req.file.path.replace(STORAGE_ROOT, '').replace(/\\/g, '/');
  res.json({
    success: true,
    url: `/storage${relativePath}`,
    path: relativePath,
    filename: req.file.filename
  });
});

// 健康检查接口（用于排查 502）
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// 5. 静态服务
app.use('/storage', express.static(STORAGE_ROOT));
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  if (req.path.includes('.')) return res.status(404).end();
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 6. 异常处理与启动
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🌐 LuminaDrive Server is RUNNING
  -----------------------------------
  Port:    ${PORT}
  Storage: ${STORAGE_ROOT}
  Health:  http://localhost:${PORT}/api/health
  -----------------------------------
  `);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please kill the other process.`);
  } else {
    console.error('❌ Server failed to start:', err.message);
  }
  process.exit(1);
});