import React, { useRef, useState, useEffect } from 'react';
import { 
  PenTool, 
  Type, 
  Stamp, 
  RotateCcw, 
  Eraser, 
  Download, 
  Save, 
  Upload, 
  FileText, 
  Check, 
  Palette,
  Layers
} from 'lucide-react';
import { DocumentItem } from '../types';
import { renderPdfPageToDataUrl } from '../lib/pdfEngine';

interface PdfAnnotatorProps {
  initialItem?: DocumentItem | null;
  onSaveToStudio: (updatedItem: DocumentItem) => void;
}

export const PdfAnnotator: React.FC<PdfAnnotatorProps> = ({
  initialItem,
  onSaveToStudio,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeItem, setActiveItem] = useState<DocumentItem | null>(initialItem || null);
  const [tool, setTool] = useState<'pen' | 'text' | 'stamp' | 'eraser'>('pen');
  const [color, setColor] = useState('#dc2626'); // Red default for markup
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [stampType, setStampType] = useState<'APPROVED' | 'CONFIDENTIAL' | 'DRAFT' | 'SIGNED'>('APPROVED');
  const [textInput, setTextInput] = useState('');
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Update activeItem if prop changes
  useEffect(() => {
    if (initialItem) {
      setActiveItem(initialItem);
    }
  }, [initialItem]);

  // Load image into canvas
  useEffect(() => {
    if (!activeItem || !activeItem.dataUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 1000;
      ctx.drawImage(img, 0, 0);
      saveState();
    };
    img.src = activeItem.dataUrl;
  }, [activeItem]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(data);
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const newIdx = historyIndex - 1;
    ctx.putImageData(history[newIdx], 0, 0);
    setHistoryIndex(newIdx);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const buffer = await file.arrayBuffer();
      const rendered = await renderPdfPageToDataUrl(buffer, 0, 1.5);
      setActiveItem({
        id: `pdf-annotated-${Date.now()}`,
        type: 'pdf_page',
        title: `${file.name} (Annotated)`,
        dataUrl: rendered.dataUrl,
        width: rendered.width,
        height: rendered.height,
        rotation: 0,
      });
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setActiveItem({
          id: `img-annotated-${Date.now()}`,
          type: 'image',
          title: `${file.name} (Annotated)`,
          dataUrl,
          width: 800,
          height: 1000,
          rotation: 0,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);

    if (tool === 'stamp') {
      // Draw stamp at coordinates
      drawStamp(ctx, x, y, stampType);
      saveState();
      return;
    }

    if (tool === 'text') {
      // Draw text note at coordinates
      if (!textInput.trim()) {
        const input = prompt('Enter text note to place on this page:');
        if (input) {
          drawText(ctx, x, y, input);
          saveState();
        }
      } else {
        drawText(ctx, x, y, textInput);
        saveState();
      }
      return;
    }

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);

    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = strokeWidth * 4;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveState();
  };

  const drawStamp = (ctx: CanvasRenderingContext2D, x: number, y: number, type: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((-12 * Math.PI) / 180);

    let stampColor = '#dc2626'; // Red
    let label = type;
    if (type === 'APPROVED') {
      stampColor = '#16a34a'; // Green
    } else if (type === 'SIGNED') {
      stampColor = '#2563eb'; // Blue
      label = `SIGNED · ${new Date().toLocaleDateString()}`;
    }

    ctx.strokeStyle = stampColor;
    ctx.fillStyle = stampColor;
    ctx.lineWidth = 4;

    const width = 200;
    const height = 50;

    ctx.strokeRect(-width / 2, -height / 2, width, height);

    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);

    ctx.restore();
  };

  const drawText = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string) => {
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.max(16, strokeWidth * 6)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);
  };

  const handleSaveToStudio = () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeItem) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    const updated: DocumentItem = {
      ...activeItem,
      dataUrl,
      title: activeItem.title.includes('(Annotated)') ? activeItem.title : `${activeItem.title} (Annotated)`,
    };
    onSaveToStudio(updated);
    alert('Annotated page updated in Document Studio!');
  };

  const handleDownloadOnly = () => {
    const canvas = canvasRef.current;
    if (!canvas || !activeItem) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${activeItem.title.toLowerCase().replace(/\s+/g, '-')}.jpg`;
    a.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="bg-white p-5 rounded-xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Page Annotator &amp; Editor</h2>
          <p className="text-xs text-neutral-500">
            Edit saved document pages: sketch handwritten signatures, add approval stamps, highlight, or add text labels.
          </p>
        </div>

        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-lg cursor-pointer transition-colors shrink-0">
          <Upload className="w-3.5 h-3.5" />
          <span>Upload PDF Page / Photo</span>
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={handleUploadFile}
            className="hidden"
          />
        </label>
      </div>

      {!activeItem ? (
        <div className="bg-white p-12 text-center rounded-xl border border-neutral-200 space-y-4">
          <FileText className="w-10 h-10 text-neutral-400 mx-auto" />
          <h3 className="text-sm font-semibold text-neutral-800">No Page Currently Selected</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Choose a page from Document Studio and click the "Annotate" icon, or upload an existing PDF file or photo to start editing.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
          {/* Editor Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-50 border-b border-neutral-200 text-xs">
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-neutral-200">
              <button
                onClick={() => setTool('pen')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
                  tool === 'pen' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                Pen
              </button>
              <button
                onClick={() => setTool('text')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
                  tool === 'text' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                Text Note
              </button>
              <button
                onClick={() => setTool('stamp')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
                  tool === 'stamp' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Stamp className="w-3.5 h-3.5" />
                Stamp
              </button>
              <button
                onClick={() => setTool('eraser')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
                  tool === 'eraser' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                Eraser
              </button>
            </div>

            {/* Stamp selection */}
            {tool === 'stamp' && (
              <div className="flex items-center gap-1">
                {(['APPROVED', 'CONFIDENTIAL', 'DRAFT', 'SIGNED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStampType(st)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                      stampType === st
                        ? 'bg-neutral-900 text-white'
                        : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}

            {/* Text input for quick placement */}
            {tool === 'text' && (
              <input
                type="text"
                placeholder="Click on canvas to place text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="px-2 py-1 bg-white border border-neutral-300 rounded text-xs w-48"
              />
            )}

            {/* Colors */}
            {tool !== 'eraser' && tool !== 'stamp' && (
              <div className="flex items-center gap-1">
                {['#dc2626', '#2563eb', '#16a34a', '#0f172a', '#eab308'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-4 h-4 rounded-full border border-neutral-300 ${
                      color === c ? 'scale-125 ring-2 ring-neutral-900' : ''
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-1 text-neutral-600 hover:text-neutral-900 disabled:opacity-30"
                title="Undo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleDownloadOnly}
                className="flex items-center gap-1 px-3 py-1 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>

              <button
                onClick={handleSaveToStudio}
                className="flex items-center gap-1 px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded font-medium transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save to Studio
              </button>
            </div>
          </div>

          {/* Interactive Annotation Canvas */}
          <div className="bg-neutral-100 p-6 flex items-center justify-center overflow-auto max-h-[700px]">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="border border-neutral-300 shadow-lg rounded bg-white cursor-crosshair max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
