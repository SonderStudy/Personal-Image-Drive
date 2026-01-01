
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const STORAGE_ROOT = path.join(__dirname, 'storage');

app.use(cors());
app.use(express.json());

// 配置存储引擎
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 从请求体获取 pathPrefix (例如: img/2025/vacation)
    const pathPrefix = req.body.pathPrefix || 'uploads';
    const targetDir = path.join(STORAGE_ROOT, pathPrefix);
    
    // 自动建立对应的文件夹 (recursive: true 支持多级创建)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    // 使用用户定义的 slug 作为文件名，如果没有则保持原名
    const slug = req.body.slug || Date.now() + '-' + file.originalname;
    cb(null, slug);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 限制 20MB
});

// 上传接口
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // 返回成功信息及文件访问路径
  res.json({
    message: 'Upload successful',
    file: {
      path: req.file.path.replace(STORAGE_ROOT, ''),
      size: req.file.size,
      filename: req.file.filename
    }
  });
});

// 静态资源服务 (生产环境建议用 Nginx)
app.use('/storage', express.static(STORAGE_ROOT));

app.listen(PORT, () => {
  console.log(`LuminaDrive Backend running at http://localhost:${PORT}`);
  console.log(`Storage root: ${STORAGE_ROOT}`);
});
