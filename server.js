const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const esbuild = require('esbuild');

const app = express();
const PORT = 3003;
const STORAGE_ROOT = path.join(__dirname, 'storage');

if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

app.use(cors());
app.use(express.json());

const sanitizePath = (p) => p.replace(/\.\./g, '').replace(/[\\:]/g, '/').replace(/\/+/g, '/').replace(/^\//, '');
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
    // 批量上传时不使用单一 slug，使用原名基础上的时间戳化
    const baseName = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '-').toLowerCase();
    cb(null, `${baseName}-${Date.now()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
  if (isAllowedMime && isAllowedExt) {
    cb(null, true);
  } else {
    cb(new Error(`不支持文件类型: ${ext}`), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } 
});

// 单文件上传路由 (保留用于单选及 Slug 情况)
app.post('/api/upload', (req, res) => {
  // 单个文件可能需要 slug，这里特殊处理一下 storage 的 filename 是比较麻烦的，
  // 为了简单起见，我们直接复用 upload 逻辑，如果 body 带有 slug，就在这里重命名
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: '未接收到文件' });

    // 如果用户提供了 slug，我们在存储后重命名它（单文件专用）
    if (req.body.slug) {
      const ext = path.extname(req.file.path);
      const newName = req.body.slug.endsWith(ext) ? sanitizePath(req.body.slug) : sanitizePath(req.body.slug) + ext;
      const newPath = path.join(path.dirname(req.file.path), newName);
      try {
        fs.renameSync(req.file.path, newPath);
        req.file.path = newPath;
        req.file.filename = newName;
      } catch (e) {
        console.error("Rename error", e);
      }
    }

    const relativePath = req.file.path.replace(STORAGE_ROOT, '').replace(/\\/g, '/');
    return res.json({ success: true, url: `/storage${relativePath}` });
  });
});

// 批量上传路由
app.post('/api/upload-bulk', (req, res) => {
  upload.array('files', 20)(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, error: '未接收到文件' });

    const results = req.files.map(file => {
      const relativePath = file.path.replace(STORAGE_ROOT, '').replace(/\\/g, '/');
      return { url: `/storage${relativePath}`, name: file.originalname };
    });

    return res.json({ success: true, files: results });
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
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
        return res.status(500).send(e.message);
      }
    }
  }
  next();
});

app.use(express.static(__dirname));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ success: false });
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 LuminaDrive v3.6.0 [Bulk Support] on ${PORT}`));