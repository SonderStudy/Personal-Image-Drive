
export interface UploadedImage {
  id: string;
  name: string;
  slug: string;
  pathPrefix: string;
  baseDomain: string;
  url: string; // Base64 for demo storage
  size: number;
  type: string;
  createdAt: number;
  tags: string[];
  aiDescription?: string;
}

export interface AppState {
  images: UploadedImage[];
  isUploading: boolean;
  searchQuery: string;
  globalBaseDomain: string;
}

// Global augmentation for the AI Studio environment
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // Marked as optional to ensure compatibility with environment-provided types
    aistudio?: AIStudio;
  }
}
