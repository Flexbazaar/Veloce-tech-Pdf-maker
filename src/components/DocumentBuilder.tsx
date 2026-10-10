import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Trash2, 
  Copy, 
  Download, 
  FileText, 
  Eye, 
  PenTool, 
  Settings2, 
  Sparkles,
  ArrowUpDown,
  FileCheck,
  Maximize2
} from 'lucide-react';
import { DocumentItem, ExportSettings } from '../types';
import { createPdfFromItems } from '../lib/pdfEngine';
import { exportDocumentItemsToDocx } from '../lib/docxEngine';
import { FileDropzone } from './FileDropzone';
import { SketchPadModal } from './SketchPadModal';

interface DocumentBuilderProps {
  items: DocumentItem[];
  onItemsChange: (items: DocumentItem[]) => void;
  onFilesAdded: (files: File[]) => void;
  onOpenAnnotate?: (item: DocumentItem) => void;
}

export const DocumentBuilder: React.FC<DocumentBuilderProps> = ({
  items,
  onItemsChange,
  onFilesAdded,
  onOpenAnnotate,
}) => {
  const [settings, setSettings] = useState<ExportSettings>({
    pageSize: 'a4',
    orientation: 'auto',
    margin: 'none',
    imageQuality: 0.9,
    includePageNumbers: true,
    documentTitle: 'Document',
    authorName: '',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, text: '' });
  const [previewItem, setPreviewItem] = useState<DocumentItem | null>(null);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [isSketchModalOpen, setIsSketchModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Move item left/up
  const moveItem = (index: number, direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    onItemsChange(newItems);
  };

  // Rotate item 90 deg
  const rotateItem = (index: number) => {
    const newItems = [...items];
    const currentRot = newItems[index].rotation || 0;
    newItems[index] = {
      ...newItems[index],
      rotation: (currentRot + 90) % 360,
    };
    onItemsChange(newItems);
  };

  // Remove item
  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  // Duplicate item
  const duplicateItem = (index: number) => {
    const target = items[index];
    const copy: DocumentItem = {
      ...target,
      id: `${target.id}-copy-${Date.now()}`,
      title: `${target.title} (Copy)`,
    };
    const newItems = [...items];
    newItems.splice(index + 1, 0, copy);
    onItemsChange(newItems);
  };

  // Reverse list
  const handleReverseOrder = () => {
    onItemsChange([...items].reverse());
  };

  // Clear all
  const handleClearAll = () => {
    if (window.confirm('Remove all pages from current document workspace?')) {
      onItemsChange([]);
    }
  };

  // Drag and Drop reordering handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const newItems = [...items];
    const [moved] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, moved);
    setDraggedIndex(null);
    onItemsChange(newItems);
  };

  // Export to PDF
  const handleExportPdf = async () => {
    if (items.length === 0) return;
    try {
      setIsExporting(true);
      setExportProgress({ current: 0, total: items.length, text: 'Preparing pages...' });

      const blob = await createPdfFromItems(items, settings, (cur, tot, text) => {
        setExportProgress({ current: cur, total: tot, text });
      });

      const fileName = `${settings.documentTitle.trim() || 'PaperForge-Document'}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Error generating PDF: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to Microsoft Word (.docx)
  const handleExportWord = async () => {
    if (items.length === 0) return;
    try {
      setIsExporting(true);
      setExportProgress({ current: 1, total: 1, text: 'Packaging Word (.docx) document...' });

      const blob = await exportDocumentItemsToDocx(
        items,
        settings.documentTitle || 'PaperForge Document'
      );

      const fileName = `${settings.documentTitle.trim() || 'PaperForge-Document'}.docx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Error generating Word document: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle adding a sketch item to master document
  const handleSaveSketch = (dataUrl: string, title: string) => {
    const newItem: DocumentItem = {
      id: `sketch-${Date.now()}`,
      type: 'sketch',
      title: title || `Sketch ${items.length + 1}`,
      dataUrl,
      width: 1000,
      height: 750,
      rotation: 0,
    };
    onItemsChange([...items, newItem]);
  };

  return (
    <div className="space-y-6">
      {/* Top action strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-neutral-200">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-neutral-900">Document Studio</h2>
            <span className="text-xs text-neutral-500 tabular-nums">
              {items.length} {items.length === 1 ? 'page' : 'pages'} arranged
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Convert photos to PDF, arrange page sequence, merge files, and export to PDF or Word (.docx).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {items.length > 0 && (
            <>
              <button
                onClick={handleReverseOrder}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                title="Reverse page sequence"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                Reverse
              </button>

              <button
                onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                  showSettingsDrawer
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                Layout &amp; Margins
              </button>

              <button
                onClick={() => setIsSketchModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <PenTool className="w-3.5 h-3.5" />
                Add Sketch Page
              </button>

              <button
                onClick={handleExportWord}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Export Word (.docx)
              </button>

              <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettingsDrawer && (
        <div className="bg-white p-5 rounded-xl border border-neutral-200 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Document Title</label>
              <input
                type="text"
                value={settings.documentTitle}
                onChange={(e) => setSettings({ ...settings, documentTitle: e.target.value })}
                className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                placeholder="My Document"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-700 mb-1">Page Format</label>
              <select
                value={settings.pageSize}
                onChange={(e) => setSettings({ ...settings, pageSize: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
              >
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="letter">US Letter (8.5 × 11 in)</option>
                <option value="legal">US Legal (8.5 × 14 in)</option>
                <option value="auto">Auto (Match Image Aspect)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-neutral-700 mb-1">Page Orientation</label>
              <select
                value={settings.orientation}
                onChange={(e) => setSettings({ ...settings, orientation: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
              >
                <option value="auto">Auto (Detect per image)</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-neutral-700 mb-1">Page Margins</label>
              <select
                value={settings.margin}
                onChange={(e) => setSettings({ ...settings, margin: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
              >
                <option value="none">Zero Margins (Edge-to-edge)</option>
                <option value="small">Small (20pt)</option>
                <option value="normal">Normal (36pt)</option>
              </select>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-600">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.includePageNumbers}
                  onChange={(e) => setSettings({ ...settings, includePageNumbers: e.target.checked })}
                  className="rounded text-neutral-900 focus:ring-neutral-900"
                />
                <span>Include Bottom Page Numbers</span>
              </label>

              <div className="flex items-center gap-2">
                <span>Image Quality:</span>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={settings.imageQuality}
                  onChange={(e) => setSettings({ ...settings, imageQuality: parseFloat(e.target.value) })}
                  className="w-24 accent-neutral-900"
                />
                <span className="tabular-nums font-mono">{Math.round(settings.imageQuality * 100)}%</span>
              </div>
            </div>

            <button
              onClick={handleClearAll}
              className="text-red-600 hover:text-red-700 text-xs font-medium"
            >
              Clear Workspace
            </button>
          </div>
        </div>
      )}

      {/* Progress banner during export */}
      {isExporting && (
        <div className="bg-neutral-900 text-white p-4 rounded-xl shadow-lg flex items-center justify-between gap-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <div>
              <p className="text-xs font-medium">{exportProgress.text}</p>
              <p className="text-[11px] text-neutral-400">Rendering directly in your browser...</p>
            </div>
          </div>
          <div className="text-xs font-mono tabular-nums text-neutral-300">
            {exportProgress.current} / {exportProgress.total}
          </div>
        </div>
      )}

      {/* Main Pages Display */}
      {items.length === 0 ? (
        <div className="space-y-4">
          <FileDropzone
            onFilesSelected={onFilesAdded}
            helperText="Drag & drop multiple photos, mobile camera scans, or PDFs to compile them into a unified PDF."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Page Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`group relative bg-white rounded-xl border transition-all flex flex-col overflow-hidden shadow-sm hover:shadow-md ${
                  draggedIndex === index
                    ? 'opacity-40 border-dashed border-neutral-400'
                    : 'border-neutral-200'
                }`}
              >
                {/* Page Number & Type Tag */}
                <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-neutral-100 bg-neutral-50/80 text-[11px]">
                  <span className="font-semibold text-neutral-700 font-mono">#{index + 1}</span>
                  <span className="text-neutral-400 capitalize text-[10px]">{item.type}</span>
                </div>

                {/* Thumbnail Preview Area */}
                <div
                  onClick={() => setPreviewItem(item)}
                  className="relative aspect-[3/4] bg-neutral-100 flex items-center justify-center p-2 cursor-pointer overflow-hidden group-hover:bg-neutral-50 transition-colors"
                >
                  {item.dataUrl ? (
                    <img
                      src={item.dataUrl}
                      alt={item.title}
                      style={{
                        transform: `rotate(${item.rotation || 0}deg)`,
                      }}
                      className="max-w-full max-h-full object-contain transition-transform duration-200 rounded shadow-xs"
                    />
                  ) : item.type === 'note' ? (
                    <div className="p-2 text-left w-full h-full bg-white rounded border border-neutral-200 overflow-hidden text-[9px] text-neutral-600">
                      <p className="font-semibold text-neutral-900 mb-1 line-clamp-1">{item.title}</p>
                      <p className="line-clamp-6 whitespace-pre-wrap">{item.noteContent || ''}</p>
                    </div>
                  ) : (
                    <div className="text-neutral-400 flex flex-col items-center gap-1 text-[10px]">
                      <FileText className="w-6 h-6" />
                      <span>Page {index + 1}</span>
                    </div>
                  )}

                  {/* Zoom Overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                    <Maximize2 className="w-5 h-5 drop-shadow" />
                  </div>
                </div>

                {/* Title */}
                <div className="px-2 py-1 bg-white border-t border-neutral-100">
                  <p className="text-[11px] font-medium text-neutral-800 truncate" title={item.title}>
                    {item.title}
                  </p>
                </div>

                {/* Action Button Strip */}
                <div className="flex items-center justify-between px-1.5 py-1 border-t border-neutral-100 bg-neutral-50/50">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => moveItem(index, 'prev')}
                      disabled={index === 0}
                      className="p-1 text-neutral-600 hover:text-neutral-900 disabled:opacity-20 rounded transition-colors"
                      title="Move left/up"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'next')}
                      disabled={index === items.length - 1}
                      className="p-1 text-neutral-600 hover:text-neutral-900 disabled:opacity-20 rounded transition-colors"
                      title="Move right/down"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => rotateItem(index)}
                      className="p-1 text-neutral-600 hover:text-neutral-900 rounded transition-colors"
                      title="Rotate 90 degrees"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-0.5">
                    {onOpenAnnotate && (
                      <button
                        onClick={() => onOpenAnnotate(item)}
                        className="p-1 text-neutral-600 hover:text-neutral-900 rounded transition-colors"
                        title="Annotate / Edit page"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => duplicateItem(index)}
                      className="p-1 text-neutral-600 hover:text-neutral-900 rounded transition-colors"
                      title="Duplicate page"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeItem(index)}
                      className="p-1 text-neutral-500 hover:text-red-600 rounded transition-colors"
                      title="Delete page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Quick add card */}
            <div className="flex flex-col justify-center items-center p-4 border-2 border-dashed border-neutral-300 rounded-xl hover:border-neutral-400 transition-colors aspect-[3/4] bg-neutral-50/50">
              <FileDropzone onFilesSelected={onFilesAdded} isCompact={true} />
            </div>
          </div>
        </div>
      )}

      {/* High-Res Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900 truncate">
                {previewItem.title}
              </h3>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-medium px-2 py-1"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-neutral-100">
              {previewItem.dataUrl ? (
                <img
                  src={previewItem.dataUrl}
                  alt={previewItem.title}
                  style={{ transform: `rotate(${previewItem.rotation || 0}deg)` }}
                  className="max-h-[75vh] max-w-full object-contain shadow-md rounded"
                />
              ) : (
                <div className="p-8 bg-white rounded shadow text-sm whitespace-pre-wrap max-w-xl">
                  {previewItem.noteContent}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sketch Pad Modal */}
      <SketchPadModal
        isOpen={isSketchModalOpen}
        onClose={() => setIsSketchModalOpen(false)}
        onSaveSketch={handleSaveSketch}
        targetDescription="This sketch will be appended as a new page in your document sequence."
      />
    </div>
  );
};
