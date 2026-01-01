
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const esbuild = require('esbuild');

const app = express();
const PORT = process.env.PORT || 3003;
const STORAGE_ROOT = path.join(__dirname, 'storage');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch (err) {
      console.error(`❌ Folder error:`, err);
    }
  }
};
ensureDir(STORAGE_ROOT);

app.use(cors());
app.use(express.json());

const publicPath = __dirname;

// 即时转译中间件 (V1.3)
app.use((req, res, next) => {
  const urlPath = req.path;
  const ext = path.extname(urlPath);

  if (ext === '.tsx' || ext === '.ts') {
    const filePath = path.join(publicPath, urlPath);
    
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const result = esbuild.transformSync(content, {
          loader: ext === '.ts' ? 'ts' : 'tsx',
          format: 'esm',
          target: 'es2020',
          jsx: 'transform',
          define: {
            'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
          }
        });

        // 关键：禁用缓存，确保修改立即生效
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.send(result.code);
      } catch (err) {
        console.error(`[Transpiler] ❌ Error: ${urlPath}`, err.message);
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.status(500).send(`console.error("Transpile Error: ${err.message.replace(/"/g, '\\"')}");`);
      }
    }
  }
  next();
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const targetDir = path.join(STORAGE_ROOT, req.body.pathPrefix || 'img');
    ensureDir(targetDir);
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    cb(null, req.body.slug || (Date.now() + '-' + file.originalname));
  }
});

const upload = multer({ storage });

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({
    message: 'Success',
    file: { path: req.file.path.replace(STORAGE_ROOT, ''), filename: req.file.filename }
  });
});

app.use('/storage', express.static(STORAGE_ROOT));
app.use(express.static(publicPath));

app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Not Found');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LuminaDrive Backend v1.3 | Port ${PORT}`);
});
