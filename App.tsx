import React, { useState, useEffect } from 'react';

interface ImageData {
  id: string;
  name: string;
  url: string;
  path: string;
  createdAt: number;
}

export default function App() {
  const [history, setHistory] = useState<ImageData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [prefix, setPrefix] = useState('img/blog');
  const [slug, setSlug] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // 初始化加载历史
  useEffect(() => {
    const saved = localStorage.getItem('lumina_v3_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      // 自动提取合理的文件名别名
      const safeName = file.name.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
      setSlug(safeName);
    }
  };

  const onUpload = async () => {
    if (!selectedFile || uploading) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('pathPrefix', prefix);
    formData.append('slug', slug);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        const newImage: ImageData = {
          id: Math.random().toString(36).substr(2, 9),
          name: result.filename,
          url: result.url,
          path: result.path,
          createdAt: Date.now()
        };

        const newHistory = [newImage, ...history];
        setHistory(newHistory);
        localStorage.setItem('lumina_v3_history', JSON.stringify(newHistory));
        
        // 状态重置
        setSelectedFile(null);
        setPreview(null);
        setSlug('');
      } else {
        alert('上传失败: ' + (result.error || '未知错误'));
      }
    } catch (err) {
      console.error('Upload Error:', err);
      alert('无法连接到 VPS 后端服务，请检查 3003 端口是否开放');
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (urlPath: string) => {
    const fullUrl = window.location.origin + urlPath;
    navigator.clipboard.writeText(fullUrl);
    // 简单的成功反馈，不打断用户
    const btn = event?.currentTarget as HTMLElement;
    const originalText = btn.innerText;
    btn.innerText = '已复制!';
    setTimeout(() => { btn.innerText = originalText; }, 1500);
  };

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto flex flex-col gap-10">
      {/* 顶部导航 */}
      <nav className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-8 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-black tracking-tighter gradient-text">LuminaDrive</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">VPS Cloud Storage Active</span>
          </div>
        </div>
        <div className="flex gap-2">
           <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-[10px] text-slate-400 font-mono">
             ENDPOINT: {window.location.host}/api/upload
           </div>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* 左侧：上传控制器 */}
        <section className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-[2rem] p-8 shadow-2xl border border-white/5">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-3">
              <span className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400 italic font-serif">i</span>
              资源入库
            </h2>

            {/* 文件选择器 */}
            <div 
              onClick={() => document.getElementById('file-input')?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFileSelect({ target: { files: [file] } } as any);
              }}
              className="group relative aspect-[4/3] rounded-3xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden bg-slate-950/50 flex items-center justify-center"
            >
              {preview ? (
                <img src={preview} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              ) : (
                <div className="text-center p-6">
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/10 transition-colors">
                    <svg className="w-8 h-8 text-slate-600 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  </div>
                  <p className="text-slate-400 text-sm font-medium">点击或拖拽图片</p>
                  <p className="text-slate-600 text-[10px] mt-2 uppercase">Max size: 50MB</p>
                </div>
              )}
              <input id="file-input" type="file" className="hidden" onChange={handleFileSelect} accept="image/*" />
            </div>

            {/* 路径参数 */}
            <div className="mt-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">路径前缀 (Path Prefix)</label>
                <input 
                  type="text" 
                  value={prefix} 
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 ring-blue-500/10 outline-none transition-all font-mono"
                  placeholder="e.g. static/assets"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">资源别名 (Slug)</label>
                <input 
                  type="text" 
                  value={slug} 
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 ring-blue-500/10 outline-none transition-all font-mono"
                  placeholder="e.g. my-awesome-photo"
                />
              </div>
            </div>

            {/* 预览映射 */}
            <div className="mt-6 p-4 bg-slate-950 rounded-2xl border border-white/5">
              <span className="text-[10px] text-blue-500 font-bold uppercase">映射地址预览</span>
              <p className="text-xs text-slate-500 font-mono mt-1 break-all">
                /{prefix}/{slug || 'name'}.{selectedFile?.name.split('.').pop() || 'jpg'}
              </p>
            </div>

            <button 
              disabled={!selectedFile || uploading}
              onClick={onUpload}
              className="w-full mt-8 py-4.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/10 transition-all disabled:opacity-30 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  磁盘写入中...
                </>
              ) : '立即同步到 VPS'}
            </button>
          </div>
        </section>

        {/* 右侧：云端资源列表 */}
        <section className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              云端存储库
            </h2>
            <div className="px-3 py-1 bg-slate-900 rounded-full border border-slate-800 text-[10px] text-slate-500">
              {history.length} ITEMS
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
            {history.length === 0 && (
              <div className="col-span-2 py-20 text-center glass-panel rounded-3xl border-dashed">
                <p className="text-slate-600 text-sm">暂无云端数据，开始上传您的第一张图片</p>
              </div>
            )}
            {history.map(item => (
              <div key={item.id} className="glass-panel p-4 rounded-3xl group hover:border-blue-500/30 transition-all shadow-sm">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 mb-4">
                  <img src={item.url} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                    <button 
                      onClick={() => window.open(item.url, '_blank')}
                      className="p-3 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-md"
                      title="在新窗口查看"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="px-1">
                    <h3 className="text-sm font-bold text-slate-200 truncate">{item.name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{item.path}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => copyToClipboard(item.url)}
                      className="text-[10px] font-bold py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
                    >
                      复制原链
                    </button>
                    <button 
                      onClick={() => copyToClipboard(`![${item.name}](${window.location.origin}${item.url})`)}
                      className="text-[10px] font-bold py-2.5 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 rounded-xl transition-all"
                    >
                      Markdown
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}