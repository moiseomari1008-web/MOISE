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
import {
  PdfCheckboxGroup,
  PdfField,
  PdfFormActions,
  PdfFormShell,
  PdfRadioGroup,
  PdfStepCard,
  PdfSummarySection,
} from '../components/PdfFormKit';
import { formatDateFr } from '../lib/pdfPrint';
import { clearFormDraft, loadFormDraft, saveFormDraft } from '../lib/offlineSync';
import { KINSHASA_COMMUNES } from '../lib/rdcGeo';
import { OfficeAwareSelect } from '../components/DualSelectInput';

export const AcademieHomePage: React.FC = () => {
  const { data, navigate } = useApp();
  if (!data) return null;
  const formations = data.formations.filter((f) => f.active);
  const academiePhotos = data.photos.filter((p) => p.pole === 'academie' && p.consentVerified);

  const heroPhotoUrl = academiePhotos[0]?.url || data.settings.academieHeroUrl;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumbs items={[{ label: 'Lomakrev Académie' }]} />

      <div className="grid items-center gap-8 border-b border-[#F4B400]/40 pb-10 lg:grid-cols-12">
        <div className={heroPhotoUrl ? 'lg:col-span-6' : 'lg:col-span-12 max-w-3xl'}>
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
        {heroPhotoUrl && (
          <div className="lg:col-span-6">
            <PhotoFrame
              src={heroPhotoUrl}
              alt="Salle de formation Lomakrev Académie"
              aspectClass="aspect-[16/10]"
              className="rounded-xl border border-slate-200"
              priority
              caption={academiePhotos[0]?.caption || 'Campus Lomakrev — Kinshasa, Gombe'}
            />
          </div>
        )}
      </div>

      {/* 7 Formations Grid */}
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {formations.map((f, idx) => {
          const openSessions = f.sessions.filter((s) => s.isOpen);
          return (
            <article key={f.id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
              {f.imageUrl && (
                <PhotoFrame src={f.imageUrl} alt={f.title} aspectClass="aspect-[16/9]" className="border-b border-slate-100" />
              )}
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

  const [wlSelectedFormations, setWlSelectedFormations] = useState<string[]>([]);

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
  const activeWlFormations = wlSelectedFormations.length > 0 ? wlSelectedFormations : [formation.title];

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setWlError('');
    if (!wlName.trim()) {
      setWlError('Veuillez saisir votre nom complet.');
      return;
    }
    if (!validateRdcPhone(wlPhone)) {
      setWlError('Numéro RDC invalide (+243 suivi de 9 chiffres).');
      return;
    }
    if (activeWlFormations.length === 0) {
      setWlError('Veuillez sélectionner au moins une formation.');
      return;
    }
    if (!wlConsent) {
      setWlError('Veuillez accepter d’être contacté(e) à l’ouverture des inscriptions.');
      return;
    }
    setWlBusy(true);
    const res = await submitForm('WAITLIST', `Liste intérêt ${activeWlFormations.join(', ')}`, {
      applicantName: wlName.trim(),
      phone: wlPhone,
      email: wlEmail.trim(),
      formationSlug: formation.slug,
      payload: { formationTitle: activeWlFormations.join(', '), formations: activeWlFormations },
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

          {formation.imageUrl && (
            <PhotoFrame src={formation.imageUrl} alt={formation.title} aspectClass="aspect-[16/9]" className="rounded-xl border border-slate-200" priority />
          )}

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
                    <PdfField label="Nom complet" required>
                      <input
                        type="text"
                        value={wlName}
                        onChange={(e) => setWlName(e.target.value)}
                        placeholder="Ex. : Grâce Mbuyi"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </PdfField>
                    <RdcPhoneInput label="Téléphone / WhatsApp" phone={wlPhone} onPhoneChange={setWlPhone} showWhatsappOption={false} />
                    <PdfField label="Formation(s) qui vous intéressent" required>
                      <PdfCheckboxGroup
                        values={activeWlFormations}
                        onChange={setWlSelectedFormations}
                        options={data.formations.filter((f) => f.active).map((f) => f.title)}
                        tone="academie"
                        columnsClass="flex flex-col gap-1.5"
                      />
                    </PdfField>
                    <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-700">
                      <input type="checkbox" checked={wlConsent} onChange={(e) => setWlConsent(e.target.checked)} className="mt-0.5 accent-[#1E293B]" />
                      <span>J'accepte d'être contacté(e) à l'ouverture des inscriptions. <span className="text-[#D90A14]">*</span></span>
                    </label>
                    {wlError && <p className="text-xs font-medium text-[#D90A14]">{wlError}</p>}
                    <button
                      type="submit"
                      disabled={wlBusy}
                      className="w-full rounded-lg bg-[#D90A14] py-2.5 text-sm font-semibold text-white hover:bg-[#B80811]"
                    >
                      {wlBusy ? 'Enregistrement...' : 'Me prévenir de l’ouverture'}
                    </button>
                  </form>
                )}

                {wlResult && (
                  <SubmissionSuccessCard
                    offline={wlResult.offline}
                    localId={wlResult.localId}
                    dossier={wlResult.dossier}
                    title="Demande enregistrée"
                    bulletPoints={[
                      'Vous êtes inscrit(e) sur la liste d’alerte pour la relance 2027.',
                      'Nous vous contacterons par téléphone ou WhatsApp dès l’ouverture des inscriptions.',
                    ]}
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
  const { data, searchQuery, submitForm, navigate, pushToast } = useApp();
  const params = new URLSearchParams(searchQuery);
  const initialFormation = params.get('formation') || '';
  const initialSession = params.get('session') || '';
  const draftParam = params.get('draft') || '';

  const [activeStepKey, setActiveStepKey] = useState<'1' | '2' | '2b' | '3' | '4'>('1');
  const [resumeLink, setResumeLink] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formState, setFormState] = useState<Record<string, any>>({
    formationSlug: initialFormation || 'cybersecurite',
    sessionCode: initialSession || '',
    format: 'Présentiel (Gombe)',
    typeInscription: 'Pour moi-même',
    nom: '',
    postnom: '',
    prenom: '',
    sexe: '',
    dateNaissance: '',
    phone: '+243',
    whatsapp: '+243',
    sameWhatsapp: true,
    email: '',
    ville: 'Kinshasa',
    commune: '',
    communeAutre: '',
    // Step 2b Organisation
    organisation: '',
    secteurActivite: '',
    nbParticipants: '',
    personneContact: '',
    factureOrganisation: '',
    // Step 3 Profil
    niveauEtudes: '',
    situation: '',
    niveauInfo: '',
    portable: '',
    attentes: '',
    source: '',
    // Step 4 Envoi
    modePaiement: '',
    acceptReglement: false,
    consent: false,
    consentMessages: false,
    _website: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Short waitlist version state (when no open sessions exist)
  const [wlName, setWlName] = useState('');
  const [wlPhone, setWlPhone] = useState('+243');
  const [wlFormations, setWlFormations] = useState<string[]>([]);
  const [wlConsent, setWlConsent] = useState(false);
  const [wlErrors, setWlErrors] = useState<Record<string, string>>({});
  const [wlBusy, setWlBusy] = useState(false);
  const [wlResult, setWlResult] = useState<any>(null);

  useEffect(() => {
    if (draftParam) {
      fetch(`/api/public/drafts/${encodeURIComponent(draftParam)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.data) {
            setFormState((prev) => ({ ...prev, ...d.data }));
            pushToast('info', 'Brouillon restauré avec succès.');
          }
        })
        .catch(() => {});
    } else if (!enteredByAgent) {
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
  }, [draftParam, enteredByAgent, initialFormation, initialSession, pushToast]);

  const updateField = (k: string, v: any) => {
    setFieldErrors((prev) => {
      if (!prev[k]) return prev;
      const c = { ...prev };
      delete c[k];
      return c;
    });
    setFormState((prev) => {
      const next = { ...prev, [k]: v };
      if (!enteredByAgent) saveFormDraft('academie', next);
      return next;
    });
  };

  if (!data) return null;
  const activeFormations = data.formations.filter((f) => f.active);
  const anyOpenSessions = activeFormations.some((f) => f.sessions.some((s) => s.isOpen));
  const selectedFormation = activeFormations.find((f) => f.slug === formState.formationSlug) || activeFormations[0];
  const openSessions = (selectedFormation?.sessions || []).filter((s) => s.isOpen);
  const currentSession = openSessions.find((s) => s.code === formState.sessionCode) || openSessions[0];
  const customFields = data.forms.academie?.customFields || [];
  const isOrg = formState.typeInscription === 'Pour mon entreprise ou mon organisation';
  const resolvedCommune = formState.commune === 'Autre' ? formState.communeAutre : formState.commune;

  const stepsList = isOrg
    ? [
        { key: '1', num: '1', label: 'Formation' },
        { key: '2', num: '2', label: 'Participant' },
        { key: '2b', num: '2b', label: 'Organisation' },
        { key: '3', num: '3', label: 'Profil' },
        { key: '4', num: '4', label: 'Envoi' },
      ]
    : [
        { key: '1', num: '1', label: 'Formation' },
        { key: '2', num: '2', label: 'Participant' },
        { key: '3', num: '3', label: 'Profil' },
        { key: '4', num: '4', label: 'Envoi' },
      ];
  const activeStepIndex = Math.max(0, stepsList.findIndex((s) => s.key === activeStepKey));

  const handleSaveDraft = async () => {
    await saveFormDraft('academie', formState);
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/public/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: draftParam || undefined, formKey: 'academie', data: formState }),
        });
        const json = await res.json();
        if (json.resumeUrl) {
          setResumeLink(`${window.location.origin}${json.resumeUrl}`);
          pushToast('success', 'Brouillon enregistré. Lien de reprise prêt.');
          return;
        }
      } catch {
        // fallback local only
      }
    }
    pushToast('success', 'Brouillon sauvegardé sur cet appareil.');
  };

  // Version courte : « Me prévenir de l'ouverture » when NO open session exists across Académie (or selected formation via ?formation has none and user didn't pick another)
  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!wlName.trim()) errs.wlName = 'Veuillez indiquer votre nom complet.';
    if (!validateRdcPhone(wlPhone)) errs.wlPhone = 'Format requis : +243 suivi de 9 chiffres.';
    if (wlFormations.length === 0) errs.wlFormations = 'Veuillez choisir au moins une formation.';
    if (!wlConsent) errs.wlConsent = 'Veuillez cocher cette autorisation.';
    if (Object.keys(errs).length > 0) {
      setWlErrors(errs);
      return;
    }
    setWlBusy(true);
    const res = await submitForm('WAITLIST', `Liste intérêt ${wlFormations.join(', ')}`, {
      applicantName: wlName.trim(),
      phone: wlPhone,
      formationSlug: selectedFormation?.slug || activeFormations[0]?.slug,
      payload: { formationTitle: wlFormations.join(', '), formations: wlFormations },
    });
    setWlBusy(false);
    if (!res.ok) {
      setWlErrors({ submit: res.error || 'Erreur lors de l’envoi.' });
      return;
    }
    setWlResult(res);
  };

  if (!anyOpenSessions && !enteredByAgent) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
        <Breadcrumbs items={[{ label: 'Lomakrev Académie', to: '/academie' }, { label: 'Me prévenir de l’ouverture' }]} />
        {wlResult ? (
          <SubmissionSuccessCard
            offline={wlResult.offline}
            localId={wlResult.localId}
            dossier={wlResult.dossier}
            title="Inscription en liste d'attente enregistrée"
            bulletPoints={[
              'Vous serez prévenu(e) par téléphone ou WhatsApp dès l’ouverture des inscriptions.',
              'Suivez votre demande sur lomakrev.com/suivi.',
            ]}
            onReset={() => {
              setWlResult(null);
              navigate('/academie');
            }}
          />
        ) : (
          <PdfFormShell
            tone="academie"
            poleLabel="LOMAKREV ACADÉMIE"
            title="Me prévenir de l'ouverture"
            urlHint="lomakrev.com/academie/inscription"
            refPreview="WL-AAAA-00000"
            introText="Aucune session n'est ouverte pour le moment (relance 2027). Laissez vos coordonnées pour être averti(e) en priorité dès l'ouverture des inscriptions."
            steps={[{ key: 'wl', num: '+', label: 'Liste d’alerte' }]}
            activeStepIndex={0}
          >
            <form onSubmit={handleWaitlistSubmit} className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <PdfField label="Nom complet" required error={wlErrors.wlName}>
                  <input
                    type="text"
                    placeholder="Ex. : Grâce Mbuyi"
                    value={wlName}
                    onChange={(e) => {
                      setWlName(e.target.value);
                      setWlErrors((p) => ({ ...p, wlName: '' }));
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm sm:text-base outline-none focus:border-[#1E293B]"
                  />
                </PdfField>

                <RdcPhoneInput
                  label="Téléphone / WhatsApp"
                  phone={wlPhone}
                  onPhoneChange={(v) => {
                    setWlPhone(v);
                    setWlErrors((p) => ({ ...p, wlPhone: '' }));
                  }}
                  showWhatsappOption={false}
                  error={wlErrors.wlPhone}
                />
              </div>

              <PdfField label="Formation(s) qui vous intéressent" required error={wlErrors.wlFormations}>
                <PdfCheckboxGroup
                  values={wlFormations}
                  onChange={(next) => {
                    setWlFormations(next);
                    setWlErrors((p) => ({ ...p, wlFormations: '' }));
                  }}
                  options={activeFormations.map((f) => f.title)}
                  tone="academie"
                />
              </PdfField>

              <div>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={wlConsent}
                    onChange={(e) => {
                      setWlConsent(e.target.checked);
                      setWlErrors((p) => ({ ...p, wlConsent: '' }));
                    }}
                    className="mt-0.5 h-4 w-4 accent-[#1E293B]"
                  />
                  <span>
                    J'accepte d'être contacté(e) à l'ouverture des inscriptions. <span className="text-[#D90A14]">*</span>
                  </span>
                </label>
                {wlErrors.wlConsent && <p className="mt-1 pl-6 text-xs font-medium text-[#D90A14]">{wlErrors.wlConsent}</p>}
              </div>

              {wlErrors.submit && <p className="text-sm font-medium text-[#D90A14]">{wlErrors.submit}</p>}

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  disabled={wlBusy}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#D90A14] px-5 text-sm font-semibold text-white hover:bg-[#b80811] disabled:opacity-60"
                >
                  {wlBusy ? 'Enregistrement...' : 'Me prévenir de l’ouverture'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </PdfFormShell>
        )}
      </div>
    );
  }

  const validateAndNext = () => {
    const errs: Record<string, string> = {};
    if (activeStepKey === '1') {
      if (!selectedFormation) errs.formationSlug = 'Veuillez choisir une formation.';
      if (openSessions.length === 0 && !enteredByAgent) {
        errs.sessionCode = 'Aucune session ouverte pour cette formation. Choisissez une formation ayant une session ouverte.';
      }
      if (!formState.format) errs.format = 'Veuillez choisir un format.';
      if (!formState.typeInscription) errs.typeInscription = 'Veuillez choisir un type d’inscription.';
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }
      setActiveStepKey('2');
      return;
    }

    if (activeStepKey === '2') {
      if (!formState.nom.trim()) errs.nom = 'Veuillez indiquer votre nom.';
      if (!formState.postnom.trim()) errs.postnom = 'Veuillez indiquer votre postnom.';
      if (!formState.prenom.trim()) errs.prenom = 'Veuillez indiquer votre prénom.';
      if (!formState.sexe) errs.sexe = 'Veuillez sélectionner votre sexe.';
      if (!formState.dateNaissance) errs.dateNaissance = 'Veuillez indiquer votre date de naissance.';
      if (!validateRdcPhone(formState.phone)) errs.phone = 'Format requis : +243 suivi de 9 chiffres.';
      if (!formState.sameWhatsapp && formState.whatsapp && formState.whatsapp !== '+243' && !validateRdcPhone(formState.whatsapp)) {
        errs.whatsapp = 'Format WhatsApp requis : +243 suivi de 9 chiffres.';
      }
      if (!formState.ville.trim()) errs.ville = 'Veuillez indiquer votre ville.';
      if (!resolvedCommune.trim()) errs.commune = 'Veuillez choisir ou saisir votre commune.';
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }
      setActiveStepKey(isOrg ? '2b' : '3');
      return;
    }

    if (activeStepKey === '2b') {
      if (!formState.organisation.trim()) errs.organisation = 'Veuillez indiquer le nom de l’organisation.';
      if (!String(formState.nbParticipants).trim() || Number(formState.nbParticipants) <= 0) {
        errs.nbParticipants = 'Veuillez indiquer le nombre de participants.';
      }
      if (!formState.personneContact.trim()) errs.personneContact = 'Veuillez indiquer la personne de contact et sa fonction.';
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }
      setActiveStepKey('3');
      return;
    }

    if (activeStepKey === '3') {
      if (!formState.niveauEtudes) errs.niveauEtudes = 'Veuillez choisir votre niveau d’études.';
      if (!formState.situation) errs.situation = 'Veuillez indiquer votre situation actuelle.';
      if (!formState.niveauInfo) errs.niveauInfo = 'Veuillez sélectionner votre niveau dans ce domaine.';
      if (!formState.portable) errs.portable = 'Veuillez répondre à cette question.';
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }
      setActiveStepKey('4');
    }
  };

  const handleBack = () => {
    if (activeStepKey === '4') setActiveStepKey('3');
    else if (activeStepKey === '3') setActiveStepKey(isOrg ? '2b' : '2');
    else if (activeStepKey === '2b') setActiveStepKey('2');
    else if (activeStepKey === '2') setActiveStepKey('1');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!formState.modePaiement) errs.modePaiement = 'Veuillez sélectionner un mode de paiement envisagé.';
    if (!formState.acceptReglement) errs.acceptReglement = 'Veuillez accepter le règlement de la Lomakrev Académie.';
    if (!formState.consent) errs.consent = 'Veuillez accepter le traitement de vos données.';
    if (!formState.consentMessages) errs.consentMessages = 'Veuillez accepter de recevoir les messages de suivi.';
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    const sessionCode = currentSession?.code || formState.sessionCode || '2027-01';
    const sessionLabel = currentSession ? formatDateFr(currentSession.startDate) : sessionCode;
    setSubmitting(true);
    const res = await submitForm(
      'ACA',
      `Inscription ${selectedFormation?.title || formState.formationSlug}`,
      {
        applicantName: `${formState.prenom} ${formState.nom} ${formState.postnom}`.trim(),
        phone: formState.phone,
        whatsapp: formState.sameWhatsapp ? formState.phone : formState.whatsapp,
        email: formState.email,
        commune: resolvedCommune,
        ville: formState.ville,
        formationSlug: selectedFormation?.slug || formState.formationSlug,
        sessionCode,
        _website: formState._website,
        payload: {
          ...formState,
          commune: resolvedCommune,
          formationChoisie: selectedFormation?.title || formState.formationSlug,
          sessionLabel,
        },
      },
      enteredByAgent
    );
    setSubmitting(false);
    if (!res.ok) {
      setFieldErrors({ submit: res.error || 'Erreur lors de l’envoi.' });
      return;
    }
    if (!enteredByAgent) clearFormDraft('academie');
    setResult(res);
  };

  const inputClass = (hasErr?: boolean) =>
    `w-full rounded-lg border px-3.5 py-2.5 text-sm sm:text-base outline-none transition-colors ${
      hasErr ? 'border-[#D90A14] bg-red-50/30' : 'border-slate-300 bg-white focus:border-[#1E293B]'
    }`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
      {!enteredByAgent && (
        <Breadcrumbs items={[{ label: 'Lomakrev Académie', to: '/academie' }, { label: 'Inscription en ligne' }]} />
      )}

      {result ? (
        <SubmissionSuccessCard
          offline={result.offline}
          localId={result.localId}
          dossier={result.dossier}
          title="Inscription bien reçue"
          bulletPoints={[
            'Notre équipe vous contacte sous 24 h ouvrées pour confirmer votre place.',
            'Vous recevrez les modalités de paiement et le lieu exact.',
            'Suivez votre inscription sur lomakrev.com/suivi.',
          ]}
          smsPreview={
            result.dossier?.autoMessage ||
            `LOMAKREV ACADÉMIE : inscription ${result.dossier?.reference} (${selectedFormation?.title}, ${currentSession ? formatDateFr(currentSession.startDate) : formState.sessionCode}) reçue. Nous vous appelons sous 24 h ouvrées. Suivi : lomakrev.com/suivi`
          }
          onReset={() => {
            setResult(null);
            if (onDone) onDone();
            else navigate('/academie');
          }}
        />
      ) : (
        <PdfFormShell
          tone="academie"
          poleLabel="LOMAKREV ACADÉMIE"
          title="Inscription à une formation"
          urlHint="lomakrev.com/academie/inscription?formation=…&session=…"
          refPreview="ACA-AAAA-00000"
          introText="Inscrivez-vous en 4 étapes (environ 5 minutes). Votre place est confirmée par notre équipe après vérification et paiement."
          steps={stepsList}
          activeStepIndex={activeStepIndex}
          onStepClick={(idx) => setActiveStepKey(stepsList[idx].key as any)}
          enteredByAgent={enteredByAgent}
          resumeLink={resumeLink}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={formState._website} onChange={(e) => updateField('_website', e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" />

            {activeStepKey === '1' && (
              <PdfStepCard tone="academie" stepNum="1" title="Choix de la formation" stepMeta="Étape 1 sur 4">
                <PdfField
                  label="Formation"
                  required
                  helper="Préremplie par le lien partagé ; modifiable."
                  error={fieldErrors.formationSlug}
                >
                  <OfficeAwareSelect
                    officeMode={Boolean(enteredByAgent)}
                    fieldKey="office_academie_formation"
                    value={selectedFormation?.slug || formState.formationSlug}
                    onChange={(val) => {
                      updateField('formationSlug', val);
                      const f = activeFormations.find((x) => x.slug === val);
                      const firstOpen = f?.sessions.find((s) => s.isOpen);
                      updateField('sessionCode', firstOpen?.code || '');
                    }}
                    options={activeFormations.map((f) => {
                      const countOpen = f.sessions.filter((s) => s.isOpen).length;
                      return {
                        value: f.slug,
                        label: countOpen > 0 ? f.title : `${f.title} (bientôt disponible)`,
                      };
                    })}
                    className={inputClass(Boolean(fieldErrors.formationSlug))}
                  />
                </PdfField>

                <div className="grid gap-4 md:grid-cols-2">
                  <PdfField
                    label="Session"
                    required
                    helper="Seules les sessions ouvertes sont proposées, avec les places restantes."
                    error={fieldErrors.sessionCode}
                  >
                    <OfficeAwareSelect
                      officeMode={Boolean(enteredByAgent)}
                      fieldKey="office_academie_session"
                      value={currentSession?.code || formState.sessionCode}
                      onChange={(val) => updateField('sessionCode', val)}
                      options={
                        openSessions.length > 0
                          ? openSessions.map((s) => ({
                              value: s.code,
                              label: `Session du ${formatDateFr(s.startDate)} — ${Math.max(0, s.capacity - s.enrolledCount)} places restantes`,
                            }))
                          : enteredByAgent
                          ? [{ value: '2027-01', label: 'Relance 2027 — Saisie bureau' }]
                          : [{ value: '', label: 'Aucune session ouverte pour cette formation' }]
                      }
                      className={inputClass(Boolean(fieldErrors.sessionCode))}
                    />
                  </PdfField>

                  <PdfField label="Format" required error={fieldErrors.format}>
                    <PdfRadioGroup
                      name="aca_format"
                      value={formState.format}
                      onChange={(val) => updateField('format', val)}
                      options={['Présentiel (Gombe)', 'En ligne']}
                      tone="academie"
                    />
                  </PdfField>
                </div>

                <PdfField label="Vous inscrivez-vous…" required error={fieldErrors.typeInscription}>
                  <PdfRadioGroup
                    name="aca_type_inscription"
                    value={formState.typeInscription}
                    onChange={(val) => updateField('typeInscription', val)}
                    options={['Pour moi-même', 'Pour mon entreprise ou mon organisation']}
                    tone="academie"
                  />
                </PdfField>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs sm:text-sm text-slate-600">
                  Durée : <strong className="text-slate-900">{selectedFormation?.durationHours} h</strong> · Prix :{' '}
                  <strong className="text-slate-900">
                    {currentSession?.priceUsd ? `${currentSession.priceUsd} USD` : "affiché dès qu'il est saisi dans l'administration"}
                  </strong>{' '}
                  · Attestation Lomakrev Académie
                </div>

                <CustomFieldsRenderer fields={customFields} step={1} values={formState} onChange={updateField} officeMode={Boolean(enteredByAgent)} />
              </PdfStepCard>
            )}

            {activeStepKey === '2' && (
              <PdfStepCard tone="academie" stepNum="2" title="Participant" stepMeta="Étape 2 sur 4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <PdfField label="Nom" required error={fieldErrors.nom}>
                    <input type="text" placeholder="Ex. : MBUYI" value={formState.nom} onChange={(e) => updateField('nom', e.target.value)} className={inputClass(Boolean(fieldErrors.nom))} />
                  </PdfField>
                  <PdfField label="Postnom" required error={fieldErrors.postnom}>
                    <input type="text" placeholder="Ex. : KABANGA" value={formState.postnom} onChange={(e) => updateField('postnom', e.target.value)} className={inputClass(Boolean(fieldErrors.postnom))} />
                  </PdfField>
                  <PdfField label="Prénom" required error={fieldErrors.prenom}>
                    <input type="text" placeholder="Ex. : Grâce" value={formState.prenom} onChange={(e) => updateField('prenom', e.target.value)} className={inputClass(Boolean(fieldErrors.prenom))} />
                  </PdfField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField label="Sexe" required error={fieldErrors.sexe}>
                    <PdfRadioGroup
                      name="aca_sexe"
                      value={formState.sexe}
                      onChange={(val) => updateField('sexe', val)}
                      options={['Femme', 'Homme']}
                      tone="academie"
                    />
                  </PdfField>
                  <PdfField label="Date de naissance" required error={fieldErrors.dateNaissance}>
                    <input type="date" value={formState.dateNaissance} onChange={(e) => updateField('dateNaissance', e.target.value)} className={inputClass(Boolean(fieldErrors.dateNaissance))} />
                  </PdfField>
                </div>

                <RdcPhoneInput
                  label="Téléphone"
                  whatsappLabel="Numéro WhatsApp"
                  phone={formState.phone}
                  onPhoneChange={(v) => updateField('phone', v)}
                  whatsapp={formState.whatsapp}
                  onWhatsappChange={(v) => updateField('whatsapp', v)}
                  sameForWhatsapp={formState.sameWhatsapp}
                  onSameChange={(v) => updateField('sameWhatsapp', v)}
                  error={fieldErrors.phone}
                  whatsappError={fieldErrors.whatsapp}
                  layout="grid"
                />

                <PdfField label="Adresse e-mail" helper="Facultatif, mais recommandé pour recevoir les documents.">
                  <input type="email" placeholder="exemple@gmail.com" value={formState.email} onChange={(e) => updateField('email', e.target.value)} className={inputClass(false)} />
                </PdfField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField label="Ville" required error={fieldErrors.ville}>
                    <input type="text" placeholder="Ex. : Kinshasa" value={formState.ville} onChange={(e) => updateField('ville', e.target.value)} className={inputClass(Boolean(fieldErrors.ville))} />
                  </PdfField>

                  <PdfField label="Commune" required error={fieldErrors.commune}>
                    <div className="space-y-2">
                      <OfficeAwareSelect
                        officeMode={Boolean(enteredByAgent)}
                        fieldKey="office_kin_commune"
                        value={formState.commune}
                        onChange={(val) => updateField('commune', val)}
                        options={[
                          ...(!enteredByAgent ? [{ value: '', label: 'Choisir…' }] : []),
                          ...KINSHASA_COMMUNES.map((c) => ({ value: c, label: c })),
                          { value: 'Autre', label: 'Autre commune' },
                        ]}
                        className={inputClass(Boolean(fieldErrors.commune))}
                      />
                      {formState.commune === 'Autre' && (
                        <input
                          type="text"
                          placeholder="Précisez la commune"
                          value={formState.communeAutre}
                          onChange={(e) => updateField('communeAutre', e.target.value)}
                          className={inputClass(Boolean(fieldErrors.commune))}
                        />
                      )}
                    </div>
                  </PdfField>
                </div>

                <CustomFieldsRenderer fields={customFields} step={2} values={formState} onChange={updateField} officeMode={Boolean(enteredByAgent)} />
              </PdfStepCard>
            )}

            {activeStepKey === '2b' && (
              <PdfStepCard
                tone="academie"
                stepNum="2b"
                title="Organisation"
                subtitle="Informations de l'entreprise ou institution"
                stepMeta="Étape 2b sur 4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField label="Nom de l'organisation" required error={fieldErrors.organisation}>
                    <input
                      type="text"
                      placeholder="Ex. : Société XYZ SARL"
                      value={formState.organisation}
                      onChange={(e) => updateField('organisation', e.target.value)}
                      className={inputClass(Boolean(fieldErrors.organisation))}
                    />
                  </PdfField>

                  <PdfField label="Secteur d'activité">
                    <OfficeAwareSelect
                      officeMode={Boolean(enteredByAgent)}
                      fieldKey="office_secteur_activite"
                      value={formState.secteurActivite}
                      onChange={(val) => updateField('secteurActivite', val)}
                      options={[
                        ...(!enteredByAgent ? [{ value: '', label: 'Choisir…' }] : []),
                        'Commerce',
                        'Banque',
                        'ONG',
                        'Administration',
                        'Éducation',
                        'Autre',
                      ]}
                      className={inputClass(false)}
                    />
                  </PdfField>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <PdfField label="Nombre de participants" required error={fieldErrors.nbParticipants}>
                    <input
                      type="number"
                      min={1}
                      placeholder="Ex. : 5"
                      value={formState.nbParticipants}
                      onChange={(e) => updateField('nbParticipants', e.target.value)}
                      className={inputClass(Boolean(fieldErrors.nbParticipants))}
                    />
                  </PdfField>

                  <PdfField label="Personne de contact et fonction" required error={fieldErrors.personneContact}>
                    <input
                      type="text"
                      placeholder="Ex. : J. Ilunga, RH"
                      value={formState.personneContact}
                      onChange={(e) => updateField('personneContact', e.target.value)}
                      className={inputClass(Boolean(fieldErrors.personneContact))}
                    />
                  </PdfField>

                  <PdfField label="Facture au nom de l'organisation ?">
                    <PdfRadioGroup
                      name="aca_facture_org"
                      value={formState.factureOrganisation}
                      onChange={(val) => updateField('factureOrganisation', val)}
                      options={['Oui', 'Non']}
                      tone="academie"
                    />
                  </PdfField>
                </div>
              </PdfStepCard>
            )}

            {activeStepKey === '3' && (
              <PdfStepCard
                tone="academie"
                stepNum="3"
                title="Profil"
                subtitle="Aide le formateur à adapter le cours"
                stepMeta="Étape 3 sur 4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField label="Niveau d'études" required error={fieldErrors.niveauEtudes}>
                    <OfficeAwareSelect
                      officeMode={Boolean(enteredByAgent)}
                      fieldKey="office_niveau_etudes"
                      value={formState.niveauEtudes}
                      onChange={(val) => updateField('niveauEtudes', val)}
                      options={[
                        ...(!enteredByAgent ? [{ value: '', label: 'Choisir…' }] : []),
                        'Sans diplôme',
                        'Diplôme d’État',
                        'Graduat (Bac+3)',
                        'Licence / Master',
                        'Autre',
                      ]}
                      className={inputClass(Boolean(fieldErrors.niveauEtudes))}
                    />
                  </PdfField>

                  <PdfField label="Situation actuelle" required error={fieldErrors.situation}>
                    <PdfRadioGroup
                      name="aca_situation"
                      value={formState.situation}
                      onChange={(val) => updateField('situation', val)}
                      options={['Étudiant(e)', 'Salarié(e)', 'Sans emploi', 'Entrepreneur(e)']}
                      tone="academie"
                    />
                  </PdfField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField label="Votre niveau dans ce domaine" required error={fieldErrors.niveauInfo}>
                    <PdfRadioGroup
                      name="aca_niveau_info"
                      value={formState.niveauInfo}
                      onChange={(val) => updateField('niveauInfo', val)}
                      options={['Débutant', 'Intermédiaire', 'Avancé']}
                      tone="academie"
                    />
                  </PdfField>

                  <PdfField label="Aurez-vous un ordinateur portable pendant la formation ?" required error={fieldErrors.portable}>
                    <PdfRadioGroup
                      name="aca_portable"
                      value={formState.portable}
                      onChange={(val) => updateField('portable', val)}
                      options={['Oui', 'Non']}
                      tone="academie"
                    />
                  </PdfField>
                </div>

                <PdfField label="Qu'attendez-vous de cette formation ?">
                  <div>
                    <textarea
                      rows={3}
                      maxLength={300}
                      placeholder="Facultatif — 300 caractères maximum"
                      value={formState.attentes}
                      onChange={(e) => updateField('attentes', e.target.value)}
                      className={inputClass(false)}
                    />
                    <p className="mt-1 text-right font-mono-tabular text-[11px] text-slate-400">
                      {formState.attentes.length} / 300 caractères
                    </p>
                  </div>
                </PdfField>

                <PdfField label="Comment nous avez-vous connus ?">
                  <OfficeAwareSelect
                    officeMode={Boolean(enteredByAgent)}
                    fieldKey="office_source_connaissance"
                    value={formState.source}
                    onChange={(val) => updateField('source', val)}
                    options={[
                      ...(!enteredByAgent ? [{ value: '', label: 'Choisir…' }] : []),
                      'WhatsApp',
                      'Facebook',
                      'Instagram',
                      'Affiche / flyer',
                      'Un ami',
                      'Client Lomakrev',
                      'Autre',
                    ]}
                    className={inputClass(false)}
                  />
                </PdfField>

                <CustomFieldsRenderer fields={customFields} step={3} values={formState} onChange={updateField} officeMode={Boolean(enteredByAgent)} />
              </PdfStepCard>
            )}

            {activeStepKey === '4' && (
              <PdfStepCard tone="academie" stepNum="4" title="Vérification et envoi" stepMeta="Étape 4 sur 4">
                <div className="space-y-3">
                  <PdfSummarySection
                    title="1 · Formation"
                    onEdit={() => setActiveStepKey('1')}
                    items={[
                      { label: 'Formation', value: selectedFormation?.title || '—' },
                      {
                        label: 'Session & format',
                        value: `${currentSession ? formatDateFr(currentSession.startDate) : formState.sessionCode} · ${formState.format}`,
                      },
                      { label: 'Prix', value: currentSession?.priceUsd ? `${currentSession.priceUsd} USD` : 'À confirmer' },
                      { label: 'Type', value: formState.typeInscription },
                    ]}
                  />
                  <PdfSummarySection
                    title="2 · Participant"
                    onEdit={() => setActiveStepKey('2')}
                    items={[
                      { label: 'Nom complet', value: `${formState.nom} ${formState.postnom} ${formState.prenom}`.trim() },
                      { label: 'Téléphone / WhatsApp', value: `${formState.phone} (WA : ${formState.sameWhatsapp ? formState.phone : formState.whatsapp})` },
                      { label: 'Localisation', value: `${resolvedCommune}, ${formState.ville}` },
                    ]}
                  />
                  {isOrg && (
                    <PdfSummarySection
                      title="2b · Organisation"
                      onEdit={() => setActiveStepKey('2b')}
                      items={[
                        { label: 'Organisation', value: formState.organisation },
                        { label: 'Participants', value: `${formState.nbParticipants} participant(s)` },
                        { label: 'Contact RH / responsable', value: formState.personneContact },
                      ]}
                    />
                  )}
                </div>

                <PdfField
                  label="Mode de paiement envisagé"
                  required
                  helper="Information seulement : aucun paiement en ligne. Les modalités sont communiquées à la confirmation."
                  error={fieldErrors.modePaiement}
                >
                  <PdfRadioGroup
                    name="aca_paiement"
                    value={formState.modePaiement}
                    onChange={(val) => updateField('modePaiement', val)}
                    options={[
                      'Mobile Money (M-Pesa, Airtel Money, Orange Money)',
                      'Espèces au bureau',
                      'Virement bancaire',
                    ]}
                    tone="academie"
                  />
                </PdfField>

                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={formState.acceptReglement}
                        onChange={(e) => updateField('acceptReglement', e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#1E293B]"
                      />
                      <span>
                        J'ai lu et j'accepte le règlement de la Lomakrev Académie. <span className="text-[#D90A14]">*</span>
                      </span>
                    </label>
                    {fieldErrors.acceptReglement && <p className="mt-1 pl-6 text-xs font-medium text-[#D90A14]">{fieldErrors.acceptReglement}</p>}
                  </div>

                  <div>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={formState.consent}
                        onChange={(e) => updateField('consent', e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#1E293B]"
                      />
                      <span>
                        J'accepte que Lomakrev Group traite mes données pour gérer mon inscription. <span className="text-[#D90A14]">*</span>
                      </span>
                    </label>
                    {fieldErrors.consent && <p className="mt-1 pl-6 text-xs font-medium text-[#D90A14]">{fieldErrors.consent}</p>}
                  </div>

                  <div>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={formState.consentMessages}
                        onChange={(e) => updateField('consentMessages', e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#1E293B]"
                      />
                      <span>
                        J'accepte de recevoir des messages (SMS, WhatsApp, e-mail) au sujet de ma formation. <span className="text-[#D90A14]">*</span>
                      </span>
                    </label>
                    {fieldErrors.consentMessages && <p className="mt-1 pl-6 text-xs font-medium text-[#D90A14]">{fieldErrors.consentMessages}</p>}
                  </div>
                </div>

                {fieldErrors.submit && <p className="text-sm font-medium text-[#D90A14]">{fieldErrors.submit}</p>}
              </PdfStepCard>
            )}

            <PdfFormActions
              canGoBack={activeStepKey !== '1'}
              onBack={handleBack}
              showSaveDraft={!enteredByAgent}
              onSaveDraft={handleSaveDraft}
              isLastStep={activeStepKey === '4'}
              onNext={validateAndNext}
              submitLabel="Envoyer mon inscription"
              submitting={submitting}
              submittingLabel="Envoi en cours..."
            />
          </form>
        </PdfFormShell>
      )}
    </div>
  );
};
