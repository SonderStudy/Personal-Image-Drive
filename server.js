
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const esbuild = require('esbuild');

const app = express();
const PORT = process.env.PORT || 3003;
const STORAGE_ROOT = path.join(__dirname, 'storage');

// 1. 目录准备
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

const publicPath = fs.existsSync(path.join(__dirname, 'public')) 
  ? path.join(__dirname, 'public') 
  : __dirname;

// 2. [关键] 即时转译中间件：拦截 .tsx 和 .ts 请求
app.get(['*.tsx', '*.ts'], (req, res, next) => {
  const filePath = path.join(publicPath, req.path);
  
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 使用 esbuild 在内存中瞬间完成转译
      const result = esbuild.transformSync(content, {
        loader: req.path.endsWith('.ts') ? 'ts' : 'tsx',
        format: 'esm',
        target: 'es2020',
        // 自动注入 API_KEY 环境变量到前端
        define: {
          'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
        }
      });

      res.set('Content-Type', 'application/javascript');
      res.send(result.code);
    } catch (err) {
      console.error(`❌ Transpile error (${req.path}):`, err.message);
      res.status(500).send(`Transpile Error: ${err.message}`);
    }
  } else {
    next();
  }
});

// 3. 上传逻辑
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

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({
    message: 'Success',
    file: {
      path: req.file.path.replace(STORAGE_ROOT, ''),
      filename: req.file.filename
    }
  });
});

// 4. 静态资源服务
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
  console.log(`🚀 Server on http://localhost:${PORT} with dynamic TSX support`);
});
