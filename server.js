
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const STORAGE_ROOT = path.join(__dirname, 'storage');

// 确保存储根目录存在
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

app.use(cors());
app.use(express.json());

// 配置 Multer 存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 调试日志：检查字段是否在文件之前到达
    console.log('Receiving upload for pathPrefix:', req.body.pathPrefix);
    
    const pathPrefix = req.body.pathPrefix || 'uploads';
    const targetDir = path.join(STORAGE_ROOT, pathPrefix);
    
    try {
      if (!fs.existsSync(targetDir)) {
        console.log('Creating directory:', targetDir);
        fs.mkdirSync(targetDir, { recursive: true });
      }
      cb(null, targetDir);
    } catch (err) {
      console.error('Directory creation failed:', err);
      cb(err);
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

// 上传接口
app.post('/api/upload', (req, res, next) => {
  upload.single('image')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer Error:', err);
      return res.status(500).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      console.error('Unknown Error during upload:', err);
      return res.status(500).json({ error: `Internal error: ${err.message}` });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file found in request' });
    }

    console.log('Successfully saved:', req.file.path);
    res.json({
      message: 'Upload successful',
      file: {
        path: req.file.path.replace(STORAGE_ROOT, ''),
        filename: req.file.filename
      }
    });
  });
});

// 静态文件服务 - 用于查看已上传图片
app.use('/storage', express.static(STORAGE_ROOT));

// 静态文件服务 - 用于部署前端项目 (打包后的 dist 或 public)
const PUBLIC_DIR = path.join(__dirname, 'public');
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  app.get('*', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
}

// 全局错误捕获器
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  res.status(500).json({ error: 'Critical server error occurred' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`-------------------------------------------`);
  console.log(`LuminaDrive Backend is LIVE!`);
  console.log(`Port: ${PORT}`);
  console.log(`Storage: ${STORAGE_ROOT}`);
  console.log(`-------------------------------------------`);
});
