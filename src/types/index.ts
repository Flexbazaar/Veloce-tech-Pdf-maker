export type ItemType = 'image' | 'pdf_page' | 'note' | 'sketch';

export interface DocumentItem {
  id: string;
  type: ItemType;
  title: string;
  sourceFile?: string;
  dataUrl: string; // Base64 or object URL of image/rendered canvas
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
  originalSize?: number; // bytes
  // For note items
  noteContent?: string;
  // Page options
  fitMode?: 'fit' | 'fill' | 'stretch';
  pageOrientation?: 'portrait' | 'landscape' | 'auto';
  margin?: 'none' | 'small' | 'normal';
}

export interface NoteDocument {
  id: string;
  title: string;
  content: string; // Markdown or formatted text
  images: Array<{
    id: string;
    dataUrl: string;
    caption?: string;
    width?: number;
    height?: number;
  }>;
  sketches: Array<{
    id: string;
    dataUrl: string;
    title?: string;
  }>;
  createdAt: number;
  updatedAt: number;
  category?: string;
}

export interface CompressionPreset {
  id: 'light' | 'recommended' | 'extreme' | 'custom';
  name: string;
  description: string;
  scale: number; // 0.5 to 1.0
  quality: number; // 0.1 to 1.0
  expectedReduction: string;
}

export interface ExportSettings {
  pageSize: 'a4' | 'letter' | 'legal' | 'auto';
  orientation: 'portrait' | 'landscape' | 'auto';
  margin: 'none' | 'small' | 'normal';
  imageQuality: number; // 0.5 to 1.0
  includePageNumbers: boolean;
  documentTitle: string;
  authorName: string;
}
