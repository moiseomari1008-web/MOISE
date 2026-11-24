import React, { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  Camera,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FolderKanban,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  Link2,
  Lock,
  LogOut,
  Menu,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Settings,
  Shield,
  Sliders,
  Trash2,
  UserCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { compressImageFile } from '../lib/offlineSync';
import {
  extractOrderedPayloadEntries,
  formatCurrencyCdf,
  formatCurrencyUsd,
  formatDateFr,
  formatDateTimeFr,
  getDossierTypeLabel,
  getPoleLabel,
  getPrintFooterInfo,
  triggerPrintDocument,
} from '../lib/pdfPrint';
import { AcademieInscriptionPage } from './AcademiePages';
import { BoursePostulerPage } from './BoursesPages';
import { MaintenanceDevisPage, MaintenanceInterventionPage } from './MaintenancePages';
import type {
  AdminNotification,
  AuditLogEntry,
  CustomFormField,
  Dossier,
  Formation,
  FormDefinition,
  ScholarshipCampaign,
  ScholarshipCriterion,
  SitePhotoItem,
  SiteSettings,
  TechProduct,
  UserAccount,
  UserRole,
} from '../types/lomakrev';

type AdminTab =
  | 'dashboard'
  | 'dossiers'
  | 'notifications'
  | 'clients'
  | 'office'
  | 'catalog'
  | 'forms'
  | 'shortlinks'
  | 'settings'
  | 'security'
  | 'profile';

const ROLE_LABELS: Record<UserRole, string> = {
  DIRECTION: 'Direction / Administrateur',
  COMMERCIAL_TECH: 'Commercial Tech',
  RESPONSABLE_ACADEMIE: 'Responsable Académie',
  RESPONSABLE_BOURSES: 'Responsable Bourses',
  TOP_MAINTENANCE: 'Top Maintenance',
  TECHNICIEN: 'Technicien',
  LECTURE_SEULE: 'Lecture seule',
};

export const AdminPage: React.FC = () => {
  const { data, refreshData, navigate, pushToast, adminToken: token, setAdminToken: setToken } = useApp();
  const [user, setUser] = useState<UserAccount | null>(null);
  const [require2FA, setRequire2FA] = useState(false);
  const require2FARef = useRef(false);
  const pending2FATokenRef = useRef('');
  const loadSeqRef = useRef(0);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Admin datasets
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [notificationsList, setNotificationsList] = useState<AdminNotification[]>([]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [notifPoleFilter, setNotifPoleFilter] = useState<'all' | 'tech' | 'academie' | 'bourses' | 'maintenance' | 'contact'>('all');
  const [notifUnreadOnly, setNotifUnreadOnly] = useState(false);

  // Dossier filters & selected drawer
  const [poleFilter, setPoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [commentText, setCommentText] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [batchSelection, setBatchSelection] = useState<string[]>([]);

  // Printable view overlay
  const [printMode, setPrintMode] = useState<{ kind: 'devis' | 'attestation' | 'presence' | 'dossier'; dossier?: Dossier; title: string } | null>(null);

  // Quote editor state
  const [quoteItems, setQuoteItems] = useState<{ description: string; qty: number; unitUsd: number }[]>([
    { description: 'Prestation / Équipement Lomakrev', qty: 1, unitUsd: 150 },
  ]);
  const [quoteNotes, setQuoteNotes] = useState('Validité du devis : 15 jours. Paiement selon modalités convenues.');
  const [teamScoreInputs, setTeamScoreInputs] = useState<Record<string, number>>({});
  const [diagInput, setDiagInput] = useState({ diagnostic: '', partsUsed: '', timeSpent: '', scheduledSlot: '' });

  // Catalog sub-tab
  const [catalogSub, setCatalogSub] = useState<'tech' | 'academie' | 'bourses' | 'maintenance' | 'photos'>('tech');
  const [editingProduct, setEditingProduct] = useState<Partial<TechProduct> | null>(null);
  const [editingFormation, setEditingFormation] = useState<Formation | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<ScholarshipCampaign | null>(null);
  const [newPhoto, setNewPhoto] = useState<Partial<SitePhotoItem>>({ pole: 'bourses', edition: 'Deuxième édition — 2027', caption: '', consentVerified: true, url: '' });

  // Form builder state
  const [selectedFormKey, setSelectedFormKey] = useState<FormDefinition['formKey']>('bourses');
  const [newField, setNewField] = useState<Partial<CustomFormField>>({
    step: 1,
    label: '',
    name: '',
    type: 'text',
    required: false,
    options: [],
  });

  // Shortlink & QR state
  const [slCode, setSlCode] = useState('');
  const [slTarget, setSlTarget] = useState('/bourses/postuler?campagne=excel-avance-2027');
  const [slLabel, setSlLabel] = useState('');
  const [qrPreview, setQrPreview] = useState<{ url: string; dataUrl: string; label: string } | null>(null);

  // Site Settings editor
  const [settingsDraft, setSettingsDraft] = useState<SiteSettings | null>(null);

  // Office entry selector
  const [officeFormType, setOfficeFormType] = useState<'ACA' | 'BRS' | 'DEV' | 'INT'>('BRS');

  // New user form
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'COMMERCIAL_TECH' as UserRole, twoFactorEnabled: false });

  // Self-service profile & password state
  const [profileDraft, setProfileDraft] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    avatarUrl: '',
    bio: '',
  });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrent: false,
    showNew: false,
    busy: false,
    error: '',
  });
  const [confirmResetUser, setConfirmResetUser] = useState<UserAccount | null>(null);
  const [resetBusyId, setResetBusyId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ userId: string; name: string; email: string; temporaryPassword: string } | null>(null);
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);

  const authHeaders = useCallback(
    () => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const activeToken = token || pending2FATokenRef.current;
      if (activeToken) {
        headers.Authorization = `Bearer ${activeToken}`;
        headers['X-Lomakrev-Token'] = activeToken;
      }
      return headers;
    },
    [token]
  );

  const apiFetch = useCallback(
    (input: string, init: RequestInit = {}) => {
      const mergedHeaders = new Headers(init.headers);
      const activeToken = token || pending2FATokenRef.current;
      if (activeToken) {
        if (!mergedHeaders.has('Authorization')) {
          mergedHeaders.set('Authorization', `Bearer ${activeToken}`);
        }
        if (!mergedHeaders.has('X-Lomakrev-Token')) {
          mergedHeaders.set('X-Lomakrev-Token', activeToken);
        }
      }
      return fetch(input, {
        ...init,
        headers: mergedHeaders,
        credentials: 'same-origin',
      });
    },
    [token]
  );

  const loadAdminData = useCallback(async () => {
    if (require2FARef.current) return;
    const seq = ++loadSeqRef.current;
    try {
      const meRes = await apiFetch('/api/auth/me');
      if (seq !== loadSeqRef.current || require2FARef.current) return;
      if (!meRes.ok) {
        const err = await meRes.json().catch(() => ({}));
        if (err.require2FA) {
          require2FARef.current = true;
          setRequire2FA(true);
          return;
        }
        pending2FATokenRef.current = '';
        require2FARef.current = false;
        setRequire2FA(false);
        setToken('');
        setUser(null);
        return;
      }
      const meJson = await meRes.json();
      if (seq !== loadSeqRef.current) return;
      setUser(meJson.user);
      require2FARef.current = false;
      setRequire2FA(false);

      if (meJson.user?.mustChangePassword) {
        return;
      }

      const [dashRes, dosRes, usrRes, notifRes] = await Promise.all([
        apiFetch('/api/admin/dashboard'),
        apiFetch('/api/admin/dossiers'),
        apiFetch('/api/admin/users'),
        apiFetch('/api/admin/notifications'),
      ]);
      if (seq !== loadSeqRef.current) return;
      if (dashRes.ok) setDashboardStats(await dashRes.json());
      if (dosRes.ok) {
        const j = await dosRes.json();
        setDossiers(j.dossiers || []);
      }
      if (usrRes.ok) {
        const uj = await usrRes.json();
        setUsersList(uj.users || []);
      }
      if (notifRes.ok) {
        const nj = await notifRes.json();
        setNotificationsList(nj.notifications || []);
      }

      if (meJson.user.role !== 'TECHNICIEN') {
        const cliRes = await apiFetch('/api/admin/clients');
        if (cliRes.ok && seq === loadSeqRef.current) setClients((await cliRes.json()).clients || []);
      }
      if (meJson.user.role === 'DIRECTION' || meJson.user.role === 'LECTURE_SEULE') {
        const audRes = await apiFetch('/api/admin/audit');
        if (audRes.ok && seq === loadSeqRef.current) setAuditLogs((await audRes.json()).logs || []);
      }
    } catch {
      // ignore offline
    }
  }, [apiFetch, setToken]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Real-time role-scoped notifications SSE stream
  useEffect(() => {
    if (!user || user.mustChangePassword || user.role === 'LECTURE_SEULE') return;
    let active = true;
    let controller = new AbortController();
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectStream = async () => {
      if (!active) return;
      controller = new AbortController();
      try {
        const res = await apiFetch('/api/admin/notifications/stream', {
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error('SSE unavailable');
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (active) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() || '';

          for (const frame of frames) {
            if (!frame.trim() || frame.startsWith(':')) continue;
            let eventName = 'message';
            let dataLine = '';
            for (const line of frame.split('\n')) {
              if (line.startsWith('event:')) eventName = line.slice(6).trim();
              else if (line.startsWith('data:')) dataLine += line.slice(5).trim();
            }
            if (eventName === 'notification:created' && dataLine) {
              try {
                const incoming: AdminNotification = JSON.parse(dataLine);
                setNotificationsList((prev) => {
                  if (prev.some((item) => item.id === incoming.id)) return prev;
                  return [incoming, ...prev].slice(0, 60);
                });
                pushToast('info', incoming.title);
                loadAdminData();
              } catch {
                // ignore malformed SSE payload
              }
            }
          }
        }
      } catch {
        // Reconnect cleanly after transient drop
      }
      if (active) {
        reconnectTimer = setTimeout(() => {
          loadAdminData();
          connectStream();
        }, 4000);
      }
    };

    connectStream();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      controller.abort();
    };
  }, [token, user?.id, user?.role, user?.mustChangePassword, loadAdminData, pushToast]);

  useEffect(() => {
    if (data?.settings && !settingsDraft) {
      setSettingsDraft(data.settings);
    }
  }, [data?.settings, settingsDraft]);

  useEffect(() => {
    if (user) {
      setProfileDraft({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        title: user.title || '',
        avatarUrl: user.avatarUrl || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  useEffect(() => {
    setSearchTerm('');
    setCommentText('');
    setRejectionReason('');
    setShowTempPassword(false);
  }, [activeTab]);

  useEffect(() => {
    if (!searchTerm.trim()) return;
    const timer = window.setTimeout(() => {
      setSearchTerm('');
    }, 120_000);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!resetResult) return;
    const timer = window.setTimeout(() => {
      setResetResult(null);
      setShowTempPassword(false);
    }, 60_000);
    return () => window.clearTimeout(timer);
  }, [resetResult]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    loadSeqRef.current++;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAuthError(json.error || 'Connexion impossible.');
      } else {
        const sessionToken = String(json.token || '');
        setLoginPassword('');
        if (json.require2FA) {
          pending2FATokenRef.current = sessionToken;
          require2FARef.current = true;
          setToken(sessionToken);
          setTwoFaCode('');
          setRequire2FA(true);
        } else {
          pending2FATokenRef.current = '';
          require2FARef.current = false;
          setToken(sessionToken);
          setUser(json.user);
          setRequire2FA(false);
        }
      }
    } catch {
      setAuthError('Serveur inaccessible.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const cleanCode = twoFaCode.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      setAuthError('Veuillez saisir les 6 chiffres du code de vérification.');
      return;
    }
    setAuthBusy(true);
    try {
      const activeToken = token || pending2FATokenRef.current;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeToken) {
        headers.Authorization = `Bearer ${activeToken}`;
        headers['X-Lomakrev-Token'] = activeToken;
      }
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({
          code: cleanCode,
          ...(activeToken ? { sessionToken: activeToken } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          pending2FATokenRef.current = '';
          require2FARef.current = false;
          setRequire2FA(false);
          setToken('');
          setTwoFaCode('');
        }
        setAuthError(json.error || 'Code invalide.');
        return;
      }
      const verifiedToken = String(json.token || activeToken || '');
      const prevToken = token;
      pending2FATokenRef.current = '';
      require2FARef.current = false;
      if (verifiedToken && verifiedToken !== prevToken) {
        setToken(verifiedToken);
      }
      setTwoFaCode('');
      setUser(json.user);
      setRequire2FA(false);
      if (!verifiedToken || verifiedToken === prevToken) {
        await loadAdminData();
      }
    } catch {
      setAuthError('Serveur inaccessible.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    loadSeqRef.current++;
    await apiFetch('/api/auth/logout', { method: 'POST', headers: authHeaders() }).catch(() => {});
    pending2FATokenRef.current = '';
    require2FARef.current = false;
    setToken('');
    setUser(null);
    setRequire2FA(false);
    setConfirmResetUser(null);
    setResetResult(null);
    setShowTempPassword(false);
    setSearchTerm('');
    setCommentText('');
    setRejectionReason('');
    setSelectedDossier(null);
    setLoginPassword('');
    setTwoFaCode('');
    setNotificationsList([]);
  };

  // --- Print Overlay ---
  if (printMode && data) {
    const settings = data.settings;
    const d = printMode.dossier;
    const payloadEntries = d ? extractOrderedPayloadEntries(d) : [];
    const cmdItems =
      d && Array.isArray((d.payload as any)?.items)
        ? ((d.payload as any).items as { model?: string; productId?: string; qty?: number; priceUsd?: number }[])
        : [];
    const devisItems = d?.quoteDetails?.items || [];
    const devisTotalUsd = devisItems.reduce((s, i) => s + i.qty * i.unitUsd, 0);

    return (
      <div className="min-h-screen bg-white p-4 text-slate-900 sm:p-8">
        <div className="no-print mx-auto mb-6 flex max-w-4xl items-center justify-between border-b border-slate-200 pb-4">
          <button type="button" onClick={() => setPrintMode(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            ← Retour à l’administration
          </button>
          <button type="button" onClick={triggerPrintDocument} className="inline-flex items-center gap-2 rounded-lg bg-[#D90A14] px-5 py-2 text-sm font-semibold text-white hover:bg-[#b80811]">
            <Printer className="h-4 w-4" />
            Imprimer / Enregistrer en PDF
          </button>
        </div>

        <div className="print-sheet mx-auto max-w-4xl overflow-x-auto rounded-xl border border-slate-300 bg-white p-4 sm:p-8 print:overflow-visible">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#D90A14] pb-5">
            <div className="flex items-center gap-3.5">
              <img src={settings.logoUrl} alt="LOMAKREV GROUP" className="h-14 w-auto rounded object-contain" referrerPolicy="no-referrer" />
              <div>
                <h1 className="font-display text-xl font-extrabold text-slate-900">{settings.legalName}</h1>
                <p className="text-xs text-slate-600">{settings.address}</p>
                <p className="text-xs text-slate-600">{settings.phone} · {settings.email}</p>
              </div>
            </div>
            <div className="rounded-lg border border-[#F4B400]/60 bg-[#FFFDF5] px-4 py-2.5 text-right text-xs text-slate-700">
              <p className="font-display text-sm font-extrabold uppercase tracking-wide text-[#D90A14]">{printMode.title}</p>
              <p className="mt-0.5">Édité le : <span className="font-semibold text-slate-900">{new Date().toLocaleDateString('fr-FR')}</span></p>
              {d && <p className="mt-0.5 font-mono-tabular font-bold text-slate-900">Réf. : {d.reference}</p>}
            </div>
          </div>

          {printMode.kind === 'devis' && d && (
            <div className="mt-6 space-y-6">
              <div className="print-section">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">Informations client & référence</h2>
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <tbody>
                    <tr>
                      <th className="w-40 border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Client / Société</th>
                      <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-900">{d.applicantName}</td>
                      <th className="w-36 border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Référence</th>
                      <td className="border border-slate-300 px-3 py-2 font-mono-tabular font-bold text-slate-900">{d.reference}</td>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Téléphone</th>
                      <td className="border border-slate-300 px-3 py-2 font-mono-tabular">{d.phone}</td>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">WhatsApp</th>
                      <td className="border border-slate-300 px-3 py-2 font-mono-tabular">{d.whatsapp || d.phone || '—'}</td>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">E-mail</th>
                      <td className="border border-slate-300 px-3 py-2">{d.email || '—'}</td>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Commune / Ville</th>
                      <td className="border border-slate-300 px-3 py-2">{[d.commune, d.ville].filter(Boolean).join(', ') || '—'}</td>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Statut du devis</th>
                      <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-900">{d.status}</td>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Validité</th>
                      <td className="border border-slate-300 px-3 py-2 font-mono-tabular">{d.quoteDetails?.validUntil ? formatDateFr(d.quoteDetails.validUntil) : '15 jours'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="print-section">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">Détail des prestations & équipements</h2>
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#D90A14] text-left text-white">
                      <th className="border border-[#D90A14] px-3 py-2.5 font-semibold">#</th>
                      <th className="border border-[#D90A14] px-3 py-2.5 font-semibold">Désignation</th>
                      <th className="border border-[#D90A14] px-3 py-2.5 text-right font-semibold">Qté</th>
                      <th className="border border-[#D90A14] px-3 py-2.5 text-right font-semibold">PU (USD)</th>
                      <th className="border border-[#D90A14] px-3 py-2.5 text-right font-semibold">Total (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devisItems.map((it, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                        <td className="border border-slate-300 px-3 py-2 font-mono-tabular text-slate-500">{idx + 1}</td>
                        <td className="border border-slate-300 px-3 py-2 font-medium text-slate-900">{it.description}</td>
                        <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular">{it.qty}</td>
                        <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular">{it.unitUsd.toLocaleString('fr-FR')}</td>
                        <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular font-semibold text-slate-900">
                          {(it.qty * it.unitUsd).toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#FFFBEB] font-bold text-slate-900">
                      <td colSpan={4} className="border border-slate-300 px-3 py-2.5 text-right uppercase">Total général (USD)</td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono-tabular text-base text-[#D90A14]">
                        {formatCurrencyUsd(devisTotalUsd)}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 text-xs text-slate-700">
                      <td colSpan={4} className="border border-slate-300 px-3 py-2 text-right font-semibold">
                        Équivalent indicatif en Francs Congolais (taux : {settings.usdToCdfRate.toLocaleString('fr-FR')} CDF/USD)
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular font-bold">
                        {formatCurrencyCdf(devisTotalUsd, settings.usdToCdfRate)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {d.quoteDetails?.notes && (
                <div className="print-section">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">Notes & conditions</h2>
                  <table className="w-full border-collapse text-xs">
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 bg-[#FFFDF5] px-4 py-3 leading-relaxed text-slate-700">
                          {d.quoteDetails.notes}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {printMode.kind === 'attestation' && d && (
            <div className="mt-8 space-y-8">
              <div className="print-section rounded-xl border-2 border-[#F4B400]/70 bg-[#FFFDF5] px-6 py-10 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Lomakrev Académie — « Way of success »</p>
                <h2 className="mt-2 font-display text-3xl font-extrabold text-slate-900">ATTESTATION DE FORMATION</h2>
                <p className="mt-6 text-base leading-relaxed text-slate-700">
                  La Direction de <strong>{settings.legalName}</strong> atteste que
                </p>
                <p className="mt-3 font-display text-2xl font-bold text-[#D90A14]">{d.applicantName}</p>
                <p className="mt-3 text-base leading-relaxed text-slate-700">
                  a suivi avec succès et validé l’évaluation pratique du programme{' '}
                  <strong>{d.formationSlug || 'Formation professionnelle'}</strong>.
                </p>
                <p className="mt-6 text-xs text-slate-500">Fait à Kinshasa, le {new Date().toLocaleDateString('fr-FR')} · La Direction</p>
              </div>

              <div className="print-section">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">Récapitulatif administratif du certificat</h3>
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <tbody>
                    <tr>
                      <th className="w-44 border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Bénéficiaire</th>
                      <td className="border border-slate-300 px-3 py-2 font-bold text-slate-900">{d.applicantName}</td>
                      <th className="w-40 border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Référence dossier</th>
                      <td className="border border-slate-300 px-3 py-2 font-mono-tabular font-bold text-slate-900">{d.reference}</td>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Programme / Formation</th>
                      <td className="border border-slate-300 px-3 py-2">{d.formationSlug || 'Formation professionnelle'}</td>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Session</th>
                      <td className="border border-slate-300 px-3 py-2 font-mono-tabular">{d.sessionCode || '—'}</td>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Téléphone</th>
                      <td className="border border-slate-300 px-3 py-2 font-mono-tabular">{d.phone}</td>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Statut validé</th>
                      <td className="border border-slate-300 px-3 py-2 font-semibold text-emerald-700">{d.status}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {printMode.kind === 'dossier' && d && (
            <div className="mt-6 space-y-6">
              {/* 1. Identification & Suivi général */}
              <div className="print-section">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">1. Identification & suivi du dossier</h2>
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <tbody>
                    <tr>
                      <th className="w-44 border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Référence</th>
                      <td className="border border-slate-300 px-3 py-2 font-mono-tabular font-bold text-slate-900">{d.reference}</td>
                      <th className="w-40 border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Statut actuel</th>
                      <td className="border border-slate-300 px-3 py-2 font-bold text-[#D90A14]">{d.status}</td>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Pôle concerné</th>
                      <td className="border border-slate-300 px-3 py-2 font-medium text-slate-900">{getPoleLabel(d.pole)}</td>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Type de dossier</th>
                      <td className="border border-slate-300 px-3 py-2">{getDossierTypeLabel(d.type)}</td>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Demandeur / Client</th>
                      <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-900">{d.applicantName}</td>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Téléphone</th>
                      <td className="border border-slate-300 px-3 py-2 font-mono-tabular">{d.phone}</td>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">WhatsApp</th>
                      <td className="border border-slate-300 px-3 py-2 font-mono-tabular">{d.whatsapp || d.phone || '—'}</td>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">E-mail</th>
                      <td className="border border-slate-300 px-3 py-2">{d.email || '—'}</td>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Commune / Ville</th>
                      <td className="border border-slate-300 px-3 py-2">{[d.commune, d.ville].filter(Boolean).join(', ') || '—'}</td>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Provenance</th>
                      <td className="border border-slate-300 px-3 py-2 font-mono-tabular">{d.provenance || 'direct'}</td>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Date de création</th>
                      <td className="border border-slate-300 px-3 py-2 font-mono-tabular">{formatDateTimeFr(d.createdAt)}</td>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Dernière mise à jour</th>
                      <td className="border border-slate-300 px-3 py-2 font-mono-tabular">{formatDateTimeFr(d.updatedAt)}</td>
                    </tr>
                    {(d.assignedToName || d.enteredByAgent) && (
                      <tr>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Responsable affecté</th>
                        <td className="border border-slate-300 px-3 py-2 font-medium">{d.assignedToName || '—'}</td>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Saisi par agent</th>
                        <td className="border border-slate-300 px-3 py-2">{d.enteredByAgent || 'En ligne (Client)'}</td>
                      </tr>
                    )}
                    {(d.campaignSlug || d.formationSlug || d.sessionCode || d.serviceKey) && (
                      <tr>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Programme / Service</th>
                        <td className="border border-slate-300 px-3 py-2">
                          {[d.campaignSlug, d.formationSlug, d.serviceKey].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Session</th>
                        <td className="border border-slate-300 px-3 py-2 font-mono-tabular">{d.sessionCode || '—'}</td>
                      </tr>
                    )}
                    {(d.eligibilityStatus || typeof d.totalScore === 'number' || typeof d.autoScore === 'number' || d.rejectionReason) && (
                      <tr>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Éligibilité / Score</th>
                        <td className="border border-slate-300 px-3 py-2">
                          {[
                            d.eligibilityStatus,
                            typeof d.totalScore === 'number' ? `Score total : ${d.totalScore} pts` : typeof d.autoScore === 'number' ? `Score auto : ${d.autoScore} pts` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </td>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Motif / Observation</th>
                        <td className="border border-slate-300 px-3 py-2">{d.rejectionReason || d.eligibilityReason || '—'}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 2. Articles commandés (pour CMD) */}
              {cmdItems.length > 0 && (
                <div className="print-section">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">2. Équipements commandés</h2>
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-[#D90A14] text-left text-white">
                        <th className="border border-[#D90A14] px-3 py-2 font-semibold">#</th>
                        <th className="border border-[#D90A14] px-3 py-2 font-semibold">Désignation / Modèle</th>
                        <th className="border border-[#D90A14] px-3 py-2 text-right font-semibold">Qté</th>
                        <th className="border border-[#D90A14] px-3 py-2 text-right font-semibold">PU (USD)</th>
                        <th className="border border-[#D90A14] px-3 py-2 text-right font-semibold">Sous-total (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cmdItems.map((item, idx) => {
                        const qty = Number(item.qty || 1);
                        const priceUsd = Number(item.priceUsd || 0);
                        return (
                          <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                            <td className="border border-slate-300 px-3 py-2 font-mono-tabular text-slate-500">{idx + 1}</td>
                            <td className="border border-slate-300 px-3 py-2 font-medium text-slate-900">{item.model || item.productId || 'Équipement'}</td>
                            <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular">{qty}</td>
                            <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular">{priceUsd.toLocaleString('fr-FR')}</td>
                            <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular font-semibold">
                              {(qty * priceUsd).toLocaleString('fr-FR')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. Détails complets saisis dans le formulaire */}
              <div className="print-section">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">
                  {cmdItems.length > 0 ? '3. Détails complémentaires du dossier' : '2. Détails techniques & informations du formulaire'}
                </h2>
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-left text-white">
                      <th className="w-1/3 border border-slate-800 px-3 py-2 font-semibold">Rubrique</th>
                      <th className="border border-slate-800 px-3 py-2 font-semibold">Information renseignée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payloadEntries.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="border border-slate-300 px-3 py-3 text-center text-slate-500">
                          Aucune information complémentaire renseignée.
                        </td>
                      </tr>
                    ) : (
                      payloadEntries.map((row, idx) => (
                        <tr key={row.key} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                          <th className="border border-slate-300 bg-slate-50/80 px-3 py-2 text-left align-top font-semibold text-slate-700">
                            {row.label}
                          </th>
                          <td className="whitespace-pre-wrap border border-slate-300 px-3 py-2 align-top text-slate-900">
                            {row.value}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 4. Carnet d’intervention technique (si présent) */}
              {d.interventionLog && (
                <div className="print-section">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">Rapport & planification d’intervention</h2>
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <tbody>
                      <tr>
                        <th className="w-48 border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Diagnostic technique</th>
                        <td className="border border-slate-300 px-3 py-2 text-slate-900">{d.interventionLog.diagnostic || '—'}</td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Pièces / vérifications</th>
                        <td className="border border-slate-300 px-3 py-2 text-slate-900">{d.interventionLog.partsUsed || '—'}</td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Durée estimée / passée</th>
                        <td className="border border-slate-300 px-3 py-2 font-mono-tabular text-slate-900">{d.interventionLog.timeSpent || '—'}</td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">Créneau planifié</th>
                        <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-900">{d.interventionLog.scheduledSlot || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* 5. Devis rattaché (si présent) */}
              {d.quoteDetails && devisItems.length > 0 && (
                <div className="print-section">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">Devis technique rattaché</h2>
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-[#D90A14] text-left text-white">
                        <th className="border border-[#D90A14] px-3 py-2 font-semibold">Désignation</th>
                        <th className="border border-[#D90A14] px-3 py-2 text-right font-semibold">Qté</th>
                        <th className="border border-[#D90A14] px-3 py-2 text-right font-semibold">PU (USD)</th>
                        <th className="border border-[#D90A14] px-3 py-2 text-right font-semibold">Total (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devisItems.map((it, idx) => (
                        <tr key={idx}>
                          <td className="border border-slate-300 px-3 py-2">{it.description}</td>
                          <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular">{it.qty}</td>
                          <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular">{it.unitUsd.toLocaleString('fr-FR')}</td>
                          <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular font-semibold">
                            {(it.qty * it.unitUsd).toLocaleString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#FFFBEB] font-bold">
                        <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right">Total du devis</td>
                        <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular text-[#D90A14]">
                          {formatCurrencyUsd(devisTotalUsd)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* 6. Pièces jointes & Chronologie */}
              {d.attachments && d.attachments.length > 0 && (
                <div className="print-section">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">Pièces jointes</h2>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-left text-slate-700">
                        <th className="border border-slate-300 px-3 py-2 font-semibold">Document</th>
                        <th className="border border-slate-300 px-3 py-2 font-semibold">Format</th>
                        <th className="border border-slate-300 px-3 py-2 text-right font-semibold">Taille</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.attachments.map((att, idx) => (
                        <tr key={idx}>
                          <td className="border border-slate-300 px-3 py-2 font-medium">{att.name}</td>
                          <td className="border border-slate-300 px-3 py-2 font-mono-tabular">{att.type || 'Document'}</td>
                          <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular">
                            {att.size ? `${Math.max(1, Math.round(att.size / 1024))} Ko` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {d.timeline && d.timeline.length > 0 && (
                <div className="print-section">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">Historique & suivi chronologique</h2>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-left text-slate-700">
                        <th className="border border-slate-300 px-3 py-2 font-semibold">Date & heure</th>
                        <th className="border border-slate-300 px-3 py-2 font-semibold">Intervenant</th>
                        <th className="border border-slate-300 px-3 py-2 font-semibold">Action / Observation</th>
                        <th className="border border-slate-300 px-3 py-2 font-semibold">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.timeline.map((ev, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                          <td className="border border-slate-300 px-3 py-2 font-mono-tabular text-slate-600">{formatDateTimeFr(ev.at)}</td>
                          <td className="border border-slate-300 px-3 py-2 font-medium text-slate-900">{ev.actor}</td>
                          <td className="border border-slate-300 px-3 py-2 text-slate-800">
                            {ev.action}
                            {ev.note ? ` — ${ev.note}` : ''}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-900">{ev.status || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {printMode.kind === 'presence' && (
            <div className="mt-6 space-y-4">
              <div className="print-section">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">Feuille de présence — Lomakrev Académie</h2>
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#D90A14] text-left text-white">
                      <th className="border border-[#D90A14] px-3 py-2 font-semibold">#</th>
                      <th className="border border-[#D90A14] px-3 py-2 font-semibold">Référence</th>
                      <th className="border border-[#D90A14] px-3 py-2 font-semibold">Participant</th>
                      <th className="border border-[#D90A14] px-3 py-2 font-semibold">Téléphone</th>
                      <th className="border border-[#D90A14] px-3 py-2 font-semibold">Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(d ? [d] : []).map((row, idx) => (
                      <tr key={row.id}>
                        <td className="border border-slate-300 px-3 py-2 font-mono-tabular">{idx + 1}</td>
                        <td className="border border-slate-300 px-3 py-2 font-mono-tabular font-bold">{row.reference}</td>
                        <td className="border border-slate-300 px-3 py-2 font-medium">{row.applicantName}</td>
                        <td className="border border-slate-300 px-3 py-2 font-mono-tabular">{row.phone}</td>
                        <td className="border border-slate-300 px-3 py-2" />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-slate-300 pt-4 text-center text-[11px] text-slate-500">
            {getPrintFooterInfo(settings)}
          </div>
        </div>
      </div>
    );
  }

  // --- Login / 2FA Gate ---
  if (!user || require2FA) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF5] p-4">
        <div className="w-full max-w-md rounded-2xl border border-[#F4B400]/50 border-t-4 border-t-[#D90A14] bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <img
              src={data?.settings?.logoUrl || '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.31.55_6695b86a.jpeg'}
              alt="Lomakrev"
              className="h-10 w-auto rounded object-contain"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="font-display text-lg font-bold text-slate-900">Espace d’administration</h1>
              <p className="text-xs font-semibold text-[#D90A14]">LOMAKREV GROUP · Accès équipe</p>
            </div>
          </div>

          {require2FA ? (
            <form onSubmit={handleVerify2FA} autoComplete="off" className="mt-6 space-y-4">
              <div className="rounded-lg border border-[#F4B400]/50 bg-[#FFFDF5] p-3 text-xs text-slate-700">
                <Lock className="mb-1 h-4 w-4 text-[#D90A14]" />
                Double authentification requise pour le rôle Administrateur / Direction.
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-800">Code de vérification à 6 chiffres</label>
                <input
                  type="text"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={twoFaCode}
                  onChange={(e) => {
                    if (authError) setAuthError('');
                    setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  }}
                  placeholder="••••••"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center font-mono-tabular text-lg tracking-widest outline-none focus:border-[#D90A14]"
                />
              </div>
              {authError && <p className="text-xs font-medium text-[#D90A14]">{authError}</p>}
              <button
                type="submit"
                disabled={authBusy}
                className="w-full rounded-lg bg-[#D90A14] py-3 text-sm font-semibold text-white hover:bg-[#b80811] disabled:opacity-60"
              >
                {authBusy ? 'Vérification...' : 'Valider la connexion'}
              </button>
              <button type="button" onClick={handleLogout} className="w-full text-xs font-medium text-slate-500 hover:text-slate-800">
                Annuler
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} autoComplete="off" className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-800">Adresse e-mail professionnelle</label>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={loginEmail}
                  onChange={(e) => {
                    if (authError) setAuthError('');
                    setLoginEmail(e.target.value);
                  }}
                  placeholder="nom@lomakrev.com"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base outline-none focus:border-[#D90A14]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-800">Mot de passe</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => {
                    if (authError) setAuthError('');
                    setLoginPassword(e.target.value);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base outline-none focus:border-[#D90A14]"
                />
              </div>
              {authError && <p className="text-xs font-medium text-[#D90A14]">{authError}</p>}
              <button
                type="submit"
                disabled={authBusy}
                className="w-full rounded-lg bg-[#D90A14] py-3 text-sm font-semibold text-white hover:bg-[#b80811] disabled:opacity-60"
              >
                {authBusy ? 'Connexion...' : 'Se connecter'}
              </button>
              <button type="button" onClick={() => navigate('/')} className="block w-full text-center text-xs font-medium text-slate-500 hover:text-slate-900">
                ← Retour au site public
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- Forced Password Change Gate (after admin reset) ---
  if (user.mustChangePassword) {
    const submitForcedPasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordForm((p) => ({ ...p, error: '' }));
      if (passwordForm.newPassword.length < 8) {
        setPasswordForm((p) => ({ ...p, error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' }));
        return;
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setPasswordForm((p) => ({ ...p, error: 'La confirmation ne correspond pas au nouveau mot de passe.' }));
        return;
      }
      setPasswordForm((p) => ({ ...p, busy: true }));
      try {
        const res = await apiFetch('/api/auth/change-password', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setPasswordForm((p) => ({ ...p, busy: false, error: json.error || 'Impossible de modifier le mot de passe.' }));
          return;
        }
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          showCurrent: false,
          showNew: false,
          busy: false,
          error: '',
        });
        setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
        pushToast('success', 'Votre nouveau mot de passe personnel est enregistré.');
        loadAdminData();
      } catch {
        setPasswordForm((p) => ({ ...p, busy: false, error: 'Erreur réseau.' }));
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF5] p-4">
        <div className="w-full max-w-md rounded-2xl border border-[#F4B400]/60 border-t-4 border-t-[#D90A14] bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <img
              src={data?.settings?.logoUrl || '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.31.55_6695b86a.jpeg'}
              alt="Lomakrev"
              className="h-10 w-auto rounded object-contain"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="font-display text-lg font-bold text-slate-900">Nouveau mot de passe requis</h1>
              <p className="text-xs font-semibold text-[#D90A14]">
                {user.name} · {ROLE_LABELS[user.role]}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[#F4B400] bg-[#FFFBEB] p-3.5 text-xs leading-relaxed text-[#7A050B]">
            <div className="mb-1 flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-4 w-4 text-[#D90A14]" />
              Mot de passe réinitialisé par l’administrateur
            </div>
            Saisissez le mot de passe par défaut communiqué par la Direction, puis définissez votre mot de passe personnel (minimum 8 caractères).
          </div>

          <form onSubmit={submitForcedPasswordChange} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Mot de passe par défaut actuel *</label>
              <div className="relative">
                <input
                  type={passwordForm.showCurrent ? 'text' : 'password'}
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-[#D90A14]"
                />
                <button
                  type="button"
                  onClick={() => setPasswordForm({ ...passwordForm, showCurrent: !passwordForm.showCurrent })}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                  aria-label="Afficher ou masquer"
                >
                  {passwordForm.showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nouveau mot de passe personnel *</label>
              <div className="relative">
                <input
                  type={passwordForm.showNew ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-[#D90A14]"
                />
                <button
                  type="button"
                  onClick={() => setPasswordForm({ ...passwordForm, showNew: !passwordForm.showNew })}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                  aria-label="Afficher ou masquer"
                >
                  {passwordForm.showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Confirmer le nouveau mot de passe *</label>
              <input
                type={passwordForm.showNew ? 'text' : 'password'}
                required
                minLength={8}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#D90A14]"
              />
            </div>

            {passwordForm.error && <p className="text-xs font-semibold text-[#D90A14]">{passwordForm.error}</p>}

            <button
              type="submit"
              disabled={passwordForm.busy}
              className="w-full rounded-lg bg-[#D90A14] py-3 text-sm font-semibold text-white hover:bg-[#B80811] disabled:opacity-60"
            >
              {passwordForm.busy ? 'Enregistrement...' : 'Enregistrer et accéder à mon espace'}
            </button>

            <button type="button" onClick={handleLogout} className="w-full text-xs font-medium text-slate-500 hover:text-slate-900">
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Role-Based Navigation ---
  const isTechOnly = user.role === 'TECHNICIEN';
  const isReadOnly = user.role === 'LECTURE_SEULE';
  const isDirection = user.role === 'DIRECTION';

  const navItems: { id: AdminTab; label: string; icon: any; show: boolean }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, show: true },
    { id: 'notifications', label: 'Notifications', icon: Bell, show: !isReadOnly },
    { id: 'dossiers', label: isTechOnly ? 'Mes interventions' : 'Dossiers & Demandes', icon: ClipboardList, show: true },
    { id: 'clients', label: 'Fiches clients', icon: Users, show: !isTechOnly },
    { id: 'office', label: 'Saisie au bureau', icon: UserCheck, show: !isTechOnly && !isReadOnly },
    { id: 'catalog', label: 'Catalogue & Photos', icon: FolderKanban, show: !isTechOnly && !isReadOnly },
    { id: 'forms', label: 'Formulaires', icon: Sliders, show: ['DIRECTION', 'RESPONSABLE_ACADEMIE', 'RESPONSABLE_BOURSES', 'TOP_MAINTENANCE'].includes(user.role) },
    { id: 'shortlinks', label: 'Liens courts & QR', icon: Link2, show: !isTechOnly && !isReadOnly },
    { id: 'settings', label: 'Paramètres vitrine', icon: Settings, show: isDirection },
    { id: 'security', label: 'Utilisateurs & Audit', icon: Shield, show: isDirection || isReadOnly },
    { id: 'profile', label: 'Mon profil', icon: UserCog, show: true },
  ];

  const unreadNotificationsCount = notificationsList.filter((n) => !n.read).length;

  const poleLabel = (pole: AdminNotification['pole']) => {
    if (pole === 'tech') return 'Lomakrev Tech';
    if (pole === 'academie') return 'Lomakrev Académie';
    if (pole === 'bourses') return 'Programme Bourses';
    if (pole === 'maintenance') return 'Top Maintenance';
    return 'Contact';
  };

  const allowedPoleTabs: { id: 'all' | AdminNotification['pole']; label: string }[] = (() => {
    if (user.role === 'DIRECTION') {
      return [
        { id: 'all', label: 'Tous les pôles' },
        { id: 'tech', label: 'Tech (Achats)' },
        { id: 'academie', label: 'Académie' },
        { id: 'bourses', label: 'Bourses' },
        { id: 'maintenance', label: 'Maintenance & Devis' },
        { id: 'contact', label: 'Contact' },
      ];
    }
    if (user.role === 'COMMERCIAL_TECH') {
      return [
        { id: 'all', label: 'Toutes mes alertes' },
        { id: 'tech', label: 'Lomakrev Tech' },
        { id: 'maintenance', label: 'Devis multi-postes' },
      ];
    }
    if (user.role === 'RESPONSABLE_ACADEMIE') return [{ id: 'all', label: 'Lomakrev Académie' }];
    if (user.role === 'RESPONSABLE_BOURSES') return [{ id: 'all', label: 'Programme Bourses' }];
    return [{ id: 'all', label: 'Top Maintenance' }];
  })();

  const filteredNotifications = notificationsList.filter((n) => {
    if (notifPoleFilter !== 'all' && n.pole !== notifPoleFilter) return false;
    if (notifUnreadOnly && n.read) return false;
    return true;
  });

  const handleMarkNotificationRead = async (id: string) => {
    const now = new Date().toISOString();
    setNotificationsList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true, readAt: n.readAt || now } : n)));
    await apiFetch(`/api/admin/notifications/${id}/read`, {
      method: 'POST',
      headers: authHeaders(),
    }).catch(() => {});
  };

  const handleMarkAllNotificationsRead = async (pole?: string) => {
    const now = new Date().toISOString();
    setNotificationsList((prev) =>
      prev.map((n) => (!pole || pole === 'all' || n.pole === pole ? { ...n, read: true, readAt: n.readAt || now } : n))
    );
    const res = await apiFetch('/api/admin/notifications/read-all', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ pole: pole || 'all' }),
    }).catch(() => null);
    if (res?.ok) {
      pushToast('success', 'Notifications marquées comme lues.');
    }
  };

  const handleOpenNotification = async (n: AdminNotification) => {
    if (!n.read) {
      await handleMarkNotificationRead(n.id);
    }
    setNotifPanelOpen(false);
    if (n.dossierId) {
      const found = dossiers.find((d) => d.id === n.dossierId || d.reference === n.dossierRef);
      if (found) setSelectedDossier(found);
      setActiveTab('dossiers');
      return;
    }
    const targetTab = (n.linkTab as AdminTab) || 'dossiers';
    setActiveTab(targetTab);
  };

  // --- Handlers ---
  const handleUpdateDossier = async (id: string, body: any) => {
    const res = await apiFetch(`/api/admin/dossiers/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      pushToast('error', json.error || 'Modification refusée.');
      return;
    }
    setSelectedDossier(json.dossier);
    setCommentText('');
    setRejectionReason('');
    pushToast('success', 'Dossier mis à jour.');
    loadAdminData();
  };

  const handleBatchApprove = async () => {
    if (batchSelection.length === 0) return;
    const res = await apiFetch('/api/admin/bourses/batch-approve', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ dossierIds: batchSelection }),
    });
    const json = await res.json();
    if (res.ok) {
      pushToast('success', `${json.approved} candidature(s) approuvée(s) en groupe.`);
      setBatchSelection([]);
      loadAdminData();
    } else {
      pushToast('error', json.error || 'Erreur');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsDraft) return;
    const res = await apiFetch('/api/admin/settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(settingsDraft),
    });
    if (res.ok) {
      pushToast('success', 'Paramètres du site vitrine enregistrés avec effet immédiat.');
      refreshData();
      loadAdminData();
    } else {
      pushToast('error', 'Erreur lors de la sauvegarde des paramètres.');
    }
  };

  const handleSettingsImageUpload = async (field: keyof SiteSettings, file: File | null) => {
    if (!file || !settingsDraft) return;
    const compressed = await compressImageFile(file);
    setSettingsDraft({ ...settingsDraft, [field]: compressed });
    pushToast('info', 'Image compressée et prête — cliquez sur Enregistrer.');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const res = await apiFetch('/api/admin/products', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(editingProduct),
    });
    if (res.ok) {
      pushToast('success', 'Produit enregistré.');
      setEditingProduct(null);
      refreshData();
    } else {
      const err = await res.json().catch(() => ({}));
      pushToast('error', err.error || 'Erreur lors de l’enregistrement.');
    }
  };

  const handleSaveFormation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFormation) return;
    const res = await apiFetch('/api/admin/formations', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(editingFormation),
    });
    if (res.ok) {
      pushToast('success', 'Formation et sessions mises à jour.');
      setEditingFormation(null);
      refreshData();
    } else {
      const err = await res.json().catch(() => ({}));
      pushToast('error', err.error || 'Erreur lors de la mise à jour.');
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    const res = await apiFetch('/api/admin/campaigns', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(editingCampaign),
    });
    if (res.ok) {
      pushToast('success', 'Campagne et critères enregistrés.');
      setEditingCampaign(null);
      refreshData();
    } else {
      const err = await res.json().catch(() => ({}));
      pushToast('error', err.error || 'Erreur lors de l’enregistrement.');
    }
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhoto.url) {
      pushToast('error', 'Veuillez sélectionner une image.');
      return;
    }
    const res = await apiFetch('/api/admin/photos', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(newPhoto),
    });
    if (res.ok) {
      pushToast('success', 'Photo ajoutée à la galerie.');
      setNewPhoto({ pole: 'bourses', edition: 'Deuxième édition — 2027', caption: '', consentVerified: true, url: '' });
      refreshData();
    } else {
      const err = await res.json().catch(() => ({}));
      pushToast('error', err.error || 'Erreur lors de l’ajout de la photo.');
    }
  };

  const handleGenerateQR = async (urlPath: string, label: string) => {
    const full = `${window.location.origin}${urlPath}`;
    const dataUrl = await QRCode.toDataURL(full, { width: 512, margin: 2 });
    setQrPreview({ url: full, dataUrl, label });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileBusy(true);
    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(profileDraft),
      });
      const json = await res.json();
      if (!res.ok) {
        setProfileError(json.error || 'Impossible de mettre à jour le profil.');
      } else {
        setUser(json.user);
        pushToast('success', 'Vos informations et votre photo de profil ont été enregistrées.');
        loadAdminData();
      }
    } catch {
      setProfileError('Erreur de connexion au serveur.');
    } finally {
      setProfileBusy(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordForm((p) => ({ ...p, error: '' }));
    if (passwordForm.newPassword.length < 8) {
      setPasswordForm((p) => ({ ...p, error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' }));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordForm((p) => ({ ...p, error: 'La confirmation ne correspond pas au nouveau mot de passe.' }));
      return;
    }
    setPasswordForm((p) => ({ ...p, busy: true }));
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPasswordForm((p) => ({ ...p, busy: false, error: json.error || 'Erreur lors du changement de mot de passe.' }));
      } else {
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          showCurrent: false,
          showNew: false,
          busy: false,
          error: '',
        });
        setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
        pushToast('success', 'Mot de passe modifié avec succès.');
      }
    } catch {
      setPasswordForm((p) => ({ ...p, busy: false, error: 'Erreur réseau.' }));
    }
  };

  const handleResetUserPassword = async (targetUser: UserAccount) => {
    setResetBusyId(targetUser.id);
    try {
      const res = await apiFetch(`/api/admin/users/${targetUser.id}/reset-password`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) {
        pushToast('error', json.error || 'Réinitialisation impossible.');
        return;
      }
      setConfirmResetUser(null);
      setShowTempPassword(false);
      setResetResult({
        userId: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        temporaryPassword: json.temporaryPassword,
      });
      pushToast('success', `Mot de passe réinitialisé pour ${targetUser.name}.`);
      loadAdminData();
    } catch {
      pushToast('error', 'Erreur réseau lors de la réinitialisation.');
    } finally {
      setResetBusyId(null);
    }
  };

  const handleToggleUserActive = async (targetUser: UserAccount) => {
    setToggleBusyId(targetUser.id);
    try {
      const res = await apiFetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ active: !targetUser.active }),
      });
      const json = await res.json();
      if (!res.ok) {
        pushToast('error', json.error || 'Modification impossible.');
        return;
      }
      pushToast('success', targetUser.active ? `Compte ${targetUser.name} désactivé.` : `Compte ${targetUser.name} réactivé.`);
      loadAdminData();
    } catch {
      pushToast('error', 'Erreur réseau.');
    } finally {
      setToggleBusyId(null);
    }
  };

  const handleExportExcel = async (pole: string) => {
    const res = await apiFetch(`/api/admin/export/xlsx?pole=${encodeURIComponent(pole)}`);
    if (!res.ok) {
      pushToast('error', 'Export non autorisé.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lomakrev-export-${pole}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredDossiers = dossiers.filter((d) => {
    if (poleFilter !== 'all' && d.pole !== poleFilter) return false;
    if (statusFilter !== 'all' && !d.status.toLowerCase().includes(statusFilter.toLowerCase())) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        d.reference.toLowerCase().includes(q) ||
        d.applicantName.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const technicians = usersList.filter((u) => u.role === 'TECHNICIEN' && u.active);

  return (
    <div className="flex min-h-screen overflow-x-clip bg-[#FFFDF5]">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
        />
      )}
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto border-r border-[#F4B400]/40 bg-white transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#F4B400]/40 border-t-4 border-t-[#D90A14] px-5">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 text-left">
            <img
              src={data?.settings?.logoUrl || '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.31.55_6695b86a.jpeg'}
              alt="Lomakrev"
              className="h-8 w-auto rounded object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="font-display text-sm font-extrabold text-[#D90A14]">Lomakrev Admin</span>
          </button>
          <button type="button" onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems
            .filter((n) => n.show)
            .map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? 'bg-[#D90A14] text-white shadow-sm' : 'text-slate-700 hover:bg-[#FFFBEB] hover:text-[#99060D]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.id === 'notifications' && unreadNotificationsCount > 0 && (
                    <span
                      className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                        active ? 'bg-[#FBBF24] text-[#7A050B]' : 'bg-[#D90A14] text-white'
                      }`}
                    >
                      {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        <div className="mt-auto shrink-0 border-t border-[#F4B400]/40 bg-[#FFFDF5] p-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setSidebarOpen(false);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg p-1 text-left transition-colors hover:bg-[#FEF3C7]"
            title="Modifier mon profil et mot de passe"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-9 w-9 shrink-0 rounded-full border-2 border-[#FBBF24] object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#FBBF24] bg-[#D90A14] text-xs font-bold text-white">
                {user.name
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-900">{user.name}</p>
              <p className="truncate text-[11px] text-slate-500">{user.title || ROLE_LABELS[user.role]}</p>
            </div>
          </button>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 rounded border border-[#F4B400] bg-[#FFFBEB] py-1.5 text-xs font-semibold text-[#78350F] hover:bg-[#FEF3C7]"
            >
              Site public
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-red-50 hover:text-[#D90A14]"
              title="Déconnexion"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-[#F4B400]/40 border-t-4 border-t-[#D90A14] bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg border border-slate-200 p-2 lg:hidden">
              <Menu className="h-5 w-5 text-slate-700" />
            </button>
            <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifPanelOpen((o) => !o)}
                  className={`relative inline-flex items-center justify-center rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    notifPanelOpen || activeTab === 'notifications'
                      ? 'border-[#D90A14] bg-[#FFFBEB] text-[#D90A14]'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-label="Notifications"
                  title="Notifications de vos pôles"
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#D90A14] px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                      {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {notifPanelOpen && (
                  <div className="fixed inset-x-4 top-20 z-50 overflow-hidden rounded-2xl border border-[#F4B400]/60 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-[#FFFDF5] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-[#D90A14]" />
                        <span className="font-display text-sm font-bold text-slate-900">Notifications</span>
                        {unreadNotificationsCount > 0 && (
                          <span className="rounded-full bg-[#D90A14] px-2 py-0.5 text-[10px] font-bold text-white">
                            {unreadNotificationsCount} non lue{unreadNotificationsCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadNotificationsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMarkAllNotificationsRead('all')}
                            className="text-[11px] font-semibold text-[#D90A14] hover:underline"
                          >
                            Tout lire
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setNotifPanelOpen(false)}
                          className="rounded p-0.5 text-slate-400 hover:text-slate-700"
                          aria-label="Fermer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                      {notificationsList.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-slate-500">
                          Aucune notification pour vos pôles pour le moment.
                        </div>
                      ) : (
                        notificationsList.slice(0, 6).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => handleOpenNotification(n)}
                            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#FFFBEB] ${
                              !n.read ? 'bg-[#FFFDF5]' : 'bg-white'
                            }`}
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                !n.read ? 'bg-[#D90A14]' : 'bg-slate-200'
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-bold text-[#7A050B]">
                                  {poleLabel(n.pole)}
                                </span>
                                <span className="font-mono-tabular text-[10px] text-slate-400">
                                  {new Date(n.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className={`mt-1 truncate text-xs ${!n.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                {n.title}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{n.message}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setNotifPanelOpen(false);
                          setActiveTab('notifications');
                        }}
                        className="text-xs font-bold text-[#D90A14] hover:underline"
                      >
                        Voir toutes les notifications ({notificationsList.length})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {!isTechOnly && (
              <button
                type="button"
                onClick={() => handleExportExcel('all')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Export Excel</span>
              </button>
            )}
            <button
              type="button"
              onClick={loadAdminData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                activeTab === 'profile'
                  ? 'border-[#D90A14] bg-[#D90A14] text-white'
                  : 'border-[#F4B400]/60 bg-[#FFFBEB] text-[#78350F] hover:bg-[#FEF3C7]'
              }`}
              title="Mon profil & mot de passe"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D90A14] text-[10px] font-bold text-white">
                  {user.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="hidden md:inline max-w-[120px] truncate">{user.name}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && dashboardStats && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-medium text-slate-500">Total dossiers visibles</p>
                  <p className="mt-2 font-mono-tabular text-3xl font-extrabold text-slate-900">{dashboardStats.totalDossiers}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-medium text-slate-500">Nouveaux cette semaine</p>
                  <p className="mt-2 font-mono-tabular text-3xl font-extrabold text-slate-900">{dashboardStats.weeklyCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-medium text-slate-500">En retard (&gt; 24 h)</p>
                  <p className="mt-2 font-mono-tabular text-3xl font-extrabold text-[#D90A14]">{dashboardStats.overdueCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-medium text-slate-500">Clics d’action mesurés</p>
                  <p className="mt-2 font-mono-tabular text-3xl font-extrabold text-slate-900">{dashboardStats.analyticsCount}</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="flex items-center gap-2 font-display text-base font-bold text-slate-900">
                    <BarChart3 className="h-4 w-4 text-[#D90A14]" />
                    Demandes par pôle
                  </h3>
                  <div className="mt-4 space-y-3 text-sm">
                    {Object.entries(dashboardStats.byPole || {}).map(([pole, count]) => (
                      <div key={pole} className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="capitalize text-slate-700">{pole}</span>
                        <span className="font-mono-tabular font-bold text-slate-900">{String(count)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="font-display text-base font-bold text-slate-900">Provenance des visiteurs</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    {Object.entries(dashboardStats.byProvenance || {}).map(([prov, count]) => (
                      <div key={prov} className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-mono-tabular text-slate-700">?src={prov}</span>
                        <span className="font-mono-tabular font-bold text-slate-900">{String(count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOSSIERS */}
          {activeTab === 'dossiers' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="relative w-full sm:min-w-[220px] sm:flex-1">
                  <input
                    type="text"
                    name="lomakrev-admin-search"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher nom, téléphone, référence..."
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 pr-9 text-sm"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-[#D90A14]"
                      aria-label="Effacer la recherche"
                      title="Effacer immédiatement"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {!isTechOnly && (
                  <select value={poleFilter} onChange={(e) => setPoleFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="all">Tous les pôles</option>
                    <option value="tech">Tech (Commandes)</option>
                    <option value="academie">Académie</option>
                    <option value="bourses">Bourses</option>
                    <option value="maintenance">Top Maintenance</option>
                    <option value="contact">Contact</option>
                  </select>
                )}
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="all">Tous les statuts</option>
                  <option value="nouvelle">Nouvelle / Reçue</option>
                  <option value="éligible">Éligible</option>
                  <option value="approuvée">Approuvée</option>
                  <option value="planifiée">Planifiée</option>
                  <option value="terminée">Terminée</option>
                </select>
                {batchSelection.length > 0 && ['DIRECTION', 'RESPONSABLE_BOURSES'].includes(user.role) && (
                  <button
                    type="button"
                    onClick={handleBatchApprove}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Approuver la sélection ({batchSelection.length})
                  </button>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <tr>
                      {['DIRECTION', 'RESPONSABLE_BOURSES'].includes(user.role) && <th className="p-3 w-8"></th>}
                      <th className="p-3">Référence</th>
                      <th className="p-3">Demandeur</th>
                      <th className="p-3">Téléphone</th>
                      <th className="p-3">Pôle</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3">Provenance</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDossiers.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80">
                        {['DIRECTION', 'RESPONSABLE_BOURSES'].includes(user.role) && (
                          <td className="p-3">
                            {d.type === 'BRS' && (
                              <input
                                type="checkbox"
                                checked={batchSelection.includes(d.id)}
                                onChange={(e) =>
                                  setBatchSelection((prev) => (e.target.checked ? [...prev, d.id] : prev.filter((id) => id !== d.id)))
                                }
                              />
                            )}
                          </td>
                        )}
                        <td className="p-3 font-mono-tabular font-bold text-slate-900">{d.reference}</td>
                        <td className="p-3">
                          <p className="font-medium text-slate-900">{d.applicantName}</p>
                          {d.enteredByAgent && <p className="text-[11px] text-slate-500">Saisi au bureau par {d.enteredByAgent}</p>}
                        </td>
                        <td className="p-3 font-mono-tabular text-slate-700">{d.phone}</td>
                        <td className="p-3 capitalize text-slate-600">{d.pole}</td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-900">{d.status}</span>
                          {d.totalScore !== undefined && d.type === 'BRS' && (
                            <span className="ml-1.5 font-mono-tabular text-xs text-slate-500">({d.totalScore} pts)</span>
                          )}
                        </td>
                        <td className="p-3 font-mono-tabular text-xs text-slate-500">{d.provenance}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDossier(d);
                              setTeamScoreInputs(d.teamScores || {});
                              setDiagInput(
                                d.interventionLog || { diagnostic: '', partsUsed: '', timeSpent: '', scheduledSlot: '' }
                              );
                            }}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                          >
                            Ouvrir
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredDossiers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-sm text-slate-500">
                          Aucun dossier trouvé pour ces critères.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Dossier Detail Drawer */}
              {selectedDossier && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50">
                  <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                      <div>
                        <p className="font-mono-tabular text-xs font-bold text-[#D90A14]">{selectedDossier.reference}</p>
                        <h3 className="font-display text-lg font-bold text-slate-900">{selectedDossier.applicantName}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPrintMode({ kind: 'dossier', dossier: selectedDossier, title: `Fiche dossier ${selectedDossier.reference}` })}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          PDF
                        </button>
                        <button type="button" onClick={() => setSelectedDossier(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 space-y-6 overflow-y-auto p-6">
                      <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-3">
                        <div>
                          <span className="text-slate-500">Téléphone</span>
                          <p className="font-mono-tabular font-bold text-slate-900">{selectedDossier.phone}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Statut actuel</span>
                          <p className="font-bold text-slate-900">{selectedDossier.status}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Provenance</span>
                          <p className="font-mono-tabular font-bold text-slate-900">{selectedDossier.provenance}</p>
                        </div>
                      </div>

                      {/* Workflow Status Controls */}
                      {!isReadOnly && (
                        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                          <h4 className="text-sm font-bold text-slate-900">Changer le statut</h4>
                          {selectedDossier.type === 'BRS' ? (
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDossier(selectedDossier.id, { status: 'Approuvée' })}
                                  className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                                >
                                  Approuver la bourse
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDossier(selectedDossier.id, { status: 'Liste d’attente' })}
                                  className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                                >
                                  Liste d’attente
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  placeholder="Motif obligatoire pour un refus..."
                                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDossier(selectedDossier.id, { status: 'Refusée', rejectionReason })}
                                  className="rounded-lg bg-[#D90A14] px-4 py-2 text-xs font-semibold text-white"
                                >
                                  Refuser
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {(selectedDossier.type === 'CMD'
                                ? ['Nouvelle', 'Confirmée', 'Prête pour retrait', 'Livrée', 'Annulée']
                                : selectedDossier.type === 'ACA'
                                ? ['Reçue', 'Confirmée', 'Payée', 'En formation', 'Terminée', 'Annulée']
                                : selectedDossier.type === 'DEV'
                                ? ['Reçu', 'Visite planifiée', 'Devis envoyé', 'Accepté', 'Refusé', 'Expiré']
                                : ['Reçue', 'Planifiée', 'En cours', 'En attente de pièce', 'Terminée', 'Clôturée']
                              ).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleUpdateDossier(selectedDossier.id, { status: st })}
                                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                                    selectedDossier.status === st ? 'border-[#D90A14] bg-[#D90A14] text-white' : 'border-slate-300 text-slate-700 hover:bg-[#FFFBEB]'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                              {selectedDossier.type === 'ACA' && (
                                <button
                                  type="button"
                                  onClick={() => setPrintMode({ kind: 'attestation', dossier: selectedDossier, title: 'Attestation Lomakrev Académie' })}
                                  className="rounded-lg border border-[#F4B400] bg-[#FFFBEB] px-3 py-1.5 text-xs font-semibold text-[#78350F] hover:bg-[#FEF3C7]"
                                >
                                  Générer attestation PDF
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Scholarship Team Scoring */}
                      {selectedDossier.type === 'BRS' && !isReadOnly && (
                        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                          <h4 className="text-sm font-bold text-slate-900">Grille d’évaluation (Score auto : {selectedDossier.autoScore || 0} pts)</h4>
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            {['Motivation (/20)', 'Projet (/20)', 'Entretien (/20)'].map((lbl, i) => {
                              const k = `crit_${i}`;
                              return (
                                <div key={k}>
                                  <label className="block text-slate-600">{lbl}</label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={20}
                                    value={teamScoreInputs[k] || 0}
                                    onChange={(e) => setTeamScoreInputs({ ...teamScoreInputs, [k]: Number(e.target.value) })}
                                    className="mt-1 w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono-tabular"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUpdateDossier(selectedDossier.id, { teamScores: teamScoreInputs })}
                            className="rounded-lg bg-[#D90A14] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B80811]"
                          >
                            Enregistrer les notes
                          </button>
                        </div>
                      )}

                      {/* Top Maintenance Quote Builder */}
                      {selectedDossier.type === 'DEV' && !isReadOnly && (
                        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                          <h4 className="text-sm font-bold text-slate-900">Rédiger le devis Lomakrev</h4>
                          {quoteItems.map((it, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 text-xs">
                              <input
                                type="text"
                                value={it.description}
                                onChange={(e) => {
                                  const next = [...quoteItems];
                                  next[idx].description = e.target.value;
                                  setQuoteItems(next);
                                }}
                                className="col-span-6 rounded border border-slate-300 px-2.5 py-1.5"
                                placeholder="Désignation"
                              />
                              <input
                                type="number"
                                value={it.qty}
                                onChange={(e) => {
                                  const next = [...quoteItems];
                                  next[idx].qty = Number(e.target.value);
                                  setQuoteItems(next);
                                }}
                                className="col-span-2 rounded border border-slate-300 px-2 py-1.5 font-mono-tabular"
                              />
                              <input
                                type="number"
                                value={it.unitUsd}
                                onChange={(e) => {
                                  const next = [...quoteItems];
                                  next[idx].unitUsd = Number(e.target.value);
                                  setQuoteItems(next);
                                }}
                                className="col-span-4 rounded border border-slate-300 px-2 py-1.5 font-mono-tabular"
                                placeholder="PU USD"
                              />
                            </div>
                          ))}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setQuoteItems([...quoteItems, { description: '', qty: 1, unitUsd: 0 }])}
                              className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                            >
                              + Ligne
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateDossier(selectedDossier.id, {
                                  status: 'Devis envoyé',
                                  quoteDetails: { items: quoteItems, notes: quoteNotes, validUntil: '2026-12-31' },
                                })
                              }
                              className="rounded bg-[#D90A14] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B80811]"
                            >
                              Enregistrer devis
                            </button>
                            {selectedDossier.quoteDetails && (
                              <button
                                type="button"
                                onClick={() => setPrintMode({ kind: 'devis', dossier: selectedDossier, title: 'DEVIS OFFICIEL' })}
                                className="rounded bg-[#B80811] px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                Télécharger devis PDF
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleUpdateDossier(selectedDossier.id, { convertToIntervention: true })}
                              className="rounded border border-[#F4B400] bg-[#FFFBEB] px-3 py-1.5 text-xs font-semibold text-[#78350F] hover:bg-[#FEF3C7]"
                            >
                              Convertir en intervention
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Top Maintenance Intervention Assignment & Log */}
                      {selectedDossier.type === 'INT' && !isReadOnly && (
                        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                          <h4 className="text-sm font-bold text-slate-900">Affectation & carnet d’entretien</h4>
                          {['DIRECTION', 'TOP_MAINTENANCE'].includes(user.role) && (
                            <select
                              value={selectedDossier.assignedToId || ''}
                              onChange={(e) => handleUpdateDossier(selectedDossier.id, { assignedToId: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                            >
                              <option value="">-- Affecter un technicien --</option>
                              {technicians.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          )}
                          <textarea
                            rows={2}
                            placeholder="Diagnostic technique..."
                            value={diagInput.diagnostic}
                            onChange={(e) => setDiagInput({ ...diagInput, diagnostic: e.target.value })}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-xs"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Pièces utilisées"
                              value={diagInput.partsUsed}
                              onChange={(e) => setDiagInput({ ...diagInput, partsUsed: e.target.value })}
                              className="rounded border border-slate-300 px-3 py-2 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Temps passé"
                              value={diagInput.timeSpent}
                              onChange={(e) => setDiagInput({ ...diagInput, timeSpent: e.target.value })}
                              className="rounded border border-slate-300 px-3 py-2 text-xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUpdateDossier(selectedDossier.id, { interventionLog: diagInput })}
                            className="rounded-lg bg-[#D90A14] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B80811]"
                          >
                            Sauvegarder carnet technique
                          </button>
                        </div>
                      )}

                      {/* Payload details */}
                      <div className="rounded-xl border border-slate-200 p-4">
                        <h4 className="mb-2 text-sm font-bold text-slate-900">Informations saisies</h4>
                        <dl className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(selectedDossier.payload || {}).map(([k, v]) => {
                            if (k.startsWith('_') || typeof v === 'object') return null;
                            return (
                              <div key={k} className="border-b border-slate-100 py-1">
                                <dt className="text-slate-500">{k}</dt>
                                <dd className="font-medium text-slate-900">{String(v)}</dd>
                              </div>
                            );
                          })}
                        </dl>
                        {selectedDossier.attachments?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-xs font-semibold text-slate-700">Pièces jointes ({selectedDossier.attachments.length}) :</p>
                            <ul className="mt-1 space-y-1 text-xs text-slate-600">
                              {selectedDossier.attachments.map((att, idx) => (
                                <li key={idx}>
                                  {att.name} ({Math.round(att.size / 1024)} Ko)
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Internal Comments */}
                      {!isReadOnly && (
                        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                          <h4 className="text-sm font-bold text-slate-900">Commentaires internes</h4>
                          <ul className="space-y-2 text-xs">
                            {selectedDossier.internalComments.map((c, i) => (
                              <li key={i} className="rounded bg-slate-50 p-2.5">
                                <span className="font-bold text-slate-900">{c.author}</span> ·{' '}
                                <span className="text-slate-400">{new Date(c.at).toLocaleString('fr-FR')}</span>
                                <p className="mt-1 text-slate-700">{c.text}</p>
                              </li>
                            ))}
                          </ul>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder="Ajouter une note interne..."
                              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateDossier(selectedDossier.id, { comment: commentText })}
                              className="rounded-lg bg-[#D90A14] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B80811]"
                            >
                              Ajouter
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FICHE CLIENT UNIQUE */}
          {activeTab === 'clients' && (
            <div className="grid gap-4 md:grid-cols-2">
              {clients.map((cl) => (
                <div key={cl.phone} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900">{cl.name}</h3>
                      <p className="font-mono-tabular text-xs text-slate-600">{cl.phone} {cl.email ? `· ${cl.email}` : ''}</p>
                    </div>
                    {isDirection && (
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/clients/${encodeURIComponent(cl.phone)}`, { method: 'DELETE', headers: authHeaders() });
                          pushToast('success', 'Données client supprimées (RGPD).');
                          loadAdminData();
                        }}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-[#D90A14]"
                        title="Supprimer données personnelles"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-2 text-xs">
                    {cl.dossiers.map((d: Dossier) => (
                      <div key={d.id} className="flex items-center justify-between py-2">
                        <span className="font-mono-tabular font-semibold text-slate-900">{d.reference}</span>
                        <span className="capitalize text-slate-500">{d.pole}</span>
                        <span className="font-medium text-slate-700">{d.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: SAISIE AU BUREAU */}
          {activeTab === 'office' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4">
                {[
                  { id: 'BRS', label: 'Candidature Bourse (assistée)' },
                  { id: 'ACA', label: 'Inscription Académie' },
                  { id: 'DEV', label: 'Demande de Devis' },
                  { id: 'INT', label: 'Demande d’Intervention' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOfficeFormType(opt.id as any)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      officeFormType === opt.id ? 'bg-[#D90A14] text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {officeFormType === 'BRS' && <BoursePostulerPage enteredByAgent={user.name} onDone={loadAdminData} />}
              {officeFormType === 'ACA' && <AcademieInscriptionPage enteredByAgent={user.name} onDone={loadAdminData} />}
              {officeFormType === 'DEV' && <MaintenanceDevisPage enteredByAgent={user.name} onDone={loadAdminData} />}
              {officeFormType === 'INT' && <MaintenanceInterventionPage enteredByAgent={user.name} onDone={loadAdminData} />}
            </div>
          )}

          {/* TAB 5: CATALOGUE & PHOTOS */}
          {activeTab === 'catalog' && data && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
                {[
                  { id: 'tech', label: 'Ordinateurs Tech' },
                  { id: 'academie', label: 'Formations & Sessions' },
                  { id: 'bourses', label: 'Campagnes & Critères' },
                  { id: 'photos', label: 'Galerie Photos par Édition' },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setCatalogSub(sub.id as any)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      catalogSub === sub.id ? 'bg-[#D90A14] text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-[#FFFBEB]'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {catalogSub === 'tech' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProduct({
                          brand: 'HP',
                          model: '',
                          processor: 'Core i5',
                          generation: '11e gén.',
                          ram: '16 Go',
                          storage: 'SSD 512 Go',
                          screen: '14" Full HD',
                          condition: 'Quasi neuf',
                          priceUsd: 450,
                          availability: 'En stock',
                          stockQty: 5,
                          warranty: 'Contrôlé en atelier Lomakrev',
                          category: 'Ultrabook Pro',
                          images: [],
                          featured: true,
                          sortOrder: 10,
                          active: true,
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-[#D90A14] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b80811]"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter un ordinateur
                    </button>
                    <p className="text-xs text-slate-500">
                      {data.products.length} article(s) enregistré(s) dans le catalogue
                    </p>
                  </div>

                  {editingProduct && (
                    <form onSubmit={handleSaveProduct} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h4 className="font-display text-base font-bold text-slate-900">
                          {editingProduct.id ? `Modifier : ${editingProduct.model || 'Article'}` : 'Nouvel article Lomakrev Tech'}
                        </h4>
                        <span className="rounded bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          Prévisualisation en direct avant enregistrement
                        </span>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-12">
                        {/* Form Fields */}
                        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Modèle *</label>
                            <input
                              type="text"
                              required
                              placeholder="Modèle (ex. HP EliteBook 840 G8)"
                              value={editingProduct.model || ''}
                              onChange={(e) => setEditingProduct({ ...editingProduct, model: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Marque *</label>
                            <input
                              type="text"
                              required
                              placeholder="Marque (HP, Dell...)"
                              value={editingProduct.brand || ''}
                              onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Processeur *</label>
                            <input
                              type="text"
                              required
                              placeholder="Processeur (ex. Core i5)"
                              value={editingProduct.processor || ''}
                              onChange={(e) => setEditingProduct({ ...editingProduct, processor: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Mémoire RAM *</label>
                            <input
                              type="text"
                              required
                              placeholder="RAM (ex. 16 Go)"
                              value={editingProduct.ram || ''}
                              onChange={(e) => setEditingProduct({ ...editingProduct, ram: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Stockage *</label>
                            <input
                              type="text"
                              required
                              placeholder="Stockage (ex. SSD 512 Go)"
                              value={editingProduct.storage || ''}
                              onChange={(e) => setEditingProduct({ ...editingProduct, storage: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Prix (USD) *</label>
                            <input
                              type="number"
                              required
                              min={1}
                              placeholder="Prix USD"
                              value={editingProduct.priceUsd || 0}
                              onChange={(e) => setEditingProduct({ ...editingProduct, priceUsd: Number(e.target.value) })}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-tabular"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Disponibilité</label>
                            <select
                              value={editingProduct.availability || 'En stock'}
                              onChange={(e) => setEditingProduct({ ...editingProduct, availability: e.target.value as any })}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            >
                              <option>En stock</option>
                              <option>Sur commande</option>
                              <option>Épuisé</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">État</label>
                            <select
                              value={editingProduct.condition || 'Quasi neuf'}
                              onChange={(e) => setEditingProduct({ ...editingProduct, condition: e.target.value as any })}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            >
                              <option>Neuf</option>
                              <option>Quasi neuf</option>
                              <option>Reconditionné</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Photo(s) de l’article</label>
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100">
                                <Camera className="h-3.5 w-3.5 text-[#D90A14]" />
                                <span>{(editingProduct.images && editingProduct.images.length > 0) ? 'Changer la photo principale' : 'Choisir une photo'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const url = await compressImageFile(file);
                                      const rest = (editingProduct.images || []).slice(1);
                                      setEditingProduct({ ...editingProduct, images: [url, ...rest] });
                                    }
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                                <Plus className="h-3.5 w-3.5" />
                                <span>Ajouter photo secondaire</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const url = await compressImageFile(file);
                                      setEditingProduct({
                                        ...editingProduct,
                                        images: [...(editingProduct.images || []), url],
                                      });
                                    }
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                              {(editingProduct.images?.length || 0) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setEditingProduct({ ...editingProduct, images: [] })}
                                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-[#D90A14] hover:bg-red-50"
                                >
                                  Effacer photo(s)
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Live Pre-Save Preview Card */}
                        <div className="lg:col-span-5">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Prévisualisation avant enregistrement
                            </p>
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                              <div className="relative h-44 w-full bg-slate-100">
                                {editingProduct.images?.[0] ? (
                                  <img
                                    src={editingProduct.images[0]}
                                    alt={editingProduct.model || 'Aperçu article'}
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-slate-400">
                                    <ImageIcon className="h-8 w-8" />
                                    <span className="text-xs">Aucune photo sélectionnée</span>
                                  </div>
                                )}
                                <span className="absolute right-2.5 top-2.5 rounded bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-slate-800 shadow-sm">
                                  {editingProduct.availability || 'En stock'}
                                </span>
                              </div>
                              {editingProduct.images && editingProduct.images.length > 1 && (
                                <div className="flex gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2 overflow-x-auto">
                                  {editingProduct.images.map((imgUrl, idx) => (
                                    <div key={idx} className="relative shrink-0">
                                      <img
                                        src={imgUrl}
                                        alt={`Vue ${idx + 1}`}
                                        className="h-11 w-14 rounded border border-slate-200 object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingProduct({
                                            ...editingProduct,
                                            images: editingProduct.images?.filter((_, i) => i !== idx),
                                          })
                                        }
                                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#D90A14] text-[10px] text-white"
                                        title="Retirer cette image"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="p-3.5">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  {editingProduct.brand || 'Marque'} · {editingProduct.condition || 'Quasi neuf'}
                                </p>
                                <p className="mt-0.5 font-bold text-slate-900">
                                  {editingProduct.model?.trim() || 'Nom du modèle'}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {editingProduct.processor || 'Processeur'} · {editingProduct.ram || 'RAM'} · {editingProduct.storage || 'Stockage'}
                                </p>
                                <div className="mt-2 flex items-baseline gap-2">
                                  <span className="font-mono-tabular text-base font-extrabold text-[#D90A14]">
                                    {(editingProduct.priceUsd || 0).toLocaleString('fr-FR')} USD
                                  </span>
                                  <span className="font-mono-tabular text-xs text-slate-500">
                                    ≈ {Math.round((editingProduct.priceUsd || 0) * (data.settings.usdToCdfRate || 2850)).toLocaleString('fr-FR')} CDF
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        <button type="submit" className="rounded-lg bg-[#D90A14] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#B80811]">
                          Enregistrer l’article
                        </button>
                        <button type="button" onClick={() => setEditingProduct(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Annuler
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.products.map((p) => (
                      <div key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white flex flex-col">
                        <div className="relative h-44 w-full bg-slate-100">
                          {p.images?.[0] ? (
                            <img
                              src={p.images[0]}
                              alt={p.model}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
                              <ImageIcon className="h-7 w-7" />
                              <span className="text-[11px]">Sans photo</span>
                            </div>
                          )}
                          <span className="absolute left-2.5 top-2.5 rounded bg-[#D90A14] px-2 py-0.5 text-[11px] font-semibold text-white">
                            {p.brand}
                          </span>
                          <span className="absolute right-2.5 top-2.5 rounded bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-slate-800 shadow-sm">
                            {p.availability}
                          </span>
                          {p.images && p.images.length > 1 && (
                            <span className="absolute bottom-2 right-2 rounded bg-[#FBBF24] px-2 py-0.5 text-[10px] font-bold text-[#7A050B]">
                              {p.images.length} photos
                            </span>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col justify-between p-4">
                          <div>
                            <p className="font-bold text-slate-900">{p.model}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{p.processor} · {p.ram} · {p.storage}</p>
                            <p className="mt-2 font-mono-tabular text-base font-bold text-[#D90A14]">{p.priceUsd} USD</p>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button type="button" onClick={() => setEditingProduct(p)} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50">
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await apiFetch(`/api/admin/products/${p.id}`, { method: 'DELETE', headers: authHeaders() });
                                pushToast('success', 'Article supprimé.');
                                refreshData();
                              }}
                              className="rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-[#D90A14] hover:bg-red-50"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {catalogSub === 'academie' && (
                <div className="space-y-4">
                  {editingFormation && (
                    <form onSubmit={handleSaveFormation} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                      <h4 className="font-bold text-slate-900">Éditer : {editingFormation.title}</h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input type="text" value={editingFormation.title} onChange={(e) => setEditingFormation({ ...editingFormation, title: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm" />
                        <input type="number" value={editingFormation.durationHours} onChange={(e) => setEditingFormation({ ...editingFormation, durationHours: Number(e.target.value) })} className="rounded border border-slate-300 px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase text-slate-500">Sessions (dates, horaires, prix, ouverture 2027)</p>
                        {editingFormation.sessions.map((s, idx) => (
                          <div key={s.id} className="mb-2 grid gap-2 rounded border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-5 text-xs">
                            <input type="text" value={s.code} onChange={(e) => { const next = [...editingFormation.sessions]; next[idx].code = e.target.value; setEditingFormation({ ...editingFormation, sessions: next }); }} placeholder="Code" className="rounded border px-2 py-1" />
                            <input type="date" value={s.startDate} onChange={(e) => { const next = [...editingFormation.sessions]; next[idx].startDate = e.target.value; setEditingFormation({ ...editingFormation, sessions: next }); }} className="rounded border px-2 py-1" />
                            <input type="text" value={s.schedule} onChange={(e) => { const next = [...editingFormation.sessions]; next[idx].schedule = e.target.value; setEditingFormation({ ...editingFormation, sessions: next }); }} placeholder="Horaires" className="rounded border px-2 py-1" />
                            <input type="number" value={s.priceUsd || 0} onChange={(e) => { const next = [...editingFormation.sessions]; next[idx].priceUsd = Number(e.target.value); setEditingFormation({ ...editingFormation, sessions: next }); }} placeholder="Prix USD" className="rounded border px-2 py-1" />
                            <label className="flex items-center gap-1.5 font-semibold">
                              <input type="checkbox" checked={s.isOpen} onChange={(e) => { const next = [...editingFormation.sessions]; next[idx].isOpen = e.target.checked; setEditingFormation({ ...editingFormation, sessions: next }); }} />
                              Ouverte
                            </label>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setEditingFormation({
                              ...editingFormation,
                              sessions: [
                                ...editingFormation.sessions,
                                {
                                  id: `sess_${Date.now()}`,
                                  code: '2027-02',
                                  formationSlug: editingFormation.slug,
                                  startDate: '2027-03-15',
                                  schedule: 'Sam · 09h00 – 13h00',
                                  location: 'Gombe, Avenue des Étoiles n° 09',
                                  instructor: 'Équipe Lomakrev',
                                  format: 'Présentiel',
                                  priceUsd: 100,
                                  capacity: 20,
                                  enrolledCount: 0,
                                  isOpen: true,
                                },
                              ],
                            })
                          }
                          className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                        >
                          + Ajouter une session 2027
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="rounded-lg bg-[#D90A14] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B80811]">Enregistrer</button>
                        <button type="button" onClick={() => setEditingFormation(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs">Fermer</button>
                      </div>
                    </form>
                  )}

                  <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                    {data.formations.map((f) => (
                      <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div>
                          <p className="font-bold text-slate-900">{f.title}</p>
                          <p className="text-xs text-slate-500">{f.durationHours} h · {f.sessions.filter((s) => s.isOpen).length} session(s) ouverte(s)</p>
                        </div>
                        <button type="button" onClick={() => setEditingFormation(f)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">
                          Gérer / Ouvrir session
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {catalogSub === 'bourses' && (
                <div className="space-y-4">
                  {editingCampaign && (
                    <form onSubmit={handleSaveCampaign} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                      <h4 className="font-bold text-slate-900">Campagne & Critères : {editingCampaign.title}</h4>
                      <div className="grid gap-3 sm:grid-cols-3 text-xs">
                        <div>
                          <label className="block text-slate-600">Titre</label>
                          <input type="text" value={editingCampaign.title} onChange={(e) => setEditingCampaign({ ...editingCampaign, title: e.target.value })} className="mt-1 w-full rounded border px-2.5 py-2" />
                        </div>
                        <div>
                          <label className="block text-slate-600">Âge min / Places</label>
                          <div className="mt-1 flex gap-2">
                            <input type="number" value={editingCampaign.minAge} onChange={(e) => setEditingCampaign({ ...editingCampaign, minAge: Number(e.target.value) })} className="w-1/2 rounded border px-2 py-2" />
                            <input type="number" value={editingCampaign.places} onChange={(e) => setEditingCampaign({ ...editingCampaign, places: Number(e.target.value) })} className="w-1/2 rounded border px-2 py-2" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-slate-600">Statut manuel</label>
                          <select value={editingCampaign.statusOverride || 'auto'} onChange={(e) => setEditingCampaign({ ...editingCampaign, statusOverride: e.target.value as any })} className="mt-1 w-full rounded border bg-white px-2 py-2">
                            <option value="auto">Automatique (selon dates)</option>
                            <option value="open">Forcer Ouverte</option>
                            <option value="closed">Forcer Clôturée</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-bold uppercase text-slate-500">Critères paramétrables</p>
                        {editingCampaign.criteria.map((c, idx) => (
                          <div key={c.id} className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                            <input type="text" value={c.label} onChange={(e) => { const next = [...editingCampaign.criteria]; next[idx].label = e.target.value; setEditingCampaign({ ...editingCampaign, criteria: next }); }} className="flex-1 rounded border px-2.5 py-1.5" />
                            <select value={c.type} onChange={(e) => { const next = [...editingCampaign.criteria]; next[idx].type = e.target.value as any; setEditingCampaign({ ...editingCampaign, criteria: next }); }} className="rounded border bg-white px-2 py-1.5">
                              <option value="eliminatoire">Éliminatoire</option>
                              <option value="automatique">Noté automatiquement</option>
                              <option value="equipe">Noté par l’équipe</option>
                            </select>
                            <input type="number" value={c.points || c.maxScore || 0} onChange={(e) => { const next = [...editingCampaign.criteria]; next[idx].points = Number(e.target.value); next[idx].maxScore = Number(e.target.value); setEditingCampaign({ ...editingCampaign, criteria: next }); }} className="w-20 rounded border px-2 py-1.5 font-mono-tabular" />
                            <button type="button" onClick={() => setEditingCampaign({ ...editingCampaign, criteria: editingCampaign.criteria.filter((_, i) => i !== idx) })} className="text-[#D90A14]">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const nc: ScholarshipCriterion = { id: `crit_${Date.now()}`, label: 'Nouveau critère', type: 'automatique', fieldKey: 'situation', operator: 'eq', expectedValue: 'Étudiant', points: 5 };
                            setEditingCampaign({ ...editingCampaign, criteria: [...editingCampaign.criteria, nc] });
                          }}
                          className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                        >
                          + Ajouter un critère
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button type="submit" className="rounded-lg bg-[#D90A14] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B80811]">Enregistrer campagne</button>
                        <button type="button" onClick={() => setEditingCampaign(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs">Fermer</button>
                      </div>
                    </form>
                  )}

                  <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                    {data.campaigns.map((c) => (
                      <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div>
                          <p className="font-bold text-slate-900">{c.title}</p>
                          <p className="text-xs text-slate-500">{c.places} places · Clôture {formatDateFr(c.closeDate)} · {c.criteria.length} critère(s)</p>
                        </div>
                        <button type="button" onClick={() => setEditingCampaign(c)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">
                          Modifier critères & dates
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {catalogSub === 'photos' && (
                <div className="space-y-6">
                  <form onSubmit={handleAddPhoto} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
                    <select value={newPhoto.pole} onChange={(e) => setNewPhoto({ ...newPhoto, pole: e.target.value as any })} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">
                      <option value="bourses">Programme de Bourses</option>
                      <option value="academie">Lomakrev Académie</option>
                      <option value="accueil">Accueil / Siège</option>
                      <option value="maintenance">Top Maintenance</option>
                    </select>
                    <input type="text" placeholder="Édition (ex. Première édition — 2026)" value={newPhoto.edition || ''} onChange={(e) => setNewPhoto({ ...newPhoto, edition: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm" />
                    <input type="text" required placeholder="Légende de la photo" value={newPhoto.caption || ''} onChange={(e) => setNewPhoto({ ...newPhoto, caption: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
                    <div className="space-y-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100">
                        <Camera className="h-3.5 w-3.5 text-[#D90A14]" />
                        <span>{newPhoto.url ? 'Changer l’image' : 'Choisir une image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = await compressImageFile(file);
                              setNewPhoto({ ...newPhoto, url });
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input type="checkbox" checked={Boolean(newPhoto.consentVerified)} onChange={(e) => setNewPhoto({ ...newPhoto, consentVerified: e.target.checked })} />
                        Accord de publication vérifié
                      </label>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <p className="mb-1.5 text-[11px] font-bold uppercase text-slate-500">Prévisualisation avant publication</p>
                      {newPhoto.url ? (
                        <img src={newPhoto.url} alt="Prévisualisation" className="h-32 w-full rounded object-cover" />
                      ) : (
                        <div className="flex h-32 w-full items-center justify-center rounded border border-dashed border-slate-300 text-xs text-slate-400">
                          Aucune image sélectionnée
                        </div>
                      )}
                    </div>
                    <button type="submit" className="rounded-lg bg-[#D90A14] px-4 py-2 text-sm font-semibold text-white sm:w-fit">
                      Publier la photo
                    </button>
                  </form>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.photos.map((ph) => (
                      <div key={ph.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <img src={ph.url} alt={ph.caption} className="h-44 w-full object-cover" referrerPolicy="no-referrer" />
                        <div className="p-4 text-xs">
                          <p className="font-bold uppercase text-slate-500">{ph.pole} · {ph.edition}</p>
                          <p className="mt-1 text-slate-800">{ph.caption}</p>
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/photos/${ph.id}`, { method: 'DELETE', headers: authHeaders() });
                              pushToast('success', 'Photo retirée immédiatement.');
                              refreshData();
                            }}
                            className="mt-3 text-[#D90A14] font-semibold hover:underline"
                          >
                            Retirer immédiatement
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CONSTRUCTEUR DE FORMULAIRES */}
          {activeTab === 'forms' && data && (
            <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">Constructeur de formulaires</h3>
                  <p className="text-xs text-slate-500">Ajoutez, renommez ou rendez obligatoire une question sans développeur (versionnement conservé).</p>
                </div>
                <select value={selectedFormKey} onChange={(e) => setSelectedFormKey(e.target.value as any)} className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold">
                  <option value="bourses">Candidature Bourses</option>
                  <option value="academie">Inscription Académie</option>
                  <option value="devis">Demande de Devis</option>
                  <option value="intervention">Demande d’Intervention</option>
                  <option value="contact">Contact</option>
                </select>
              </div>

              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
                <input type="text" placeholder="Libellé de la question" value={newField.label || ''} onChange={(e) => setNewField({ ...newField, label: e.target.value, name: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_') })} className="rounded border border-slate-300 bg-white px-3 py-2 text-xs sm:col-span-2" />
                <select value={newField.type} onChange={(e) => setNewField({ ...newField, type: e.target.value as any })} className="rounded border border-slate-300 bg-white px-2.5 py-2 text-xs">
                  <option value="text">Texte court</option>
                  <option value="textarea">Texte long</option>
                  <option value="number">Nombre</option>
                  <option value="date">Date</option>
                  <option value="select">Liste déroulante</option>
                  <option value="radio">Choix unique</option>
                  <option value="checkbox">Case à cocher</option>
                </select>
                <input type="number" min={1} max={4} value={newField.step || 1} onChange={(e) => setNewField({ ...newField, step: Number(e.target.value) })} placeholder="Étape" className="rounded border border-slate-300 bg-white px-2.5 py-2 text-xs" />
                <button
                  type="button"
                  onClick={async () => {
                    if (!newField.label) return;
                    const existing = data.forms[selectedFormKey]?.customFields || [];
                    const added: CustomFormField = {
                      id: `fld_${Date.now()}`,
                      step: newField.step || 1,
                      name: newField.name || `q_${Date.now()}`,
                      label: newField.label,
                      type: newField.type || 'text',
                      required: Boolean(newField.required),
                      options: ['Option A', 'Option B'],
                      sortOrder: existing.length + 1,
                    };
                    await apiFetch(`/api/admin/forms/${selectedFormKey}`, {
                      method: 'PUT',
                      headers: authHeaders(),
                      body: JSON.stringify({ customFields: [...existing, added] }),
                    });
                    setNewField({ step: 1, label: '', name: '', type: 'text', required: false });
                    pushToast('success', 'Champ ajouté au formulaire.');
                    refreshData();
                  }}
                  className="rounded-lg bg-[#D90A14] px-4 py-2 text-xs font-semibold text-white"
                >
                  Ajouter champ
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {(data.forms[selectedFormKey]?.customFields || []).map((f) => (
                  <div key={f.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{f.label}</p>
                      <p className="text-xs text-slate-500">Étape {f.step} · Type : {f.type}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const next = (data.forms[selectedFormKey]?.customFields || []).filter((x) => x.id !== f.id);
                        await apiFetch(`/api/admin/forms/${selectedFormKey}`, {
                          method: 'PUT',
                          headers: authHeaders(),
                          body: JSON.stringify({ customFields: next }),
                        });
                        refreshData();
                      }}
                      className="text-xs font-semibold text-[#D90A14]"
                    >
                      Retirer
                    </button>
                  </div>
                ))}
                {(data.forms[selectedFormKey]?.customFields || []).length === 0 && (
                  <p className="py-4 text-xs text-slate-500">Aucun champ personnalisé ajouté pour l’instant sur ce formulaire (tous les champs standards du cahier des charges sont déjà actifs).</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: LIENS COURTS & QR CODES */}
          {activeTab === 'shortlinks' && data && (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const res = await apiFetch('/api/admin/shortlinks', {
                      method: 'POST',
                      headers: authHeaders(),
                      body: JSON.stringify({ code: slCode, targetPath: slTarget, label: slLabel }),
                    });
                    if (res.ok) {
                      setSlCode('');
                      setSlLabel('');
                      pushToast('success', 'Lien court créé.');
                      refreshData();
                    } else {
                      const err = await res.json().catch(() => ({}));
                      pushToast('error', err.error || 'URL cible refusée.');
                    }
                  }}
                  className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
                >
                  <h3 className="font-display text-base font-bold text-slate-900">Créer un lien court</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input type="text" required placeholder="Code (ex. excel)" value={slCode} onChange={(e) => setSlCode(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm" />
                    <input type="text" required placeholder="Libellé" value={slLabel} onChange={(e) => setSlLabel(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <input type="text" required placeholder="URL cible (ex. /bourses/postuler?campagne=excel-avance-2027)" value={slTarget} onChange={(e) => setSlTarget(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
                  <button type="submit" className="rounded-lg bg-[#D90A14] px-4 py-2 text-sm font-semibold text-white">Créer le lien</button>
                </form>

                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                  {data.shortLinks.map((sl) => (
                    <div key={sl.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                      <div>
                        <p className="font-mono-tabular font-bold text-slate-900">/b/{sl.code}</p>
                        <p className="text-xs text-slate-500">{sl.label} → {sl.targetPath} ({sl.clicks} clics)</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGenerateQR(`/b/${sl.code}`, sl.label)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        QR Code
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                  <h3 className="font-display text-base font-bold text-slate-900">Générateur de QR Code pour affiches</h3>
                  {qrPreview ? (
                    <div className="mt-4 space-y-4">
                      <img src={qrPreview.dataUrl} alt={qrPreview.label} className="mx-auto h-52 w-52 rounded border border-slate-200" />
                      <p className="text-xs font-semibold text-slate-800">{qrPreview.label}</p>
                      <p className="break-all font-mono-tabular text-[11px] text-slate-500">{qrPreview.url}</p>
                      <a
                        href={qrPreview.dataUrl}
                        download={`qr-${qrPreview.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#D90A14] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B80811]"
                      >
                        <Download className="h-4 w-4" />
                        Télécharger PNG haute définition
                      </a>
                    </div>
                  ) : (
                    <p className="mt-6 text-xs text-slate-500">Cliquez sur « QR Code » à côté d’un lien court pour générer l’image imprimable.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: PARAMÈTRES DU SITE VITRINE & PHOTOS */}
          {activeTab === 'settings' && settingsDraft && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
                <h3 className="font-display text-lg font-bold text-slate-900">Identité & Informations du site vitrine</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Nom affiché du site vitrine</label>
                    <input type="text" value={settingsDraft.siteName} onChange={(e) => setSettingsDraft({ ...settingsDraft, siteName: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Raison sociale</label>
                    <input type="text" value={settingsDraft.legalName} onChange={(e) => setSettingsDraft({ ...settingsDraft, legalName: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Promesse principale (Hero)</label>
                    <input type="text" value={settingsDraft.promise} onChange={(e) => setSettingsDraft({ ...settingsDraft, promise: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Vision</label>
                    <textarea rows={2} value={settingsDraft.vision} onChange={(e) => setSettingsDraft({ ...settingsDraft, vision: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Adresse</label>
                    <input type="text" value={settingsDraft.address} onChange={(e) => setSettingsDraft({ ...settingsDraft, address: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Téléphone & WhatsApp</label>
                    <input type="text" value={settingsDraft.phone} onChange={(e) => setSettingsDraft({ ...settingsDraft, phone: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Taux USD → CDF</label>
                    <input type="number" value={settingsDraft.usdToCdfRate} onChange={(e) => setSettingsDraft({ ...settingsDraft, usdToCdfRate: Number(e.target.value), rateDate: new Date().toISOString().slice(0, 10) })} className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono-tabular" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Horaires d’ouverture</label>
                    <input type="text" value={settingsDraft.openingHours} onChange={(e) => setSettingsDraft({ ...settingsDraft, openingHours: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm" />
                  </div>
                </div>
              </div>

              {/* Photos configuration */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
                <h3 className="font-display text-lg font-bold text-slate-900">Photos officielles & Griffes affichées sur le site</h3>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {(
                    [
                      { key: 'logoUrl', label: 'Logo officiel / Griffes' },
                      { key: 'heroImageUrl', label: 'Photo principale Accueil' },
                      { key: 'boursesFamilyImageUrl', label: 'Photo de famille Bourses (1ère édition)' },
                      { key: 'academieHeroUrl', label: 'Photo Lomakrev Académie' },
                      { key: 'maintenanceHeroUrl', label: 'Photo Top Maintenance' },
                      { key: 'aboutImageUrl', label: 'Photo page À propos' },
                    ] as { key: keyof SiteSettings; label: string }[]
                  ).map((item) => (
                    <div key={item.key} className="space-y-2 rounded-lg border border-slate-200 p-3">
                      <p className="text-xs font-bold text-slate-800">{item.label}</p>
                      <img src={String(settingsDraft[item.key] || '')} alt={item.label} className="h-28 w-full rounded bg-slate-100 object-cover" referrerPolicy="no-referrer" />
                      <input type="file" accept="image/*" onChange={(e) => handleSettingsImageUpload(item.key, e.target.files?.[0] || null)} className="w-full text-[11px]" />
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="rounded-lg bg-[#D90A14] px-6 py-3 text-sm font-semibold text-white hover:bg-[#b80811]">
                Enregistrer tous les paramètres
              </button>
            </form>
          )}

          {/* TAB 9: UTILISATEURS, AUDIT & SAUVEGARDE */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {isDirection && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <form
                    autoComplete="off"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const res = await apiFetch('/api/admin/users', { method: 'POST', headers: authHeaders(), body: JSON.stringify(newUser) });
                      if (res.ok) {
                        setNewUser({ name: '', email: '', password: '', role: 'COMMERCIAL_TECH', twoFactorEnabled: false });
                        pushToast('success', 'Compte utilisateur créé.');
                        loadAdminData();
                      } else {
                        const err = await res.json().catch(() => ({}));
                        pushToast('error', err.error || 'Création du compte impossible.');
                      }
                    }}
                    className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
                  >
                    <h3 className="font-display text-base font-bold text-slate-900">Créer un compte équipe</h3>
                    <input type="text" required autoComplete="off" placeholder="Nom complet" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
                    <input type="email" required autoComplete="off" placeholder="E-mail" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
                    <input type="password" required minLength={8} autoComplete="new-password" placeholder="Mot de passe (8 caractères min.)" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
                    <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })} className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm">
                      {Object.entries(ROLE_LABELS).map(([k, lbl]) => (
                        <option key={k} value={k}>{lbl}</option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-lg bg-[#D90A14] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B80811]">Ajouter utilisateur</button>
                  </form>

                  <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="flex items-center gap-2 font-display text-base font-bold text-slate-900">
                      <Database className="h-4 w-4 text-[#D90A14]" />
                      Sauvegardes & restauration
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600">
                      Sauvegarde automatique quotidienne conservée localement. Téléchargez une copie complète ou exécutez un test d’intégrité.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await apiFetch('/api/admin/backup');
                          if (res.ok) {
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `lomakrev-backup-${new Date().toISOString().slice(0, 10)}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                            loadAdminData();
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#D90A14] px-4 py-2 text-xs font-semibold text-white"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Télécharger sauvegarde
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await apiFetch('/api/admin/restore-test', { method: 'POST', headers: authHeaders() });
                          const json = await res.json();
                          if (res.ok) {
                            pushToast('success', `Restauration vérifiée : ${json.counts.dossiers} dossiers, ${json.counts.formations} formations.`);
                            loadAdminData();
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Tester la restauration
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">Comptes & Rôles</h3>
                    {isDirection && (
                      <p className="text-xs text-slate-500">
                        Les mots de passe sont chiffrés et hachés (scrypt). En cas d’oubli, réinitialisez le mot de passe d’un collaborateur au mot de passe par défaut : il devra le modifier à sa prochaine connexion.
                      </p>
                    )}
                  </div>
                </div>

                {isDirection && resetResult && (
                  <div className="rounded-xl border border-[#F4B400] bg-[#FFFBEB] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-[#7A050B]">
                          Mot de passe réinitialisé pour {resetResult.name}
                        </p>
                        <p className="text-xs text-slate-700">
                          Compte : <strong>{resetResult.email}</strong> — Communiquez ce mot de passe temporaire à l’utilisateur (masqué automatiquement après 60 s).
                        </p>
                        <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-lg border border-[#F4B400]/70 bg-white px-3 py-1.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Mot de passe temporaire :</span>
                          <code className="font-mono-tabular text-sm font-extrabold text-[#D90A14]">
                            {showTempPassword ? resetResult.temporaryPassword : '••••••••••••'}
                          </code>
                          <button
                            type="button"
                            onClick={() => setShowTempPassword((v) => !v)}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                            aria-label={showTempPassword ? 'Masquer' : 'Afficher'}
                          >
                            {showTempPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            {showTempPassword ? 'Masquer' : 'Afficher'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard?.writeText(resetResult.temporaryPassword).catch(() => {});
                              pushToast('success', 'Mot de passe par défaut copié.');
                            }}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <Copy className="h-3 w-3" />
                            Copier
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setResetResult(null);
                          setShowTempPassword(false);
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                        aria-label="Fermer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {isDirection && confirmResetUser && (
                  <div className="rounded-xl border border-[#D90A14]/40 bg-red-50/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-800">
                        <p className="font-bold text-[#D90A14]">
                          Réinitialiser le mot de passe de {confirmResetUser.name} ?
                        </p>
                        <p className="mt-0.5 text-slate-600">
                          Le mot de passe de <strong>{confirmResetUser.email}</strong> sera remplacé par le mot de passe par défaut et ses sessions actives seront fermées.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={resetBusyId === confirmResetUser.id}
                          onClick={() => handleResetUserPassword(confirmResetUser)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#D90A14] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#B80811] disabled:opacity-60"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          {resetBusyId === confirmResetUser.id ? 'Réinitialisation...' : 'Confirmer la réinitialisation'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmResetUser(null)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-slate-100 text-sm">
                  {usersList.map((u) => (
                    <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name} className="h-9 w-9 rounded-full border border-slate-200 object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                            {u.name
                              .split(' ')
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </span>
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{u.name}</p>
                            {u.mustChangePassword && (
                              <span className="rounded border border-[#F4B400] bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-semibold text-[#7A050B]">
                                Mot de passe à changer
                              </span>
                            )}
                            {!u.active && (
                              <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-[#D90A14]">
                                Désactivé
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {u.email}
                            {u.phone ? ` · ${u.phone}` : ''}
                            {u.title ? ` · ${u.title}` : ''}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1.5 rounded bg-slate-100 px-2 py-0.5 font-mono-tabular text-[11px] text-slate-600">
                            <Lock className="h-3 w-3 text-[#D90A14]" />
                            Mot de passe (haché) : {u.passwordHashPreview || 'scrypt-512 · ••••••••••••'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{ROLE_LABELS[u.role]}</span>
                        {isDirection && u.id !== user.id && (
                          <>
                            <button
                              type="button"
                              onClick={() => setConfirmResetUser(u)}
                              disabled={resetBusyId === u.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#F4B400] bg-[#FFFBEB] px-3 py-1.5 text-xs font-semibold text-[#7A050B] hover:bg-[#FEF3C7] disabled:opacity-60"
                            >
                              <RefreshCw className="h-3.5 w-3.5 text-[#D90A14]" />
                              Réinitialiser mot de passe
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleUserActive(u)}
                              disabled={toggleBusyId === u.id}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              {u.active ? 'Désactiver' : 'Réactiver'}
                            </button>
                          </>
                        )}
                        {isDirection && u.id === user.id && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('profile')}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Mon profil
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 font-display text-base font-bold text-slate-900">Journal des actions & modifications</h3>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div>
                        <span className="font-semibold text-slate-900">{log.action}</span> — <span className="text-slate-700">{log.target}</span>
                        <span className="ml-2 text-slate-400">par {log.userName}</span>
                      </div>
                      <span className="font-mono-tabular text-slate-400">{new Date(log.at).toLocaleString('fr-FR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: MON PROFIL & MOT DE PASSE (ALL USERS) */}
          {activeTab === 'profile' && user && (
            <div className="grid gap-6 lg:grid-cols-12">
              <form onSubmit={handleSaveProfile} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-900">Mes informations & Photo de profil</h3>
                    <p className="text-xs text-slate-500">Mettez à jour votre identité, vos coordonnées et votre photo affichée dans l’espace équipe.</p>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>

                {/* Avatar Upload + Instant Preview */}
                <div className="flex flex-wrap items-center gap-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="relative">
                    {profileDraft.avatarUrl ? (
                      <img
                        src={profileDraft.avatarUrl}
                        alt={profileDraft.name || user.name}
                        className="h-24 w-24 rounded-2xl border border-slate-200 object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-[#FBBF24] bg-[#D90A14] text-2xl font-extrabold text-white">
                        {(profileDraft.name || user.name)
                          .split(' ')
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 min-w-[200px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">Photo de profil</p>
                      {profileDraft.avatarUrl !== (user.avatarUrl || '') && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          Prévisualisation non enregistrée
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">Format JPG/PNG recommandé. L’aperçu s’affiche immédiatement avant d’enregistrer.</p>
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100">
                        <Camera className="h-3.5 w-3.5 text-[#D90A14]" />
                        <span>Choisir une photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await compressImageFile(file, 480, 0.82);
                              setProfileDraft((p) => ({ ...p, avatarUrl: compressed }));
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {profileDraft.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setProfileDraft((p) => ({ ...p, avatarUrl: '' }))}
                          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-[#D90A14] hover:bg-red-50"
                        >
                          Supprimer la photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Nom complet *</label>
                    <input
                      type="text"
                      required
                      value={profileDraft.name}
                      onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Adresse e-mail *</label>
                    <input
                      type="email"
                      required
                      value={profileDraft.email}
                      onChange={(e) => setProfileDraft({ ...profileDraft, email: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Téléphone / WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="+243 ..."
                      value={profileDraft.phone}
                      onChange={(e) => setProfileDraft({ ...profileDraft, phone: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Fonction / Poste</label>
                    <input
                      type="text"
                      placeholder="Ex. Responsable Commercial Tech"
                      value={profileDraft.title}
                      onChange={(e) => setProfileDraft({ ...profileDraft, title: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Note / Signature professionnelle</label>
                    <textarea
                      rows={2}
                      placeholder="Courte présentation ou signature..."
                      value={profileDraft.bio}
                      onChange={(e) => setProfileDraft({ ...profileDraft, bio: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>

                {profileError && <p className="text-xs font-medium text-[#D90A14]">{profileError}</p>}

                <button
                  type="submit"
                  disabled={profileBusy}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#D90A14] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b80811] disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {profileBusy ? 'Enregistrement...' : 'Enregistrer mes informations'}
                </button>
              </form>

              {/* Password Change Card */}
              <form onSubmit={handleChangePassword} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 h-fit">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                    <KeyRound className="h-5 w-5 text-[#D90A14]" />
                    Sécurité & Mot de passe
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Modifiez votre mot de passe personnel à tout moment (minimum 8 caractères).
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Mot de passe actuel *</label>
                  <div className="relative">
                    <input
                      type={passwordForm.showCurrent ? 'text' : 'password'}
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordForm({ ...passwordForm, showCurrent: !passwordForm.showCurrent })}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                      aria-label="Afficher/masquer"
                    >
                      {passwordForm.showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Nouveau mot de passe *</label>
                  <div className="relative">
                    <input
                      type={passwordForm.showNew ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordForm({ ...passwordForm, showNew: !passwordForm.showNew })}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                      aria-label="Afficher/masquer"
                    >
                      {passwordForm.showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Confirmer le nouveau mot de passe *</label>
                  <input
                    type={passwordForm.showNew ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>

                {passwordForm.error && <p className="text-xs font-medium text-[#D90A14]">{passwordForm.error}</p>}

                <button
                  type="submit"
                  disabled={passwordForm.busy}
                  className="w-full rounded-lg border border-[#F4B400] bg-[#FBBF24] px-4 py-2.5 text-sm font-bold text-[#7A050B] hover:bg-[#F4B400] disabled:opacity-60"
                >
                  {passwordForm.busy ? 'Mise à jour...' : 'Changer mon mot de passe'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 11: NOTIFICATIONS PAR PÔLE */}
          {activeTab === 'notifications' && !isReadOnly && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#F4B400]/50 bg-white p-5">
                <div>
                  <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                    <Bell className="h-5 w-5 text-[#D90A14]" />
                    Notifications de vos pôles
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Alertes en temps réel sur les achats, demandes de bourses, inscriptions Académie, devis et maintenances visibles uniquement par les responsables concernés ({ROLE_LABELS[user.role]}).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={notifUnreadOnly}
                      onChange={(e) => setNotifUnreadOnly(e.target.checked)}
                      className="accent-[#D90A14]"
                    />
                    Non lues uniquement ({unreadNotificationsCount})
                  </label>
                  {unreadNotificationsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMarkAllNotificationsRead(notifPoleFilter)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#D90A14] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#B80811]"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Tout marquer comme lu
                    </button>
                  )}
                </div>
              </div>

              {allowedPoleTabs.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {allowedPoleTabs.map((tab) => {
                    const active = notifPoleFilter === tab.id;
                    const countUnread = notificationsList.filter(
                      (n) => !n.read && (tab.id === 'all' || n.pole === tab.id)
                    ).length;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setNotifPoleFilter(tab.id)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                          active
                            ? 'border-[#D90A14] bg-[#D90A14] text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-[#FFFBEB]'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {countUnread > 0 && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                              active ? 'bg-[#FBBF24] text-[#7A050B]' : 'bg-[#D90A14] text-white'
                            }`}
                          >
                            {countUnread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {filteredNotifications.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">
                    Aucune notification ne correspond à ce filtre.
                  </div>
                ) : (
                  filteredNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex flex-wrap items-start justify-between gap-4 p-4 transition-colors ${
                        !n.read ? 'bg-[#FFFDF5]' : 'bg-white'
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span
                          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                            !n.read ? 'bg-[#D90A14]' : 'bg-slate-200'
                          }`}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded border border-[#F4B400] bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-bold text-[#7A050B]">
                              {poleLabel(n.pole)}
                            </span>
                            {n.dossierRef && (
                              <span className="font-mono-tabular rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                {n.dossierRef}
                              </span>
                            )}
                            <span className="font-mono-tabular text-[11px] text-slate-400">
                              {new Date(n.createdAt).toLocaleString('fr-FR')}
                            </span>
                            {!n.read && (
                              <span className="rounded bg-[#D90A14] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                                Nouveau
                              </span>
                            )}
                          </div>
                          <p className={`text-sm ${!n.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs leading-relaxed text-slate-600">{n.message}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => handleMarkNotificationRead(n.id)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Marquer lu
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenNotification(n)}
                          className="rounded-lg bg-[#D90A14] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#B80811]"
                        >
                          Ouvrir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
