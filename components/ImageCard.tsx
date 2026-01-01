
import React, { useState } from 'react';
import { UploadedImage } from '../types';
import { Button } from './Button';

interface ImageCardProps {
  image: UploadedImage;
  onDelete: (id: string) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ image, onDelete }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const cleanPrefix = image.pathPrefix ? `${image.pathPrefix.replace(/^\/+|\/+$/g, '')}/` : '';
  const directLink = `https://${image.baseDomain.replace(/\/+$/, '')}/${cleanPrefix}${image.slug}`;
  const markdownLink = `![${image.name}](${directLink})`;

  return (
    <div className="glass rounded-xl overflow-hidden group hover:border-blue-500/40 transition-all flex flex-col border border-slate-800">
      <div className="aspect-[4/3] relative overflow-hidden bg-slate-900">
        <img 
          src={image.url} 
          alt={image.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
            onClick={() => onDelete(image.id)}
            className="p-2 bg-rose-600/80 hover:bg-rose-500 rounded-lg text-white backdrop-blur-sm transition-colors"
            title="Delete image"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        <div className="absolute bottom-2 left-2">
           <span className="text-[10px] bg-black/60 text-slate-300 px-2 py-0.5 rounded backdrop-blur-sm font-mono border border-white/10">
            {image.slug}
          </span>
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold text-slate-100 truncate flex-1 text-sm">{image.name}</h4>
          <span className="text-[9px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded uppercase font-bold ml-2">
            {(image.size / 1024).toFixed(0)} KB
          </span>
        </div>
        
        {image.aiDescription && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-3 h-8 italic">
            "{image.aiDescription}"
          </p>
        )}

        <div className="flex flex-wrap gap-1 mb-4 h-5 overflow-hidden">
          {image.tags.map(tag => (
            <span key={tag} className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-full border border-blue-500/20">
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-auto space-y-2">
          <div className="p-2 bg-slate-900/50 border border-slate-800 rounded text-[10px] font-mono text-slate-500 truncate mb-2">
            {directLink}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              className="text-[10px] py-1 flex-1 h-8"
              onClick={() => copyToClipboard(directLink, 'URL')}
            >
              {copied === 'URL' ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button 
              variant="secondary" 
              className="text-[10px] py-1 flex-1 h-8"
              onClick={() => copyToClipboard(markdownLink, 'MD')}
            >
              {copied === 'MD' ? 'Copied!' : 'Markdown'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
