import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  DossierType,
  Language,
  PublicBootstrapData,
  SiteSettings,
  TechProduct,
} from '../types/lomakrev';
import {
  captureProvenanceFromUrl,
  clearLocalReceipts,
  enqueueOfflineSubmission,
  getLocalReceipts,
  getOutboxItems,
  getStoredProvenance,
  loadBootstrapCache,
  saveBootstrapCache,
  saveLocalReceipt,
  syncOutboxNow,
  type LocalReceipt,
  type OutboxItem,
} from '../lib/offlineSync';

export interface CartItem {
  product: TechProduct;
  qty: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface AppContextValue {
  data: PublicBootstrapData | null;
  loading: boolean;
  refreshData: () => Promise<void>;
  currentPath: string;
  searchQuery: string;
  navigate: (to: string) => void;
  lang: Language;
  setLang: (l: Language) => void;
  currency: 'USD' | 'CDF';
  setCurrency: (c: 'USD' | 'CDF') => void;
  cart: CartItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: TechProduct, qty?: number) => void;
  updateCartQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  isOnline: boolean;
  outboxItems: OutboxItem[];
  localReceipts: LocalReceipt[];
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  submitForm: (
    type: DossierType,
    label: string,
    payload: Record<string, unknown>,
    enteredByAgent?: string | null
  ) => Promise<{ ok: boolean; offline?: boolean; dossier?: any; localId?: string; error?: string; ageRejected?: boolean }>;
  trackEvent: (eventName: string, path?: string) => void;
  provenance: string;
  toasts: ToastMessage[];
  pushToast: (type: ToastMessage['type'], text: string) => void;
  dismissToast: (id: string) => void;
  adminToken: string;
  setAdminToken: (token: string) => void;
  clearReceipts: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<PublicBootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [searchQuery, setSearchQuery] = useState<string>(() => window.location.search);
  const [lang, setLang] = useState<Language>('fr');
  const [currency, setCurrency] = useState<'USD' | 'CDF'>('USD');
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('lomakrev_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const [localReceipts, setLocalReceipts] = useState<LocalReceipt[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [provenance, setProvenance] = useState<string>(() => captureProvenanceFromUrl());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [adminToken, setAdminToken] = useState<string>('');

  const pushToast = useCallback((type: ToastMessage['type'], text: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 5500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const refreshOutbox = useCallback(async () => {
    const items = await getOutboxItems();
    const receipts = await getLocalReceipts();
    setOutboxItems(items);
    setLocalReceipts(receipts);
  }, []);

  const clearReceipts = useCallback(async () => {
    await clearLocalReceipts();
    setLocalReceipts([]);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch('/api/public/bootstrap');
      if (res.ok) {
        const json: PublicBootstrapData = await res.json();
        setData(json);
        await saveBootstrapCache(json);
        setLoading(false);
        return;
      }
    } catch {
      // fallback to offline cache
    }
    const cached = await loadBootstrapCache();
    if (cached) {
      setData(cached);
    }
    setLoading(false);
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      pushToast('info', 'Toujours hors ligne. Vos données restent enregistrées en sécurité sur cet appareil.');
      return;
    }
    setIsSyncing(true);
    try {
      const items = await getOutboxItems();
      if (items.length === 0) {
        setIsSyncing(false);
        return;
      }
      const res = await syncOutboxNow();
      await refreshOutbox();
      if (res.syncedCount > 0) {
        const refs = res.receipts.map((r) => r.reference).join(', ');
        pushToast('success', `${res.syncedCount} dossier(s) synchronisé(s) avec succès : ${refs}`);
      }
      if (res.errors.length > 0) {
        pushToast('error', res.errors[0]);
      }
    } catch {
      pushToast('error', 'Synchronisation reportée — Nouvelle tentative automatique dès que le réseau sera stable.');
    } finally {
      setIsSyncing(false);
    }
  }, [pushToast, refreshOutbox]);

  useEffect(() => {
    try {
      sessionStorage.removeItem('lomakrev_admin_token');
      localStorage.removeItem('lomakrev_admin_token');
    } catch {
      // ignore
    }
    refreshData();
    refreshOutbox();

    const handlePop = () => {
      setCurrentPath(window.location.pathname);
      setSearchQuery(window.location.search);
      setProvenance(captureProvenanceFromUrl());
    };
    const handleOnline = () => {
      setIsOnline(true);
      syncNow();
      refreshData();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('popstate', handlePop);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('popstate', handlePop);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshData, refreshOutbox, syncNow]);

  useEffect(() => {
    try {
      localStorage.setItem('lomakrev_cart', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    if (data?.settings?.siteName) {
      document.title = `${data.settings.siteName} — ${data.settings.legalName}`;
    }
  }, [data?.settings?.siteName, data?.settings?.legalName]);

  const navigate = useCallback((to: string) => {
    const [pathOnly, queryPart] = to.split('?');
    const normalizedPath = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
    const nextSearch = queryPart ? `?${queryPart}` : '';

    // Handle legacy redirects cleanly on client as well
    if (normalizedPath === '/devis') {
      window.history.pushState({}, '', `/maintenance/devis${nextSearch}`);
      setCurrentPath('/maintenance/devis');
      setSearchQuery(nextSearch);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (normalizedPath === '/academy') {
      window.history.pushState({}, '', `/academie${nextSearch}`);
      setCurrentPath('/academie');
      setSearchQuery(nextSearch);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    window.history.pushState({}, '', `${normalizedPath}${nextSearch}`);
    setCurrentPath(normalizedPath);
    setSearchQuery(nextSearch);
    const captured = captureProvenanceFromUrl();
    if (captured) setProvenance(captured);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const addToCart = useCallback(
    (product: TechProduct, qty = 1) => {
      setCart((prev) => {
        const idx = prev.findIndex((i) => i.product.id === product.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
          return copy;
        }
        return [...prev, { product, qty }];
      });
      pushToast('success', `${product.model} ajouté au panier`);
      setCartOpen(true);
    },
    [pushToast]
  );

  const updateCartQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((prev) => prev.map((i) => (i.product.id === productId ? { ...i, qty } : i)));
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const trackEvent = useCallback(
    (eventName: string, path?: string) => {
      if (!navigator.onLine) return;
      fetch('/api/public/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          path: path || currentPath,
          provenance: getStoredProvenance(),
        }),
      }).catch(() => {});
    },
    [currentPath]
  );

  const submitForm = useCallback(
    async (
      type: DossierType,
      label: string,
      payload: Record<string, unknown>,
      enteredByAgent?: string | null
    ) => {
      const fullPayload = {
        ...payload,
        provenance: payload.provenance || getStoredProvenance(),
      };

      if (!navigator.onLine) {
        const queued = await enqueueOfflineSubmission(type, label, fullPayload, enteredByAgent);
        await refreshOutbox();
        return { ok: true, offline: true, localId: queued.localId };
      }

      try {
        const endpoint = enteredByAgent ? '/api/admin/dossiers/office' : `/api/public/submit/${type}`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (enteredByAgent && adminToken) {
          headers.Authorization = `Bearer ${adminToken}`;
          headers['X-Lomakrev-Token'] = adminToken;
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          credentials: 'same-origin',
          body: JSON.stringify(enteredByAgent ? { ...fullPayload, type } : fullPayload),
        });
        const json = await res.json();
        if (!res.ok) {
          return { ok: false, error: json.error || 'Erreur lors de l’envoi.', ageRejected: !!json.ageRejected };
        }
        if (json.dossier?.reference) {
          await saveLocalReceipt({
            localId: json.dossier.reference,
            reference: json.dossier.reference,
            type: json.dossier.type,
            applicantName: json.dossier.applicantName,
            syncedAt: new Date().toISOString(),
          });
          await refreshOutbox();
        }
        return { ok: true, offline: false, dossier: json.dossier };
      } catch {
        // Network dropped mid-request -> queue offline automatically!
        const queued = await enqueueOfflineSubmission(type, label, fullPayload, enteredByAgent);
        await refreshOutbox();
        return { ok: true, offline: true, localId: queued.localId };
      }
    },
    [refreshOutbox, adminToken]
  );

  return (
    <AppContext.Provider
      value={{
        data,
        loading,
        refreshData,
        currentPath,
        searchQuery,
        navigate,
        lang,
        setLang,
        currency,
        setCurrency,
        cart,
        cartOpen,
        setCartOpen,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        isOnline,
        outboxItems,
        localReceipts,
        isSyncing,
        syncNow,
        submitForm,
        trackEvent,
        provenance,
        toasts,
        pushToast,
        dismissToast,
        adminToken,
        setAdminToken,
        clearReceipts,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function useSettings(): SiteSettings | undefined {
  return useApp().data?.settings;
}
