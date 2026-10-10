import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, FileText, Camera, Plus } from 'lucide-react';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  isCompact?: boolean;
  acceptedTypes?: string;
  helperText?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFilesSelected,
  isCompact = false,
  acceptedTypes = 'image/*,application/pdf',
  helperText = 'Drop photos, scans, or existing PDF files here',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFilesSelected(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
      e.target.value = ''; // Reset input
    }
  };

  if (isCompact) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          isDragOver
            ? 'border-neutral-900 bg-neutral-100'
            : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes}
          onChange={handleFileInputChange}
          className="hidden"
        />
        <Plus className="w-4 h-4 text-neutral-600" />
        <span className="text-xs font-medium text-neutral-700">Add More Files</span>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative p-8 sm:p-12 border-2 border-dashed rounded-2xl text-center transition-all ${
        isDragOver
          ? 'border-neutral-900 bg-neutral-100/80 scale-[0.99]'
          : 'border-neutral-300 hover:border-neutral-400 bg-white'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes}
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="flex justify-center gap-2 mb-4">
        <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 border border-neutral-200">
          <ImageIcon className="w-6 h-6" />
        </div>
        <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 border border-neutral-200">
          <FileText className="w-6 h-6" />
        </div>
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-neutral-900 mb-1">
        Upload Photos &amp; Documents
      </h3>
      <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto mb-6">
        {helperText} · Fast, simple, and intuitive document creation
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          <Upload className="w-4 h-4" />
          Select Files from Computer
        </button>

        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 text-xs sm:text-sm font-medium rounded-lg transition-colors"
        >
          <Camera className="w-4 h-4" />
          Camera Scan
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-neutral-400">
        <span>PNG</span>
        <span>·</span>
        <span>JPG</span>
        <span>·</span>
        <span>WEBP</span>
        <span>·</span>
        <span>PDF</span>
        <span>·</span>
        <span>Multi-page</span>
      </div>
    </div>
  );
};
