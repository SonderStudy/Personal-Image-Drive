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
      const safeName = file.name.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
      setSlug(safeName);
    }
  };

  const onUpload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedFile || uploading) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('pathPrefix', prefix);
    formData.append('slug', slug);
    formData.append('file', selectedFile);

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
        
        setSelectedFile(null);
        setPreview(null);
        setSlug('');
      } else {
        alert('上传失败: ' + (result.error || '未知错误'));
      }
    } catch (err) {
      console.error('Upload Error:', err);
      alert('连接后端失败，请确认服务器 3003 端口已开放');
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = async (e: React.MouseEvent<HTMLButtonElement>, text: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const btn = e.currentTarget;
    const originalText = btn.innerText;
    
    // 修复逻辑：判断是否已经是完整 URL 或 Markdown 格式
    const isFullUrl = text.startsWith('http');
    const isMarkdown = text.startsWith('![');
    const finalCopyText = (isFullUrl || isMarkdown) ? text : (window.location.origin + text);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(finalCopyText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = finalCopyText;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      btn.innerText = '已复制 ✅';
      btn.classList.add('text-emerald-400', 'bg-emerald-500/10');
      setTimeout(() => {
        btn.innerText = originalText;
        btn.classList.remove('text-emerald-400', 'bg-emerald-500/10');
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto flex flex-col gap-10">
      <nav className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-8 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-black tracking-tighter gradient-text">LuminaDrive</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Cloud Node v3.2.2 Production</span>
          </div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2 text-[10px] text-slate-400 font-mono">
          ENDPOINT: {window.location.host}/api/upload
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-5">
          <div className="glass-panel rounded-[2.5rem] p-8 shadow-2xl border border-white/5">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-3">
              <span className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center font-serif">i</span>
              资源入库
            </h2>

            <div 
              onClick={() => document.getElementById('file-input')?.click()}
              className="group relative aspect-[4/3] rounded-[2rem] border-2 border-dashed border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden bg-slate-950/50 flex items-center justify-center"
            >
              {preview ? (
                <img src={preview} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              ) : (
                <div className="text-center p-6">
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/10 transition-colors text-slate-600 group-hover:text-blue-500">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  </div>
                  <p className="text-slate-400 text-sm font-medium">点击或拖拽图片</p>
                  <p className="text-slate-600 text-[10px] mt-2 uppercase font-bold tracking-tighter">MAX SIZE: 50MB</p>
                </div>
              )}
              <input id="file-input" type="file" className="hidden" onChange={handleFileSelect} accept="image/*" />
            </div>

            <div className="mt-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">路径前缀 (Path Prefix)</label>
                <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 ring-blue-500/10 outline-none transition-all font-mono" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">资源别名 (Slug)</label>
                <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 ring-blue-500/10 outline-none transition-all font-mono" />
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-950/50 rounded-2xl border border-white/5">
              <span className="text-[10px] text-blue-500 font-bold uppercase">映射预览</span>
              <p className="text-xs text-slate-500 font-mono mt-1 break-all">
                /{prefix}/{slug || 'name'}.{selectedFile?.name.split('.').pop() || 'jpg'}
              </p>
            </div>

            <button 
              type="button"
              disabled={!selectedFile || uploading}
              onClick={onUpload}
              className="w-full mt-8 py-4.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 transition-all disabled:opacity-30 active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {uploading ? '正在同步到云端...' : '立即同步到 VPS'}
            </button>
          </div>
        </section>

        <section className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2 italic">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              云端存储库
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto max-h-[750px] pr-2 custom-scrollbar">
            {history.length === 0 && (
              <div className="col-span-2 py-20 text-center glass-panel rounded-3xl border-dashed opacity-50">
                <p className="text-slate-500 text-sm">暂无云端数据</p>
              </div>
            )}
            {history.map(item => (
              <div key={item.id} className="glass-panel p-4 rounded-[2rem] group hover:border-blue-500/30 transition-all shadow-sm bg-slate-900/40">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 mb-4">
                  <img src={item.url} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                     <button type="button" onClick={() => window.open(item.url, '_blank')} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-md text-xs font-bold transition-all">新窗口打开</button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="px-1">
                    <h3 className="text-sm font-bold text-slate-200 truncate">{item.name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono truncate mt-1">{item.path}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={(e) => copyToClipboard(e, item.url)}
                      className="text-[10px] font-bold py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl transition-all border border-white/5"
                    >
                      复制原链
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => copyToClipboard(e, `![${item.name}](${window.location.origin}${item.url})`)}
                      className="text-[10px] font-bold py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-all border border-blue-500/10"
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