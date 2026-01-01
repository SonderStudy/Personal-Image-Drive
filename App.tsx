import React, { useState, useEffect, useMemo, useRef } from 'react';

interface ImageData {
  name: string;
  url: string;
  path: string;
  mtime: number;
}

interface SelectedFile {
  file: File;
  preview: string;
}

export default function App() {
  const [allFiles, setAllFiles] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  
  const [prefix, setPrefix] = useState('img/blog');
  const [slug, setSlug] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 前端同步清洗逻辑
  const cleanSlug = (name: string) => {
    const baseName = name.split('.')[0];
    return baseName
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase()
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      if (data.success) setAllFiles(data.files || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const groupedFiles = useMemo(() => {
    const groups: Record<string, ImageData[]> = {};
    allFiles.forEach(file => {
      const parts = file.path.split('/');
      const folder = parts.length > 2 ? parts.slice(1, -1).join('/') : 'root';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(file);
    });
    return groups;
  }, [allFiles]);

  const recentFiles = useMemo(() => allFiles.slice(0, 12), [allFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    selectedFiles.forEach(sf => URL.revokeObjectURL(sf.preview));

    const newSelected = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setSelectedFiles(newSelected);
    
    if (files.length === 1) {
      setSlug(cleanSlug(files[0].name));
    } else {
      setSlug('');
    }
  };

  const onUpload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || uploading) return;
    setUploading(true);

    const isBulk = selectedFiles.length > 1;
    const formData = new FormData();
    formData.append('pathPrefix', prefix);

    try {
      if (!isBulk) {
        formData.append('file', selectedFiles[0].file);
        formData.append('slug', slug);
        setUploadProgress('正在同步 1 张资源...');
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
      } else {
        selectedFiles.forEach(sf => formData.append('files', sf.file));
        setUploadProgress(`正在同步 ${selectedFiles.length} 张资源...`);
        const response = await fetch('/api/upload-bulk', { method: 'POST', body: formData });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
      }

      await fetchFiles();
      setSelectedFiles([]);
      setSlug('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      alert('同步失败: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const copyToClipboard = async (e: React.MouseEvent<HTMLButtonElement>, text: string) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget;
    const originalText = btn.innerText;
    const finalCopyText = text.startsWith('http') || text.startsWith('![') ? text : (window.location.origin + text);

    try {
      await navigator.clipboard.writeText(finalCopyText);
      btn.innerText = 'OK!';
      setTimeout(() => btn.innerText = originalText, 1500);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = finalCopyText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      btn.innerText = 'OK!';
      setTimeout(() => btn.innerText = originalText, 1500);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    URL.revokeObjectURL(newFiles[index].preview);
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    if (newFiles.length !== 1) setSlug('');
  };

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-[1600px] mx-auto flex flex-col gap-8">
      <nav className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-black tracking-tighter gradient-text">WildSaltDrive</h1>
          <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-slate-500 uppercase">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Cloud Node Management v3.7.0
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2 text-[10px] text-slate-400 font-mono">
            {loading ? 'SCANNING...' : `ASSETS: ${allFiles.length}`}
          </div>
        </div>
      </nav>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <section className="xl:col-span-4 sticky top-12">
          <div className="glass-panel rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round"/></svg>
                </span>
                资源同步
              </h2>
              {selectedFiles.length > 0 && (
                <button 
                  onClick={() => setSelectedFiles([])}
                  className="text-[10px] text-red-400 font-bold uppercase tracking-wider hover:text-red-300 transition-colors"
                >
                  清空队列
                </button>
              )}
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`group relative rounded-[2rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden bg-slate-950/50 flex flex-col items-center justify-center
                ${selectedFiles.length > 0 ? 'aspect-video border-slate-800' : 'aspect-[4/3] border-slate-800 hover:border-blue-500/50'}`}
            >
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 002-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <span className="text-xs text-slate-500 font-medium tracking-wide text-center px-4">
                  {selectedFiles.length > 0 ? '继续添加图片' : '点击上传 \n(自动清洗文件名)'}
                </span>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                onChange={handleFileSelect} 
                accept="image/*" 
                multiple 
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-6 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">待上传队列 ({selectedFiles.length})</div>
                <div className="grid grid-cols-4 gap-2">
                  {selectedFiles.map((sf, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-white/5 bg-slate-900">
                      <img src={sf.preview} className="w-full h-full object-cover" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">存储路径</label>
                <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-1 ring-blue-500/50 outline-none font-mono" />
              </div>
              
              {selectedFiles.length === 1 && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">自定义别名 (URL 安全)</label>
                  <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-1 ring-blue-500/50 outline-none font-mono" placeholder="无需后缀" />
                </div>
              )}
            </div>

            <button 
              disabled={selectedFiles.length === 0 || uploading}
              onClick={onUpload}
              className={`w-full mt-8 py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center
                ${uploading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/10'}`}
            >
              <span>{uploading ? '正在同步' : '开始同步'}</span>
              {uploading && <span className="text-[10px] mt-1 font-mono opacity-60">{uploadProgress}</span>}
            </button>
          </div>
        </section>

        <section className="xl:col-span-8 space-y-8">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeWidth="2"/></svg>
              文件系统
            </h2>
            
            <div className="grid grid-cols-1 gap-6">
              {loading ? (
                <div className="py-20 text-center animate-pulse text-slate-600 font-mono">SCANNING DRIVE...</div>
              ) : Object.keys(groupedFiles).length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl opacity-30 text-slate-500">存储空间尚空</div>
              ) : Object.entries(groupedFiles).map(([folder, files]) => (
                <div key={folder} className="glass-panel rounded-3xl overflow-hidden border border-white/5">
                  <div className="px-6 py-4 bg-slate-900/30 flex justify-between items-center border-b border-white/5">
                    <span className="text-xs font-mono text-blue-400 font-bold tracking-wider uppercase">{folder}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800/50 rounded-full text-slate-500 font-mono">{files.length} ASSETS</span>
                  </div>
                  <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {files.map((file, idx) => (
                      <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-950 border border-white/5 hover:border-blue-500/50 transition-all">
                        <img src={file.url} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-blue-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={(e) => copyToClipboard(e, file.url)} className="p-2 bg-white/20 hover:bg-white/40 rounded-xl transition-transform hover:scale-110">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" strokeWidth="2"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
              近期活动
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentFiles.map((file, idx) => (
                <div key={idx} className="glass-panel p-3 rounded-2xl flex gap-3 border border-white/5 group hover:bg-slate-900/40 transition-all">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-white/5">
                    <img src={file.url} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-[11px] font-bold text-slate-200 truncate">{file.name}</p>
                    <p className="text-[9px] text-slate-500 font-mono truncate mt-0.5">{file.path}</p>
                    <div className="flex gap-3 mt-2">
                      <button onClick={(e) => copyToClipboard(e, file.url)} className="text-[9px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-tighter">复制链接</button>
                      <button onClick={(e) => copyToClipboard(e, `![${file.name}](${window.location.origin}${file.url})`)} className="text-[9px] font-bold text-slate-500 hover:text-slate-400 uppercase tracking-tighter">Markdown</button>
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