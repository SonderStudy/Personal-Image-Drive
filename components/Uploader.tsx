
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { analyzeImage } from '../services/geminiService';
import { UploadedImage } from '../types';

interface UploaderProps {
  onUploadComplete: (image: UploadedImage) => void;
}

export const Uploader: React.FC<UploaderProps> = ({ onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [pathPrefix, setPathPrefix] = useState('img/2025');
  const [baseDomain, setBaseDomain] = useState('pic.wildsalt.me');
  const [isUploading, setIsUploading] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
        if (!selected) setUseAI(false);
      }
    };
    checkKey();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        const baseSlug = selectedFile.name.split('.').slice(0, -1).join('.').toLowerCase().replace(/[^a-z0-9]/g, '-');
        setSlug(baseSlug);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const cleanPath = (p: string) => p.replace(/^\/+|\/+$/g, '');
  const cleanDomain = (d: string) => d.replace(/\/+$/, '');
  
  const fileExtension = file ? file.name.split('.').pop() : 'jpg';
  const finalSlug = slug.includes('.') ? slug : `${slug}.${fileExtension}`;
  const finalUrlPreview = `https://${cleanDomain(baseDomain)}/${cleanPath(pathPrefix)}/${finalSlug}`;

  const handleUpload = async () => {
    if (!file || !preview || !slug) return;
    setIsUploading(true);

    try {
      let metadata = { title: file.name, tags: ['manual'], description: '' };

      if (useAI && hasKey) {
        try {
          const aiResult = await analyzeImage(preview, file.name);
          metadata = {
            title: aiResult.title || file.name,
            tags: aiResult.tags || [],
            description: aiResult.description || ''
          };
        } catch (aiError) {
          console.warn("AI skipped", aiError);
        }
      }

      try {
        const formData = new FormData();
        formData.append('pathPrefix', cleanPath(pathPrefix));
        formData.append('slug', finalSlug);
        formData.append('image', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          let errorMsg = `Server error (${response.status})`;
          try {
            const errData = await response.json();
            errorMsg = errData.error || errorMsg;
          } catch(e) {}
          
          if (response.status === 500) {
            alert(`❌ 500 错误: 可能是后端权限不足或 Nginx 限制了文件大小。详情: ${errorMsg}`);
          } else {
            alert(`❌ 上传失败: ${errorMsg}`);
          }
          setIsUploading(false);
          return;
        }
      } catch (e) {
        alert("❌ 无法连接到后端。请确保 Node.js 服务已启动并运行在 3003 端口。");
        setIsUploading(false);
        return;
      }
      
      const newImage: UploadedImage = {
        id: crypto.randomUUID(),
        name: metadata.title,
        slug: finalSlug,
        pathPrefix: cleanPath(pathPrefix),
        baseDomain: cleanDomain(baseDomain),
        url: preview,
        size: file.size,
        type: file.type,
        createdAt: Date.now(),
        tags: metadata.tags,
        aiDescription: metadata.description,
      };

      onUploadComplete(newImage);
      reset();
    } catch (error) {
      console.error("Upload process failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setSlug('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="glass rounded-2xl p-6 md:p-8 mb-8 border-blue-500/20 border shadow-2xl">
      <div className="flex flex-col lg:flex-row gap-10 items-start">
        <div className="w-full lg:w-1/3">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-2xl border-2 border-dashed border-slate-700 hover:border-blue-500/50 cursor-pointer flex flex-col items-center justify-center bg-slate-900/40 transition-all overflow-hidden relative group"
          >
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            ) : (
              <div className="text-center p-8">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-900/30 transition-colors">
                  <svg className="w-8 h-8 text-slate-400 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-slate-300 font-medium">Select Image</p>
                <p className="text-slate-500 text-xs mt-2">Will auto-create folders on VPS</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>

        <div className="flex-1 w-full space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white tracking-tight">Deployment Config</h3>
            <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
               <label className="flex items-center cursor-pointer gap-2">
                <input 
                  type="checkbox" 
                  checked={useAI} 
                  onChange={(e) => setUseAI(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500/30"
                />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${useAI ? 'text-blue-400' : 'text-slate-500'}`}>
                  AI Analyze
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Base Domain</label>
              <input 
                type="text"
                value={baseDomain}
                onChange={(e) => setBaseDomain(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Path Prefix (Folders)</label>
              <input 
                type="text"
                value={pathPrefix}
                onChange={(e) => setPathPrefix(e.target.value.replace(/[^a-z0-9\/]/g, '-'))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:outline-none placeholder:text-slate-700 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Custom Slug (Filename)</label>
            <input 
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, '-'))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-sm"
              placeholder="e.g. my-travel-photo"
            />
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 transition-all">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Final URL Preview</span>
              <span className="text-[10px] text-slate-500 uppercase">Will be served by Nginx</span>
            </div>
            <p className="text-xs font-mono text-slate-300 break-all select-all cursor-text bg-slate-950/40 p-2 rounded">
              {finalUrlPreview}
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={handleUpload} 
              isLoading={isUploading} 
              disabled={!file || !slug}
              className="flex-1 py-4 text-sm font-bold shadow-2xl shadow-blue-500/20"
            >
              Upload & Get Link
            </Button>
            <Button variant="ghost" onClick={reset} disabled={isUploading} className="px-8 py-4">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
