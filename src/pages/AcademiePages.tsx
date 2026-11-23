import React, { useEffect, useState } from 'react';
import { ArrowRight, Award, Bell, Calendar, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Breadcrumbs } from '../components/Layout';
import { PhotoFrame } from '../components/MotionPrimitives';
import {
  CustomFieldsRenderer,
  RdcPhoneInput,
  ShareButton,
  SubmissionSuccessCard,
  validateRdcPhone,
} from '../components/DynamicFormFields';
import { formatDateFr } from '../lib/pdfPrint';
import { loadFormDraft, saveFormDraft, clearFormDraft } from '../lib/offlineSync';

export const AcademieHomePage: React.FC = () => {
  const { data, navigate } = useApp();
  if (!data) return null;
  const formations = data.formations.filter((f) => f.active);
  const academiePhotos = data.photos.filter((p) => p.pole === 'academie' && p.consentVerified);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumbs items={[{ label: 'Lomakrev Académie' }]} />

      <div className="grid items-center gap-8 border-b border-[#F4B400]/40 pb-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="text-xs font-bold uppercase tracking-wider text-[#D90A14]">Pôle 2 · Lomakrev Académie — « Way of success »</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl text-balance">
            Formations numériques et entrepreneuriales pratiques
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Catalogue complet de 7 programmes préparés pour la relance de 2027. Chaque formation se termine par une évaluation pratique et une attestation officielle Lomakrev Académie.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ShareButton title="Lomakrev Académie — 7 formations certifiantes à Kinshasa" />
            <button
              type="button"
              onClick={() => navigate('/maintenance/devis?service=autre')}
              className="rounded-lg border border-[#F4B400] bg-[#FFFBEB] px-4 py-2 text-sm font-semibold text-[#78350F] hover:bg-[#FEF3C7]"
            >
              Partenariat entreprise / ONG
            </button>
          </div>
        </div>
        <div className="lg:col-span-6">
          <PhotoFrame
            src={academiePhotos[0]?.url || data.settings.academieHeroUrl}
            alt="Salle de formation Lomakrev Académie"
            aspectClass="aspect-[16/10]"
            className="rounded-xl border border-slate-200"
            priority
            caption={academiePhotos[0]?.caption || 'Campus Lomakrev — Kinshasa, Gombe'}
          />
        </div>
      </div>

      {/* 7 Formations Grid */}
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {formations.map((f, idx) => {
          const openSessions = f.sessions.filter((s) => s.isOpen);
          return (
            <article key={f.id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
              <PhotoFrame src={f.imageUrl} alt={f.title} aspectClass="aspect-[16/9]" className="border-b border-slate-100" />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono-tabular font-semibold">0{idx + 1}. {f.durationHours} heures</span>
                  <span>{f.level}</span>
                </div>
                <h2 className="mt-2 font-display text-lg font-bold text-slate-900">{f.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.summary}</p>
                <p className="mt-3 text-xs text-slate-500">
                  <strong>Public :</strong> {f.audience}
                </p>

                <div className="mt-auto pt-5">
                  <div className="mb-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-500">Prochaine session</span>
                    <span className={`font-semibold ${openSessions.length > 0 ? 'text-emerald-700' : 'text-[#92400E]'}`}>
                      {openSessions.length > 0 ? `${formatDateFr(openSessions[0].startDate)} · ${openSessions[0].priceUsd} USD` : 'À venir (2027)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/academie/formations/${f.slug}`)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#D90A14] py-2.5 text-sm font-semibold text-white hover:bg-[#B80811]"
                  >
                    Voir le programme
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export const FormationDetailPage: React.FC<{ slug: string }> = ({ slug }) => {
  const { data, navigate, submitForm, trackEvent } = useApp();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [wlName, setWlName] = useState('');
  const [wlPhone, setWlPhone] = useState('+243');
  const [wlEmail, setWlEmail] = useState('');
  const [wlConsent, setWlConsent] = useState(false);
  const [wlError, setWlError] = useState('');
  const [wlResult, setWlResult] = useState<any>(null);
  const [wlBusy, setWlBusy] = useState(false);

  if (!data) return null;
  const formation = data.formations.find((f) => f.slug === slug);

  if (!formation) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Formation introuvable</h1>
        <button type="button" onClick={() => navigate('/academie')} className="mt-4 rounded-lg bg-[#D90A14] px-5 py-2.5 text-sm font-semibold text-white">
          Retour au catalogue Académie
        </button>
      </div>
    );
  }

  const openSessions = formation.sessions.filter((s) => s.isOpen);

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setWlError('');
    if (!wlName.trim()) {
      setWlError('Veuillez saisir votre nom.');
      return;
    }
    if (!validateRdcPhone(wlPhone)) {
      setWlError('Numéro RDC invalide (+243 suivi de 9 chiffres).');
      return;
    }
    if (!wlConsent) {
      setWlError('Veuillez accepter d’être recontacté lors de l’ouverture.');
      return;
    }
    setWlBusy(true);
    const res = await submitForm('WAITLIST', `Liste intérêt ${formation.title}`, {
      applicantName: wlName.trim(),
      phone: wlPhone,
      email: wlEmail.trim(),
      formationSlug: formation.slug,
      payload: { formationTitle: formation.title },
    });
    setWlBusy(false);
    if (!res.ok) {
      setWlError(res.error || 'Erreur lors de l’enregistrement.');
      return;
    }
    setWlResult(res);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumbs items={[{ label: 'Lomakrev Académie', to: '/academie' }, { label: formation.title }]} />

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#D90A14]">Programme officiel · Lomakrev Académie</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">{formation.title}</h1>
            <p className="mt-3 text-base leading-relaxed text-slate-600">{formation.objective}</p>
          </div>

          <PhotoFrame src={formation.imageUrl} alt={formation.title} aspectClass="aspect-[16/9]" className="rounded-xl border border-slate-200" priority />

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-xl font-bold text-slate-900">Programme détaillé par modules</h2>
            <ul className="mt-4 divide-y divide-slate-100">
              {formation.modules.map((mod, i) => (
                <li key={i} className="flex items-start gap-3 py-3 text-sm leading-relaxed text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#D90A14]" />
                  <span>{mod}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#F4B400]/40 bg-[#FFFDF5] p-5">
              <h3 className="text-sm font-bold text-slate-900">Public cible</h3>
              <p className="mt-1.5 text-sm text-slate-600">{formation.audience}</p>
            </div>
            <div className="rounded-xl border border-[#F4B400]/40 bg-[#FFFDF5] p-5">
              <h3 className="text-sm font-bold text-slate-900">Prérequis</h3>
              <p className="mt-1.5 text-sm text-slate-600">{formation.prerequisites}</p>
            </div>
          </div>
        </div>

        {/* Sticky Registration / Waitlist Sidebar */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">Informations pratiques</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-slate-500"><Clock className="h-4 w-4" /> Durée</dt>
                <dd className="font-semibold text-slate-900">{formation.durationHours} heures</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-slate-500"><Award className="h-4 w-4" /> Niveau</dt>
                <dd className="font-semibold text-slate-900">{formation.level}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-slate-500"><MapPin className="h-4 w-4" /> Format</dt>
                <dd className="font-semibold text-slate-900">{formation.format}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-slate-500"><Calendar className="h-4 w-4" /> Dates & Tarifs</dt>
                <dd className="font-semibold text-slate-900">
                  {openSessions.length > 0 ? formatDateFr(openSessions[0].startDate) : 'À venir'}
                </dd>
              </div>
            </dl>
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{formation.certificate}</p>

            {openSessions.length > 0 ? (
              <div className="mt-6 space-y-3">
                {openSessions.map((s) => (
                  <div key={s.id} className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3.5 text-xs">
                    <p className="font-bold text-slate-900">Session {s.code} · {s.format}</p>
                    <p className="mt-1 text-slate-600">{s.schedule}</p>
                    <p className="mt-1 font-mono-tabular font-semibold text-slate-900">
                      {s.priceUsd ? `${s.priceUsd} USD` : 'À venir'} · {Math.max(0, s.capacity - s.enrolledCount)} places restantes
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        trackEvent('click_sinscrire_academie');
                        navigate(`/academie/inscription?formation=${formation.slug}&session=${s.code}`);
                      }}
                      className="mt-3 w-full rounded-lg bg-[#D90A14] py-2.5 text-sm font-semibold text-white hover:bg-[#b80811]"
                    >
                      S’inscrire à cette session
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                  Aucune session ouverte pour le moment (relance 2027). Laissez vos coordonnées pour recevoir le lien d’inscription dès l’ouverture.
                </div>
                {!waitlistOpen && !wlResult && (
                  <button
                    type="button"
                    onClick={() => setWaitlistOpen(true)}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#D90A14] text-sm font-semibold text-white hover:bg-[#b80811]"
                  >
                    <Bell className="h-4 w-4" />
                    Me prévenir de l’ouverture
                  </button>
                )}

                {waitlistOpen && !wlResult && (
                  <form onSubmit={handleWaitlist} className="space-y-3 border-t border-slate-200 pt-4">
                    <input
                      type="text"
                      value={wlName}
                      onChange={(e) => setWlName(e.target.value)}
                      placeholder="Votre nom complet *"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <RdcPhoneInput phone={wlPhone} onPhoneChange={setWlPhone} showWhatsappOption={false} />
                    <input
                      type="email"
                      value={wlEmail}
                      onChange={(e) => setWlEmail(e.target.value)}
                      placeholder="E-mail (facultatif)"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-600">
                      <input type="checkbox" checked={wlConsent} onChange={(e) => setWlConsent(e.target.checked)} className="mt-0.5 accent-[#D90A14]" />
                      <span>J’accepte d’être averti par SMS/WhatsApp ou e-mail lors de l’ouverture des inscriptions 2027.</span>
                    </label>
                    {wlError && <p className="text-xs font-medium text-[#D90A14]">{wlError}</p>}
                    <button
                      type="submit"
                      disabled={wlBusy}
                      className="w-full rounded-lg bg-[#D90A14] py-2.5 text-sm font-semibold text-white hover:bg-[#B80811]"
                    >
                      {wlBusy ? 'Enregistrement...' : 'Valider mon intérêt'}
                    </button>
                  </form>
                )}

                {wlResult && (
                  <SubmissionSuccessCard
                    offline={wlResult.offline}
                    localId={wlResult.localId}
                    dossier={wlResult.dossier}
                    nextStepsText="Vous êtes inscrit sur la liste d’intérêt 2027. Notre équipe vous contactera dès l’ouverture de la session."
                    onReset={() => {
                      setWlResult(null);
                      setWaitlistOpen(false);
                    }}
                  />
                )}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100">
              <ShareButton title={`Formation ${formation.title} — Lomakrev Académie`} className="w-full justify-center" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AcademieInscriptionPage: React.FC<{ enteredByAgent?: string | null; onDone?: () => void }> = ({
  enteredByAgent = null,
  onDone,
}) => {
  const { data, searchQuery, submitForm, navigate } = useApp();
  const params = new URLSearchParams(searchQuery);
  const initialFormation = params.get('formation') || '';
  const initialSession = params.get('session') || '';

  const [step, setStep] = useState(1);
  const [formState, setFormState] = useState<Record<string, any>>({
    formationSlug: initialFormation || 'cybersecurite',
    sessionCode: initialSession || '2027-01',
    format: 'Présentiel',
    typeInscription: 'Individuelle',
    nom: '',
    postnom: '',
    prenom: '',
    sexe: 'Masculin',
    dateNaissance: '',
    phone: '+243',
    whatsapp: '+243',
    sameWhatsapp: true,
    email: '',
    commune: '',
    ville: 'Kinshasa',
    organisation: '',
    nbParticipants: '2',
    personneContact: '',
    besoinFacture: 'Oui',
    niveauEtudes: 'Graduat / Licence',
    situation: 'Étudiant',
    niveauInfo: 'Débutant',
    portable: 'Oui',
    source: 'WhatsApp',
    attentes: '',
    consent: false,
    _website: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!enteredByAgent) {
      loadFormDraft('academie').then((saved) => {
        if (saved) {
          setFormState((prev) => ({
            ...prev,
            ...saved,
            formationSlug: initialFormation || (saved.formationSlug as string) || prev.formationSlug,
            sessionCode: initialSession || (saved.sessionCode as string) || prev.sessionCode,
          }));
        }
      });
    }
  }, [enteredByAgent, initialFormation, initialSession]);

  const updateField = (k: string, v: any) => {
    setFormState((prev) => {
      const next = { ...prev, [k]: v };
      if (!enteredByAgent) saveFormDraft('academie', next);
      return next;
    });
  };

  if (!data) return null;
  const formations = data.formations;
  const selectedFormation = formations.find((f) => f.slug === formState.formationSlug) || formations[0];
  const customFields = data.forms.academie?.customFields || [];

  const nextStep = () => {
    setError('');
    if (step === 2) {
      if (!formState.nom.trim() || !formState.prenom.trim()) {
        setError('Veuillez renseigner votre nom et prénom.');
        return;
      }
      if (!validateRdcPhone(formState.phone)) {
        setError('Numéro de téléphone RDC invalide (+243 suivi de 9 chiffres).');
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formState.consent) {
      setError('Veuillez accepter le règlement et la politique de confidentialité.');
      return;
    }
    setSubmitting(true);
    const res = await submitForm(
      'ACA',
      `Inscription ${selectedFormation?.title || formState.formationSlug}`,
      {
        applicantName: `${formState.prenom} ${formState.nom} ${formState.postnom}`.trim(),
        phone: formState.phone,
        whatsapp: formState.sameWhatsapp ? formState.phone : formState.whatsapp,
        email: formState.email,
        commune: formState.commune,
        ville: formState.ville,
        formationSlug: formState.formationSlug,
        sessionCode: formState.sessionCode,
        _website: formState._website,
        payload: formState,
      },
      enteredByAgent
    );
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || 'Erreur lors de l’envoi.');
      return;
    }
    if (!enteredByAgent) clearFormDraft('academie');
    setResult(res);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      {!enteredByAgent && (
        <Breadcrumbs items={[{ label: 'Lomakrev Académie', to: '/academie' }, { label: 'Inscription en ligne' }]} />
      )}

      {result ? (
        <SubmissionSuccessCard
          offline={result.offline}
          localId={result.localId}
          dossier={result.dossier}
          onReset={() => {
            setResult(null);
            if (onDone) onDone();
            else navigate('/academie');
          }}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#D90A14]">
              {enteredByAgent ? `Saisie au bureau (${enteredByAgent})` : 'Lomakrev Académie · Formulaire d’inscription'}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900">Inscription à une formation</h1>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#FEF3C7]">
              <div className="h-full bg-[#D90A14] transition-all" style={{ width: `${(step / 4) * 100}%` }} />
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">Étape {step} sur 4</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <input type="text" value={formState._website} onChange={(e) => updateField('_website', e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" />

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">Formation choisie *</label>
                  <select
                    value={formState.formationSlug}
                    onChange={(e) => updateField('formationSlug', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base"
                  >
                    {formations.map((f) => (
                      <option key={f.slug} value={f.slug}>
                        {f.title} ({f.durationHours} h)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">Session *</label>
                  <select
                    value={formState.sessionCode}
                    onChange={(e) => updateField('sessionCode', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base"
                  >
                    {selectedFormation?.sessions.length ? (
                      selectedFormation.sessions.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.code} — {formatDateFr(s.startDate)} ({s.schedule})
                        </option>
                      ))
                    ) : (
                      <option value="2027-01">Relance 2027 — Pré-inscription</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">Format souhaité *</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {['Présentiel', 'En ligne'].map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => updateField('format', fmt)}
                        className={`rounded-lg border py-3 text-sm font-semibold transition-colors ${
                          formState.format === fmt ? 'border-[#D90A14] bg-[#D90A14] text-white' : 'border-slate-300 text-slate-700 hover:bg-[#FFFBEB]'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">Type d’inscription *</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {['Individuelle', 'Entreprise / Organisation'].map((tp) => (
                      <button
                        key={tp}
                        type="button"
                        onClick={() => updateField('typeInscription', tp)}
                        className={`rounded-lg border py-3 text-sm font-semibold transition-colors ${
                          formState.typeInscription === tp ? 'border-[#D90A14] bg-[#D90A14] text-white' : 'border-slate-300 text-slate-700 hover:bg-[#FFFBEB]'
                        }`}
                      >
                        {tp}
                      </button>
                    ))}
                  </div>
                </div>
                <CustomFieldsRenderer fields={customFields} step={1} values={formState} onChange={updateField} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Nom *</label>
                    <input type="text" value={formState.nom} onChange={(e) => updateField('nom', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Postnom</label>
                    <input type="text" value={formState.postnom} onChange={(e) => updateField('postnom', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Prénom *</label>
                    <input type="text" value={formState.prenom} onChange={(e) => updateField('prenom', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Sexe *</label>
                    <select value={formState.sexe} onChange={(e) => updateField('sexe', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                      <option value="Masculin">Masculin</option>
                      <option value="Féminin">Féminin</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Date de naissance *</label>
                    <input type="date" value={formState.dateNaissance} onChange={(e) => updateField('dateNaissance', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                </div>

                <RdcPhoneInput
                  phone={formState.phone}
                  onPhoneChange={(v) => updateField('phone', v)}
                  whatsapp={formState.whatsapp}
                  onWhatsappChange={(v) => updateField('whatsapp', v)}
                  sameForWhatsapp={formState.sameWhatsapp}
                  onSameChange={(v) => updateField('sameWhatsapp', v)}
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">E-mail (facultatif)</label>
                    <input type="email" value={formState.email} onChange={(e) => updateField('email', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Commune *</label>
                    <input type="text" value={formState.commune} onChange={(e) => updateField('commune', e.target.value)} placeholder="Ex. Gombe" className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Ville *</label>
                    <input type="text" value={formState.ville} onChange={(e) => updateField('ville', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                </div>

                {formState.typeInscription === 'Entreprise / Organisation' && (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Informations entreprise</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input type="text" placeholder="Nom de l’organisation *" value={formState.organisation} onChange={(e) => updateField('organisation', e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm" />
                      <input type="number" placeholder="Nombre de participants" value={formState.nbParticipants} onChange={(e) => updateField('nbParticipants', e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm" />
                    </div>
                  </div>
                )}
                <CustomFieldsRenderer fields={customFields} step={2} values={formState} onChange={updateField} />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Niveau d’études</label>
                    <select value={formState.niveauEtudes} onChange={(e) => updateField('niveauEtudes', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                      <option>Secondaire / Diplôme d’État</option>
                      <option>Graduat / Licence</option>
                      <option>Master / Doctorat</option>
                      <option>Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Situation actuelle</label>
                    <select value={formState.situation} onChange={(e) => updateField('situation', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                      <option>Étudiant</option>
                      <option>Employé / Salarié</option>
                      <option>Entrepreneur / Indépendant</option>
                      <option>En recherche d’emploi</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Niveau en informatique</label>
                    <select value={formState.niveauInfo} onChange={(e) => updateField('niveauInfo', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                      <option>Débutant</option>
                      <option>Intermédiaire</option>
                      <option>Avancé</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Avez-vous un ordinateur portable ?</label>
                    <select value={formState.portable} onChange={(e) => updateField('portable', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                      <option>Oui</option>
                      <option>Non</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">Vos attentes pour cette formation</label>
                  <textarea rows={3} value={formState.attentes} onChange={(e) => updateField('attentes', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                </div>
                <CustomFieldsRenderer fields={customFields} step={3} values={formState} onChange={updateField} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm space-y-1.5">
                  <p><strong>Formation :</strong> {selectedFormation?.title}</p>
                  <p><strong>Session :</strong> {formState.sessionCode} ({formState.format})</p>
                  <p><strong>Apprenant :</strong> {formState.prenom} {formState.nom} {formState.postnom}</p>
                  <p><strong>Téléphone :</strong> {formState.phone}</p>
                </div>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                  <input type="checkbox" checked={formState.consent} onChange={(e) => updateField('consent', e.target.checked)} className="mt-1 h-4 w-4 accent-[#D90A14]" />
                  <span>J’accepte le règlement intérieur de Lomakrev Académie et la politique de confidentialité de LOMAKREV GROUP.</span>
                </label>
              </div>
            )}

            {error && <p className="text-sm font-medium text-[#D90A14]">{error}</p>}

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
              {step > 1 ? (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700">
                  Précédent
                </button>
              ) : (
                <span />
              )}
              {step < 4 ? (
                <button type="button" onClick={nextStep} className="rounded-lg bg-[#D90A14] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#B80811]">
                  Continuer
                </button>
              ) : (
                <button type="submit" disabled={submitting} className="rounded-lg bg-[#D90A14] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#b80811] disabled:opacity-60">
                  {submitting ? 'Validation...' : 'Confirmer l’inscription'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
