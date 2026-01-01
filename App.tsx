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
      setSlug(file.name.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '-'));
    }
  };

  const onUpload = async () => {
    if (!selectedFile) return;
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
          name: slug || selectedFile.name,
          url: result.url, // 这里的 URL 是服务器返回的 /storage/...
          path: result.path,
          createdAt: Date.now()
        };

        const newHistory = [newImage, ...history];
        setHistory(newHistory);
        localStorage.setItem('lumina_v3_history', JSON.stringify(newHistory));
        
        // 重置状态
        setSelectedFile(null);
        setPreview(null);
        setSlug('');
        alert('上传成功！');
      } else {
        alert('上传失败: ' + result.error);
      }
    } catch (err) {
      console.error('Upload Error:', err);
      alert('服务器连接失败，请检查后端服务是否启动');
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    const fullUrl = window.location.origin + text;
    navigator.clipboard.writeText(fullUrl);
    alert('链接已复制: ' + fullUrl);
  };

  return (
    <div className="min-h-screen p-4 md:p-10 max-w-7xl mx-auto">
      <header className="flex justify-between items-center mb-12 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold gradient-text tracking-tight">LuminaDrive</h1>
          <p className="text-slate-500 text-sm mt-1">VPS 专用持久化图床</p>
        </div>
        <div className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          SERVER ONLINE
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-5">
          <div className="glass-panel rounded-3xl p-8 space-y-6 shadow-2xl sticky top-10">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
              发布新资源
            </h2>
            
            <div 
              onClick={() => document.getElementById('file-input')?.click()}
              className="relative aspect-video rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center bg-slate-900/40 group"
            >
              {preview ? (
                <img src={preview} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  </div>
                  <span className="text-slate-500 text-sm font-medium">点击或拖拽上传图片</span>
                </div>
              )}
              <input id="file-input" type="file" className="hidden" onChange={handleFileSelect} accept="image/*" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">存储目录 (Prefix)</label>
                <input 
                  type="text" 
                  value={prefix} 
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 ring-blue-500/20 outline-none transition-all"
                  placeholder="例如: posts/2024"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">自定义文件名 (Slug)</label>
                <input 
                  type="text" 
                  value={slug} 
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 ring-blue-500/20 outline-none transition-all"
                  placeholder="例如: cover-image"
                />
              </div>
            </div>

            <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">物理存储路径</span>
              <p className="text-xs text-slate-400 font-mono mt-1 break-all">
                /storage/{prefix}/{slug || 'name'}.jpg
              </p>
            </div>

            <button 
              disabled={!selectedFile || uploading}
              onClick={onUpload}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  正在写入磁盘...
                </>
              ) : '确认并同步到服务器'}
            </button>
          </div>
        </section>

        <section className="lg:col-span-7">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold">云端库</h2>
            <div className="flex items-center gap-3">
               <span className="text-xs text-slate-500 bg-slate-900 px-3 py-1 rounded-full">{history.length} FILES</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
            {history.map(item => (
              <div key={item.id} className="glass-panel p-4 rounded-3xl group hover:border-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/5">
                <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden mb-4 relative">
                  <img src={item.url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button 
                      onClick={() => copyToClipboard(item.url)}
                      className="p-3 bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors shadow-lg"
                      title="复制原始链接"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </button>
                    <a 
                      href={item.url} 
                      target="_blank" 
                      className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    </a>
                  </div>
                </div>
                <div className="px-1">
                  <h3 className="text-sm font-semibold truncate text-slate-200">{item.name}</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                    {item.path}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-2">
                   <button 
                     onClick={() => copyToClipboard(`![${item.name}](${window.location.origin}${item.url})`)}
                     className="text-[10px] bg-slate-900 text-slate-400 py-2 rounded-xl hover:text-white hover:bg-slate-800 transition-all font-bold"
                   >
                     MD 格式
                   </button>
                   <button 
                     onClick={() => copyToClipboard(`<img src="${window.location.origin}${item.url}" alt="${item.name}" />`)}
                     className="text-[10px] bg-slate-900 text-slate-400 py-2 rounded-xl hover:text-white hover:bg-slate-800 transition-all font-bold"
                   >
                     HTML 格式
                   </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}