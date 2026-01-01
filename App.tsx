
import React, { useState, useEffect, useMemo } from 'react';
import { UploadedImage } from './types';
import { Uploader } from './components/Uploader';
import { ImageCard } from './components/ImageCard';

const App: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'recent'>('all');
  const [isAiActive, setIsAiActive] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('lumina_images');
    if (saved) {
      try {
        setImages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse images", e);
      }
    }
    
    // Check initial AI status
    const checkStatus = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsAiActive(hasKey);
      }
    };
    checkStatus();
  }, []);

  // Save to local storage when images change
  useEffect(() => {
    localStorage.setItem('lumina_images', JSON.stringify(images));
  }, [images]);

  const handleUploadComplete = (newImage: UploadedImage) => {
    setImages(prev => [newImage, ...prev]);
  };

  const handleDelete = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleOpenKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setIsAiActive(true);
    }
  };

  const filteredImages = useMemo(() => {
    return images.filter(img => 
      img.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      img.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [images, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0f172a] selection:bg-blue-500/30">
      {/* Header */}
      <nav className="sticky top-0 z-50 glass border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight gradient-text block leading-none">LuminaDrive</span>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isAiActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  {isAiActive ? 'AI Intelligent' : 'Standard Mode'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={handleOpenKey}
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {isAiActive ? 'Update API Key' : 'Connect API Key'}
            </button>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Billing Docs</a>
            <div className="h-8 w-[1px] bg-slate-800"></div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                <span className="text-[10px] font-bold text-slate-400">LD</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Intro */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Personal Image Drive</h1>
          <p className="text-slate-400 max-w-2xl leading-relaxed">
            Fast, secure image hosting with custom URL slugs. 
            Enable the <span className="text-blue-400 font-medium underline decoration-blue-400/30 underline-offset-4">AI analysis</span> toggle 
            to automatically organize and tag your media assets.
          </p>
        </div>

        {/* Uploader Section */}
        <Uploader onUploadComplete={handleUploadComplete} />

        {/* Gallery Section */}
        <div className="mt-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800 self-start">
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                All Assets
              </button>
              <button 
                onClick={() => setActiveTab('recent')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'recent' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Recent
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search by name, tag, or slug..."
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredImages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredImages.map((image) => (
                <ImageCard 
                  key={image.id} 
                  image={image} 
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 border-2 border-dashed border-slate-800/50 rounded-3xl bg-slate-900/20">
              <div className="bg-slate-800/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
                <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-300">Your drive is empty</h3>
              <p className="text-slate-500 mt-2 text-sm max-w-xs mx-auto">Upload images to generate direct links and Markdown code for your projects.</p>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-20 border-t border-slate-800/50 py-12 px-6 bg-slate-900/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-bold tracking-tight">LuminaDrive</span>
            <span className="text-slate-700">|</span>
            <p className="text-slate-600 text-sm">Personal Cloud Storage System</p>
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-slate-600 hover:text-blue-400 text-sm transition-colors">Documentation</a>
            <a href="https://ai.google.dev" className="text-slate-600 hover:text-blue-400 text-sm transition-colors">Gemini API</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
