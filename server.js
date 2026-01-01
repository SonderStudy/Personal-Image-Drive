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

// --- 核心工具函数 ---

const sanitizePath = (p) => p.replace(/\.\./g, '').replace(/[\\:]/g, '/').replace(/\/+/g, '/').replace(/^\//, '');

/**
 * 强力清洗文件名：只保留小写字母、数字和连字符，截断长度，收缩重复
 */
const cleanFileName = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  let baseName = path.basename(originalName, ext);

  // 1. 处理非 ASCII (如中文) 并替换特殊符号
  // 逻辑：将非 a-z0-9 的所有内容替换为 -
  let cleaned = baseName
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase()
    // 2. 收缩连续的 -
    .replace(/-+/g, '-')
    // 3. 去除首尾的 -
    .replace(/^-|-$/g, '');

  // 4. 如果清洗后为空 (比如全是中文)，降级为 asset
  if (!cleaned) cleaned = 'asset';

  // 5. 长度截断 (50个字符以内)
  return cleaned.substring(0, 50);
};

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
    const safeName = cleanFileName(file.originalname);
    // 批量上传通过 时间戳+随机数 彻底解决冲突
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E4);
    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
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

// 单文件上传路由
app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: '未接收到文件' });

    // 处理 Slug 自定义逻辑
    let finalPath = req.file.path;
    let finalName = req.file.filename;

    if (req.body.slug) {
      const ext = path.extname(req.file.path);
      // 对用户输入的 slug 也进行一次清洗，防止恶意输入
      const cleanSlug = cleanFileName(req.body.slug);
      const newName = cleanSlug + ext;
      const newPath = path.join(path.dirname(req.file.path), newName);
      try {
        if (fs.existsSync(newPath)) {
            // 如果别名冲突，自动加时间戳
            const conflictName = `${cleanSlug}-${Date.now()}${ext}`;
            const conflictPath = path.join(path.dirname(req.file.path), conflictName);
            fs.renameSync(req.file.path, conflictPath);
            finalPath = conflictPath;
            finalName = conflictName;
        } else {
            fs.renameSync(req.file.path, newPath);
            finalPath = newPath;
            finalName = newName;
        }
      } catch (e) {
        console.error("Rename error", e);
      }
    }

    const relativePath = finalPath.replace(STORAGE_ROOT, '').replace(/\\/g, '/');
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

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 LuminaDrive v3.7.0 [Smart Filename] on ${PORT}`));