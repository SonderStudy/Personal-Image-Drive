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
    const newSelected = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setSelectedFiles(newSelected);
    if (files.length === 1) setSlug(cleanSlug(files[0].name));
    else setSlug('');
  };

  const onUpload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || uploading) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('pathPrefix', prefix);
    try {
      if (selectedFiles.length === 1) {
        formData.append('file', selectedFiles[0].file);
        formData.append('slug', slug);
        setUploadProgress('PROCESING...');
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
      } else {
        selectedFiles.forEach(sf => formData.append('files', sf.file));
        setUploadProgress(`SYNCING ${selectedFiles.length}...`);
        const response = await fetch('/api/upload-bulk', { method: 'POST', body: formData });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
      }
      await fetchFiles();
      setSelectedFiles([]);
      setSlug('');
    } catch (err: any) {
      alert('UPLOAD_ERR: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const copyToClipboard = async (e: React.MouseEvent, text: string) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget as HTMLElement;
    const originalContent = btn.innerHTML;
    const finalCopyText = text.startsWith('http') || text.startsWith('![') ? text : (window.location.origin + text);
    try {
      await navigator.clipboard.writeText(finalCopyText);
      btn.innerHTML = '<span class="text-emerald-400">DONE</span>';
      setTimeout(() => btn.innerHTML = originalContent, 1000);
    } catch (err) {
      btn.innerHTML = '<span class="text-red-400">FAIL</span>';
      setTimeout(() => btn.innerHTML = originalContent, 1000);
    }
  };

  return (
    <div className="min-h-screen px-6 py-8 md:px-12 md:py-12 max-w-[1500px] mx-auto flex flex-col gap-12 relative">
      {/* 顶部导航 */}
      <nav className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative">
            <h1 className="text-4xl font-[900] tracking-tight gradient-text">WildSaltDrive</h1>
            <div className="flex items-center gap-2 mt-1.5 mono text-[10px] text-slate-500 uppercase tracking-[0.2em]">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
              Secure Image Engine // V4.0.0
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 backdrop-blur-md">
          <div className="flex flex-col items-end">
            <span className="text-[10px] mono text-slate-500 uppercase tracking-widest">Total Assets</span>
            <span className="text-xl font-bold mono text-white">{loading ? '...' : allFiles.length}</span>
          </div>
          <div className="w-[1px] h-8 bg-white/10 mx-1"></div>
          <div className="w-10 h-10 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-400">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" strokeWidth="2"/></svg>
          </div>
        </div>
      </nav>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* 左侧：精雕细琢的上传区 */}
        <section className="xl:col-span-4 lg:sticky lg:top-12 h-fit">
          <div className="glass-panel rounded-[2rem] p-8 relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-sm font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5" strokeLinecap="round"/></svg>
                </span>
                SYNC_CONTROL
              </h2>
              {selectedFiles.length > 0 && (
                <button onClick={() => setSelectedFiles([])} className="text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest">RESET</button>
              )}
            </div>

            <div onClick={() => fileInputRef.current?.click()} className={`upload-zone relative rounded-3xl border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center overflow-hidden cursor-pointer ${selectedFiles.length > 0 ? 'aspect-video' : 'aspect-square'}`}>
              <div className="flex flex-col items-center z-10">
                <div className="w-16 h-16 bg-slate-900/80 rounded-2xl flex items-center justify-center mb-4 border border-white/5 shadow-2xl">
                  <svg className="w-8 h-8 text-blue-500/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                </div>
                <p className="text-xs font-semibold text-slate-400 tracking-wide">{selectedFiles.length > 0 ? '追加资产' : '点击或拖拽上传'}</p>
                <p className="text-[10px] text-slate-600 mt-2 mono">MAX 50MB / IMAGE</p>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*" multiple />
              
              {selectedFiles.length > 0 && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"></div>
              )}
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-8 grid grid-cols-4 gap-3 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                {selectedFiles.map((sf, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
                    <img src={sf.preview} className="w-full h-full object-cover" />
                    <button onClick={(e) => { e.stopPropagation(); setSelectedFiles(prev => prev.filter((_, i) => i !== idx)); }} className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Vault Path</label>
                <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm mono focus:border-blue-500/50 outline-none transition-all" placeholder="img/blog" />
              </div>
              {selectedFiles.length === 1 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Asset Alias</label>
                  <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm mono focus:border-blue-500/50 outline-none transition-all" placeholder="custom-name" />
                </div>
              )}
            </div>

            <button disabled={selectedFiles.length === 0 || uploading} onClick={onUpload} className={`w-full mt-10 py-5 rounded-2xl font-black transition-all active:scale-[0.98] flex flex-col items-center justify-center relative overflow-hidden ${uploading ? 'bg-slate-800 text-slate-500 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.4)]'}`}>
              <span className="tracking-widest">START_SYNC</span>
              {uploading && <span className="text-[9px] mt-1 mono opacity-60 tracking-tighter">{uploadProgress}</span>}
              {uploading && <div className="absolute bottom-0 left-0 h-1 bg-white/20 animate-[loading_2s_infinite]"></div>}
            </button>
          </div>
        </section>

        {/* 右侧：管理卷与最近活动 */}
        <section className="xl:col-span-8 flex flex-col gap-12">
          {/* 存储卷 */}
          <div className="space-y-6">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              Storage Volumes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading ? (
                [1,2,3,4].map(i => <div key={i} className="aspect-[4/5] rounded-[2rem] bg-white/[0.02] animate-pulse border border-white/5" />)
              ) : Object.entries(groupedFiles).map(([folder, files]) => (
                <div key={folder} onClick={() => setExpandedFolder(folder)} className="folder-card group cursor-pointer flex flex-col gap-4">
                  <div className="aspect-[4/5] rounded-[2rem] bg-slate-900/40 border border-white/5 p-4 shadow-xl relative overflow-hidden">
                    <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className="rounded-2xl overflow-hidden bg-slate-950/80 border border-white/5">
                          {files[i] && <img src={files[i].url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500" loading="lazy" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="px-2">
                    <div className="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors truncate">{folder}</div>
                    <div className="text-[10px] mono text-slate-500 mt-1 uppercase tracking-wider">{files.length} Assets</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 最近活动 - Quick Workflow */}
          <div className="space-y-6 pt-10 border-t border-white/5">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
              Quick Access Console
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentFiles.map((file, idx) => (
                <div key={idx} className="glass-panel p-5 rounded-[1.8rem] flex gap-5 group hover:bg-white/[0.05] transition-all duration-300">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-950 border border-white/5 shrink-0 shadow-inner">
                    <img src={file.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <p className="text-[13px] font-bold text-slate-200 truncate leading-none group-hover:text-blue-300 transition-colors">{file.name}</p>
                    <div className="flex gap-2.5 mt-3">
                      <button 
                        onClick={(e) => copyToClipboard(e, file.url)} 
                        className="quick-copy-btn flex-1 py-2 bg-blue-500/10 hover:bg-blue-600 border border-blue-500/20 hover:border-blue-400 rounded-xl text-[11px] font-black text-blue-400 hover:text-white mono tracking-widest"
                      >
                        LINK
                      </button>
                      <button 
                        onClick={(e) => copyToClipboard(e, `![${file.name}](${window.location.origin}${file.url})`)} 
                        className="quick-copy-btn flex-1 py-2 bg-purple-500/10 hover:bg-purple-600 border border-purple-500/20 hover:border-purple-400 rounded-xl text-[11px] font-black text-purple-400 hover:text-white mono tracking-widest"
                      >
                        MD
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* 全屏详情沉浸页 */}
      {expandedFolder && (
        <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-3xl flex flex-col animate-in fade-in duration-500">
          <div className="max-w-[1400px] mx-auto w-full flex flex-col h-full p-8 md:p-16">
            <header className="flex justify-between items-end mb-12 border-b border-white/10 pb-8">
              <div>
                <button onClick={() => setExpandedFolder(null)} className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-[11px] font-black uppercase tracking-[0.3em] mb-6 group">
                  <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  BACK_TO_DASHBOARD
                </button>
                <div className="flex items-baseline gap-4">
                  <h3 className="text-5xl font-black tracking-tighter">
                    <span className="text-blue-600">/</span> {expandedFolder}
                  </h3>
                  <span className="text-slate-500 mono text-sm uppercase tracking-widest">{groupedFiles[expandedFolder]?.length} ASSETS</span>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-20">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                {groupedFiles[expandedFolder]?.map((file, idx) => (
                  <div key={idx} className="group flex flex-col gap-4">
                    <div className="aspect-square rounded-3xl overflow-hidden bg-slate-900 border border-white/5 relative group shadow-2xl">
                      <img src={file.url} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-2" loading="lazy" />
                      <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300 backdrop-blur-sm p-4 gap-3">
                        <button onClick={(e) => copyToClipboard(e, file.url)} className="w-full py-3 bg-blue-600 rounded-2xl text-white font-black text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">COPY LINK</button>
                        <button onClick={(e) => copyToClipboard(e, `![${file.name}](${window.location.origin}${file.url})`)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-white font-black text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">MARKDOWN</button>
                      </div>
                    </div>
                    <div className="px-1 text-center">
                      <p className="text-[10px] mono text-slate-500 truncate group-hover:text-slate-300 transition-colors">{file.name}</p>
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