import React, { useState } from 'react';
import { 
  Minimize2, 
  Upload, 
  Download, 
  CheckCircle, 
  FileText, 
  ArrowRight, 
  Sliders, 
  RefreshCw,
  Layers,
  Sparkles
} from 'lucide-react';
import { compressPdfFile } from '../lib/pdfEngine';
import { DocumentItem } from '../types';

interface PdfCompressorProps {
  onLoadIntoStudio?: (items: DocumentItem[]) => void;
}

export const PdfCompressor: React.FC<PdfCompressorProps> = ({ onLoadIntoStudio }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<'light' | 'recommended' | 'extreme' | 'custom'>('recommended');
  const [customQuality, setCustomQuality] = useState<number>(0.65);
  const [customScale, setCustomScale] = useState<number>(0.75);

  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [result, setResult] = useState<{
    blob: Blob;
    originalSize: number;
    compressedSize: number;
    reductionPct: number;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setSelectedFile(file);
        setResult(null);
      } else {
        alert('Please upload a PDF document for compression.');
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleCompress = async () => {
    if (!selectedFile) return;

    let scale = 0.75;
    let quality = 0.65;

    if (preset === 'extreme') {
      scale = 0.55;
      quality = 0.45;
    } else if (preset === 'recommended') {
      scale = 0.75;
      quality = 0.65;
    } else if (preset === 'light') {
      scale = 0.9;
      quality = 0.82;
    } else {
      scale = customScale;
      quality = customQuality;
    }

    try {
      setIsCompressing(true);
      setProgress({ current: 0, total: 1 });

      const compressedResult = await compressPdfFile(
        selectedFile,
        scale,
        quality,
        (current, total) => {
          setProgress({ current, total });
        }
      );

      setResult(compressedResult);
    } catch (err: any) {
      alert('Error compressing PDF: ' + err.message);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!result || !selectedFile) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFile.name.replace(/\.pdf$/i, '')}-compressed.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title Card */}
      <div className="bg-white p-6 rounded-xl border border-neutral-200">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-neutral-100 rounded-lg text-neutral-800">
            <Minimize2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">PDF Compression Engine</h2>
            <p className="text-xs text-neutral-500">
              Reduce large PDF file sizes for rapid email sharing and uploading — 100% in your browser.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Box */}
      {!selectedFile ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-neutral-300 hover:border-neutral-400 bg-white p-12 rounded-2xl text-center transition-colors"
        >
          <div className="w-14 h-14 mx-auto mb-4 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-700">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-neutral-900 mb-1">
            Choose a PDF to Compress
          </h3>
          <p className="text-xs text-neutral-500 mb-6">
            Drag and drop your PDF here or select a file from your device
          </p>
          <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-medium rounded-lg cursor-pointer transition-colors shadow-sm">
            <Upload className="w-4 h-4" />
            <span>Select PDF File</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File Selected Card */}
          <div className="bg-white p-5 rounded-xl border border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-700">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{selectedFile.name}</p>
                <p className="text-xs text-neutral-500 font-mono tabular-nums">
                  Original Size: {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <label className="text-xs font-medium text-neutral-600 hover:text-neutral-900 cursor-pointer underline">
              Change File
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Compression Level Selector */}
          <div className="bg-white p-6 rounded-xl border border-neutral-200 space-y-4">
            <h4 className="text-sm font-semibold text-neutral-900">Select Compression Level</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Extreme */}
              <div
                onClick={() => setPreset('extreme')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  preset === 'extreme'
                    ? 'border-neutral-900 bg-neutral-50/80 ring-1 ring-neutral-900'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-neutral-900">Extreme</span>
                  <span className="text-[10px] bg-neutral-200 px-1.5 py-0.5 rounded font-mono">~70-80%</span>
                </div>
                <p className="text-xs text-neutral-500">
                  Lowest resolution, smallest possible file size for strict upload limits.
                </p>
              </div>

              {/* Recommended */}
              <div
                onClick={() => setPreset('recommended')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  preset === 'recommended'
                    ? 'border-neutral-900 bg-neutral-50/80 ring-1 ring-neutral-900'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-neutral-900">Recommended</span>
                  <span className="text-[10px] bg-neutral-900 text-white px-1.5 py-0.5 rounded font-mono">Balanced</span>
                </div>
                <p className="text-xs text-neutral-500">
                  Great balance between clear document legibility and high file compression.
                </p>
              </div>

              {/* Light */}
              <div
                onClick={() => setPreset('light')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  preset === 'light'
                    ? 'border-neutral-900 bg-neutral-50/80 ring-1 ring-neutral-900'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-neutral-900">Light</span>
                  <span className="text-[10px] bg-neutral-200 px-1.5 py-0.5 rounded font-mono">~25-40%</span>
                </div>
                <p className="text-xs text-neutral-500">
                  Preserves high image fidelity and crisp typography with modest reduction.
                </p>
              </div>
            </div>

            {/* Custom Mode Toggle */}
            <div className="pt-2">
              <button
                onClick={() => setPreset(preset === 'custom' ? 'recommended' : 'custom')}
                className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{preset === 'custom' ? 'Hide Custom Sliders' : 'Fine-Tune Sliders (Advanced)'}</span>
              </button>

              {preset === 'custom' && (
                <div className="mt-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-neutral-700">Image Quality:</span>
                      <span className="font-mono tabular-nums">{Math.round(customQuality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="0.95"
                      step="0.05"
                      value={customQuality}
                      onChange={(e) => setCustomQuality(parseFloat(e.target.value))}
                      className="w-full accent-neutral-900"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-neutral-700">DPI / Resolution Scale:</span>
                      <span className="font-mono tabular-nums">{Math.round(customScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="1.0"
                      step="0.05"
                      value={customScale}
                      onChange={(e) => setCustomScale(parseFloat(e.target.value))}
                      className="w-full accent-neutral-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Compress Button */}
            <div className="pt-3">
              <button
                onClick={handleCompress}
                disabled={isCompressing}
                className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                {isCompressing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Compressing Page {progress.current} of {progress.total}...</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-4 h-4" />
                    <span>Compress PDF Now</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Compression Results Banner */}
          {result && (
            <div className="bg-white p-6 rounded-xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                <CheckCircle className="w-5 h-5" />
                <span>PDF Compression Complete!</span>
              </div>

              {/* Size metrics */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-center">
                <div>
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Original Size</p>
                  <p className="text-base font-bold text-neutral-800 font-mono tabular-nums mt-0.5">
                    {formatFileSize(result.originalSize)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Compressed Size</p>
                  <p className="text-base font-bold text-emerald-600 font-mono tabular-nums mt-0.5">
                    {formatFileSize(result.compressedSize)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Storage Saved</p>
                  <p className="text-base font-bold text-neutral-900 font-mono tabular-nums mt-0.5">
                    -{result.reductionPct}%
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Compressed PDF
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
