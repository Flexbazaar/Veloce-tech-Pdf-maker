import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Smartphone, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  Globe, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';
import QRCode from 'qrcode';
import { createSyncBundle, restoreSyncBundle } from '../lib/storage';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncRestored: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onSyncRestored,
}) => {
  const [currentUrl, setCurrentUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      setCurrentUrl(url);

      QRCode.toDataURL(url, {
        width: 220,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [isOpen]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportSync = async () => {
    try {
      const jsonStr = await createSyncBundle();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PaperForge-Workspace-Sync-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSyncStatus('Backup file exported!');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (e: any) {
      alert('Error exporting sync file: ' + e.message);
    }
  };

  const handleImportSync = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const result = await restoreSyncBundle(text);
        setSyncStatus(`Sync successful! Restored ${result.itemsCount} items & ${result.notesCount} notes.`);
        onSyncRestored();
        setTimeout(() => {
          setSyncStatus('');
          onClose();
        }, 1500);
      } catch (err: any) {
        alert('Invalid PaperForge sync file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-neutral-800" />
            <h3 className="text-base font-bold text-neutral-900">
              Cross-Device Access &amp; Sync
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-xs text-neutral-600">
          {/* Mobile QR Section */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-36 h-36 rounded-lg border border-neutral-200 bg-white p-1 shrink-0"
              />
            ) : (
              <div className="w-36 h-36 rounded-lg bg-neutral-200 animate-pulse shrink-0" />
            )}
            <div className="space-y-2 text-center sm:text-left">
              <h4 className="text-sm font-semibold text-neutral-900">
                Open on Mobile Phone or Tablet
              </h4>
              <p className="text-neutral-500">
                Scan this QR code with your phone camera to take photo scans or review documents on the go.
              </p>
              <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-800 font-medium hover:bg-neutral-100 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied Link' : 'Copy App Link'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sync Bundle Transfer */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-neutral-900">
              How to Transfer Your Work to Another Device
            </h4>
            <p className="text-neutral-500 leading-relaxed">
              Click &quot;Export Sync Package&quot; to save your current work. Open Veloce tech pdf maker on your phone, tablet, or another computer and click &quot;Import Sync Package&quot; to restore all your pages, notes, and sketches seamlessly.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleExportSync}
                className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl font-medium text-neutral-800 transition-colors"
              >
                <Download className="w-4 h-4 text-neutral-600" />
                <span>Export Sync Package</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-medium transition-colors shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>Import Sync Package</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportSync}
                className="hidden"
              />
            </div>

            {syncStatus && (
              <p className="text-center font-medium text-emerald-600 pt-1">
                {syncStatus}
              </p>
            )}
          </div>

          {/* Quick Guide on How to Use the App */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
            <div className="flex items-center gap-2 text-neutral-900 font-semibold">
              <Check className="w-4 h-4 text-neutral-700" />
              <span>How to Use Veloce tech pdf maker</span>
            </div>
            <p className="text-neutral-500 leading-relaxed text-[11px]">
              • <strong>Document Studio:</strong> Drag and drop your photos, arrange page sequence, rotate images, and choose between PDF or Word (.docx) formats.<br />
              • <strong>Merge &amp; Split:</strong> Combine multiple PDFs and image files together into one unified document.<br />
              • <strong>Compress PDF:</strong> Select your PDF and choose a compression level to shrink file size for easy email sharing.<br />
              • <strong>Notepad &amp; Sketch:</strong> Type reports, attach photos, and draw diagrams or signatures directly on your documents.<br />
              • <strong>Page Annotator:</strong> Add approval stamps, handwritten signatures, and custom text notes over any page.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
