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
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
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
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedFolder(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const groupedFiles = useMemo(() => {
    const groups: Record<string, ImageData[]> = {};
    allFiles.forEach(file => {
      const parts = file.path.split('/');
      // 提取文件夹路径
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

  const copyToClipboard = async (e: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLDivElement>, text: string) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget as HTMLElement;
    const originalContent = btn.innerHTML;
    const finalCopyText = text.startsWith('http') || text.startsWith('![') ? text : (window.location.origin + text);

    try {
      await navigator.clipboard.writeText(finalCopyText);
      btn.innerText = '已复制!';
      setTimeout(() => btn.innerHTML = originalContent, 1500);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = finalCopyText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      btn.innerText = '已复制!';
      setTimeout(() => btn.innerHTML = originalContent, 1500);
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
    <div className="min-h-screen p-6 md:p-12 max-w-[1600px] mx-auto flex flex-col gap-8 relative">
      <nav className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-black tracking-tighter gradient-text">WildSaltDrive</h1>
          <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-slate-500 uppercase">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            File System Engine v3.8.0
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2 text-[10px] text-slate-400 font-mono">
            {loading ? 'SCANNING...' : `TOTAL: ${allFiles.length} ASSETS`}
          </div>
        </div>
      </nav>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* 左侧：上传区域 */}
        <section className="xl:col-span-4 sticky top-12 z-10">
          <div className="glass-panel rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round"/></svg>
                </span>
                同步资源
              </h2>
              {selectedFiles.length > 0 && (
                <button onClick={() => setSelectedFiles([])} className="text-[10px] text-red-400 font-bold uppercase tracking-wider hover:text-red-300 transition-colors">清空</button>
              )}
            </div>

            <div onClick={() => fileInputRef.current?.click()} className={`group relative rounded-[2rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden bg-slate-950/50 flex flex-col items-center justify-center ${selectedFiles.length > 0 ? 'aspect-video border-slate-800' : 'aspect-[4/3] border-slate-800 hover:border-blue-500/50'}`}>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 002-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <span className="text-xs text-slate-500 font-medium tracking-wide text-center px-4">
                  {selectedFiles.length > 0 ? '追加图片' : '拖拽或点击上传'}
                </span>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*" multiple />
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-6 space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-4 gap-2">
                  {selectedFiles.map((sf, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-white/5 bg-slate-900">
                      <img src={sf.preview} className="w-full h-full object-cover" />
                      <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="absolute inset-0 bg-red-500/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">目标路径</label>
                <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-1 ring-blue-500/50 outline-none font-mono" />
              </div>
              {selectedFiles.length === 1 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">别名 (Slug)</label>
                  <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-1 ring-blue-500/50 outline-none font-mono" />
                </div>
              )}
            </div>

            <button disabled={selectedFiles.length === 0 || uploading} onClick={onUpload} className={`w-full mt-8 py-4 rounded-xl font-bold transition-all active:scale-95 flex flex-col items-center justify-center ${uploading ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'}`}>
              <span>{uploading ? '同步中...' : '提交同步'}</span>
              {uploading && <span className="text-[10px] mt-1 font-mono opacity-60">{uploadProgress}</span>}
            </button>
          </div>
        </section>

        {/* 右侧：文件夹管理 */}
        <section className="xl:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
             <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeWidth="2"/></svg>
              我的存储卷
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              [1,2,3,4].map(i => <div key={i} className="aspect-[4/5] rounded-3xl bg-slate-900/50 animate-pulse border border-white/5" />)
            ) : Object.keys(groupedFiles).length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl opacity-30 text-slate-500">暂无存储卷</div>
            ) : Object.entries(groupedFiles).map(([folder, files]) => (
              <div key={folder} onClick={() => setExpandedFolder(folder)} className="group cursor-pointer flex flex-col gap-3">
                {/* 文件夹预览卡片 (2x2) */}
                <div className="aspect-[4/5] rounded-3xl bg-slate-900/40 border border-white/5 p-3 group-hover:border-blue-500/40 group-hover:bg-slate-900/80 transition-all shadow-xl">
                  <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className="rounded-xl overflow-hidden bg-slate-950/50 border border-white/5">
                        {files[i] ? (
                          <img src={files[i].url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-10">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 002-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {/* 文件夹信息 */}
                <div className="px-1">
                  <div className="text-xs font-bold text-slate-200 truncate group-hover:text-blue-400 transition-colors">{folder}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-tighter">{files.length} 份资源</div>
                </div>
              </div>
            ))}
          </div>

          {/* 最近活动 */}
          <div className="space-y-4 pt-6 border-t border-white/5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
              最近同步
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentFiles.map((file, idx) => (
                <div key={idx} className="glass-panel p-3 rounded-2xl flex gap-3 border border-white/5 group hover:bg-slate-900/40 transition-all cursor-default">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-white/5">
                    <img src={file.url} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-[11px] font-bold text-slate-200 truncate">{file.name}</p>
                    <div className="flex gap-3 mt-2">
                      <button onClick={(e) => copyToClipboard(e, file.url)} className="text-[9px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-tighter">链接</button>
                      <button onClick={(e) => copyToClipboard(e, `![${file.name}](${window.location.origin}${file.url})`)} className="text-[9px] font-bold text-slate-500 hover:text-slate-400 uppercase tracking-tighter">MD</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* 文件夹展开 Overlay */}
      {expandedFolder && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex flex-col p-6 md:p-12 animate-in fade-in duration-300">
          <div className="max-w-[1400px] mx-auto w-full flex flex-col h-full">
            <header className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
              <div>
                <button onClick={() => setExpandedFolder(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-4">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  返回主页
                </button>
                <h3 className="text-3xl font-black tracking-tight flex items-center gap-3">
                  <span className="text-blue-500">/</span> {expandedFolder}
                </h3>
                <p className="text-slate-500 font-mono text-[10px] mt-1 uppercase">当前卷包含 {groupedFiles[expandedFolder]?.length || 0} 个媒体资产</p>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-12">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {groupedFiles[expandedFolder]?.map((file, idx) => (
                  <div key={idx} className="group relative flex flex-col gap-2">
                    <div className="aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-white/5 relative">
                      <img src={file.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                        <button onClick={(e) => copyToClipboard(e, file.url)} className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-colors shadow-lg">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" strokeWidth="2"/></svg>
                        </button>
                        <button onClick={(e) => copyToClipboard(e, `![${file.name}](${window.location.origin}${file.url})`)} className="p-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition-colors shadow-lg">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 7h10M7 12h10M7 17h10" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </div>
                    <div className="px-1">
                      <p className="text-[10px] font-mono text-slate-400 truncate text-center">{file.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}