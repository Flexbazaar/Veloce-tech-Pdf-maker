/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header';
import { DocumentBuilder } from './components/DocumentBuilder';
import { PdfMerger } from './components/PdfMerger';
import { PdfCompressor } from './components/PdfCompressor';
import { NotepadStudio } from './components/NotepadStudio';
import { PdfAnnotator } from './components/PdfAnnotator';
import { SyncModal } from './components/SyncModal';
import { DocumentItem } from './types';
import { extractPdfToItems } from './lib/pdfEngine';
import { saveWorkspaceItems, loadWorkspaceItems } from './lib/storage';
import { Layers, Sparkles, FileCheck, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('studio');
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [annotatingItem, setAnnotatingItem] = useState<DocumentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved workspace on mount
  useEffect(() => {
    loadWorkspaceItems()
      .then((saved) => {
        if (saved && saved.length > 0) {
          setItems(saved);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Auto-save items to IndexedDB
  const handleItemsChange = (newItems: DocumentItem[]) => {
    setItems(newItems);
    saveWorkspaceItems(newItems);
  };

  // Process files dropped or picked anywhere in app
  const handleFilesAdded = async (files: File[]) => {
    const newItems: DocumentItem[] = [];

    for (const file of files) {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        try {
          const pdfItems = await extractPdfToItems(file);
          newItems.push(...pdfItems);
        } catch (err) {
          console.error('Failed to parse PDF:', err);
          alert(`Could not parse ${file.name}. Ensure it is a valid PDF.`);
        }
      } else {
        // Image processing
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });

        newItems.push({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'image',
          title: file.name.replace(/\.[^/.]+$/, ''),
          sourceFile: file.name,
          dataUrl,
          width: img.naturalWidth || 800,
          height: img.naturalHeight || 1000,
          rotation: 0,
          originalSize: file.size,
          fitMode: 'fit',
        });
      }
    }

    if (newItems.length > 0) {
      const merged = [...items, ...newItems];
      handleItemsChange(merged);
    }
  };

  // Open Annotator from Studio
  const handleOpenAnnotateFromStudio = (item: DocumentItem) => {
    setAnnotatingItem(item);
    setActiveTab('annotate');
  };

  // Save changes from Annotator back to Studio
  const handleSaveAnnotatedItem = (updatedItem: DocumentItem) => {
    const existingIndex = items.findIndex((i) => i.id === updatedItem.id);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex] = updatedItem;
      handleItemsChange(newItems);
    } else {
      handleItemsChange([...items, updatedItem]);
    }
    setActiveTab('studio');
  };

  // Append new items from Notepad or Merger
  const handleAppendItems = (newItems: DocumentItem[]) => {
    handleItemsChange([...items, ...newItems]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
      {/* 3-Zone Header Contract */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'annotate') {
            setAnnotatingItem(null);
          }
        }}
        onOpenSync={() => setIsSyncModalOpen(true)}
        documentCount={items.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'studio' && (
          <DocumentBuilder
            items={items}
            onItemsChange={handleItemsChange}
            onFilesAdded={handleFilesAdded}
            onOpenAnnotate={handleOpenAnnotateFromStudio}
          />
        )}

        {activeTab === 'merge' && (
          <PdfMerger
            onSendToStudio={(extracted) => {
              handleItemsChange([...items, ...extracted]);
              setActiveTab('studio');
            }}
          />
        )}

        {activeTab === 'compress' && (
          <PdfCompressor
            onLoadIntoStudio={(compressedItems) => {
              handleItemsChange([...items, ...compressedItems]);
              setActiveTab('studio');
            }}
          />
        )}

        {activeTab === 'notepad' && (
          <NotepadStudio onAppendToDocument={handleAppendItems} />
        )}

        {activeTab === 'annotate' && (
          <PdfAnnotator
            initialItem={annotatingItem}
            onSaveToStudio={handleSaveAnnotatedItem}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-800">Developed by VeloceTech Company</span>
            <span>·</span>
            <a
              href="mailto:velocetechcompany@gmail.com"
              className="text-neutral-600 hover:text-neutral-900 transition-colors underline-offset-2 hover:underline"
            >
              velocetechcompany@gmail.com
            </a>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="hover:text-neutral-900 transition-colors"
            >
              Cross-Device Transfer
            </button>
            <span aria-hidden="true">·</span>
            <span>All rights reserved</span>
          </div>
        </div>
      </footer>

      {/* Cross-Device Sync & QR Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSyncRestored={() => {
          loadWorkspaceItems().then((saved) => setItems(saved || []));
        }}
      />
    </div>
  );
}
