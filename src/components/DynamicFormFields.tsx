import React, { useState } from 'react';
import { Check, Copy, FileText, Share2, Trash2, Upload, WifiOff, ArrowRight } from 'lucide-react';
import type { CustomFormField } from '../types/lomakrev';
import { compressImageFile } from '../lib/offlineSync';
import { buildFacebookShareUrl, buildWhatsAppShareUrl } from '../lib/pdfPrint';
import { useApp } from '../context/AppContext';
import { OfficeAwareSelect } from './DualSelectInput';

export function validateRdcPhone(value: string): boolean {
  const clean = value.replace(/[\s\-().]/g, '');
  return /^\+?243[0-9]{9}$/.test(clean);
}

export const RdcPhoneInput: React.FC<{
  label?: string;
  phone: string;
  onPhoneChange: (val: string) => void;
  whatsapp?: string;
  onWhatsappChange?: (val: string) => void;
  sameForWhatsapp?: boolean;
  onSameChange?: (same: boolean) => void;
  error?: string;
  showWhatsappOption?: boolean;
  autoComplete?: string;
}> = ({
  label = 'Numéro de téléphone (RDC)',
  phone,
  onPhoneChange,
  whatsapp = '',
  onWhatsappChange,
  sameForWhatsapp = true,
  onSameChange,
  error,
  showWhatsappOption = true,
  autoComplete,
}) => {
  const handleInput = (val: string) => {
    let next = val;
    if (!next.startsWith('+243')) {
      const digits = next.replace(/[^0-9]/g, '');
      next = digits.startsWith('243') ? `+${digits}` : `+243${digits.replace(/^0+/, '')}`;
    }
    onPhoneChange(next);
    if (sameForWhatsapp && onWhatsappChange) {
      onWhatsappChange(next);
    }
  };

  const resolvedAutoComplete = autoComplete ?? (showWhatsappOption ? 'tel' : 'off');

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-800">
          {label} <span className="text-[#D90A14]">*</span>
        </label>
        <input
          type="tel"
          autoComplete={resolvedAutoComplete}
          spellCheck={false}
          value={phone || '+243'}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="+243990000000"
          className={`w-full rounded-lg border px-4 py-3 text-base text-slate-900 font-mono-tabular outline-none transition-colors focus:border-[#D90A14] ${
            error ? 'border-[#D90A14] bg-red-50/40' : 'border-slate-300 bg-white'
          }`}
        />
        <p className="mt-1 text-xs text-slate-500">Format attendu : +243 suivi de 9 chiffres (Vodacom, Airtel, Orange, Africell).</p>
        {error && <p className="mt-1 text-xs font-medium text-[#D90A14]">{error}</p>}
      </div>

      {showWhatsappOption && onSameChange && (
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={sameForWhatsapp}
            onChange={(e) => {
              onSameChange(e.target.checked);
              if (e.target.checked && onWhatsappChange) onWhatsappChange(phone);
            }}
            className="h-4 w-4 rounded border-slate-300 accent-[#D90A14]"
          />
          <span>Même numéro pour WhatsApp</span>
        </label>
      )}

      {showWhatsappOption && !sameForWhatsapp && onWhatsappChange && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-800">Numéro WhatsApp</label>
          <input
            type="tel"
            value={whatsapp || '+243'}
            onChange={(e) => onWhatsappChange(e.target.value)}
            placeholder="+243990000000"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 font-mono-tabular outline-none focus:border-[#D90A14]"
          />
        </div>
      )}
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
  accept?: string;
  helperText?: string;
}> = ({
  label,
  required = false,
  files,
  onChange,
  maxFiles = 5,
  accept = '.jpg,.jpeg,.png,.pdf',
  helperText = 'JPG, PNG ou PDF · 10 Mo max. par fichier',
}) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    setErr('');
    setBusy(true);
    try {
      const next = [...files];
      for (const file of Array.from(fileList)) {
        if (next.length >= maxFiles) {
          setErr(`Maximum ${maxFiles} fichiers autorisés.`);
          break;
        }
        if (file.size > 10 * 1024 * 1024) {
          setErr(`${file.name} dépasse 10 Mo.`);
          continue;
        }
        const dataUrl = await compressImageFile(file);
        next.push({ name: file.name, type: file.type, size: file.size, dataUrl });
      }
      onChange(next);
    } catch {
      setErr('Impossible de lire le fichier sélectionné.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-800">
        {label} {required && <span className="text-[#D90A14]">*</span>}
      </label>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#F4B400]/70 bg-[#FFFDF5] px-4 py-6 text-center transition-colors hover:border-[#D90A14]/60 hover:bg-[#FFFBEB]">
        <Upload className="mb-2 h-5 w-5 text-[#D90A14]" />
        <span className="text-sm font-medium text-slate-800">
          {busy ? 'Compression en cours...' : 'Sélectionner un ou plusieurs fichiers'}
        </span>
        <span className="mt-1 text-xs text-slate-500">{helperText}</span>
        <input
          type="file"
          multiple={maxFiles > 1}
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </label>
      {err && <p className="text-xs font-medium text-[#D90A14]">{err}</p>}
      {files.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {files.map((f, idx) => (
            <li key={`${f.name}-${idx}`} className="flex items-center justify-between px-3 py-2 text-sm">
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="truncate font-medium text-slate-800">{f.name}</span>
                <span className="text-xs text-slate-400 tabular-nums">({Math.round(f.size / 1024)} Ko)</span>
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
            <label className="mb-1.5 block text-sm font-medium text-slate-800">
              {f.label} {f.required && <span className="text-[#D90A14]">*</span>}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                rows={3}
                value={String(val || '')}
                onChange={(e) => onChange(f.name, e.target.value)}
                placeholder={f.placeholder || ''}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 outline-none focus:border-[#D90A14]"
              />
            ) : f.type === 'select' ? (
              <OfficeAwareSelect
                officeMode={officeMode}
                fieldKey={`custom_${f.name}`}
                value={String(val || '')}
                onChange={(nextVal) => onChange(f.name, nextVal)}
                options={[
                  ...(!officeMode ? [{ value: '', label: 'Sélectionner...' }] : []),
                  ...(f.options || []).map((opt) => ({ value: opt, label: opt })),
                ]}
                placeholder={f.placeholder || 'Sélectionner ou saisir...'}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-[#D90A14]"
              />
            ) : f.type === 'radio' ? (
              <div className="flex flex-wrap gap-2">
                {(f.options || []).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(f.name, opt)}
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      val === opt ? 'border-[#D90A14] bg-[#D90A14] text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-[#FFFBEB]'
                    }`}
                  >
                    {opt}
                  </button>
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
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-[#D90A14]"
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
  dossier?: {
    reference: string;
    applicantName: string;
    status: string;
    eligibilityStatus?: string | null;
    eligibilityReason?: string | null;
  };
  nextStepsText?: string;
  onReset?: () => void;
}> = ({ offline, localId, dossier, nextStepsText, onReset }) => {
  const { navigate, data } = useApp();

  return (
    <div className="rounded-xl border border-[#F4B400]/50 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${offline ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-red-50 text-[#D90A14]'}`}>
          {offline ? <WifiOff className="h-6 w-6" /> : <Check className="h-6 w-6" />}
        </div>
        <div className="flex-1 space-y-3">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {offline ? 'Dossier sauvegardé hors ligne' : 'Demande enregistrée avec succès'}
          </h2>
          {offline ? (
            <p className="text-sm leading-relaxed text-slate-600">
              Aucune connexion Internet détectée. Vos informations ont été enregistrées en sécurité sur cet appareil (identifiant local{' '}
              <span className="font-mono-tabular font-semibold text-slate-900">{localId}</span>). Elles seront transmises automatiquement dès le retour de la connexion.
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-[#F4B400]/50 bg-[#FFFDF5] p-4">
                <p className="text-xs font-medium text-slate-600">Numéro de référence officiel</p>
                <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#D90A14]">{dossier?.reference}</p>
                <p className="mt-2 text-sm text-slate-700">
                  Demandeur : <strong>{dossier?.applicantName}</strong> · Statut actuel : <strong>{dossier?.status}</strong>
                </p>
                {dossier?.eligibilityReason && (
                  <p className="mt-2 text-sm font-medium text-[#92400E]">Motif communiqué : {dossier.eligibilityReason}</p>
                )}
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                {nextStepsText || data?.settings?.responseDelayText || 'Nous vous rappelons sous 24 h ouvrées.'} Un accusé de réception vient d’être préparé par SMS/WhatsApp et e-mail.
              </p>
            </>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            {!offline && dossier?.reference && (
              <button
                type="button"
                onClick={() => navigate(`/suivi?ref=${encodeURIComponent(dossier.reference)}`)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#D90A14] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#b80811]"
              >
                Suivre mon dossier
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => (onReset ? onReset() : navigate('/'))}
              className="rounded-lg border border-[#F4B400] bg-[#FFFBEB] px-5 py-2.5 text-sm font-semibold text-[#78350F] hover:bg-[#FEF3C7]"
            >
              Retour à l’accueil
            </button>
          </div>
        </div>
      </div>
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
