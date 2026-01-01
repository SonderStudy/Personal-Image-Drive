
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button.tsx';
import { analyzeImage } from '../services/geminiService.ts';
import { UploadedImage } from '../types.ts';

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

      const formData = new FormData();
      formData.append('pathPrefix', cleanPath(pathPrefix));
      formData.append('slug', finalSlug);
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const serverResult = await response.json();
      
      const newImage: UploadedImage = {
        id: crypto.randomUUID(),
        name: metadata.title,
        slug: finalSlug,
        pathPrefix: cleanPath(pathPrefix),
        baseDomain: cleanDomain(baseDomain),
        url: preview, // 这里仍使用 preview 演示，生产环境应使用 serverResult 返回的路径
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
      alert("Upload Error: " + error.message);
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
                <p className="text-slate-300 font-medium">Select Image</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>

        <div className="flex-1 w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Base Domain</label>
              <input type="text" value={baseDomain} onChange={(e) => setBaseDomain(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Path Prefix</label>
              <input type="text" value={pathPrefix} onChange={(e) => setPathPrefix(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Custom Slug</label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm" />
          </div>

          <div className="bg-slate-950/40 p-3 rounded-xl">
             <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">Preview URL</p>
             <p className="text-xs font-mono text-slate-400 break-all">{finalUrlPreview}</p>
          </div>

          <div className="pt-4 flex gap-4">
            <Button onClick={handleUpload} isLoading={isUploading} disabled={!file || !slug} className="flex-1 py-4">
              Upload
            </Button>
            <Button variant="ghost" onClick={reset} disabled={isUploading} className="px-8">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
