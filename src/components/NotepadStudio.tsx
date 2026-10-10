import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  PenTool, 
  Image as ImageIcon, 
  Download, 
  Save, 
  Plus, 
  Trash2, 
  Layers, 
  Check, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Quote, 
  Bold, 
  Italic,
  Eye,
  FileCheck
} from 'lucide-react';
import { NoteDocument, DocumentItem } from '../types';
import { exportNoteToDocx } from '../lib/docxEngine';
import { createPdfFromItems } from '../lib/pdfEngine';
import { saveNoteToStorage, loadAllNotes, deleteNoteFromStorage } from '../lib/storage';
import { SketchPadModal } from './SketchPadModal';

interface NotepadStudioProps {
  onAppendToDocument: (items: DocumentItem[]) => void;
}

export const NotepadStudio: React.FC<NotepadStudioProps> = ({ onAppendToDocument }) => {
  const [notes, setNotes] = useState<NoteDocument[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string>('');
  const [currentNote, setCurrentNote] = useState<NoteDocument>({
    id: `note-${Date.now()}`,
    title: 'Meeting Notes & Project Brief',
    content: `# Project Overview\n\nWelcome to Veloce tech pdf maker Notepad. Write your document notes, research outlines, or project requirements here.\n\n## How to Use\n- Type or format your notes using the toolbar buttons\n- Click "Attach Image" to embed photos directly into your note\n- Click "Draw Sketch" to add drawings, formulas, or signatures\n- Click "Word (.docx)" or "Download PDF" to save your document\n\n> "Create illustrated documents effortlessly with Veloce tech pdf maker."`,
    images: [],
    sketches: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const [isSketchOpen, setIsSketchOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Load notes on mount
  useEffect(() => {
    loadAllNotes().then((saved) => {
      if (saved && saved.length > 0) {
        setNotes(saved);
        setActiveNoteId(saved[0].id);
        setCurrentNote(saved[0]);
      } else {
        // Save initial note
        saveNoteToStorage(currentNote);
        setNotes([currentNote]);
        setActiveNoteId(currentNote.id);
      }
    });
  }, []);

  const handleSelectNote = (note: NoteDocument) => {
    setActiveNoteId(note.id);
    setCurrentNote(note);
  };

  const handleCreateNewNote = () => {
    const newNote: NoteDocument = {
      id: `note-${Date.now()}`,
      title: 'Untitled Document',
      content: '# New Document\n\nStart typing notes, insert photographs, or draw a diagram...',
      images: [],
      sketches: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveNoteToStorage(newNote);
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setCurrentNote(newNote);
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this note document?')) return;
    await deleteNoteFromStorage(id);
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    if (activeNoteId === id) {
      if (updated.length > 0) {
        setActiveNoteId(updated[0].id);
        setCurrentNote(updated[0]);
      } else {
        handleCreateNewNote();
      }
    }
  };

  const handleSaveCurrentNote = async () => {
    const updated = {
      ...currentNote,
      updatedAt: Date.now(),
    };
    await saveNoteToStorage(updated);
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setSaveStatus('Saved!');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  // Add formatting tags to content textarea
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('note-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = currentNote.content;
    const selected = text.substring(start, end);

    const replacement = prefix + (selected || 'text') + suffix;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setCurrentNote({ ...currentNote, content: newContent });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 4));
    }, 10);
  };

  // Handle image upload into note
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newImages = [
        ...currentNote.images,
        {
          id: `img-${Date.now()}`,
          dataUrl,
          caption: file.name.replace(/\.[^.]+$/, ''),
        },
      ];
      const updated = { ...currentNote, images: newImages };
      setCurrentNote(updated);
      saveNoteToStorage(updated);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle sketch added into note
  const handleSaveSketch = (dataUrl: string, title: string) => {
    const newSketches = [
      ...currentNote.sketches,
      {
        id: `sketch-${Date.now()}`,
        dataUrl,
        title: title || 'Hand-drawn Sketch',
      },
    ];
    const updated = { ...currentNote, sketches: newSketches };
    setCurrentNote(updated);
    saveNoteToStorage(updated);
  };

  // Remove embedded image from note
  const handleRemoveImage = (imgId: string) => {
    const updated = {
      ...currentNote,
      images: currentNote.images.filter((img) => img.id !== imgId),
    };
    setCurrentNote(updated);
    saveNoteToStorage(updated);
  };

  // Remove embedded sketch from note
  const handleRemoveSketch = (sketchId: string) => {
    const updated = {
      ...currentNote,
      sketches: currentNote.sketches.filter((sk) => sk.id !== sketchId),
    };
    setCurrentNote(updated);
    saveNoteToStorage(updated);
  };

  // Export note to Word (.docx)
  const handleExportDocx = async () => {
    try {
      setIsExporting(true);
      const blob = await exportNoteToDocx(currentNote);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentNote.title.trim() || 'Note-Document'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Error exporting Word document: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Export note to PDF
  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const items: DocumentItem[] = [];

      // 1. Note text page
      items.push({
        id: `note-page-${currentNote.id}`,
        type: 'note',
        title: currentNote.title,
        dataUrl: '',
        width: 595,
        height: 842,
        rotation: 0,
        noteContent: currentNote.content,
      });

      // 2. Attached images
      for (const img of currentNote.images) {
        items.push({
          id: img.id,
          type: 'image',
          title: img.caption || 'Embedded Image',
          dataUrl: img.dataUrl,
          width: 800,
          height: 600,
          rotation: 0,
        });
      }

      // 3. Attached sketches
      for (const sk of currentNote.sketches) {
        items.push({
          id: sk.id,
          type: 'sketch',
          title: sk.title || 'Sketch Diagram',
          dataUrl: sk.dataUrl,
          width: 1000,
          height: 750,
          rotation: 0,
        });
      }

      const blob = await createPdfFromItems(items, {
        pageSize: 'a4',
        orientation: 'portrait',
        margin: 'normal',
        imageQuality: 0.9,
        includePageNumbers: true,
        documentTitle: currentNote.title,
        authorName: 'PaperForge User',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentNote.title.trim() || 'Note-Document'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Error exporting PDF: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Append all note pages into master workspace
  const handleAppendToMaster = () => {
    const items: DocumentItem[] = [];

    items.push({
      id: `note-p-${Date.now()}`,
      type: 'note',
      title: currentNote.title,
      dataUrl: '',
      width: 595,
      height: 842,
      rotation: 0,
      noteContent: currentNote.content,
    });

    for (const img of currentNote.images) {
      items.push({
        id: `img-p-${Date.now()}-${img.id}`,
        type: 'image',
        title: img.caption || 'Note Image',
        dataUrl: img.dataUrl,
        width: 800,
        height: 600,
        rotation: 0,
      });
    }

    for (const sk of currentNote.sketches) {
      items.push({
        id: `sk-p-${Date.now()}-${sk.id}`,
        type: 'sketch',
        title: sk.title || 'Note Sketch',
        dataUrl: sk.dataUrl,
        width: 1000,
        height: 750,
        rotation: 0,
      });
    }

    onAppendToDocument(items);
    alert(`Added ${items.length} page(s) from this note into Document Studio!`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar: Notes List */}
      <div className="lg:col-span-1 bg-white p-4 rounded-xl border border-neutral-200 flex flex-col h-[750px]">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-neutral-700" />
            <h3 className="text-sm font-semibold text-neutral-900">Saved Notes</h3>
          </div>
          <button
            onClick={handleCreateNewNote}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => handleSelectNote(note)}
              className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-left transition-colors ${
                activeNoteId === note.id
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <div className="overflow-hidden pr-2">
                <p className="text-xs font-medium truncate">{note.title || 'Untitled'}</p>
                <p className={`text-[10px] truncate mt-0.5 ${activeNoteId === note.id ? 'text-neutral-300' : 'text-neutral-400'}`}>
                  {new Date(note.updatedAt).toLocaleDateString()} · {(note.images?.length || 0) + (note.sketches?.length || 0)} visuals
                </p>
              </div>
              <button
                onClick={(e) => handleDeleteNote(note.id, e)}
                className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-opacity ${
                  activeNoteId === note.id ? 'text-neutral-200 hover:text-white' : 'text-neutral-400 hover:text-red-600'
                }`}
                title="Delete note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Editor & Studio Area */}
      <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-neutral-200 flex flex-col h-[750px] overflow-hidden">
        {/* Note Title & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200">
          <input
            type="text"
            value={currentNote.title}
            onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
            className="text-lg font-bold text-neutral-900 bg-transparent focus:outline-none focus:border-b focus:border-neutral-900 px-1"
            placeholder="Document Note Title..."
          />

          <div className="flex flex-wrap items-center gap-2">
            {saveStatus && (
              <span className="text-xs text-emerald-600 font-medium px-2 animate-in fade-in">
                {saveStatus}
              </span>
            )}

            <button
              onClick={handleSaveCurrentNote}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </button>

            <button
              onClick={handleAppendToMaster}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              title="Add pages to Document Studio"
            >
              <Layers className="w-3.5 h-3.5" />
              Add to Master Doc
            </button>

            <button
              onClick={handleExportDocx}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
            >
              <FileCheck className="w-3.5 h-3.5" />
              Word (.docx)
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-neutral-100 text-neutral-700 text-xs bg-neutral-50/50 -mx-5 px-5">
          <div className="flex items-center gap-1">
            <button
              onClick={() => insertFormatting('# ', '\n')}
              className="p-1.5 hover:bg-neutral-200 rounded transition-colors"
              title="Heading 1"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('## ', '\n')}
              className="p-1.5 hover:bg-neutral-200 rounded transition-colors"
              title="Heading 2"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-neutral-300 mx-1" />
            <button
              onClick={() => insertFormatting('**', '**')}
              className="p-1.5 hover:bg-neutral-200 rounded transition-colors"
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('*', '*')}
              className="p-1.5 hover:bg-neutral-200 rounded transition-colors"
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('- ', '')}
              className="p-1.5 hover:bg-neutral-200 rounded transition-colors"
              title="Bullet list"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('1. ', '')}
              className="p-1.5 hover:bg-neutral-200 rounded transition-colors"
              title="Numbered list"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting('> ', '')}
              className="p-1.5 hover:bg-neutral-200 rounded transition-colors"
              title="Quote callout"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Visual Embedding Buttons */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md cursor-pointer hover:bg-neutral-50 transition-colors">
              <ImageIcon className="w-3.5 h-3.5 text-neutral-600" />
              <span>Attach Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setIsSketchOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
            >
              <PenTool className="w-3.5 h-3.5 text-neutral-600" />
              <span>Draw Sketch</span>
            </button>
          </div>
        </div>

        {/* Split View: Text Area + Visual Attachments Panel */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 pt-3 overflow-hidden">
          {/* Main Text Note Area */}
          <div className="flex-1 flex flex-col">
            <textarea
              id="note-textarea"
              value={currentNote.content}
              onChange={(e) => setCurrentNote({ ...currentNote, content: e.target.value })}
              className="w-full flex-1 p-3 bg-neutral-50/50 border border-neutral-200 rounded-lg text-sm text-neutral-800 leading-relaxed font-mono resize-none focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white transition-all"
              placeholder="Write your document content here..."
            />
          </div>

          {/* Visual Elements Drawer: Sketches & Images */}
          {((currentNote.images && currentNote.images.length > 0) ||
            (currentNote.sketches && currentNote.sketches.length > 0)) && (
            <div className="w-full md:w-64 bg-neutral-50 p-3 rounded-lg border border-neutral-200 flex flex-col overflow-y-auto max-h-[300px] md:max-h-full">
              <p className="text-xs font-semibold text-neutral-700 mb-2">
                Visual Attachments ({(currentNote.images?.length || 0) + (currentNote.sketches?.length || 0)})
              </p>

              <div className="space-y-3">
                {/* Images */}
                {currentNote.images?.map((img) => (
                  <div key={img.id} className="relative bg-white p-1.5 rounded-lg border border-neutral-200 group">
                    <img
                      src={img.dataUrl}
                      alt={img.caption || 'Image'}
                      className="w-full h-24 object-cover rounded"
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-600">
                      <span className="truncate pr-1">{img.caption || 'Photo'}</span>
                      <button
                        onClick={() => handleRemoveImage(img.id)}
                        className="text-neutral-400 hover:text-red-600"
                        title="Remove image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Sketches */}
                {currentNote.sketches?.map((sk) => (
                  <div key={sk.id} className="relative bg-white p-1.5 rounded-lg border border-neutral-200 group">
                    <img
                      src={sk.dataUrl}
                      alt={sk.title || 'Sketch'}
                      className="w-full h-24 object-contain bg-neutral-100 rounded"
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-600">
                      <span className="truncate pr-1">{sk.title || 'Sketch'}</span>
                      <button
                        onClick={() => handleRemoveSketch(sk.id)}
                        className="text-neutral-400 hover:text-red-600"
                        title="Remove sketch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sketch Modal */}
      <SketchPadModal
        isOpen={isSketchOpen}
        onClose={() => setIsSketchOpen(false)}
        onSaveSketch={handleSaveSketch}
        targetDescription="Draw a diagram, visual formula, or handwritten note to embed directly into this note document."
      />
    </div>
  );
};
