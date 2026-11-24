import React, { useEffect, useState } from 'react';
import { Clock, Mail, MapPin, Phone, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Breadcrumbs } from '../components/Layout';
import { PhotoFrame } from '../components/MotionPrimitives';
import { RdcPhoneInput, SubmissionSuccessCard, validateRdcPhone } from '../components/DynamicFormFields';
import { formatDateFr } from '../lib/pdfPrint';

export const SuiviDossierPage: React.FC = () => {
  const { searchQuery, localReceipts, outboxItems, isOnline, clearReceipts, pushToast } = useApp();
  const params = new URLSearchParams(searchQuery);
  const initialRef = params.get('ref') || '';

  const [refInput, setRefInput] = useState(initialRef);
  const [phoneInput, setPhoneInput] = useState('+243');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dossier, setDossier] = useState<any>(null);

  useEffect(() => {
    if (initialRef) {
      setRefInput(initialRef);
      try {
        window.history.replaceState({}, '', '/suivi');
      } catch {
        // ignore
      }
    }
  }, [initialRef]);

  // Automatically wipe search fields & results after 90s of inactivity or on page exit
  useEffect(() => {
    const hasSensitiveInput = refInput.trim().length > 0 || phoneInput !== '+243' || !!dossier;
    if (!hasSensitiveInput) return;
    const timer = window.setTimeout(() => {
      setRefInput('');
      setPhoneInput('+243');
      setDossier(null);
      setError('');
    }, 90_000);
    return () => window.clearTimeout(timer);
  }, [refInput, phoneInput, dossier]);

  useEffect(() => {
    return () => {
      setRefInput('');
      setPhoneInput('+243');
      setDossier(null);
    };
  }, []);

  const clearSearch = () => {
    setRefInput('');
    setPhoneInput('+243');
    setDossier(null);
    setError('');
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDossier(null);
    if (!refInput.trim()) {
      setError('Veuillez saisir votre numéro de référence (ex. BRS-2026-00142).');
      return;
    }
    if (!validateRdcPhone(phoneInput)) {
      setError('Veuillez saisir votre numéro de téléphone au format +243...');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/public/suivi?ref=${encodeURIComponent(refInput.trim())}&phone=${encodeURIComponent(phoneInput.trim())}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Dossier introuvable.');
      } else {
        setDossier(json);
      }
    } catch {
      setError('Connexion impossible pour vérifier en ligne.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumbs items={[{ label: 'Suivi de dossier' }]} />

      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#D90A14]">Guichet en ligne · Suivi sans compte</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">Suivre mon dossier</h1>
        <p className="mt-2 text-sm text-slate-600">
          Entrez le numéro de référence reçu (ACA-, BRS-, DEV-, INT-, CMD- ou CTC-) et le téléphone utilisé lors de la demande.
        </p>

        <form onSubmit={handleSearch} autoComplete="off" className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-800">Référence du dossier *</label>
            <div className="relative">
              <input
                type="text"
                name="lomakrev-ref-lookup"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value.toUpperCase())}
                placeholder="Ex. BRS-2026-00142"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-10 text-base font-mono-tabular uppercase outline-none focus:border-[#D90A14]"
              />
              {refInput && (
                <button
                  type="button"
                  onClick={() => setRefInput('')}
                  aria-label="Effacer la référence"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <RdcPhoneInput phone={phoneInput} onPhoneChange={setPhoneInput} showWhatsappOption={false} />

          {error && <p className="text-sm font-medium text-[#D90A14]">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading || !isOnline}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#D90A14] px-6 text-sm font-semibold text-white hover:bg-[#b80811] disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {loading ? 'Recherche...' : 'Consulter le statut'}
            </button>
            {(refInput || phoneInput !== '+243' || dossier) && (
              <button
                type="button"
                onClick={clearSearch}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Effacer la recherche
              </button>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Sécurité : aucun historique de recherche conservé ; les champs s’effacent automatiquement après inactivité ou fermeture de la page.</span>
          </p>
        </form>

        {dossier && (
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="rounded-xl border border-[#F4B400]/50 bg-[#FFFDF5] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono-tabular text-lg font-bold text-[#D90A14]">{dossier.reference}</span>
                <span className="rounded-md bg-[#FEF3C7] border border-[#F4B400] px-3 py-1 text-xs font-bold text-[#78350F]">{dossier.status}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">
                Demandeur : <strong>{dossier.applicantName}</strong> · Créé le {formatDateFr(dossier.createdAt)}
              </p>
              {dossier.rejectionReason && (
                <p className="mt-2 text-sm font-medium text-[#D90A14]">Motif : {dossier.rejectionReason}</p>
              )}
            </div>

            <h2 className="mt-6 font-display text-base font-bold text-slate-900">Historique du traitement</h2>
            <ul className="mt-3 space-y-3 border-l-2 border-[#F4B400] pl-4">
              {(dossier.timeline || []).map((ev: any, idx: number) => (
                <li key={idx} className="text-sm">
                  <p className="font-semibold text-slate-900">{ev.action}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(ev.at).toLocaleString('fr-FR')} · {ev.actor}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Offline / Recent Local Receipts */}
      {(outboxItems.length > 0 || localReceipts.length > 0) && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-slate-900">Dossiers enregistrés sur cet appareil</h2>
            {localReceipts.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  await clearReceipts();
                  pushToast('success', 'Historique local effacé de cet appareil.');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-[#D90A14]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Effacer l’historique local
              </button>
            )}
          </div>
          {outboxItems.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-amber-800">En attente de synchronisation :</p>
              {outboxItems.map((it) => (
                <div key={it.localId} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <span>{it.label}</span>
                  <span className="font-mono-tabular font-semibold">{it.localId}</span>
                </div>
              ))}
            </div>
          )}
          {localReceipts.length > 0 && (
            <div className="mt-3 space-y-2">
              {localReceipts.map((r) => (
                <button
                  key={r.localId}
                  type="button"
                  onClick={() => setRefInput(r.reference)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-xs hover:bg-slate-50"
                >
                  <span>{r.applicantName} ({r.type})</span>
                  <span className="font-mono-tabular font-bold text-slate-900">{r.reference}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const AProposPage: React.FC = () => {
  const { data, navigate } = useApp();
  if (!data) return null;
  const { settings } = data;

  const aboutPhoto = settings.aboutImageUrl || settings.heroImageUrl;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumbs items={[{ label: 'À propos' }]} />
      <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
        <div className={aboutPhoto ? 'lg:col-span-6' : 'lg:col-span-12 max-w-3xl'}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D90A14]">À propos de {settings.legalName}</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl text-balance">
            {settings.promise}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">{settings.vision}</p>
          <p className="mt-4 text-sm font-semibold text-slate-800">{settings.valuesText}</p>
          <div className="mt-6 rounded-xl border border-[#F4B400]/50 bg-[#FFFDF5] p-5 text-sm space-y-1.5">
            <p><strong>RCCM :</strong> {settings.rccm}</p>
            <p><strong>IDNat :</strong> {settings.idNat}</p>
            <p><strong>Adresse :</strong> {settings.address} ({settings.addressLandmarks})</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate('/tech')} className="rounded-lg bg-[#D90A14] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B80811]">
              Découvrir nos pôles
            </button>
            <button type="button" onClick={() => navigate('/contact')} className="rounded-lg border border-[#F4B400] bg-[#FFFBEB] px-5 py-2.5 text-sm font-semibold text-[#78350F] hover:bg-[#FEF3C7]">
              Contacter la direction
            </button>
          </div>
        </div>
        {aboutPhoto && (
          <div className="lg:col-span-6">
            <PhotoFrame src={aboutPhoto} alt="Équipe et siège LOMAKREV GROUP à Gombe" aspectClass="aspect-[4/3]" className="rounded-xl border border-slate-200" priority />
          </div>
        )}
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const { data, submitForm } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+243');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Renseignement général');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!data) return null;
  const { settings } = data;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !message.trim()) {
      setError('Veuillez indiquer votre nom et votre message.');
      return;
    }
    if (!validateRdcPhone(phone)) {
      setError('Numéro RDC invalide (+243 suivi de 9 chiffres).');
      return;
    }
    if (!consent) {
      setError('Veuillez accepter la politique de confidentialité.');
      return;
    }
    setBusy(true);
    const res = await submitForm('CTC', `Contact ${name}`, {
      applicantName: name.trim(),
      phone,
      email: email.trim(),
      payload: { subject, message },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Erreur.');
      return;
    }
    setResult(res);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumbs items={[{ label: 'Contact' }]} />

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#D90A14]">Contact officiel</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900">Parler à l’équipe Lomakrev</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{settings.responseDelayText}.</p>
          </div>
          <div className="space-y-4 rounded-xl border border-[#F4B400]/50 bg-[#FFFDF5] p-6 text-sm text-slate-700">
            <p className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D90A14]" />
              <span><strong>{settings.address}</strong><br />{settings.addressLandmarks}</span>
            </p>
            <p className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-[#D90A14]" />
              <span className="font-mono-tabular font-semibold">{settings.phone}</span>
            </p>
            <p className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-[#D90A14]" />
              <span>{settings.email}</span>
            </p>
            <p className="flex items-center gap-3">
              <Clock className="h-4 w-4 shrink-0 text-[#D90A14]" />
              <span>{settings.openingHours}</span>
            </p>
          </div>
        </div>

        <div className="lg:col-span-7">
          {result ? (
            <SubmissionSuccessCard offline={result.offline} localId={result.localId} dossier={result.dossier} onReset={() => setResult(null)} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-800">Nom complet *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
              </div>
              <RdcPhoneInput phone={phone} onPhoneChange={setPhone} showWhatsappOption={false} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">E-mail (facultatif)</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">Objet</label>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                    <option>Renseignement général</option>
                    <option>Partenariat institutionnel / ONG</option>
                    <option>Achat matériel informatique</option>
                    <option>Lomakrev Académie / Bourses</option>
                    <option>Top Maintenance</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-800">Message *</label>
                <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
              </div>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[#D90A14]" />
                <span>J’accepte la politique de confidentialité de LOMAKREV GROUP.</span>
              </label>
              {error && <p className="text-sm font-medium text-[#D90A14]">{error}</p>}
              <button type="submit" disabled={busy} className="rounded-lg bg-[#D90A14] px-6 py-3 text-sm font-semibold text-white hover:bg-[#b80811] disabled:opacity-60">
                {busy ? 'Envoi...' : 'Envoyer le message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const LegalPage: React.FC<{ mode: 'legal' | 'privacy' }> = ({ mode }) => {
  const { data } = useApp();
  if (!data) return null;
  const { settings } = data;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: mode === 'legal' ? 'Mentions légales' : 'Politique de confidentialité' }]} />
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <h1 className="font-display text-2xl font-extrabold text-slate-900">
          {mode === 'legal' ? 'Mentions légales' : 'Politique de confidentialité & Protection des données'}
        </h1>
        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-slate-700">
          {mode === 'legal' ? settings.legalNoticeText : settings.privacyPolicyText}
        </p>
      </div>
    </div>
  );
};
