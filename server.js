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

app.use('/storage', express.static(STORAGE_ROOT));
app.use(express.static(__dirname));

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

const sanitizePath = (p) => p.replace(/\.\./g, '').replace(/[\\:]/g, '/').replace(/\/+/g, '/').replace(/^\//, '');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 关键点：req.body 此时包含了在 file 之前 appended 的所有字段
    const safePrefix = sanitizePath(req.body.pathPrefix || 'uploads');
    const targetDir = path.join(STORAGE_ROOT, safePrefix);
    
    console.log(`[Upload] Path: ${safePrefix}, Target: ${targetDir}`);
    
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

app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.get('*', (req, res) => {
  if (req.path.includes('.')) return res.status(404).end();
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LuminaDrive v3.2 is running at http://localhost:${PORT}`);
});