
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const esbuild = require('esbuild');

const app = express();
const PORT = process.env.PORT || 3003;
const STORAGE_ROOT = path.join(__dirname, 'storage');

// 1. Directory Setup
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

// 2. [REFINED] Robust Transpilation Middleware
// This intercepts any .tsx or .ts requests and compiles them to JS on the fly
app.use((req, res, next) => {
  const ext = path.extname(req.path);
  if (ext === '.tsx' || ext === '.ts') {
    const filePath = path.join(publicPath, req.path);
    
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Use esbuild for high-speed transpilation
        const result = esbuild.transformSync(content, {
          loader: ext === '.ts' ? 'ts' : 'tsx',
          format: 'esm',
          target: 'es2020',
          jsx: 'react', // Explicitly handle JSX
          define: {
            'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
          }
        });

        // CRITICAL: Set the correct MIME type for ES Modules
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        return res.send(result.code);
      } catch (err) {
        console.error(`❌ Transpile error on ${req.path}:`, err);
        return res.status(500).send(`/* Transpile Error: ${err.message} */`);
      }
    }
  }
  next();
});

// 3. Upload Logic
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

// 4. Static and SPA routing
app.use('/storage', express.static(STORAGE_ROOT));
app.use(express.static(publicPath));

app.get('*', (req, res) => {
  // If request is not for a specific file, serve index.html for SPA support
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
  🚀 LuminaDrive Backend Active
  📍 URL: http://0.0.0.0:${PORT}
  🛠 Mode: On-the-fly TSX/TS Transpilation
  📂 Storage: ${STORAGE_ROOT}
  -------------------------------------------------------
  `);
});
