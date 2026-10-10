import { DocumentItem, NoteDocument, ExportSettings } from '../types';

const DB_NAME = 'PaperForge_Studio_DB';
const DB_VERSION = 1;
const STORE_ITEMS = 'workspace_items';
const STORE_NOTES = 'workspace_notes';
const STORE_SETTINGS = 'workspace_settings';

export interface SavedProject {
  id: string;
  name: string;
  updatedAt: number;
  itemCount: number;
  items: DocumentItem[];
  settings: ExportSettings;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save current items list to IndexedDB
 */
export async function saveWorkspaceItems(items: DocumentItem[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_ITEMS, 'readwrite');
  const store = tx.objectStore(STORE_ITEMS);
  await new Promise<void>((resolve, reject) => {
    store.put({ id: 'current_workspace', items, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Load current items list from IndexedDB
 */
export async function loadWorkspaceItems(): Promise<DocumentItem[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ITEMS, 'readonly');
    const store = tx.objectStore(STORE_ITEMS);
    return new Promise((resolve) => {
      const req = store.get('current_workspace');
      req.onsuccess = () => {
        resolve(req.result?.items || []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Save a note
 */
export async function saveNoteToStorage(note: NoteDocument): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NOTES, 'readwrite');
  const store = tx.objectStore(STORE_NOTES);
  await new Promise<void>((resolve, reject) => {
    store.put(note);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Load all notes
 */
export async function loadAllNotes(): Promise<NoteDocument[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NOTES, 'readonly');
    const store = tx.objectStore(STORE_NOTES);
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        resolve(req.result || []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Delete a note
 */
export async function deleteNoteFromStorage(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NOTES, 'readwrite');
  const store = tx.objectStore(STORE_NOTES);
  await new Promise<void>((resolve, reject) => {
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Export full workspace sync bundle for cross-device transfer
 */
export async function createSyncBundle(): Promise<string> {
  const items = await loadWorkspaceItems();
  const notes = await loadAllNotes();
  const bundle = {
    version: '1.0',
    exportedAt: Date.now(),
    device: navigator.userAgent.slice(0, 50),
    items,
    notes,
  };
  return JSON.stringify(bundle, null, 2);
}

/**
 * Import and merge sync bundle from another device
 */
export async function restoreSyncBundle(jsonString: string): Promise<{ itemsCount: number; notesCount: number }> {
  const data = JSON.parse(jsonString);
  if (!data.version) {
    throw new Error('Invalid PaperForge sync bundle format');
  }

  if (Array.isArray(data.items)) {
    await saveWorkspaceItems(data.items);
  }

  if (Array.isArray(data.notes)) {
    for (const note of data.notes) {
      await saveNoteToStorage(note);
    }
  }

  return {
    itemsCount: data.items?.length || 0,
    notesCount: data.notes?.length || 0,
  };
}
