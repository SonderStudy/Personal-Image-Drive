
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const STORAGE_ROOT = path.join(__dirname, 'storage');

// 1. 自动创建基础存储目录
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Folder created: ${dirPath}`);
    } catch (err) {
      console.error(`❌ Failed to create folder ${dirPath}:`, err);
    }
  }
};

ensureDir(STORAGE_ROOT);

app.use(cors());
app.use(express.json());

// 2. Multer 配置：处理自定义路径
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const pathPrefix = req.body.pathPrefix || 'img';
    const targetDir = path.join(STORAGE_ROOT, pathPrefix);
    
    // 动态创建用户定义的子目录
    ensureDir(targetDir);
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    // 使用用户定义的 slug 或原始文件名
    const slug = req.body.slug || (Date.now() + '-' + file.originalname);
    cb(null, slug);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// 3. API 路由
app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, function (err) {
    if (err) {
      console.error('❌ Upload Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file received' });
    }
    
    console.log(`📸 Image uploaded: ${req.file.filename} to ${req.file.destination}`);
    
    res.json({
      message: 'Success',
      file: {
        path: req.file.path.replace(STORAGE_ROOT, ''),
        filename: req.file.filename
      }
    });
  });
});

// 4. 静态图片服务
app.use('/storage', express.static(STORAGE_ROOT));

// 5. 前端静态文件服务 (兼容根目录或 public 目录)
const publicPath = fs.existsSync(path.join(__dirname, 'public')) 
  ? path.join(__dirname, 'public') 
  : __dirname;

app.use(express.static(publicPath));

// 处理 SPA 路由
app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend index.html not found. Check your file structure.');
  }
});

// 6. 启动服务
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  -----------------------------------------
  🚀 LuminaDrive Backend is Running!
  📍 Local: http://localhost:${PORT}
  📂 Storage: ${STORAGE_ROOT}
  -----------------------------------------
  `);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is busy.`);
    console.error(`💡 Solution: Run 'sudo fuser -k ${PORT}/tcp' to free the port.\n`);
    process.exit(1);
  }
});
