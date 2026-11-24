import React, { useState } from 'react';
import { ArrowRight, Check, Copy, Download, Eye, FileText, Share2, Trash2, Upload, WifiOff } from 'lucide-react';
import type { CustomFormField } from '../types/lomakrev';
import { compressImageFile } from '../lib/offlineSync';
import {
  buildFacebookShareUrl,
  buildWhatsAppShareUrl,
  downloadClientFichePdf,
  type ClientFicheDossier,
} from '../lib/pdfPrint';
import { useApp } from '../context/AppContext';
import { OfficeAwareSelect } from './DualSelectInput';
import { ClientFicheModal } from './ClientFicheModal';

export function validateRdcPhone(value: string): boolean {
  const clean = value.replace(/[\s\-().]/g, '');
  return /^\+?243[0-9]{9}$/.test(clean);
}

function strip243Prefix(val: string): string {
  const digits = (val || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('243')) return digits.slice(3, 12);
  if (digits.startsWith('0')) return digits.slice(1, 10);
  return digits.slice(0, 9);
}

function format9Digits(digits: string): string {
  const d = digits.slice(0, 9);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}

export const RdcPhoneBox: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
  autoComplete?: string;
}> = ({ value, onChange, placeholder = '81 234 5678', hasError = false, disabled = false, autoComplete = 'tel' }) => {
  const localDigits = strip243Prefix(value);
  const displayVal = format9Digits(localDigits);

  const handleLocalChange = (raw: string) => {
    const cleanDigits = raw.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(0, 9);
    onChange(cleanDigits ? `+243${cleanDigits}` : '+243');
  };

  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-lg border transition-colors ${
        hasError ? 'border-[#D90A14] bg-red-50/30' : 'border-slate-300 bg-white focus-within:border-[#D90A14]'
      } ${disabled ? 'bg-slate-50 text-slate-500' : ''}`}
    >
      <span className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 font-mono-tabular select-none">
        +243
      </span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete={autoComplete}
        spellCheck={false}
        disabled={disabled}
        value={displayVal}
        onChange={(e) => handleLocalChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm sm:text-base text-slate-900 font-mono-tabular outline-none placeholder:text-slate-400"
      />
    </div>
  );
};

export const RdcPhoneInput: React.FC<{
  label?: string;
  whatsappLabel?: string;
  phone: string;
  onPhoneChange: (val: string) => void;
  whatsapp?: string;
  onWhatsappChange?: (val: string) => void;
  sameForWhatsapp?: boolean;
  onSameChange?: (same: boolean) => void;
  error?: string;
  whatsappError?: string;
  showWhatsappOption?: boolean;
  autoComplete?: string;
  layout?: 'stack' | 'grid';
}> = ({
  label = 'Téléphone',
  whatsappLabel = 'Numéro WhatsApp',
  phone,
  onPhoneChange,
  whatsapp = '',
  onWhatsappChange,
  sameForWhatsapp = true,
  onSameChange,
  error,
  whatsappError,
  showWhatsappOption = true,
  autoComplete,
  layout = 'stack',
}) => {
  const resolvedAutoComplete = autoComplete ?? (showWhatsappOption ? 'tel' : 'off');

  const phoneField = (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-800">
        {label} <span className="text-[#D90A14]">*</span>
      </label>
      <RdcPhoneBox
        value={phone}
        onChange={(next) => {
          onPhoneChange(next);
          if (sameForWhatsapp && onWhatsappChange) onWhatsappChange(next);
        }}
        hasError={Boolean(error)}
        autoComplete={resolvedAutoComplete}
      />
      <p className="mt-1 text-xs text-slate-500">Format vérifié automatiquement (9 chiffres après +243).</p>
      {error && <p className="mt-1 text-xs font-medium text-[#D90A14]">{error}</p>}
    </div>
  );

  const whatsappField = showWhatsappOption && onWhatsappChange && (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-800">{whatsappLabel}</label>
      <RdcPhoneBox
        value={sameForWhatsapp ? phone : whatsapp}
        onChange={(next) => onWhatsappChange(next)}
        disabled={sameForWhatsapp}
        hasError={Boolean(whatsappError)}
        autoComplete="off"
      />
      {onSameChange && (
        <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-slate-600 select-none">
          <input
            type="checkbox"
            checked={sameForWhatsapp}
            onChange={(e) => {
              onSameChange(e.target.checked);
              if (e.target.checked) onWhatsappChange(phone);
            }}
            className="h-3.5 w-3.5 rounded border-slate-300 accent-[#D90A14]"
          />
          <span>Même numéro que le téléphone</span>
        </label>
      )}
      {whatsappError && <p className="mt-1 text-xs font-medium text-[#D90A14]">{whatsappError}</p>}
    </div>
  );

  if (layout === 'grid' && whatsappField) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {phoneField}
        {whatsappField}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {phoneField}
      {whatsappField}
    </div>
  );
};

export interface AttachmentFile {
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
}

export const FileAttachmentPicker: React.FC<{
  label: string;
  required?: boolean;
  files: AttachmentFile[];
  onChange: (files: AttachmentFile[]) => void;
  maxFiles?: number;
  maxSizeMb?: number;
  accept?: string;
  helperText?: string;
  error?: string;
}> = ({
  label,
  required = false,
  files,
  onChange,
  maxFiles = 5,
  maxSizeMb = 10,
  accept = '.jpg,.jpeg,.png,.pdf',
  helperText = 'JPG, PNG ou PDF · 10 Mo max.',
  error,
}) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    setErr('');
    setBusy(true);
    try {
      const next = maxFiles === 1 ? [] : [...files];
      for (const file of Array.from(fileList)) {
        if (next.length >= maxFiles && maxFiles > 1) {
          setErr(`Maximum ${maxFiles} fichiers autorisés.`);
          break;
        }
        if (file.size > maxSizeMb * 1024 * 1024) {
          setErr(`${file.name} dépasse ${maxSizeMb} Mo.`);
          continue;
        }
        const dataUrl = await compressImageFile(file);
        next.push({ name: file.name, type: file.type, size: file.size, dataUrl });
        if (maxFiles === 1) break;
      }
      onChange(next);
    } catch {
      setErr('Impossible de lire le fichier sélectionné.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-800">
        {label} {required && <span className="text-[#D90A14]">*</span>}
      </label>
      <label
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center transition-colors ${
          error || err
            ? 'border-[#D90A14]/60 bg-red-50/30 hover:bg-red-50/50'
            : 'border-slate-300 bg-slate-50/40 hover:border-slate-400 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <Upload className="h-4 w-4 text-slate-500" />
          <span>{busy ? 'Traitement du fichier...' : 'Ajouter un fichier ou prendre une photo'}</span>
        </div>
        <span className="mt-1 text-xs text-slate-500">{helperText}</span>
        <input
          type="file"
          multiple={maxFiles > 1}
          accept={accept}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
      </label>
      {(err || error) && <p className="text-xs font-medium text-[#D90A14]">{err || error}</p>}
      {files.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {files.map((f, idx) => (
            <li key={`${f.name}-${idx}`} className="flex items-center justify-between px-3 py-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 shrink-0 text-emerald-700" />
                <span className="truncate font-medium text-slate-800">{f.name}</span>
                <span className="text-xs text-slate-400 tabular-nums">({Math.max(1, Math.round(f.size / 1024))} Ko)</span>
              </div>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, i) => i !== idx))}
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-[#D90A14]"
                aria-label="Retirer le fichier"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const CustomFieldsRenderer: React.FC<{
  fields: CustomFormField[];
  step: number;
  values: Record<string, unknown>;
  onChange: (name: string, val: unknown) => void;
  officeMode?: boolean;
}> = ({ fields, step, values, onChange, officeMode = false }) => {
  const stepFields = fields
    .filter((f) => f.step === step)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((f) => {
      if (!f.conditionField) return true;
      return String(values[f.conditionField] || '').toLowerCase() === String(f.conditionValue || '').toLowerCase();
    });

  if (stepFields.length === 0) return null;

  return (
    <div className="space-y-4 border-t border-slate-200 pt-4">
      {stepFields.map((f) => {
        const val = values[f.name];
        return (
          <div key={f.id}>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">
              {f.label} {f.required && <span className="text-[#D90A14]">*</span>}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                rows={3}
                value={String(val || '')}
                onChange={(e) => onChange(f.name, e.target.value)}
                placeholder={f.placeholder || ''}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:text-base text-slate-900 outline-none focus:border-[#D90A14]"
              />
            ) : f.type === 'select' ? (
              <OfficeAwareSelect
                officeMode={officeMode}
                fieldKey={`custom_${f.name}`}
                value={String(val || '')}
                onChange={(nextVal) => onChange(f.name, nextVal)}
                options={[
                  ...(!officeMode ? [{ value: '', label: 'Choisir…' }] : []),
                  ...(f.options || []).map((opt) => ({ value: opt, label: opt })),
                ]}
                placeholder={f.placeholder || 'Choisir ou saisir...'}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:text-base text-slate-900 outline-none focus:border-[#D90A14]"
              />
            ) : f.type === 'radio' ? (
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {(f.options || []).map((opt) => (
                  <label key={opt} className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                    <input
                      type="radio"
                      name={`custom_${f.name}`}
                      checked={val === opt}
                      onChange={() => onChange(f.name, opt)}
                      className="h-4 w-4 accent-[#D90A14]"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : f.type === 'checkbox' || f.type === 'consent' ? (
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(val)}
                  onChange={(e) => onChange(f.name, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[#D90A14]"
                />
                <span>{f.placeholder || 'Oui, je confirme'}</span>
              </label>
            ) : (
              <input
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : 'text'}
                value={String(val || '')}
                onChange={(e) => onChange(f.name, e.target.value)}
                placeholder={f.placeholder || ''}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:text-base text-slate-900 outline-none focus:border-[#D90A14]"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const SubmissionSuccessCard: React.FC<{
  offline?: boolean;
  localId?: string;
  dossier?: ClientFicheDossier;
  title?: string;
  bulletPoints?: string[];
  smsPreview?: string;
  nextStepsText?: string;
  resetLabel?: string;
  onReset?: () => void;
}> = ({
  offline,
  localId,
  dossier,
  title,
  bulletPoints,
  smsPreview,
  nextStepsText,
  resetLabel = 'Retour',
  onReset,
}) => {
  const { navigate, data, pushToast } = useApp();
  const [ficheOpen, setFicheOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const autoSmsText = smsPreview || dossier?.autoMessage || '';

  const handleDownloadPdf = async () => {
    if (!dossier || !data?.settings) return;
    setDownloadingPdf(true);
    try {
      const filename = await downloadClientFichePdf({ settings: data.settings, dossier });
      pushToast('success', `PDF téléchargé : ${filename}`);
    } catch {
      pushToast('error', 'Impossible de générer le PDF. Utilisez Visualiser la fiche client puis Imprimer.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div
      className={`rounded-xl border-2 bg-white p-6 sm:p-7 shadow-xs ${
        offline ? 'border-amber-500' : 'border-emerald-600'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            offline ? 'bg-amber-100 text-amber-800' : 'bg-emerald-600 text-white'
          }`}
        >
          {offline ? <WifiOff className="h-4 w-4" /> : <Check className="h-4 w-4 stroke-[2.75]" />}
        </div>
        <h2 className="font-display text-lg font-extrabold text-slate-900 sm:text-xl">
          {offline ? 'Dossier sauvegardé hors ligne' : title || 'Demande bien reçue'}
        </h2>
      </div>

      {offline ? (
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Aucune connexion Internet détectée. Vos informations ont été enregistrées en sécurité sur cet appareil (identifiant local{' '}
          <span className="font-mono-tabular font-semibold text-slate-900">{localId}</span>). Elles seront transmises automatiquement dès le retour de la connexion.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="inline-block rounded-lg border border-dashed border-emerald-500 bg-emerald-50/50 px-4 py-2.5">
            <p className="text-[11px] font-medium text-emerald-900/80">Votre numéro de dossier</p>
            <p className="mt-0.5 font-mono-tabular text-xl font-extrabold tracking-wider text-emerald-800 sm:text-2xl">
              {dossier?.reference}
            </p>
          </div>

          {dossier?.eligibilityReason && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-950">
              Motif communiqué : {dossier.eligibilityReason}
            </p>
          )}

          {bulletPoints && bulletPoints.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {bulletPoints.map((pt, idx) => (
                <li key={idx}>{pt}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-relaxed text-slate-600">
              {nextStepsText || data?.settings?.responseDelayText || 'Nous vous rappelons sous 24 h ouvrées.'}
            </p>
          )}

          {autoSmsText && (
            <div className="rounded-lg border border-slate-200 bg-slate-100/80 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                MESSAGE SMS / WHATSAPP ENVOYÉ AUTOMATIQUEMENT
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-800 sm:text-sm">{autoSmsText}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2.5">
        {!offline && dossier?.reference && (
          <>
            <button
              type="button"
              onClick={() => navigate(`/suivi?ref=${encodeURIComponent(dossier.reference)}`)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#D90A14] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#b80811] whitespace-nowrap shrink-0"
            >
              Suivre mon dossier
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setFicheOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Eye className="h-4 w-4 text-slate-600" />
              Visualiser la fiche client
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" />
              {downloadingPdf ? 'PDF...' : 'Garder en PDF'}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => (onReset ? onReset() : navigate('/'))}
          className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          {resetLabel}
        </button>
      </div>

      {!offline && dossier && (
        <ClientFicheModal open={ficheOpen} onClose={() => setFicheOpen(false)} dossier={dossier} />
      )}
    </div>
  );
};

export const ShareButton: React.FC<{
  title: string;
  path?: string;
  className?: string;
}> = ({ title, path, className = '' }) => {
  const { pushToast } = useApp();
  const [open, setOpen] = useState(false);
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${path || window.location.pathname + window.location.search}` : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      pushToast('success', 'Lien copié dans le presse-papiers');
      setOpen(false);
    } catch {
      pushToast('info', fullUrl);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 rounded-lg border border-[#F4B400] bg-[#FFFBEB] px-4 py-2 text-sm font-semibold text-[#78350F] transition-colors hover:bg-[#FEF3C7] whitespace-nowrap shrink-0 ${className}`}
      >
        <Share2 className="h-4 w-4 text-[#D90A14]" />
        Partager
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <a
            href={buildWhatsAppShareUrl(fullUrl, title)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            WhatsApp
          </a>
          <a
            href={buildFacebookShareUrl(fullUrl)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Facebook
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <Copy className="h-4 w-4 text-slate-500" />
            Copier le lien
          </button>
        </div>
      )}
    </div>
  );
};
