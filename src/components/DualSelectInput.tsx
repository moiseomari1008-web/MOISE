import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { AdminSelectOption } from '../types/lomakrev';

export interface DualSelectOption {
  id?: string;
  value: string;
  label: string;
  isCustom?: boolean;
}

interface SelectOptionsContextValue {
  optionsByField: Record<string, AdminSelectOption[]>;
  refreshOptions: () => Promise<void>;
  saveOption: (fieldKey: string, value: string, label?: string) => Promise<AdminSelectOption | null>;
  deleteOption: (id: string, fieldKey: string) => Promise<boolean>;
}

const SelectOptionsContext = createContext<SelectOptionsContextValue | null>(null);

export const SelectOptionsProvider: React.FC<{
  token?: string;
  children: React.ReactNode;
}> = ({ token = '', children }) => {
  const { pushToast } = useApp();
  const [optionsByField, setOptionsByField] = useState<Record<string, AdminSelectOption[]>>({});

  const buildHeaders = useCallback(
    (jsonBody = false): Record<string, string> => {
      const headers: Record<string, string> = {};
      if (jsonBody) headers['Content-Type'] = 'application/json';
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        headers['X-Lomakrev-Token'] = token;
      }
      return headers;
    },
    [token]
  );

  const refreshOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/select-options', {
        headers: buildHeaders(false),
        credentials: 'same-origin',
      });
      if (res.ok) {
        const json = await res.json();
        setOptionsByField(json.optionsByField || {});
      }
    } catch {
      // ignore offline transient fetch
    }
  }, [buildHeaders]);

  useEffect(() => {
    refreshOptions();
  }, [refreshOptions]);

  const saveOption = useCallback(
    async (fieldKey: string, value: string, label?: string): Promise<AdminSelectOption | null> => {
      const cleanVal = value.trim();
      const cleanLabel = (label ?? cleanVal).trim();
      if (!cleanVal) return null;

      try {
        const res = await fetch('/api/admin/select-options', {
          method: 'POST',
          headers: buildHeaders(true),
          credentials: 'same-origin',
          body: JSON.stringify({ fieldKey, value: cleanVal, label: cleanLabel }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          pushToast('error', json.error || 'Impossible d’enregistrer cette option.');
          return null;
        }
        if (json.optionsForField) {
          setOptionsByField((prev) => ({
            ...prev,
            [fieldKey]: json.optionsForField,
          }));
        } else if (json.option) {
          setOptionsByField((prev) => {
            const list = prev[fieldKey] || [];
            const exists = list.some((o) => o.value.toLowerCase() === json.option.value.toLowerCase());
            return {
              ...prev,
              [fieldKey]: exists
                ? list.map((o) => (o.value.toLowerCase() === json.option.value.toLowerCase() ? json.option : o))
                : [...list, json.option],
            };
          });
        }
        pushToast('success', `« ${cleanLabel} » enregistré dans la liste déroulante.`);
        return json.option || null;
      } catch {
        pushToast('error', 'Erreur réseau lors de l’enregistrement.');
        return null;
      }
    },
    [buildHeaders, pushToast]
  );

  const deleteOption = useCallback(
    async (id: string, fieldKey: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/admin/select-options/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: buildHeaders(false),
          credentials: 'same-origin',
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          pushToast('error', json.error || 'Suppression impossible.');
          return false;
        }
        setOptionsByField((prev) => ({
          ...prev,
          [fieldKey]: (prev[fieldKey] || []).filter((o) => o.id !== id),
        }));
        pushToast('success', 'Option retirée de la liste.');
        return true;
      } catch {
        return false;
      }
    },
    [buildHeaders, pushToast]
  );

  return (
    <SelectOptionsContext.Provider value={{ optionsByField, refreshOptions, saveOption, deleteOption }}>
      {children}
    </SelectOptionsContext.Provider>
  );
};

export function useSelectOptions() {
  return useContext(SelectOptionsContext);
}

export interface DualSelectInputProps {
  fieldKey: string;
  value: string;
  onChange: (newValue: string, newLabel?: string) => void;
  options: (DualSelectOption | string)[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  transformValue?: (raw: string) => string;
}

export const DualSelectInput: React.FC<DualSelectInputProps> = ({
  fieldKey,
  value,
  onChange,
  options,
  placeholder = 'Sélectionner ou saisir...',
  className = '',
  inputClassName = '',
  disabled = false,
  allowEmpty = false,
  transformValue,
}) => {
  const ctx = useSelectOptions();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [saving, setSaving] = useState(false);

  const normalizedDefaults: DualSelectOption[] = useMemo(
    () =>
      options.map((opt) =>
        typeof opt === 'string'
          ? { value: opt, label: opt, isCustom: false }
          : { value: opt.value, label: opt.label, id: opt.id, isCustom: Boolean(opt.isCustom) }
      ),
    [options]
  );

  const mergedOptions: DualSelectOption[] = useMemo(() => {
    const dbOptions = ctx?.optionsByField?.[fieldKey] || [];
    const seen = new Set<string>();
    const combined: DualSelectOption[] = [];

    for (const def of normalizedDefaults) {
      const k = def.value.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        combined.push(def);
      }
    }
    for (const dbOpt of dbOptions) {
      const k = dbOpt.value.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        combined.push({
          id: dbOpt.id,
          value: dbOpt.value,
          label: dbOpt.label || dbOpt.value,
          isCustom: true,
        });
      }
    }
    if (value && !seen.has(value.toLowerCase())) {
      combined.push({ value, label: value, isCustom: false });
    }
    return combined;
  }, [normalizedDefaults, ctx?.optionsByField, fieldKey, value]);

  const currentSelected = useMemo(
    () => mergedOptions.find((o) => o.value === value) || mergedOptions.find((o) => o.value.toLowerCase() === (value || '').toLowerCase()),
    [mergedOptions, value]
  );

  const displayedValue = isTyping ? draftText : currentSelected?.label ?? value ?? '';

  const filteredOptions = useMemo(() => {
    const q = isTyping ? draftText.trim().toLowerCase() : '';
    if (!q) return mergedOptions;
    return mergedOptions.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [isTyping, draftText, mergedOptions]);

  const trimmedDraft = draftText.trim();
  const exactExistingMatch = useMemo(() => {
    if (!trimmedDraft) return undefined;
    const lower = trimmedDraft.toLowerCase();
    return mergedOptions.find((o) => o.value.toLowerCase() === lower || o.label.toLowerCase() === lower);
  }, [trimmedDraft, mergedOptions]);

  const canAddCustom = isTyping && trimmedDraft.length > 0 && !exactExistingMatch;

  const commitTypedValue = useCallback(async () => {
    if (!isTyping) return;

    if (!trimmedDraft) {
      setIsTyping(false);
      setIsOpen(false);
      if (allowEmpty) {
        onChange('', '');
      }
      return;
    }

    if (exactExistingMatch) {
      setIsTyping(false);
      setIsOpen(false);
      if (exactExistingMatch.value !== value) {
        onChange(exactExistingMatch.value, exactExistingMatch.label);
      }
      return;
    }

    const finalValue = transformValue ? transformValue(trimmedDraft) : trimmedDraft;
    setIsTyping(false);
    setIsOpen(false);
    onChange(finalValue, trimmedDraft);
    if (ctx) {
      setSaving(true);
      try {
        await ctx.saveOption(fieldKey, finalValue, trimmedDraft);
      } finally {
        setSaving(false);
      }
    }
  }, [isTyping, trimmedDraft, allowEmpty, exactExistingMatch, value, onChange, transformValue, ctx, fieldKey]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (isTyping) {
          void commitTypedValue();
        } else {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTyping, commitTypedValue]);

  const handleSelectOption = (opt: DualSelectOption) => {
    setIsTyping(false);
    setDraftText('');
    setIsOpen(false);
    onChange(opt.value, opt.label);
  };

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled || saving}
          value={displayedValue}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          onFocus={() => {
            setIsOpen(true);
            if (!isTyping) {
              setDraftText(currentSelected?.label ?? value ?? '');
            }
          }}
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
          onChange={(e) => {
            setIsTyping(true);
            setIsOpen(true);
            setDraftText(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void commitTypedValue();
            } else if (e.key === 'Escape') {
              setIsTyping(false);
              setDraftText('');
              setIsOpen(false);
              inputRef.current?.blur();
            } else if (e.key === 'ArrowDown') {
              setIsOpen(true);
            }
          }}
          className={`w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 text-slate-900 outline-none transition-colors focus:border-[#D90A14] ${
            canAddCustom ? 'pr-16' : 'pr-9'
          } ${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''} ${inputClassName}`}
        />

        <div className="absolute right-1.5 flex items-center gap-1">
          {canAddCustom && (
            <button
              type="button"
              disabled={saving}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void commitTypedValue()}
              title={`Enregistrer « ${trimmedDraft} » dans la liste`}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-[#D90A14] px-2 text-[11px] font-bold text-white shadow-sm hover:bg-[#B80811] disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">OK</span>
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (disabled) return;
              setIsOpen((prev) => !prev);
              if (!isOpen) inputRef.current?.focus();
            }}
            aria-label="Afficher la liste déroulante"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180 text-[#D90A14]' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {canAddCustom && (
            <button
              type="button"
              disabled={saving}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void commitTypedValue()}
              className="mb-1 flex w-full items-center gap-2 rounded-lg border border-[#F4B400] bg-[#FFFBEB] px-3 py-2 text-left text-xs font-bold text-[#7A050B] hover:bg-[#FEF3C7]"
            >
              <Plus className="h-3.5 w-3.5 shrink-0 text-[#D90A14]" />
              <span className="truncate">Enregistrer « {trimmedDraft} » dans la liste</span>
            </button>
          )}

          {filteredOptions.length === 0 && !canAddCustom ? (
            <p className="px-3 py-2 text-xs text-slate-400">Aucune option correspondante — saisissez pour ajouter.</p>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={`${opt.value}-${opt.id || 'def'}`}
                  className={`flex items-center justify-between gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    isSelected ? 'bg-[#D90A14]/10 font-bold text-[#D90A14]' : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectOption(opt)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left py-0.5"
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.isCustom && (
                      <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        BDD
                      </span>
                    )}
                  </button>
                  {opt.isCustom && opt.id && ctx && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.stopPropagation();
                        void ctx.deleteOption(opt.id!, fieldKey);
                      }}
                      title="Retirer cette option de la liste"
                      className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-[#D90A14]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export const OfficeAwareSelect: React.FC<{
  officeMode: boolean;
  fieldKey: string;
  value: string;
  onChange: (val: string) => void;
  options: (DualSelectOption | string)[];
  className?: string;
  placeholder?: string;
}> = ({ officeMode, fieldKey, value, onChange, options, className = '', placeholder }) => {
  if (officeMode) {
    return (
      <DualSelectInput
        fieldKey={fieldKey}
        value={value}
        onChange={(v) => onChange(v)}
        options={options}
        placeholder={placeholder || 'Sélectionner ou saisir...'}
        inputClassName="pl-3.5 py-2.5 text-base"
      />
    );
  }

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {options.map((opt) => {
        const item = typeof opt === 'string' ? { value: opt, label: opt } : opt;
        return (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        );
      })}
    </select>
  );
};
