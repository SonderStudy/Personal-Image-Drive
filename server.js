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

// TSX 转译中间件 (适配您的开发环境)
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
        return res.status(500).send(e.message);
      }
    }
  }
  next();
});

// 配置 Multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 获取前端传来的路径前缀
    const pathPrefix = req.body.pathPrefix || 'uploads';
    const targetDir = path.join(STORAGE_ROOT, pathPrefix);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    // 获取前端传来的文件名 (Slug)
    const slug = req.body.slug;
    const ext = path.extname(file.originalname);
    const finalName = slug ? (slug.endsWith(ext) ? slug : slug + ext) : (Date.now() + ext);
    cb(null, finalName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 限制 10MB
});

// 上传接口
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '上传失败' });

  // 构造可访问的相对 URL
  const relativePath = req.file.path.replace(STORAGE_ROOT, '').replace(/\\/g, '/');
  const publicUrl = `/storage${relativePath}`;

  res.json({
    success: true,
    url: publicUrl,
    path: relativePath
  });
});

// 静态资源服务
app.use('/storage', express.static(STORAGE_ROOT));
app.use(express.static(__dirname));

// SPA 路由支持
app.get('*', (req, res) => {
  if (req.path.includes('.')) return res.status(404).end();
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 LuminaDrive Server running at http://localhost:${PORT}`);
});