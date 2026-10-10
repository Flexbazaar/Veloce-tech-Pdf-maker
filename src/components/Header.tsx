import React from 'react';
import { Share2, Layers, FileText, Minimize2, PenTool, Edit3 } from 'lucide-react';

export type ActiveTab = 'studio' | 'merge' | 'compress' | 'notepad' | 'annotate';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenSync: () => void;
  documentCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenSync,
  documentCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand Wordmark & Logo */}
          <div 
            onClick={() => onTabChange('studio')}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-xs group-hover:bg-neutral-800 transition-colors">
              V
            </div>
            <span
              className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 whitespace-nowrap group-hover:text-neutral-700 transition-colors"
            >
              Veloce tech pdf maker
            </span>
            {documentCount > 0 && (
              <span className="hidden sm:inline-block text-xs text-neutral-500 font-mono tabular-nums">
                · {documentCount} {documentCount === 1 ? 'page' : 'pages'}
              </span>
            )}
          </div>

          {/* Zone 2: 4–5 single-line nav links */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-2">
            <button
              onClick={() => onTabChange('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'studio'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Document Studio</span>
            </button>

            <button
              onClick={() => onTabChange('merge')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'merge'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Merge &amp; Split</span>
            </button>

            <button
              onClick={() => onTabChange('compress')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'compress'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Compress PDF</span>
            </button>

            <button
              onClick={() => onTabChange('notepad')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'notepad'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Notepad &amp; Sketch</span>
            </button>

            <button
              onClick={() => onTabChange('annotate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'annotate'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Page Annotator</span>
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenSync}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-lg whitespace-nowrap shrink-0 transition-colors"
              title="Backup & Cross-Device Sync"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Device Sync</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
