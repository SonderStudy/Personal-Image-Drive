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
      console.error(`❌ Dir Error:`, err);
    }
  }
};
ensureDir(STORAGE_ROOT);

app.use(cors());
app.use(express.json());

const publicPath = path.resolve(__dirname);

// V1.6 终极转译拦截器
app.use((req, res, next) => {
  // 获取不带查询参数的路径
  const requestPath = req.path;
  const ext = path.extname(requestPath);

  if (ext === '.tsx' || ext === '.ts') {
    // 立即锁定 MIME 类型，防止被后续任何逻辑覆盖
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    const relativePath = requestPath.startsWith('/') ? requestPath.slice(1) : requestPath;
    const filePath = path.join(publicPath, relativePath);

    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const result = esbuild.transformSync(content, {
          loader: ext === '.ts' ? 'ts' : 'tsx',
          format: 'esm',
          target: 'es2020',
          jsx: 'transform',
          minify: false,
          define: {
            'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
          }
        });
        console.log(`[JS-TRANSPILE] ✅ ${requestPath}`);
        return res.send(result.code);
      } catch (err) {
        console.error(`[JS-TRANSPILE] ❌ Error in ${requestPath}:`, err.message);
        return res.status(200).send(`console.error("Compile Error in ${requestPath}: ${err.message.replace(/"/g, "'")}");`);
      }
    } else {
      console.error(`[JS-TRANSPILE] ❌ Not Found: ${filePath}`);
      return res.status(200).send(`console.error("File not found: ${requestPath}");`);
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
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const relativePath = req.file.path.replace(STORAGE_ROOT, '').replace(/\\/g, '/');
  res.json({
    message: 'Success',
    file: { path: relativePath, url: `/storage${relativePath}` }
  });
});

app.use('/storage', express.static(STORAGE_ROOT));
app.use(express.static(publicPath));

// 终极 HTML 回落逻辑
app.get('*', (req, res) => {
  // 如果请求的是静态资源后缀，绝不返回 HTML
  if (req.path.includes('.') && !req.path.endsWith('.html')) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 LuminaDrive V1.6 | Port: ${PORT}`);
});