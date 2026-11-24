import React from 'react';
import { ArrowLeft, ArrowRight, Bookmark, Check, Info } from 'lucide-react';

export type FormThemeTone = 'bourses' | 'academie' | 'devis' | 'intervention';

interface ToneTokens {
  topBar: string;
  poleText: string;
  stepBg: string;
  stepText: string;
  stepBorder: string;
  radioActive: string;
  radioDot: string;
}

const TONE_MAP: Record<FormThemeTone, ToneTokens> = {
  bourses: {
    topBar: 'bg-[#D90A14]',
    poleText: 'text-[#D90A14]',
    stepBg: 'bg-[#D90A14]',
    stepText: 'text-[#D90A14]',
    stepBorder: 'border-[#D90A14]',
    radioActive: 'border-[#D90A14] bg-[#D90A14]',
    radioDot: 'accent-[#D90A14]',
  },
  academie: {
    topBar: 'bg-[#1E293B]',
    poleText: 'text-[#1E293B]',
    stepBg: 'bg-[#1E293B]',
    stepText: 'text-[#1E293B]',
    stepBorder: 'border-[#1E293B]',
    radioActive: 'border-[#1E293B] bg-[#1E293B]',
    radioDot: 'accent-[#1E293B]',
  },
  devis: {
    topBar: 'bg-[#057A55]',
    poleText: 'text-[#057A55]',
    stepBg: 'bg-[#057A55]',
    stepText: 'text-[#057A55]',
    stepBorder: 'border-[#057A55]',
    radioActive: 'border-[#057A55] bg-[#057A55]',
    radioDot: 'accent-[#057A55]',
  },
  intervention: {
    topBar: 'bg-[#B45309]',
    poleText: 'text-[#B45309]',
    stepBg: 'bg-[#B45309]',
    stepText: 'text-[#B45309]',
    stepBorder: 'border-[#B45309]',
    radioActive: 'border-[#B45309] bg-[#B45309]',
    radioDot: 'accent-[#B45309]',
  },
};

export interface StepItem {
  key: string | number;
  num: string;
  label: string;
}

export const PdfFormShell: React.FC<{
  tone: FormThemeTone;
  poleLabel: string;
  title: string;
  urlHint: string;
  refPreview: string;
  introText: string;
  steps: StepItem[];
  activeStepIndex: number;
  onStepClick?: (index: number) => void;
  enteredByAgent?: string | null;
  resumeLink?: string;
  children: React.ReactNode;
}> = ({
  tone,
  poleLabel,
  title,
  urlHint,
  refPreview,
  introText,
  steps,
  activeStepIndex,
  onStepClick,
  enteredByAgent,
  resumeLink,
  children,
}) => {
  const tk = TONE_MAP[tone];

  return (
    <div className="space-y-5">
      {/* Header Banner + Segmented Stepper (matches PDF reference pages 2, 5, 8, 11) */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className={`h-1.5 w-full ${tk.topBar}`} />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold uppercase tracking-wider">
            <span className="text-slate-900">
              {enteredByAgent ? `LOMAKREV GROUP · SAISIE BUREAU (${enteredByAgent})` : 'LOMAKREV GROUP'}
            </span>
            <span className={tk.poleText}>{poleLabel}</span>
          </div>

          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">
            {title}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
            <span>
              Adresse : <span className="font-mono-tabular text-slate-600">{urlHint}</span>
            </span>
            <span>
              Référence : <span className="font-mono-tabular font-semibold text-slate-700">{refPreview}</span>
            </span>
          </div>

          <p className="mt-4 border-t border-slate-100 pt-3.5 text-sm leading-relaxed text-slate-600">
            {introText}
          </p>

          {resumeLink && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-slate-700">
              <strong>Lien de reprise enregistré :</strong>{' '}
              <span className="break-all font-mono-tabular font-medium text-slate-900">{resumeLink}</span>
            </div>
          )}

          {/* Segmented Horizontal Step Bar */}
          <div
            className="mt-5 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
          >
            {steps.map((st, idx) => {
              const isDoneOrActive = idx <= activeStepIndex;
              const isCurrent = idx === activeStepIndex;
              const clickable = Boolean(onStepClick && idx < activeStepIndex);
              return (
                <button
                  key={st.key}
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onStepClick?.(idx)}
                  className={`group text-left focus:outline-none ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div
                    className={`h-1.5 w-full rounded-full transition-colors ${
                      isDoneOrActive ? tk.topBar : 'bg-slate-200'
                    }`}
                  />
                  <div className="mt-1.5 flex items-center gap-1 truncate text-[11px] sm:text-xs">
                    <span
                      className={`font-bold ${
                        isCurrent ? 'text-slate-900' : isDoneOrActive ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {st.num}
                    </span>
                    <span
                      className={`truncate ${
                        isCurrent
                          ? 'font-bold text-slate-900'
                          : isDoneOrActive
                          ? 'font-medium text-slate-700 group-hover:underline'
                          : 'font-medium text-slate-400'
                      }`}
                    >
                      {st.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {children}
    </div>
  );
};

export const PdfStepCard: React.FC<{
  tone: FormThemeTone;
  stepNum: string;
  title: string;
  subtitle?: string;
  stepMeta: string;
  children: React.ReactNode;
}> = ({ tone, stepNum, title, subtitle, stepMeta, children }) => {
  const tk = TONE_MAP[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${tk.stepBg}`}
          >
            {stepNum}
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <span className="shrink-0 pt-1 text-xs font-medium text-slate-400 whitespace-nowrap">{stepMeta}</span>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
};

export const PdfField: React.FC<{
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}> = ({ label, required, helper, error, children }) => (
  <div>
    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
      {label} {required && <span className="text-[#D90A14]">*</span>}
    </label>
    {children}
    {helper && !error && <p className="mt-1 text-xs leading-snug text-slate-500">{helper}</p>}
    {error && <p className="mt-1 text-xs font-medium text-[#D90A14]">{error}</p>}
  </div>
);

export const PdfRadioGroup: React.FC<{
  name: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[] | string[];
  tone?: FormThemeTone;
  columnsClass?: string;
}> = ({ name, value, onChange, options, tone = 'bourses', columnsClass = 'flex flex-wrap gap-x-5 gap-y-2.5' }) => {
  const tk = TONE_MAP[tone];
  const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <div className={columnsClass}>
      {normalized.map((opt) => {
        const checked = value === opt.value;
        return (
          <label
            key={opt.value}
            className="inline-flex min-h-[34px] cursor-pointer items-center gap-2 text-sm text-slate-800 select-none"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={checked}
              onChange={() => onChange(opt.value)}
              className={`h-4 w-4 cursor-pointer border-slate-300 ${tk.radioDot}`}
            />
            <span className={checked ? 'font-semibold text-slate-900' : 'text-slate-700'}>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
};

export const PdfCheckboxGroup: React.FC<{
  values: string[];
  onChange: (next: string[]) => void;
  options: string[];
  tone?: FormThemeTone;
  columnsClass?: string;
}> = ({ values, onChange, options, tone = 'devis', columnsClass = 'flex flex-wrap gap-x-5 gap-y-2.5' }) => {
  const tk = TONE_MAP[tone];
  const toggle = (opt: string) => {
    if (values.includes(opt)) {
      onChange(values.filter((v) => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  };
  return (
    <div className={columnsClass}>
      {options.map((opt) => {
        const checked = values.includes(opt);
        return (
          <label
            key={opt}
            className="inline-flex min-h-[34px] cursor-pointer items-center gap-2 text-sm text-slate-800 select-none"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(opt)}
              className={`h-4 w-4 cursor-pointer rounded border-slate-300 ${tk.radioDot}`}
            />
            <span className={checked ? 'font-semibold text-slate-900' : 'text-slate-700'}>{opt}</span>
          </label>
        );
      })}
    </div>
  );
};

export const PdfCallout: React.FC<{
  variant?: 'info' | 'danger';
  title?: string;
  children: React.ReactNode;
}> = ({ variant = 'info', title, children }) => {
  const isDanger = variant === 'danger';
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-xs sm:text-sm leading-relaxed ${
        isDanger
          ? 'border-red-200 bg-red-50/80 text-red-900'
          : 'border-sky-200 bg-sky-50/75 text-slate-700'
      }`}
    >
      {title && (
        <p className={`mb-1 flex items-center gap-1.5 font-bold ${isDanger ? 'text-red-800' : 'text-slate-800'}`}>
          {!isDanger && <Info className="h-3.5 w-3.5 text-sky-600 shrink-0" />}
          <span>{title}</span>
        </p>
      )}
      <div>{children}</div>
    </div>
  );
};

export const PdfFormActions: React.FC<{
  canGoBack: boolean;
  onBack?: () => void;
  onSaveDraft?: () => void;
  showSaveDraft?: boolean;
  isLastStep: boolean;
  onNext?: () => void;
  submitLabel: string;
  submitting?: boolean;
  submittingLabel?: string;
}> = ({
  canGoBack,
  onBack,
  onSaveDraft,
  showSaveDraft = true,
  isLastStep,
  onNext,
  submitLabel,
  submitting = false,
  submittingLabel = 'Envoi en cours...',
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
    <div>
      {canGoBack && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
      )}
    </div>

    <div className="flex flex-wrap items-center gap-2.5 ml-auto">
      {showSaveDraft && onSaveDraft && (
        <button
          type="button"
          onClick={onSaveDraft}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Bookmark className="h-3.5 w-3.5 text-slate-500" />
          Enregistrer le brouillon
        </button>
      )}

      {!isLastStep ? (
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#D90A14] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#b80811]"
        >
          Continuer
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#D90A14] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#b80811] disabled:opacity-60"
        >
          {submitting ? submittingLabel : submitLabel}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>
      )}
    </div>
  </div>
);

export const PdfSummarySection: React.FC<{
  title: string;
  onEdit: () => void;
  items: { label: string; value: string }[];
}> = ({ title, onEdit, items }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
    <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{title}</h3>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs font-semibold text-[#D90A14] hover:underline"
      >
        Modifier
      </button>
    </div>
    <dl className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2 sm:text-sm">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col">
          <dt className="text-[11px] font-medium text-slate-500">{it.label}</dt>
          <dd className="font-medium text-slate-900 break-words">{it.value || '—'}</dd>
        </div>
      ))}
    </dl>
  </div>
);

export const PdfChoiceCheckIcon: React.FC<{ checked: boolean }> = ({ checked }) => (
  <span
    className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
      checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
    }`}
  >
    {checked && <Check className="h-2.5 w-2.5" />}
  </span>
);
