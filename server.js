
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
      console.error(`❌ Folder creation error:`, err);
    }
  }
};
ensureDir(STORAGE_ROOT);

app.use(cors());
app.use(express.json());

const publicPath = path.resolve(__dirname);

// 即时转译中间件 (V1.5 - 终极防御版)
app.use((req, res, next) => {
  const parsedPath = req.path;
  const ext = path.extname(parsedPath);

  if (ext === '.tsx' || ext === '.ts') {
    // 强制指定响应类型，防止任何情况下的 "text/html" 错误
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    const relativePath = parsedPath.startsWith('/') ? parsedPath.slice(1) : parsedPath;
    const filePath = path.join(publicPath, relativePath);
    
    console.log(`[Transpiler] 🔍 Request: ${parsedPath} -> Real: ${filePath}`);

    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const result = esbuild.transformSync(content, {
          loader: ext === '.ts' ? 'ts' : 'tsx',
          format: 'esm',
          target: 'es2020',
          jsx: 'transform',
          minify: false, // 调试阶段不压缩
          define: {
            'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
          }
        });

        console.log(`[Transpiler] ✅ Compiled Successfully: ${parsedPath}`);
        return res.send(result.code);
      } catch (err) {
        console.error(`[Transpiler] ❌ Syntax Error in ${parsedPath}:`, err.message);
        return res.status(500).send(`console.error("Transpile Error in ${parsedPath}: ${err.message.replace(/"/g, '\\"')}");`);
      }
    } else {
        console.error(`[Transpiler] ❌ File Not Found: ${filePath}`);
        // 关键：如果文件不存在，返回一个 404 的 JS 片段，而不是让它进入 index.html 通配符
        return res.status(404).send(`console.error("File not found: ${parsedPath}");`);
    }
  }
  next();
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = req.body.pathPrefix || 'img';
    const targetDir = path.join(STORAGE_ROOT, subDir);
    ensureDir(targetDir);
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    let slug = req.body.slug || (Date.now() + '-' + file.originalname);
    if (!path.extname(slug)) slug += ext;
    cb(null, slug);
  }
});

const upload = multer({ storage });

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const relativePath = req.file.path.replace(STORAGE_ROOT, '').replace(/\\/g, '/');
  res.json({
    message: 'Success',
    file: { 
      path: relativePath, 
      filename: req.file.filename,
      url: `/storage${relativePath}`
    }
  });
});

app.use('/storage', express.static(STORAGE_ROOT));
app.use(express.static(publicPath));

// 通配符路由仅服务于非静态资源的页面导航
app.get('*', (req, res) => {
  // 如果请求是寻找 .js/.tsx 但走到了这里，说明前面的中间件漏掉了
  if (req.path.includes('.')) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 LuminaDrive Backend v1.5`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`📂 Root: ${publicPath}`);
  console.log(`🖼 Storage: ${STORAGE_ROOT}\n`);
});
