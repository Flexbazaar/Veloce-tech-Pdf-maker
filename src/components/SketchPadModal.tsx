import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  Eraser, 
  PenTool, 
  Highlighter, 
  Check, 
  Download, 
  Grid, 
  Square,
  FilePlus,
  Palette
} from 'lucide-react';

interface SketchPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSketch: (dataUrl: string, title: string) => void;
  initialTitle?: string;
  targetDescription?: string;
}

const PRESET_COLORS = [
  '#0f172a', // Slate black
  '#2563eb', // Royal blue
  '#dc2626', // Crimson red
  '#16a34a', // Emerald green
  '#d97706', // Amber gold
  '#9333ea', // Violet purple
  '#ffffff', // White
];

const STROKE_SIZES = [
  { label: 'Fine', size: 2 },
  { label: 'Medium', size: 5 },
  { label: 'Thick', size: 10 },
  { label: 'Marker', size: 22 },
];

export const SketchPadModal: React.FC<SketchPadModalProps> = ({
  isOpen,
  onClose,
  onSaveSketch,
  initialTitle = 'Sketch Diagram',
  targetDescription = 'Add sketch or drawing to your document',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [color, setColor] = useState('#0f172a');
  const [strokeSize, setStrokeSize] = useState(3);
  const [backgroundPattern, setBackgroundPattern] = useState<'white' | 'grid' | 'lined'>('white');
  const [sketchTitle, setSketchTitle] = useState(initialTitle);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI canvas
    canvas.width = 1000;
    canvas.height = 750;

    redrawBackground(ctx, backgroundPattern);
    saveState();
  }, [isOpen]);

  const redrawBackground = (ctx: CanvasRenderingContext2D, bg: 'white' | 'grid' | 'lined') => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1000, 750);

    if (bg === 'grid') {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      const step = 25;
      for (let x = step; x < 1000; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 750);
        ctx.stroke();
      }
      for (let y = step; y < 750; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1000, y);
        ctx.stroke();
      }
    } else if (bg === 'lined') {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      const step = 32;
      for (let y = step + 20; y < 750; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1000, y);
        ctx.stroke();
      }
      // Red margin line
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(80, 0);
      ctx.lineTo(80, 750);
      ctx.stroke();
    }
  };

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    redrawBackground(ctx, backgroundPattern);
    saveState();
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = strokeSize * 3;
      ctx.globalAlpha = 1.0;
    } else if (tool === 'highlighter') {
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeSize * 2.5;
      ctx.globalAlpha = 0.35;
      ctx.lineCap = 'square';
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeSize;
      ctx.globalAlpha = 1.0;
      ctx.lineCap = 'round';
    }
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveState();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSaveSketch(dataUrl, sketchTitle || 'Sketch');
    onClose();
  };

  const handleDownloadOnly = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${sketchTitle.toLowerCase().replace(/\s+/g, '-') || 'sketch'}.png`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 flex flex-col w-full max-w-5xl max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/70">
          <div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={sketchTitle}
                onChange={(e) => setSketchTitle(e.target.value)}
                className="text-base font-semibold text-neutral-900 bg-transparent border-b border-dashed border-neutral-300 focus:border-neutral-900 focus:outline-none px-1"
                placeholder="Sketch Title"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">{targetDescription}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadOnly}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download PNG
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Apply to Document
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-200/60 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-white border-b border-neutral-200 text-xs">
          {/* Tools */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
            <button
              onClick={() => setTool('pen')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                tool === 'pen' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              Pen
            </button>
            <button
              onClick={() => setTool('highlighter')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                tool === 'highlighter' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Highlighter className="w-3.5 h-3.5" />
              Marker
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                tool === 'eraser' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              Eraser
            </button>
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500 text-xs">Size:</span>
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
              {STROKE_SIZES.map((sz) => (
                <button
                  key={sz.label}
                  onClick={() => setStrokeSize(sz.size)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    strokeSize === sz.size ? 'bg-white font-medium text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>

          {/* Palette */}
          {tool !== 'eraser' && (
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 text-xs">Color:</span>
              <div className="flex items-center gap-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full border border-neutral-300 transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-neutral-900 ring-offset-1' : 'hover:scale-110'
                    }`}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-5 h-5 p-0 border-0 rounded cursor-pointer ml-1"
                  title="Custom Color"
                />
              </div>
            </div>
          )}

          {/* Paper Style */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
            <button
              onClick={() => {
                setBackgroundPattern('white');
                const canvas = canvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  if (ctx) redrawBackground(ctx, 'white');
                }
              }}
              className={`p-1 rounded ${backgroundPattern === 'white' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'}`}
              title="Plain White Paper"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setBackgroundPattern('grid');
                const canvas = canvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  if (ctx) redrawBackground(ctx, 'grid');
                }
              }}
              className={`p-1 rounded ${backgroundPattern === 'grid' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'}`}
              title="Grid Graph Paper"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Undo / Reset */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 disabled:opacity-30 rounded hover:bg-neutral-100 transition-colors"
              title="Undo last stroke"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              className="px-2 py-1 text-xs text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-neutral-100 overflow-auto p-4 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="border border-neutral-300 shadow-md rounded bg-white cursor-crosshair touch-none max-w-full max-h-[60vh] object-contain"
          />
        </div>
      </div>
    </div>
  );
};
