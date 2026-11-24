import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Calendar, CheckCircle2, ShieldAlert, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Breadcrumbs } from '../components/Layout';
import { PhotoFrame } from '../components/MotionPrimitives';
import {
  CustomFieldsRenderer,
  FileAttachmentPicker,
  RdcPhoneBox,
  RdcPhoneInput,
  ShareButton,
  SubmissionSuccessCard,
  validateRdcPhone,
  type AttachmentFile,
} from '../components/DynamicFormFields';
import {
  PdfCallout,
  PdfField,
  PdfFormActions,
  PdfFormShell,
  PdfRadioGroup,
  PdfStepCard,
  PdfSummarySection,
} from '../components/PdfFormKit';
import { formatDateFr } from '../lib/pdfPrint';
import { clearFormDraft, loadFormDraft, saveFormDraft } from '../lib/offlineSync';
import { KINSHASA_COMMUNES, RDC_PROVINCES } from '../lib/rdcGeo';
import { OfficeAwareSelect } from '../components/DualSelectInput';
import type { ScholarshipCampaign } from '../types/lomakrev';

export function isCampaignOpen(camp: ScholarshipCampaign): boolean {
  if (camp.statusOverride === 'closed') return false;
  if (camp.statusOverride === 'open') return true;
  const today = new Date().toISOString().slice(0, 10);
  return today >= camp.openDate && today <= camp.closeDate;
}

function calcAgeAt(dob: string, refDate: string): number {
  const b = new Date(dob);
  const t = new Date(refDate);
  if (Number.isNaN(b.getTime()) || Number.isNaN(t.getTime())) return -1;
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

export const BoursesHomePage: React.FC = () => {
  const { data, navigate } = useApp();
  if (!data) return null;

  const { settings, campaigns, photos } = data;
  const boursesPhotos = photos.filter((p) => p.pole === 'bourses' && p.consentVerified);
  const openCampaigns = campaigns.filter(isCampaignOpen);
  const closedCampaigns = campaigns.filter((c) => !isCampaignOpen(c));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumbs items={[{ label: 'Programme de Bourses' }]} />

      {/* Top pole card (family photo shown only when added by admin) */}
      <div className="overflow-hidden rounded-2xl border border-[#F4B400]/50 bg-white">
        {settings.boursesFamilyImageUrl && (
          <PhotoFrame
            src={settings.boursesFamilyImageUrl}
            alt="Photo de famille du Programme de Bourses LOMAKREV GROUP"
            aspectClass="aspect-[16/7]"
            priority
            caption="Photo de famille des lauréats et de l’équipe pédagogique LOMAKREV GROUP"
          />
        )}
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-8">
            <p className="text-xs font-bold uppercase tracking-wider text-[#D90A14]">Pôle 4 · Programme de Bourses</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl text-balance">
              Formations financées pour les jeunes et les clients de Lomakrev
            </h1>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Œuvre sociale de LOMAKREV GROUP : les candidatures se font exclusivement en ligne, sans dossier papier. Réservé aux personnes âgées de 18 ans et plus à la date de début de formation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
            {openCampaigns[0] && (
              <button
                type="button"
                onClick={() => navigate(`/bourses/postuler?campagne=${openCampaigns[0].slug}`)}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#D90A14] px-6 text-sm font-semibold text-white hover:bg-[#b80811]"
              >
                Postuler maintenant
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <ShareButton title="Programme de Bourses LOMAKREV GROUP — Candidature en ligne" />
          </div>
        </div>
      </div>

      {/* Rules Summary */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#F4B400]/40 bg-[#FFFDF5] p-5">
          <p className="font-mono-tabular text-xs font-bold text-[#D90A14]">01</p>
          <h2 className="mt-2 font-display text-base font-bold text-slate-900">18 ans révolus minimum</h2>
          <p className="mt-1 text-sm text-slate-600">Vérification automatique de l’âge dès la première étape et contrôle de la pièce d’identité par le comité.</p>
        </div>
        <div className="rounded-xl border border-[#F4B400]/40 bg-[#FFFDF5] p-5">
          <p className="font-mono-tabular text-xs font-bold text-[#D90A14]">02</p>
          <h2 className="mt-2 font-display text-base font-bold text-slate-900">100 % en ligne</h2>
          <p className="mt-1 text-sm text-slate-600">Aucun dossier papier accepté. Sauvegarde de brouillon possible et suivi public sur /suivi.</p>
        </div>
        <div className="rounded-xl border border-[#F4B400]/40 bg-[#FFFDF5] p-5">
          <p className="font-mono-tabular text-xs font-bold text-[#D90A14]">03</p>
          <h2 className="mt-2 font-display text-base font-bold text-slate-900">Sélection transparente</h2>
          <p className="mt-1 text-sm text-slate-600">Évaluation sur critères paramétrés et validation humaine par l’équipe Bourses & Direction.</p>
        </div>
      </div>

      {/* Open Campaigns */}
      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-slate-900">Campagnes ouvertes</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {openCampaigns.map((camp) => (
            <article key={camp.id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
              {camp.imageUrl && (
                <PhotoFrame src={camp.imageUrl} alt={camp.title} aspectClass="aspect-[16/9]" className="border-b border-slate-100" />
              )}
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-emerald-700">Inscriptions ouvertes</span>
                  <span aria-hidden="true">·</span>
                  <span>{camp.coverageRate}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{camp.places} places</span>
                </div>
                <h3 className="mt-2 font-display text-xl font-bold text-slate-900">{camp.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{camp.description}</p>
                <p className="mt-3 text-xs text-slate-500">
                  Clôture des candidatures : <strong className="text-slate-800">{formatDateFr(camp.closeDate)}</strong> · Début des cours :{' '}
                  <strong className="text-slate-800">{formatDateFr(camp.trainingStartDate)}</strong>
                </p>
                <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
                  <button
                    type="button"
                    onClick={() => navigate(`/bourses/campagnes/${camp.slug}`)}
                    className="rounded-lg border border-[#F4B400] bg-[#FFFBEB] py-2.5 text-sm font-semibold text-[#78350F] hover:bg-[#FEF3C7]"
                  >
                    Détails & critères
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/bourses/postuler?campagne=${camp.slug}`)}
                    className="rounded-lg bg-[#D90A14] py-2.5 text-sm font-semibold text-white hover:bg-[#b80811]"
                  >
                    Postuler
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Closed / Past Editions */}
      {closedCampaigns.length > 0 && (
        <div className="mt-14 border-t border-slate-200 pt-10">
          <h2 className="font-display text-xl font-bold text-slate-900">Éditions précédentes & archives</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {closedCampaigns.map((camp) => (
              <div key={camp.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Clôturée le {formatDateFr(camp.closeDate)}</p>
                  <p className="mt-1 font-display text-base font-bold text-slate-900">{camp.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/bourses/campagnes/${camp.slug}`)}
                  className="w-fit rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                >
                  Consulter
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gallery per edition */}
      {boursesPhotos.length > 0 && (
        <div className="mt-14 border-t border-slate-200 pt-10">
          <h2 className="font-display text-xl font-bold text-slate-900">Galerie des éditions</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {boursesPhotos.map((ph) => (
              <PhotoFrame key={ph.id} src={ph.url} alt={ph.caption} aspectClass="aspect-[16/10]" className="rounded-xl border border-slate-200" caption={`${ph.edition ? `${ph.edition} · ` : ''}${ph.caption}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const BourseCampaignDetailPage: React.FC<{ slug: string }> = ({ slug }) => {
  const { data, navigate } = useApp();
  if (!data) return null;
  const camp = data.campaigns.find((c) => c.slug === slug);

  if (!camp) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Campagne introuvable</h1>
        <button type="button" onClick={() => navigate('/bourses')} className="mt-4 rounded-lg bg-[#D90A14] px-5 py-2.5 text-sm font-semibold text-white">
          Voir les campagnes de bourses
        </button>
      </div>
    );
  }

  const open = isCampaignOpen(camp);
  const nextOpen = data.campaigns.find((c) => c.slug !== camp.slug && isCampaignOpen(c));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumbs items={[{ label: 'Programme de Bourses', to: '/bourses' }, { label: camp.title }]} />

      {!open && (
        <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
              <div>
                <p className="font-bold text-amber-950">Candidatures clôturées le {formatDateFr(camp.closeDate)}</p>
                <p className="mt-1 text-sm text-amber-900">
                  Cette campagne n’accepte plus de nouvelles candidatures. {nextOpen ? 'Une autre campagne est actuellement ouverte.' : ''}
                </p>
              </div>
            </div>
            {nextOpen && (
              <button
                type="button"
                onClick={() => navigate(`/bourses/campagnes/${nextOpen.slug}`)}
                className="rounded-lg bg-[#D90A14] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B80811]"
              >
                Voir : {nextOpen.title}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#F4B400]/50 bg-white">
        {camp.imageUrl && (
          <PhotoFrame src={camp.imageUrl} alt={camp.title} aspectClass="aspect-[16/7]" priority />
        )}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#D90A14]">{camp.subtitle}</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900">{camp.title}</h1>
            </div>
            <ShareButton title={`${camp.title} — Programme de Bourses Lomakrev`} />
          </div>

          <p className="mt-4 text-base leading-relaxed text-slate-600">{camp.description}</p>

          <div className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-200 py-5 md:grid-cols-4 text-sm">
            <div>
              <span className="flex items-center gap-1.5 text-xs text-slate-500"><Users className="h-3.5 w-3.5" /> Places</span>
              <span className="mt-1 block font-mono-tabular font-bold text-slate-900">{camp.places}</span>
            </div>
            <div>
              <span className="flex items-center gap-1.5 text-xs text-slate-500"><CheckCircle2 className="h-3.5 w-3.5" /> Financement</span>
              <span className="mt-1 block font-bold text-slate-900">{camp.coverageRate}</span>
            </div>
            <div>
              <span className="flex items-center gap-1.5 text-xs text-slate-500"><Calendar className="h-3.5 w-3.5" /> Clôture</span>
              <span className="mt-1 block font-bold text-slate-900">{formatDateFr(camp.closeDate)}</span>
            </div>
            <div>
              <span className="flex items-center gap-1.5 text-xs text-slate-500"><Calendar className="h-3.5 w-3.5" /> Début formation</span>
              <span className="mt-1 block font-bold text-slate-900">{formatDateFr(camp.trainingStartDate)}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">Formations incluses</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                {camp.formations.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">Pièces demandées</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                {camp.requiredDocuments.map((d) => (
                  <li key={d} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-500" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {open && (
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate(`/bourses/postuler?campagne=${camp.slug}`)}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#D90A14] px-6 text-sm font-semibold text-white hover:bg-[#b80811]"
              >
                Postuler à cette campagne
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const BoursePostulerPage: React.FC<{ enteredByAgent?: string | null; onDone?: () => void }> = ({
  enteredByAgent = null,
  onDone,
}) => {
  const { data, searchQuery, submitForm, navigate, pushToast } = useApp();
  const params = new URLSearchParams(searchQuery);
  const initialCampaign = params.get('campagne') || '';
  const draftParam = params.get('draft') || '';

  const [step, setStep] = useState(1);
  const [ageBlocked, setAgeBlocked] = useState<string | null>(null);
  const [idFiles, setIdFiles] = useState<AttachmentFile[]>([]);
  const [cvFiles, setCvFiles] = useState<AttachmentFile[]>([]);
  const [resumeLink, setResumeLink] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formState, setFormState] = useState<Record<string, any>>({
    campaignSlug: initialCampaign || 'excel-avance-2027',
    formationChoisie: '',
    dateNaissance: '',
    disponibilite: '',
    nom: '',
    postnom: '',
    prenom: '',
    sexe: '',
    phone: '+243',
    whatsapp: '+243',
    sameWhatsapp: true,
    email: '',
    province: 'Kinshasa',
    ville: 'Kinshasa',
    commune: '',
    communeAutre: '',
    adresse: '',
    niveauEtudes: '',
    etablissement: '',
    situation: '',
    clientLomakrev: '',
    numeroFacture: '',
    accesOrdinateur: '',
    niveauInfo: '',
    source: '',
    motivation: '',
    projetPro: '',
    declarationHonneur: false,
    consent: false,
    consentMessages: false,
    _website: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

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
      loadFormDraft('bourses').then((saved) => {
        if (saved) {
          setFormState((prev) => ({
            ...prev,
            ...saved,
            campaignSlug: initialCampaign || (saved.campaignSlug as string) || prev.campaignSlug,
          }));
        }
      });
    }
  }, [draftParam, enteredByAgent, initialCampaign, pushToast]);

  if (!data) return null;
  const openCampaigns = data.campaigns.filter(isCampaignOpen);
  const campaign = data.campaigns.find((c) => c.slug === formState.campaignSlug) || openCampaigns[0] || data.campaigns[0];
  const customFields = data.forms.bourses?.customFields || [];
  const formationOptions = campaign?.formations?.length ? campaign.formations : ['Excel avancée'];
  const selectedFormation = formState.formationChoisie || formationOptions[0] || '';
  const resolvedCommune =
    formState.province === 'Kinshasa'
      ? formState.commune === 'Autre'
        ? formState.communeAutre
        : formState.commune
      : formState.commune;

  const updateField = (k: string, v: any) => {
    setFieldErrors((prev) => {
      if (!prev[k]) return prev;
      const copy = { ...prev };
      delete copy[k];
      return copy;
    });
    setFormState((prev) => {
      const next = { ...prev, [k]: v };
      if (!enteredByAgent) saveFormDraft('bourses', next);
      return next;
    });
  };

  if (campaign && !isCampaignOpen(campaign)) {
    const nextOpen = openCampaigns[0];
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Breadcrumbs items={[{ label: 'Programme de Bourses', to: '/bourses' }, { label: 'Candidature' }]} />
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold text-amber-950">Candidatures clôturées le {formatDateFr(campaign.closeDate)}</h1>
          <p className="mt-2 text-sm leading-relaxed text-amber-900">
            Les candidatures pour « {campaign.title} » sont fermées. Vous pouvez consulter nos autres campagnes ouvertes ou la liste d’intérêt Académie 2027.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {nextOpen && (
              <button
                type="button"
                onClick={() => navigate(`/bourses/postuler?campagne=${nextOpen.slug}`)}
                className="rounded-lg bg-[#D90A14] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Postuler à : {nextOpen.title}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/bourses')}
              className="rounded-lg border border-amber-400 bg-white px-5 py-2.5 text-sm font-semibold text-amber-950"
            >
              Retour aux bourses
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveDraft = async () => {
    await saveFormDraft('bourses', formState);
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/public/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: draftParam || undefined, formKey: 'bourses', data: formState }),
        });
        const json = await res.json();
        if (json.resumeUrl) {
          const full = `${window.location.origin}${json.resumeUrl}`;
          setResumeLink(full);
          pushToast('success', 'Brouillon enregistré. Lien de reprise prêt.');
          return;
        }
      } catch {
        // fallback local only
      }
    }
    pushToast('success', 'Brouillon sauvegardé sur cet appareil.');
  };

  const validateStep = (targetStep: number): boolean => {
    const errs: Record<string, string> = {};
    if (targetStep === 1) {
      if (!selectedFormation) errs.formationChoisie = 'Veuillez choisir la formation souhaitée.';
      if (!formState.dateNaissance) {
        errs.dateNaissance = 'Veuillez saisir votre date de naissance.';
      } else {
        const age = calcAgeAt(formState.dateNaissance, campaign.trainingStartDate);
        if (age < 0) {
          errs.dateNaissance = 'Date de naissance invalide.';
        } else if (age < (campaign.minAge || 18)) {
          // Strict rule: stop immediately and store NOTHING!
          clearFormDraft('bourses');
          setAgeBlocked(`Ce programme est réservé aux personnes âgées de ${campaign.minAge || 18} ans et plus. Merci de votre intérêt.`);
          return false;
        }
      }
      if (!formState.disponibilite) errs.disponibilite = 'Veuillez indiquer votre disponibilité.';
    }

    if (targetStep === 2) {
      if (!formState.nom.trim()) errs.nom = 'Veuillez indiquer votre nom.';
      if (!formState.postnom.trim()) errs.postnom = 'Veuillez indiquer votre postnom.';
      if (!formState.prenom.trim()) errs.prenom = 'Veuillez indiquer votre prénom.';
      if (!formState.sexe) errs.sexe = 'Veuillez sélectionner votre sexe.';
      if (!validateRdcPhone(formState.phone)) errs.phone = 'Format requis : +243 suivi de 9 chiffres.';
      if (!formState.sameWhatsapp && formState.whatsapp && formState.whatsapp !== '+243' && !validateRdcPhone(formState.whatsapp)) {
        errs.whatsapp = 'Format WhatsApp requis : +243 suivi de 9 chiffres.';
      }
      if (!formState.province.trim()) errs.province = 'Veuillez choisir votre province.';
      if (!formState.ville.trim()) errs.ville = 'Veuillez indiquer votre ville.';
      if (!resolvedCommune.trim()) errs.commune = 'Veuillez choisir ou saisir votre commune.';
    }

    if (targetStep === 3) {
      if (!formState.niveauEtudes) errs.niveauEtudes = 'Veuillez choisir votre niveau d’études.';
      if (!formState.situation) errs.situation = 'Veuillez indiquer votre situation actuelle.';
      if (!formState.clientLomakrev) errs.clientLomakrev = 'Veuillez répondre à cette question.';
      if (!formState.accesOrdinateur) errs.accesOrdinateur = 'Veuillez indiquer votre accès à un ordinateur.';
      if (!formState.niveauInfo) errs.niveauInfo = 'Veuillez sélectionner votre niveau en informatique.';
    }

    if (targetStep === 4) {
      if (!formState.motivation.trim()) errs.motivation = 'Veuillez expliquer votre motivation.';
      if (!formState.projetPro.trim()) errs.projetPro = 'Veuillez préciser ce que vous ferez après la formation.';
      if (idFiles.length === 0) {
        errs.idFiles = 'La pièce d’identité (carte d’électeur, passeport ou carte d’étudiant) est obligatoire.';
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(5, s + 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!formState.declarationHonneur) errs.declarationHonneur = 'Veuillez certifier l’exactitude des informations.';
    if (!formState.consent) errs.consent = 'Veuillez accepter le traitement de vos données.';
    if (!formState.consentMessages) errs.consentMessages = 'Veuillez accepter de recevoir les messages de suivi.';
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    const allAttachments = [...idFiles, ...cvFiles];
    const res = await submitForm(
      'BRS',
      `Bourse ${campaign.title} — ${formState.prenom} ${formState.nom}`,
      {
        applicantName: `${formState.prenom} ${formState.nom} ${formState.postnom}`.trim(),
        phone: formState.phone,
        whatsapp: formState.sameWhatsapp ? formState.phone : formState.whatsapp,
        email: formState.email,
        commune: resolvedCommune,
        ville: formState.ville,
        campaignSlug: campaign.slug,
        formationSlug: selectedFormation,
        attachments: allAttachments,
        _website: formState._website,
        payload: {
          ...formState,
          commune: resolvedCommune,
          formationChoisie: selectedFormation,
        },
      },
      enteredByAgent
    );
    setSubmitting(false);

    if (res.ageRejected) {
      clearFormDraft('bourses');
      setAgeBlocked(res.error || 'Ce programme est réservé aux personnes âgées de 18 ans et plus. Merci de votre intérêt.');
      return;
    }
    if (!res.ok) {
      setFieldErrors({ submit: res.error || 'Erreur lors de la soumission.' });
      return;
    }
    if (!enteredByAgent) clearFormDraft('bourses');
    setResult(res);
  };

  if (ageBlocked) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl border border-red-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-8 w-8 shrink-0 text-[#D90A14]" />
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">Condition d’âge non remplie</h1>
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50/80 p-4 text-sm font-medium text-red-900">
                « {ageBlocked} »
              </div>
              <p className="mt-2 text-xs text-slate-500">Le formulaire s’arrête ; aucune donnée n’est enregistrée.</p>
              <button
                type="button"
                onClick={() => navigate('/bourses')}
                className="mt-5 rounded-lg bg-[#D90A14] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B80811]"
              >
                Retour au Programme de Bourses
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = (hasErr?: boolean) =>
    `w-full rounded-lg border px-3.5 py-2.5 text-sm sm:text-base outline-none transition-colors ${
      hasErr ? 'border-[#D90A14] bg-red-50/30' : 'border-slate-300 bg-white focus:border-[#D90A14]'
    }`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
      {!enteredByAgent && <Breadcrumbs items={[{ label: 'Programme de Bourses', to: '/bourses' }, { label: 'Candidature' }]} />}

      {result ? (
        <SubmissionSuccessCard
          offline={result.offline}
          localId={result.localId}
          dossier={result.dossier}
          title="Candidature bien reçue"
          bulletPoints={[
            'Votre candidature sera étudiée selon les critères du programme.',
            'Vous serez informé(e) par SMS ou WhatsApp à chaque étape.',
            'Suivez votre dossier sur lomakrev.com/suivi avec ce numéro et votre téléphone.',
          ]}
          smsPreview={
            result.dossier?.autoMessage ||
            `LOMAKREV : candidature ${result.dossier?.reference} (${selectedFormation}) bien reçue. Suivi : lomakrev.com/suivi. Ce message ne vaut pas attribution de bourse.`
          }
          onReset={() => {
            setResult(null);
            if (onDone) onDone();
            else navigate('/bourses');
          }}
        />
      ) : (
        <PdfFormShell
          tone="bourses"
          poleLabel="PROGRAMME DE BOURSES"
          title="Candidature au Programme de Bourses"
          urlHint="lomakrev.com/bourses/postuler?campagne=…"
          refPreview="BRS-AAAA-00000"
          introText="Programme réservé aux personnes âgées de 18 ans et plus. Durée : environ 8 minutes. Préparez votre pièce d'identité (photo ou PDF). Vous pouvez enregistrer et reprendre plus tard."
          steps={[
            { key: 1, num: '1', label: 'Éligibilité' },
            { key: 2, num: '2', label: 'Identité' },
            { key: 3, num: '3', label: 'Situation' },
            { key: 4, num: '4', label: 'Motivation' },
            { key: 5, num: '5', label: 'Envoi' },
          ]}
          activeStepIndex={step - 1}
          onStepClick={(idx) => setStep(idx + 1)}
          enteredByAgent={enteredByAgent}
          resumeLink={resumeLink}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={formState._website} onChange={(e) => updateField('_website', e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" />

            {step === 1 && (
              <PdfStepCard
                tone="bourses"
                stepNum="1"
                title="Éligibilité"
                subtitle="Vérification immédiate des conditions de base"
                stepMeta="Étape 1 sur 5"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <PdfField label="Campagne" required helper="Préremplie par le lien partagé ; modifiable.">
                    <OfficeAwareSelect
                      officeMode={Boolean(enteredByAgent)}
                      fieldKey="office_bourse_campaign"
                      value={formState.campaignSlug}
                      onChange={(val) => {
                        updateField('campaignSlug', val);
                        updateField('formationChoisie', '');
                      }}
                      options={openCampaigns.map((c) => ({ value: c.slug, label: c.title }))}
                      className={inputClass(false)}
                    />
                  </PdfField>

                  <PdfField label="Formation souhaitée" required error={fieldErrors.formationChoisie}>
                    <PdfRadioGroup
                      name="brs_formation"
                      value={selectedFormation}
                      onChange={(val) => updateField('formationChoisie', val)}
                      options={formationOptions}
                      tone="bourses"
                    />
                  </PdfField>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <PdfField
                    label="Date de naissance"
                    required
                    helper={`Contrôle ${campaign.minAge || 18} ans révolus au début de formation (${formatDateFr(campaign.trainingStartDate)}).`}
                    error={fieldErrors.dateNaissance}
                  >
                    <input
                      type="date"
                      value={formState.dateNaissance}
                      onChange={(e) => updateField('dateNaissance', e.target.value)}
                      className={inputClass(Boolean(fieldErrors.dateNaissance))}
                    />
                  </PdfField>

                  <PdfField label="Serez-vous disponible aux dates de la formation ?" required error={fieldErrors.disponibilite}>
                    <PdfRadioGroup
                      name="brs_disponibilite"
                      value={formState.disponibilite}
                      onChange={(val) => updateField('disponibilite', val)}
                      options={['Oui', 'Non']}
                      tone="bourses"
                    />
                  </PdfField>
                </div>

                <CustomFieldsRenderer fields={customFields} step={1} values={formState} onChange={updateField} officeMode={Boolean(enteredByAgent)} />
              </PdfStepCard>
            )}

            {step === 2 && (
              <PdfStepCard tone="bourses" stepNum="2" title="Identité et contact" stepMeta="Étape 2 sur 5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <PdfField label="Nom" required error={fieldErrors.nom}>
                    <input
                      type="text"
                      placeholder="Ex. : MBUYI"
                      value={formState.nom}
                      onChange={(e) => updateField('nom', e.target.value)}
                      className={inputClass(Boolean(fieldErrors.nom))}
                    />
                  </PdfField>
                  <PdfField label="Postnom" required error={fieldErrors.postnom}>
                    <input
                      type="text"
                      placeholder="Ex. : KABANGA"
                      value={formState.postnom}
                      onChange={(e) => updateField('postnom', e.target.value)}
                      className={inputClass(Boolean(fieldErrors.postnom))}
                    />
                  </PdfField>
                  <PdfField label="Prénom" required error={fieldErrors.prenom}>
                    <input
                      type="text"
                      placeholder="Ex. : Grâce"
                      value={formState.prenom}
                      onChange={(e) => updateField('prenom', e.target.value)}
                      className={inputClass(Boolean(fieldErrors.prenom))}
                    />
                  </PdfField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField label="Sexe" required error={fieldErrors.sexe}>
                    <PdfRadioGroup
                      name="brs_sexe"
                      value={formState.sexe}
                      onChange={(val) => updateField('sexe', val)}
                      options={['Femme', 'Homme']}
                      tone="bourses"
                    />
                  </PdfField>

                  <RdcPhoneInput
                    label="Téléphone"
                    phone={formState.phone}
                    onPhoneChange={(v) => updateField('phone', v)}
                    whatsapp={formState.whatsapp}
                    onWhatsappChange={(v) => updateField('whatsapp', v)}
                    sameForWhatsapp={formState.sameWhatsapp}
                    onSameChange={(v) => updateField('sameWhatsapp', v)}
                    error={fieldErrors.phone}
                    showWhatsappOption={false}
                  />
                </div>

                <div className="max-w-md">
                  <PdfField label="Numéro WhatsApp" error={fieldErrors.whatsapp}>
                    <RdcPhoneBox
                      value={formState.sameWhatsapp ? formState.phone : formState.whatsapp}
                      onChange={(val) => updateField('whatsapp', val)}
                      disabled={formState.sameWhatsapp}
                      hasError={Boolean(fieldErrors.whatsapp)}
                      autoComplete="off"
                    />
                    <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-slate-600 select-none">
                      <input
                        type="checkbox"
                        checked={formState.sameWhatsapp}
                        onChange={(e) => {
                          updateField('sameWhatsapp', e.target.checked);
                          if (e.target.checked) updateField('whatsapp', formState.phone);
                        }}
                        className="h-3.5 w-3.5 rounded border-slate-300 accent-[#D90A14]"
                      />
                      <span>Même numéro que le téléphone</span>
                    </label>
                  </PdfField>
                </div>

                <PdfField label="Adresse e-mail" helper="Facultatif, mais recommandé pour recevoir les documents.">
                  <input
                    type="email"
                    placeholder="exemple@gmail.com"
                    value={formState.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className={inputClass(false)}
                  />
                </PdfField>

                <div className="grid gap-4 sm:grid-cols-3">
                  <PdfField label="Province" required error={fieldErrors.province}>
                    <OfficeAwareSelect
                      officeMode={Boolean(enteredByAgent)}
                      fieldKey="office_rdc_province"
                      value={formState.province}
                      onChange={(val) => {
                        updateField('province', val);
                        updateField('commune', '');
                      }}
                      options={RDC_PROVINCES}
                      className={inputClass(Boolean(fieldErrors.province))}
                    />
                  </PdfField>

                  <PdfField label="Ville" required error={fieldErrors.ville}>
                    <input
                      type="text"
                      placeholder="Ex. : Kinshasa"
                      value={formState.ville}
                      onChange={(e) => updateField('ville', e.target.value)}
                      className={inputClass(Boolean(fieldErrors.ville))}
                    />
                  </PdfField>

                  <PdfField label="Commune" required error={fieldErrors.commune}>
                    {formState.province === 'Kinshasa' ? (
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
                    ) : (
                      <input
                        type="text"
                        placeholder="Votre commune / territoire"
                        value={formState.commune}
                        onChange={(e) => updateField('commune', e.target.value)}
                        className={inputClass(Boolean(fieldErrors.commune))}
                      />
                    )}
                  </PdfField>
                </div>

                <PdfField label="Adresse (quartier, avenue, numéro)">
                  <input
                    type="text"
                    placeholder="Facultatif"
                    value={formState.adresse}
                    onChange={(e) => updateField('adresse', e.target.value)}
                    className={inputClass(false)}
                  />
                </PdfField>

                <CustomFieldsRenderer fields={customFields} step={2} values={formState} onChange={updateField} officeMode={Boolean(enteredByAgent)} />
              </PdfStepCard>
            )}

            {step === 3 && (
              <PdfStepCard
                tone="bourses"
                stepNum="3"
                title="Situation"
                subtitle="Ces réponses servent au calcul automatique du score"
                stepMeta="Étape 3 sur 5"
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

                  <PdfField label="Établissement ou filière">
                    <input
                      type="text"
                      placeholder="Ex. : UNIKIN — Informatique"
                      value={formState.etablissement}
                      onChange={(e) => updateField('etablissement', e.target.value)}
                      className={inputClass(false)}
                    />
                  </PdfField>
                </div>

                <PdfField label="Situation actuelle" required error={fieldErrors.situation}>
                  <PdfRadioGroup
                    name="brs_situation"
                    value={formState.situation}
                    onChange={(val) => updateField('situation', val)}
                    options={['Étudiant(e)', 'Sans emploi', 'Salarié(e)', 'Entrepreneur(e)', 'Autre']}
                    tone="bourses"
                  />
                </PdfField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField label="Êtes-vous déjà client de Lomakrev ?" required error={fieldErrors.clientLomakrev}>
                    <PdfRadioGroup
                      name="brs_client"
                      value={formState.clientLomakrev}
                      onChange={(val) => updateField('clientLomakrev', val)}
                      options={['Oui', 'Non']}
                      tone="bourses"
                    />
                  </PdfField>

                  {formState.clientLomakrev === 'Oui' && (
                    <PdfField label="N° de facture ou de commande">
                      <input
                        type="text"
                        placeholder="Ex. : CMD-2026-00412"
                        value={formState.numeroFacture}
                        onChange={(e) => updateField('numeroFacture', e.target.value)}
                        className={inputClass(false)}
                      />
                    </PdfField>
                  )}
                </div>

                <PdfField label="Avez-vous accès à un ordinateur ?" required error={fieldErrors.accesOrdinateur}>
                  <PdfRadioGroup
                    name="brs_acces_pc"
                    value={formState.accesOrdinateur}
                    onChange={(val) => updateField('accesOrdinateur', val)}
                    options={['Oui, personnel', 'Oui, partagé', 'Non']}
                    tone="bourses"
                  />
                </PdfField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField label="Votre niveau en informatique" required error={fieldErrors.niveauInfo}>
                    <PdfRadioGroup
                      name="brs_niveau_info"
                      value={formState.niveauInfo}
                      onChange={(val) => updateField('niveauInfo', val)}
                      options={['Débutant', 'Intermédiaire', 'Avancé']}
                      tone="bourses"
                    />
                  </PdfField>

                  <PdfField label="Comment avez-vous connu le programme ?">
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
                </div>

                <CustomFieldsRenderer fields={customFields} step={3} values={formState} onChange={updateField} officeMode={Boolean(enteredByAgent)} />
              </PdfStepCard>
            )}

            {step === 4 && (
              <PdfStepCard tone="bourses" stepNum="4" title="Motivation et pièces jointes" stepMeta="Étape 4 sur 5">
                <PdfField
                  label="Pourquoi souhaitez-vous suivre cette formation ?"
                  required
                  error={fieldErrors.motivation}
                >
                  <div className="relative">
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={formState.motivation}
                      onChange={(e) => updateField('motivation', e.target.value)}
                      placeholder="Expliquez en quelques phrases…"
                      className={inputClass(Boolean(fieldErrors.motivation))}
                    />
                    <p className="mt-1 text-right font-mono-tabular text-[11px] text-slate-400">
                      {formState.motivation.length} / 500 caractères
                    </p>
                  </div>
                </PdfField>

                <PdfField
                  label="Que ferez-vous après la formation ?"
                  required
                  error={fieldErrors.projetPro}
                >
                  <div className="relative">
                    <textarea
                      rows={3}
                      maxLength={300}
                      value={formState.projetPro}
                      onChange={(e) => updateField('projetPro', e.target.value)}
                      placeholder="Votre projet professionnel ou personnel…"
                      className={inputClass(Boolean(fieldErrors.projetPro))}
                    />
                    <p className="mt-1 text-right font-mono-tabular text-[11px] text-slate-400">
                      {formState.projetPro.length} / 300 caractères
                    </p>
                  </div>
                </PdfField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FileAttachmentPicker
                    label="Pièce d'identité"
                    required
                    maxFiles={1}
                    maxSizeMb={5}
                    accept=".jpg,.jpeg,.png,.pdf"
                    helperText="Carte d'électeur, passeport ou carte d'étudiant — JPG, PNG ou PDF, 5 Mo max."
                    files={idFiles}
                    onChange={(files) => {
                      setIdFiles(files);
                      if (files.length > 0) {
                        setFieldErrors((p) => {
                          const c = { ...p };
                          delete c.idFiles;
                          return c;
                        });
                      }
                    }}
                    error={fieldErrors.idFiles}
                  />

                  <FileAttachmentPicker
                    label="CV ou autre document"
                    maxFiles={1}
                    maxSizeMb={5}
                    accept=".pdf,.jpg,.jpeg,.png"
                    helperText="Selon la campagne — PDF, 5 Mo max."
                    files={cvFiles}
                    onChange={setCvFiles}
                  />
                </div>

                <CustomFieldsRenderer fields={customFields} step={4} values={formState} onChange={updateField} />
              </PdfStepCard>
            )}

            {step === 5 && (
              <PdfStepCard tone="bourses" stepNum="5" title="Vérification et envoi" stepMeta="Étape 5 sur 5">
                <div className="space-y-3">
                  <PdfSummarySection
                    title="1 · Éligibilité"
                    onEdit={() => setStep(1)}
                    items={[
                      { label: 'Campagne', value: campaign.title },
                      { label: 'Formation souhaitée', value: selectedFormation },
                      { label: 'Date de naissance', value: formState.dateNaissance ? formatDateFr(formState.dateNaissance) : '—' },
                      { label: 'Disponible aux dates', value: formState.disponibilite },
                    ]}
                  />
                  <PdfSummarySection
                    title="2 · Identité et contact"
                    onEdit={() => setStep(2)}
                    items={[
                      { label: 'Nom complet', value: `${formState.nom} ${formState.postnom} ${formState.prenom}`.trim() },
                      { label: 'Sexe', value: formState.sexe },
                      { label: 'Téléphone / WhatsApp', value: `${formState.phone} (WA : ${formState.sameWhatsapp ? formState.phone : formState.whatsapp})` },
                      { label: 'Localisation', value: `${resolvedCommune}, ${formState.ville} (${formState.province})` },
                    ]}
                  />
                  <PdfSummarySection
                    title="3 · Situation"
                    onEdit={() => setStep(3)}
                    items={[
                      { label: 'Niveau d’études', value: formState.niveauEtudes },
                      { label: 'Situation actuelle', value: formState.situation },
                      { label: 'Accès ordinateur', value: formState.accesOrdinateur },
                      { label: 'Client Lomakrev', value: formState.clientLomakrev === 'Oui' && formState.numeroFacture ? `Oui (${formState.numeroFacture})` : formState.clientLomakrev },
                    ]}
                  />
                  <PdfSummarySection
                    title="4 · Motivation et pièces jointes"
                    onEdit={() => setStep(4)}
                    items={[
                      { label: 'Pièce d’identité', value: idFiles[0]?.name || '—' },
                      { label: 'CV / autre document', value: cvFiles[0]?.name || 'Non fourni' },
                    ]}
                  />
                </div>

                <div className="space-y-2.5 pt-2">
                  <div>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={formState.declarationHonneur}
                        onChange={(e) => updateField('declarationHonneur', e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#D90A14]"
                      />
                      <span>
                        Je certifie sur l'honneur que les informations fournies sont exactes. <span className="text-[#D90A14]">*</span>
                      </span>
                    </label>
                    {fieldErrors.declarationHonneur && <p className="mt-1 pl-6 text-xs font-medium text-[#D90A14]">{fieldErrors.declarationHonneur}</p>}
                  </div>

                  <div>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={formState.consent}
                        onChange={(e) => updateField('consent', e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#D90A14]"
                      />
                      <span>
                        J'accepte que Lomakrev Group traite mes données pour étudier ma candidature, conformément à la politique de confidentialité.{' '}
                        <span className="text-[#D90A14]">*</span>
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
                        className="mt-0.5 h-4 w-4 accent-[#D90A14]"
                      />
                      <span>
                        J'accepte de recevoir des messages (SMS, WhatsApp, e-mail) au sujet de ma candidature. <span className="text-[#D90A14]">*</span>
                      </span>
                    </label>
                    {fieldErrors.consentMessages && <p className="mt-1 pl-6 text-xs font-medium text-[#D90A14]">{fieldErrors.consentMessages}</p>}
                  </div>
                </div>

                <PdfCallout title="Mention affichée avant l'envoi">
                  L'envoi de ce formulaire ne garantit pas l'attribution d'une bourse. Les candidatures sont étudiées selon les critères du programme et dans la limite des places disponibles.
                </PdfCallout>

                {fieldErrors.submit && <p className="text-sm font-medium text-[#D90A14]">{fieldErrors.submit}</p>}
              </PdfStepCard>
            )}

            <PdfFormActions
              canGoBack={step > 1}
              onBack={() => setStep((s) => s - 1)}
              showSaveDraft={!enteredByAgent}
              onSaveDraft={handleSaveDraft}
              isLastStep={step === 5}
              onNext={handleNextStep}
              submitLabel="Envoyer ma candidature"
              submitting={submitting}
              submittingLabel="Envoi en cours..."
            />
          </form>
        </PdfFormShell>
      )}
    </div>
  );
};
