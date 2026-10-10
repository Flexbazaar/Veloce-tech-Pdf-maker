import React, { useState } from 'react';
import { 
  FileText, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Download, 
  Layers, 
  Upload, 
  Check, 
  FilePlus, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { mergePdfFiles, extractPdfToItems, processImageToBytes } from '../lib/pdfEngine';
import { DocumentItem } from '../types';

interface PdfMergerProps {
  onSendToStudio: (items: DocumentItem[]) => void;
}

interface QueuedFile {
  id: string;
  file: File;
  type: 'pdf' | 'image';
  pageCount?: number;
  previewUrl?: string;
}

export const PdfMerger: React.FC<PdfMergerProps> = ({ onSendToStudio }) => {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleFiles = (files: File[]) => {
    const newItems: QueuedFile[] = [];

    for (const f of files) {
      const isPdf = f.type === 'application/pdf' || f.name.endsWith('.pdf');
      const previewUrl = isPdf ? undefined : URL.createObjectURL(f);

      newItems.push({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file: f,
        type: isPdf ? 'pdf' : 'image',
        previewUrl,
      });
    }

    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= queue.length) return;
    const newQueue = [...queue];
    const temp = newQueue[index];
    newQueue[index] = newQueue[targetIndex];
    newQueue[targetIndex] = temp;
    setQueue(newQueue);
  };

  const removeItem = (index: number) => {
    setQueue(queue.filter((_, i) => i !== index));
  };

  // Explode all pages and images into Document Studio for fine-grained page reordering
  const handleExplodeToStudio = async () => {
    if (queue.length === 0) return;
    setIsMerging(true);
    setStatusMessage('Extracting pages from all PDFs & images...');

    try {
      const allItems: DocumentItem[] = [];

      for (const item of queue) {
        if (item.type === 'pdf') {
          const extracted = await extractPdfToItems(item.file);
          allItems.push(...extracted);
        } else {
          // Image
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(item.file);
          });

          allItems.push({
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'image',
            title: item.file.name,
            sourceFile: item.file.name,
            dataUrl,
            width: 800,
            height: 1000,
            rotation: 0,
            originalSize: item.file.size,
          });
        }
      }

      onSendToStudio(allItems);
    } catch (err: any) {
      alert('Error expanding files: ' + err.message);
    } finally {
      setIsMerging(false);
      setStatusMessage('');
    }
  };

  // Direct fast merge
  const handleQuickMerge = async () => {
    if (queue.length === 0) return;
    setIsMerging(true);
    setStatusMessage('Merging documents into a unified PDF...');

    try {
      // First convert any images into temporary single-page PDFs or explode into items
      const allItems: DocumentItem[] = [];
      for (const item of queue) {
        if (item.type === 'pdf') {
          const extracted = await extractPdfToItems(item.file);
          allItems.push(...extracted);
        } else {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(item.file);
          });
          allItems.push({
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'image',
            title: item.file.name,
            sourceFile: item.file.name,
            dataUrl,
            width: 800,
            height: 1000,
            rotation: 0,
            originalSize: item.file.size,
          });
        }
      }

      const { createPdfFromItems } = await import('../lib/pdfEngine');
      const blob = await createPdfFromItems(allItems, {
        pageSize: 'auto',
        orientation: 'auto',
        margin: 'none',
        imageQuality: 0.9,
        includePageNumbers: false,
        documentTitle: 'Merged Document',
        authorName: '',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Unified-Merged-Document.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Error merging files: ' + err.message);
    } finally {
      setIsMerging(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="bg-white p-6 rounded-xl border border-neutral-200">
        <h2 className="text-lg font-bold text-neutral-900">Merge PDFs &amp; Photos</h2>
        <p className="text-xs text-neutral-500 mt-1">
          Combine multiple PDF files and images together into one clean document. Reorder files in the queue or explode them into the Studio for page-level editing.
        </p>
      </div>

      {/* Upload Box */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="p-8 border-2 border-dashed border-neutral-300 hover:border-neutral-400 bg-white rounded-xl text-center transition-colors"
      >
        <p className="text-sm font-semibold text-neutral-800 mb-1">
          Add PDF Documents and Photos to Merge
        </p>
        <p className="text-xs text-neutral-500 mb-4">
          Drop any number of PDFs and pictures here
        </p>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-lg cursor-pointer transition-colors shadow-xs">
          <Upload className="w-3.5 h-3.5" />
          <span>Add Files</span>
          <input
            type="file"
            multiple
            accept="application/pdf,image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      </div>

      {/* Queue List */}
      {queue.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <span className="text-xs font-semibold text-neutral-700">
              Files to Merge ({queue.length})
            </span>
            <button
              onClick={() => setQueue([])}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Clear Queue
            </button>
          </div>

          <div className="space-y-2">
            {queue.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs"
              >
                <div className="flex items-center gap-3 overflow-hidden pr-2">
                  <span className="font-mono text-neutral-400 w-5">#{index + 1}</span>
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt="preview"
                      className="w-8 h-8 object-cover rounded border border-neutral-300 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-neutral-200 flex items-center justify-center text-neutral-700 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                  <div className="truncate">
                    <p className="font-medium text-neutral-900 truncate">{item.file.name}</p>
                    <p className="text-[10px] text-neutral-500 uppercase">
                      {item.type} · {(item.file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-neutral-600 hover:text-neutral-900 disabled:opacity-20 rounded"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === queue.length - 1}
                    className="p-1 text-neutral-600 hover:text-neutral-900 disabled:opacity-20 rounded"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeItem(index)}
                    className="p-1 text-neutral-400 hover:text-red-600 rounded ml-1"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Merge & Explode CTAs */}
          <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleExplodeToStudio}
              disabled={isMerging}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              title="Inspect, reorder, or delete individual pages in Studio"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Open in Page Studio (Fine Reordering)</span>
            </button>

            <button
              onClick={handleQuickMerge}
              disabled={isMerging}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Merge &amp; Download PDF</span>
            </button>
          </div>

          {statusMessage && (
            <p className="text-xs text-center text-neutral-600 animate-pulse pt-2">
              {statusMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
