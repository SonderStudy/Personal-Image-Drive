
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const esbuild = require('esbuild');

const app = express();
const PORT = process.env.PORT || 3003;
const STORAGE_ROOT = path.join(__dirname, 'storage');

// 1. 目录初始化
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

// 确定源码根目录
const publicPath = __dirname;

// 2. 高可靠即时转译中间件
app.use((req, res, next) => {
  const urlPath = req.path;
  const ext = path.extname(urlPath);

  if (ext === '.tsx' || ext === '.ts') {
    const filePath = path.join(publicPath, urlPath);
    
    console.log(`[Transpiler] 🔍 处理请求: ${urlPath}`);

    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 【核心修复】jsx 选项改为 'transform'
        const result = esbuild.transformSync(content, {
          loader: ext === '.ts' ? 'ts' : 'tsx',
          format: 'esm',
          target: 'es2020',
          jsx: 'transform', 
          define: {
            'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
          }
        });

        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        console.log(`[Transpiler] ✅ 编译成功: ${urlPath}`);
        return res.send(result.code);
      } catch (err) {
        console.error(`[Transpiler] ❌ 编译失败 ${urlPath}:`, err.message);
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        // 将错误输出到浏览器控制台，方便调试
        return res.status(500).send(`console.error("LuminaDrive Transpile Error: ${err.message.replace(/"/g, '\\"')}");`);
      }
    }
  }
  next();
});

// 3. 上传接口
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
  console.log(`
  -------------------------------------------------------
  🚀 LuminaDrive 后端已就绪 (v1.2)
  🛠 模式: 修复了 esbuild 配置错误
  -------------------------------------------------------
  `);
});
