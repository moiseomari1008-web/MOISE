import type { DossierType, PublicBootstrapData } from '../types/lomakrev';

const DB_NAME = 'lomakrev_offline_db';
const DB_VERSION = 1;
const STORE_CACHE = 'bootstrap_cache';
const STORE_OUTBOX = 'sync_outbox';
const STORE_DRAFTS = 'form_drafts';
const STORE_RECEIPTS = 'synced_receipts';

export interface OutboxItem {
  localId: string;
  type: DossierType;
  label: string;
  payload: Record<string, unknown>;
  enteredByAgent?: string | null;
  createdAt: string;
  status: 'pending' | 'failed';
  errorMessage?: string;
}

export interface LocalReceipt {
  localId: string;
  reference: string;
  type: DossierType;
  applicantName: string;
  syncedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB non disponible'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) db.createObjectStore(STORE_CACHE);
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) db.createObjectStore(STORE_OUTBOX, { keyPath: 'localId' });
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) db.createObjectStore(STORE_DRAFTS);
      if (!db.objectStoreNames.contains(STORE_RECEIPTS)) db.createObjectStore(STORE_RECEIPTS, { keyPath: 'localId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveBootstrapCache(data: PublicBootstrapData): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CACHE, 'readwrite');
    tx.objectStore(STORE_CACHE).put(data, 'latest');
    localStorage.setItem('lomakrev_bootstrap_ts', new Date().toISOString());
  } catch {
    try {
      localStorage.setItem('lomakrev_bootstrap_fallback', JSON.stringify(data));
    } catch {
      // ignore storage quota errors
    }
  }
}

export async function loadBootstrapCache(): Promise<PublicBootstrapData | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_CACHE, 'readonly');
      const req = tx.objectStore(STORE_CACHE).get('latest');
      req.onsuccess = () => resolve((req.result as PublicBootstrapData) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    try {
      const raw = localStorage.getItem('lomakrev_bootstrap_fallback');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

export async function saveFormDraft(formKey: string, data: Record<string, unknown>): Promise<void> {
  try {
    localStorage.setItem(`lomakrev_draft_${formKey}`, JSON.stringify(data));
    const db = await openDB();
    const tx = db.transaction(STORE_DRAFTS, 'readwrite');
    tx.objectStore(STORE_DRAFTS).put(data, formKey);
  } catch {
    // ignore
  }
}

export async function loadFormDraft<T = Record<string, unknown>>(formKey: string): Promise<T | null> {
  try {
    const raw = localStorage.getItem(`lomakrev_draft_${formKey}`);
    if (raw) return JSON.parse(raw) as T;
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_DRAFTS, 'readonly');
      const req = tx.objectStore(STORE_DRAFTS).get(formKey);
      req.onsuccess = () => resolve((req.result as T) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearFormDraft(formKey: string): Promise<void> {
  try {
    localStorage.removeItem(`lomakrev_draft_${formKey}`);
    const db = await openDB();
    const tx = db.transaction(STORE_DRAFTS, 'readwrite');
    tx.objectStore(STORE_DRAFTS).delete(formKey);
  } catch {
    // ignore
  }
}

export async function enqueueOfflineSubmission(
  type: DossierType,
  label: string,
  payload: Record<string, unknown>,
  enteredByAgent?: string | null
): Promise<OutboxItem> {
  const item: OutboxItem = {
    localId: `OFFLINE-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    type,
    label,
    payload,
    enteredByAgent: enteredByAgent || null,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readwrite');
    tx.objectStore(STORE_OUTBOX).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return item;
}

export async function getOutboxItems(): Promise<OutboxItem[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_OUTBOX, 'readonly');
      const req = tx.objectStore(STORE_OUTBOX).getAll();
      req.onsuccess = () => resolve((req.result as OutboxItem[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function removeOutboxItem(localId: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_OUTBOX, 'readwrite');
    tx.objectStore(STORE_OUTBOX).delete(localId);
    tx.oncomplete = () => resolve();
  });
}

export async function saveLocalReceipt(receipt: LocalReceipt): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_RECEIPTS, 'readwrite');
    tx.objectStore(STORE_RECEIPTS).put(receipt);
  } catch {
    // ignore
  }
}

export async function getLocalReceipts(): Promise<LocalReceipt[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_RECEIPTS, 'readonly');
      const req = tx.objectStore(STORE_RECEIPTS).getAll();
      req.onsuccess = () => resolve((req.result as LocalReceipt[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function clearLocalReceipts(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_RECEIPTS, 'readwrite');
      tx.objectStore(STORE_RECEIPTS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export async function syncOutboxNow(): Promise<{ syncedCount: number; receipts: LocalReceipt[]; errors: string[] }> {
  const items = await getOutboxItems();
  if (items.length === 0) return { syncedCount: 0, receipts: [], errors: [] };

  const res = await fetch('/api/sync/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) {
    throw new Error('Connexion au serveur impossible pour le moment.');
  }

  const data = await res.json();
  const receipts: LocalReceipt[] = [];
  const errors: string[] = [];
  let syncedCount = 0;

  for (const r of data.synced || []) {
    if (r.ok && r.dossier) {
      await removeOutboxItem(r.localId);
      const receipt: LocalReceipt = {
        localId: r.localId,
        reference: r.dossier.reference,
        type: r.dossier.type,
        applicantName: r.dossier.applicantName,
        syncedAt: new Date().toISOString(),
      };
      await saveLocalReceipt(receipt);
      receipts.push(receipt);
      syncedCount++;
    } else if (r.status >= 400 && r.status < 500) {
      // Remove invalid client-rejected submission or mark failed
      await removeOutboxItem(r.localId);
      errors.push(r.error || 'Dossier rejeté lors de la validation.');
    }
  }

  return { syncedCount, receipts, errors };
}

// Provenance tracking (?src=whatsapp, ?src=facebook, etc.)
export function captureProvenanceFromUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const src = params.get('src');
    if (src && src.trim()) {
      sessionStorage.setItem('lomakrev_provenance', src.trim());
      return src.trim();
    }
    return sessionStorage.getItem('lomakrev_provenance') || 'direct';
  } catch {
    return 'direct';
  }
}

export function getStoredProvenance(): string {
  try {
    return sessionStorage.getItem('lomakrev_provenance') || 'direct';
  } catch {
    return 'direct';
  }
}

// Automatic image resize & compression for uploads (Section 11)
export function compressImageFile(file: File, maxWidth = 1400, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(e.target?.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(String(e.target?.result || ''));
      img.src = String(e.target?.result || '');
    };
    reader.onerror = () => reject(new Error('Erreur de lecture image'));
    reader.readAsDataURL(file);
  });
}
