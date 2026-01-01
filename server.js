
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

// 确定源码根目录（即当前 server.js 所在目录）
const publicPath = __dirname;

// 2. [核心修复] 高可靠即时转译中间件
// 该中间件必须在 express.static 之前运行
app.use((req, res, next) => {
  const urlPath = req.path;
  const ext = path.extname(urlPath);

  // 拦截所有 .tsx 和 .ts 请求
  if (ext === '.tsx' || ext === '.ts') {
    const filePath = path.join(publicPath, urlPath);
    
    // 打印调试日志，你可以通过 pm2 logs 查看是否命中
    console.log(`[Transpiler] 🔍 处理请求: ${urlPath} -> 物理路径: ${filePath}`);

    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 使用 esbuild 进行毫秒级转译
        const result = esbuild.transformSync(content, {
          loader: ext === '.ts' ? 'ts' : 'tsx',
          format: 'esm',
          target: 'es2020',
          jsx: 'react', // 使用 React.createElement 模式
          define: {
            'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
          }
        });

        // 关键：强制设置正确的 MIME 类型
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        console.log(`[Transpiler] ✅ 编译成功: ${urlPath}`);
        return res.send(result.code);
      } catch (err) {
        console.error(`[Transpiler] ❌ 编译失败 ${urlPath}:`, err.message);
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.status(500).send(`console.error("LuminaDrive Transpile Error: ${err.message.replace(/"/g, '\\"')}");`);
      }
    } else {
      console.warn(`[Transpiler] ⚠️ 文件不存在: ${filePath}`);
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

// 4. 静态资源与 SPA 路由
app.use('/storage', express.static(STORAGE_ROOT));
app.use(express.static(publicPath));

// 兜底返回 index.html (支持 SPA 刷新)
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
  🚀 LuminaDrive 后端已就绪 (v1.1)
  📍 访问地址: http://0.0.0.0:${PORT}
  🛠 实时转译模式: 已开启 (.tsx, .ts)
  📂 存储根目录: ${STORAGE_ROOT}
  -------------------------------------------------------
  `);
});
