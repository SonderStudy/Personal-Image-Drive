const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const esbuild = require('esbuild');

const app = express();
const PORT = 3003;
const STORAGE_ROOT = path.join(__dirname, 'storage');

// 确保存储根目录存在
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

app.use(cors());
app.use(express.json());

// --- 1. 核心 API 路由 ---

const sanitizePath = (p) => p.replace(/\.\./g, '').replace(/[\\:]/g, '/').replace(/\/+/g, '/').replace(/^\//, '');

// 安全策略：允许的图片格式白名单
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        const relativePath = fullPath.replace(STORAGE_ROOT, '').replace(/\\/g, '/');
        arrayOfFiles.push({
          name: file,
          path: relativePath,
          url: `/storage${relativePath}`,
          mtime: fs.statSync(fullPath).mtimeMs
        });
      }
    }
  });
  return arrayOfFiles;
}

app.get('/api/files', (req, res) => {
  try {
    const files = getAllFiles(STORAGE_ROOT);
    files.sort((a, b) => b.mtime - a.mtime);
    res.setHeader('Content-Type', 'application/json');
    return res.json({ success: true, files });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const safePrefix = sanitizePath(req.body.pathPrefix || 'uploads');
    const targetDir = path.join(STORAGE_ROOT, safePrefix);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const finalName = req.body.slug 
      ? (req.body.slug.endsWith(ext) ? sanitizePath(req.body.slug) : sanitizePath(req.body.slug) + ext)
      : (Date.now() + ext);
    cb(null, finalName);
  }
});

// Multer 文件过滤器：严格控制上传类型
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);

  if (isAllowedMime && isAllowedExt) {
    cb(null, true);
  } else {
    cb(new Error(`非法文件类型。仅支持: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// 上传路由增加错误捕获中间件
app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer 内部错误（如文件过大）
      return res.status(400).json({ success: false, error: `上传限制: ${err.message}` });
    } else if (err) {
      // 自定义错误（如文件类型不符）
      return res.status(400).json({ success: false, error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: '未接收到有效文件' });
    }

    const relativePath = req.file.path.replace(STORAGE_ROOT, '').replace(/\\/g, '/');
    return res.json({
      success: true,
      url: `/storage${relativePath}`,
      path: relativePath,
      filename: req.file.filename
    });
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// --- 2. 静态资源与转换中间件 ---

app.use('/storage', express.static(STORAGE_ROOT));

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
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.send(result.code);
      } catch (e) {
        console.error('Transpilation Error:', e);
        return res.status(500).send(`Transpilation Error: ${e.message}`);
      }
    }
  }
  next();
});

app.use(express.static(__dirname));

// --- 3. SPA 路由兜底 ---

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
  if (req.path.includes('.')) return res.status(404).end();
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LuminaDrive v3.5.2 [Secure] is running at http://0.0.0.0:${PORT}`);
});