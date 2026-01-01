
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const STORAGE_ROOT = path.join(__dirname, 'storage');

// 1. 确保基础存储目录存在
try {
  if (!fs.existsSync(STORAGE_ROOT)) {
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
    console.log('✅ Created storage root at:', STORAGE_ROOT);
  }
} catch (e) {
  console.error('❌ Failed to create storage root. Check permissions!', e);
}

app.use(cors());
app.use(express.json());

// 2. Multer 配置：处理多级目录自动创建
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const pathPrefix = req.body.pathPrefix || 'uploads';
    const targetDir = path.join(STORAGE_ROOT, pathPrefix);
    
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log(`📂 Auto-created folder: ${targetDir}`);
      }
      cb(null, targetDir);
    } catch (err) {
      console.error('❌ Directory creation failed:', err);
      cb(new Error(`Failed to create directory: ${err.message}`));
    }
  },
  filename: function (req, file, cb) {
    const slug = req.body.slug || (Date.now() + '-' + file.originalname);
    cb(null, slug);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// 3. API 路由
app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, function (err) {
    if (err) {
      console.error('❌ Multer Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({
      message: 'Upload successful',
      file: {
        path: req.file.path.replace(STORAGE_ROOT, ''),
        filename: req.file.filename
      }
    });
  });
});

// 4. 静态资源服务 (图片查看)
app.use('/storage', express.static(STORAGE_ROOT));

// 5. 增强的静态页面服务
// 兼容性处理：如果 public 文件夹不存在，则尝试在根目录寻找
const PUBLIC_PATHS = [
  path.join(__dirname, 'public'),
  __dirname // 尝试直接在根目录查找 index.html
];

let served = false;
for (const p of PUBLIC_PATHS) {
  if (fs.existsSync(path.join(p, 'index.html'))) {
    console.log(`🌐 Serving frontend from: ${p}`);
    app.use(express.static(p));
    app.get('*', (req, res) => res.sendFile(path.join(p, 'index.html')));
    served = true;
    break;
  }
}

if (!served) {
  console.warn('⚠️ Warning: No index.html found. Frontend might not load via Node.');
}

// 6. 全局错误捕获
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

// 7. 启动并处理端口冲突提示
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 LuminaDrive Backend started!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📂 Storage: ${STORAGE_ROOT}\n`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: Port ${PORT} is already occupied!`);
    console.error(`💡 FIX: Run 'fuser -k ${PORT}/tcp' to free up the port, then try again.\n`);
    process.exit(1);
  }
});
