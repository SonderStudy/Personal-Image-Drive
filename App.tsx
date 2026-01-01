import React, { useState, useEffect, useMemo } from 'react';

interface ImageData {
  name: string;
  url: string;
  path: string;
  mtime: number;
}

export default function App() {
  const [allFiles, setAllFiles] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [prefix, setPrefix] = useState('img/blog');
  const [slug, setSlug] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      
      // 检查响应状态
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      // 检查内容类型
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response received:', text.substring(0, 100));
        throw new Error('Received non-JSON response from server');
      }

      const data = await res.json();
      if (data.success) {
        setAllFiles(data.files || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // 按文件夹分组
  const groupedFiles = useMemo(() => {
    const groups: Record<string, ImageData[]> = {};
    if (!allFiles.length) return groups;
    
    allFiles.forEach(file => {
      const parts = file.path.split('/');
      // 获取路径中的第一级目录或标记为 root
      const folder = parts.length > 2 ? parts.slice(1, -1).join('/') : 'root';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(file);
    });
    return groups;
  }, [allFiles]);

  // 最近上传 (取前12个)
  const recentFiles = useMemo(() => allFiles.slice(0, 12), [allFiles]);

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
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const result = await response.json();
      if (result.success) {
        await fetchFiles();
        setSelectedFile(null);
        setPreview(null);
        setSlug('');
      } else {
        alert('上传失败: ' + (result.error || '未知错误'));
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('上传过程发生错误，请检查网络或服务器状态');
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = async (e: React.MouseEvent<HTMLButtonElement>, text: string) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget;
    const originalText = btn.innerText;
    
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
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      btn.innerText = 'OK!';
      setTimeout(() => btn.innerText = originalText, 1500);
    } catch (err) {
      console.error('Clipboard error:', err);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-[1600px] mx-auto flex flex-col gap-8">
      {/* 顶部导航 */}
      <nav className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-black tracking-tighter gradient-text">LuminaDrive</h1>
          <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-slate-500 uppercase">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Cloud Node Management v3.5.1
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2 text-[10px] text-slate-400 font-mono">
            TOTAL: {allFiles.length} ASSETS
          </div>
        </div>
      </nav>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* 左侧：上传区域 */}
        <section className="xl:col-span-4 sticky top-12">
          <div className="glass-panel rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round"/></svg>
              </span>
              资源上传
            </h2>

            <div 
              onClick={() => document.getElementById('file-input')?.click()}
              className="group aspect-[4/3] rounded-[2rem] border-2 border-dashed border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden bg-slate-950/50 flex flex-col items-center justify-center"
            >
              {preview ? (
                <img src={preview} className="w-full h-full object-cover" />
              ) : (
                <>
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 002-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  </div>
                  <span className="text-xs text-slate-500 font-medium tracking-wide">点击选择图片</span>
                </>
              )}
              <input id="file-input" type="file" className="hidden" onChange={handleFileSelect} accept="image/*" />
            </div>

            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">路径前缀</label>
                <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-1 ring-blue-500/50 outline-none font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">资源别名</label>
                <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-1 ring-blue-500/50 outline-none font-mono" placeholder="可选别名" />
              </div>
            </div>

            <button 
              disabled={!selectedFile || uploading}
              onClick={onUpload}
              className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/10 transition-all disabled:opacity-20 active:scale-95"
            >
              {uploading ? '同步中...' : '立即上传'}
            </button>
          </div>
        </section>

        {/* 右侧：管理区域 */}
        <section className="xl:col-span-8 space-y-8">
          
          {/* 1. 文件夹视图 */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeWidth="2"/></svg>
              云端文件夹 (分组)
            </h2>
            
            <div className="grid grid-cols-1 gap-4">
              {Object.keys(groupedFiles).length === 0 && !loading && (
                <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-3xl opacity-30">暂无文件夹数据</div>
              )}
              {Object.entries(groupedFiles).map(([folder, files]) => (
                <div key={folder} className="glass-panel rounded-3xl overflow-hidden border border-white/5">
                  <div className="px-6 py-4 bg-slate-900/30 flex justify-between items-center border-b border-white/5">
                    <span className="text-xs font-mono text-blue-400 font-bold tracking-wider capitalize">{folder}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded-full text-slate-500">{files.length} ITEMS</span>
                  </div>
                  <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {files.slice(0, 16).map((file, idx) => (
                      <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-950 border border-white/5 cursor-pointer hover:border-blue-500/50 transition-all">
                        <img src={file.url} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button onClick={(e) => copyToClipboard(e, file.url)} title="复制链接" className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" strokeWidth="2"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {files.length > 16 && (
                      <div className="aspect-square rounded-xl bg-slate-900 flex items-center justify-center text-[10px] text-slate-600 font-bold border border-white/5">
                        +{files.length - 16}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. 最近上传 */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
              最近同步 (Recent 12)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentFiles.map((file, idx) => (
                <div key={idx} className="glass-panel p-3 rounded-2xl flex gap-3 border border-white/5 group hover:bg-slate-900/40 transition-all">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 shrink-0">
                    <img src={file.url} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-[11px] font-bold text-slate-200 truncate">{file.name}</p>
                    <p className="text-[9px] text-slate-500 font-mono truncate mt-0.5">{file.path}</p>
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={(e) => copyToClipboard(e, file.url)}
                        className="text-[9px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-tighter"
                      >
                        复制链接
                      </button>
                      <button 
                        onClick={(e) => copyToClipboard(e, `![${file.name}](${window.location.origin}${file.url})`)}
                        className="text-[9px] font-bold text-slate-500 hover:text-slate-400 uppercase tracking-tighter"
                      >
                        Markdown
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>
      </div>
    </div>
  );
}