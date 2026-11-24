import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Bookmark, Calendar, CheckCircle2, ShieldAlert, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Breadcrumbs } from '../components/Layout';
import { PhotoFrame } from '../components/MotionPrimitives';
import {
  CustomFieldsRenderer,
  FileAttachmentPicker,
  RdcPhoneInput,
  ShareButton,
  SubmissionSuccessCard,
  validateRdcPhone,
  type AttachmentFile,
} from '../components/DynamicFormFields';
import { formatDateFr } from '../lib/pdfPrint';
import { clearFormDraft, loadFormDraft, saveFormDraft } from '../lib/offlineSync';
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

      {/* Prominent 1st Edition Family Photo at top of pole page */}
      <div className="overflow-hidden rounded-2xl border border-[#F4B400]/50 bg-white">
        <PhotoFrame
          src={settings.boursesFamilyImageUrl}
          alt="Photo de famille de la première édition du Programme de Bourses LOMAKREV GROUP"
          aspectClass="aspect-[16/7]"
          priority
          caption="Première édition — Photo de famille des lauréats et de l’équipe pédagogique LOMAKREV GROUP"
        />
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
              <PhotoFrame src={camp.imageUrl} alt={camp.title} aspectClass="aspect-[16/9]" className="border-b border-slate-100" />
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
        <PhotoFrame src={camp.imageUrl} alt={camp.title} aspectClass="aspect-[16/7]" priority />
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
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [resumeLink, setResumeLink] = useState<string>('');
  const [formState, setFormState] = useState<Record<string, any>>({
    campaignSlug: initialCampaign || 'excel-avance-2027',
    formationChoisie: '',
    dateNaissance: '',
    disponibilite: 'Oui',
    nom: '',
    postnom: '',
    prenom: '',
    sexe: 'Masculin',
    phone: '+243',
    whatsapp: '+243',
    sameWhatsapp: true,
    email: '',
    commune: '',
    ville: 'Kinshasa',
    province: 'Kinshasa',
    niveauEtudes: 'Graduat / Licence',
    etablissement: '',
    situation: 'Étudiant',
    clientLomakrev: 'Non',
    accesOrdinateur: 'Non',
    niveauInfo: 'Débutant',
    motivation: '',
    projetPro: '',
    declarationHonneur: false,
    consent: false,
    _website: '',
  });
  const [error, setError] = useState('');
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

  const updateField = (k: string, v: any) => {
    setFormState((prev) => {
      const next = { ...prev, [k]: v };
      if (!enteredByAgent) saveFormDraft('bourses', next);
      return next;
    });
  };

  // Closed campaign check
  if (campaign && !isCampaignOpen(campaign)) {
    const nextOpen = openCampaigns[0];
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Breadcrumbs items={[{ label: 'Programme de Bourses', to: '/bourses' }, { label: 'Candidature' }]} />
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold text-amber-950">Candidatures clôturées le {formatDateFr(campaign.closeDate)}</h1>
          <p className="mt-2 text-sm leading-relaxed text-amber-900">
            Les candidatures pour « {campaign.title} » sont fermées. Aucune page d’erreur : vous pouvez consulter nos autres campagnes ouvertes ou la liste d’intérêt Académie 2027.
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

  const handleNextStep = () => {
    setError('');
    if (step === 1) {
      if (!formState.dateNaissance) {
        setError('Veuillez saisir votre date de naissance.');
        return;
      }
      const age = calcAgeAt(formState.dateNaissance, campaign.trainingStartDate);
      if (age < 0) {
        setError('Date de naissance invalide.');
        return;
      }
      if (age < (campaign.minAge || 18)) {
        // Strict requirement: stop immediately, store NOTHING!
        clearFormDraft('bourses');
        setAgeBlocked(`Ce programme est réservé aux personnes âgées de ${campaign.minAge || 18} ans et plus.`);
        return;
      }
    }
    if (step === 2) {
      if (!formState.nom.trim() || !formState.prenom.trim()) {
        setError('Veuillez indiquer votre nom et prénom.');
        return;
      }
      if (!validateRdcPhone(formState.phone)) {
        setError('Numéro RDC invalide (+243 suivi de 9 chiffres).');
        return;
      }
      if (!formState.commune.trim() || !formState.ville.trim()) {
        setError('Veuillez indiquer votre commune et votre ville.');
        return;
      }
    }
    if (step === 4) {
      if (attachments.length === 0) {
        setError('La pièce d’identité (carte d’électeur, passeport ou carte d’étudiant) est obligatoire.');
        return;
      }
    }
    setStep((s) => Math.min(5, s + 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formState.declarationHonneur || !formState.consent) {
      setError('Veuillez cocher la déclaration sur l’honneur et le consentement.');
      return;
    }
    setSubmitting(true);
    const res = await submitForm(
      'BRS',
      `Bourse ${campaign.title} — ${formState.prenom} ${formState.nom}`,
      {
        applicantName: `${formState.prenom} ${formState.nom} ${formState.postnom}`.trim(),
        phone: formState.phone,
        whatsapp: formState.sameWhatsapp ? formState.phone : formState.whatsapp,
        email: formState.email,
        commune: formState.commune,
        ville: formState.ville,
        campaignSlug: campaign.slug,
        formationSlug: formState.formationChoisie || campaign.formations[0],
        attachments,
        _website: formState._website,
        payload: { ...formState, formationChoisie: formState.formationChoisie || campaign.formations[0] },
      },
      enteredByAgent
    );
    setSubmitting(false);

    if (res.ageRejected) {
      clearFormDraft('bourses');
      setAgeBlocked(res.error || 'Ce programme est réservé aux personnes âgées de 18 ans et plus.');
      return;
    }
    if (!res.ok) {
      setError(res.error || 'Erreur lors de la soumission.');
      return;
    }
    if (!enteredByAgent) clearFormDraft('bourses');
    setResult(res);
  };

  if (ageBlocked) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-[#D90A14]" />
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">Condition d’âge non remplie</h1>
          <p className="mt-3 text-base text-slate-700">{ageBlocked}</p>
          <p className="mt-2 text-sm text-slate-500">Aucune donnée personnelle n’a été enregistrée.</p>
          <button
            type="button"
            onClick={() => navigate('/bourses')}
            className="mt-6 rounded-lg bg-[#D90A14] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#B80811]"
          >
            Retour au Programme de Bourses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      {!enteredByAgent && <Breadcrumbs items={[{ label: 'Programme de Bourses', to: '/bourses' }, { label: 'Candidature' }]} />}

      {result ? (
        <SubmissionSuccessCard
          offline={result.offline}
          localId={result.localId}
          dossier={result.dossier}
          nextStepsText="Votre dossier a été transmis au comité de sélection. La réception de la candidature ne vaut pas encore attribution de la bourse ; vous serez notifié par SMS/WhatsApp et e-mail après décision de l’équipe."
          onReset={() => {
            setResult(null);
            if (onDone) onDone();
            else navigate('/bourses');
          }}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#D90A14]">
                {enteredByAgent ? `Assisté au bureau (${enteredByAgent})` : 'Candidature 100 % en ligne'}
              </p>
              <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900">Postuler à une bourse Lomakrev</h1>
            </div>
            {!enteredByAgent && (
              <button
                type="button"
                onClick={handleSaveDraft}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#F4B400] bg-[#FFFBEB] px-3.5 py-2 text-xs font-semibold text-[#78350F] hover:bg-[#FEF3C7]"
              >
                <Bookmark className="h-3.5 w-3.5 text-[#D90A14]" />
                Enregistrer le brouillon
              </button>
            )}
          </div>

          {resumeLink && (
            <div className="mb-5 rounded-lg border border-[#F4B400]/50 bg-[#FFFDF5] p-3 text-xs text-slate-700">
              <strong>Lien de reprise :</strong> <span className="break-all font-mono-tabular">{resumeLink}</span>
            </div>
          )}

          <div className="mb-6">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#FEF3C7]">
              <div className="h-full bg-[#D90A14] transition-all" style={{ width: `${(step / 5) * 100}%` }} />
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">Étape {step} sur 5 (4 étapes de saisie + validation)</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <input type="text" value={formState._website} onChange={(e) => updateField('_website', e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" />

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">Campagne *</label>
                  <select value={formState.campaignSlug} onChange={(e) => updateField('campaignSlug', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base">
                    {openCampaigns.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">Formation souhaitée *</label>
                  <select value={formState.formationChoisie || campaign.formations[0]} onChange={(e) => updateField('formationChoisie', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base">
                    {campaign.formations.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">
                    Date de naissance * (contrôle {campaign.minAge} ans révolus au {formatDateFr(campaign.trainingStartDate)})
                  </label>
                  <input type="date" value={formState.dateNaissance} onChange={(e) => updateField('dateNaissance', e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">Êtes-vous disponible aux dates de la formation ? *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Oui', 'Non'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateField('disponibilite', v)}
                        className={`rounded-lg border py-3 text-sm font-semibold transition-colors ${
                          formState.disponibilite === v ? 'border-[#D90A14] bg-[#D90A14] text-white' : 'border-slate-300 text-slate-700 hover:bg-[#FFFBEB]'
                        }`}
                      >
                        {v}
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
                  <input type="text" placeholder="Nom *" value={formState.nom} onChange={(e) => updateField('nom', e.target.value)} className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  <input type="text" placeholder="Postnom" value={formState.postnom} onChange={(e) => updateField('postnom', e.target.value)} className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  <input type="text" placeholder="Prénom *" value={formState.prenom} onChange={(e) => updateField('prenom', e.target.value)} className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                </div>
                <select value={formState.sexe} onChange={(e) => updateField('sexe', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                  <option value="Masculin">Masculin</option>
                  <option value="Féminin">Féminin</option>
                </select>
                <RdcPhoneInput
                  phone={formState.phone}
                  onPhoneChange={(v) => updateField('phone', v)}
                  whatsapp={formState.whatsapp}
                  onWhatsappChange={(v) => updateField('whatsapp', v)}
                  sameForWhatsapp={formState.sameWhatsapp}
                  onSameChange={(v) => updateField('sameWhatsapp', v)}
                />
                <input type="email" placeholder="E-mail (facultatif)" value={formState.email} onChange={(e) => updateField('email', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                <div className="grid gap-4 sm:grid-cols-3">
                  <input type="text" placeholder="Commune *" value={formState.commune} onChange={(e) => updateField('commune', e.target.value)} className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  <input type="text" placeholder="Ville *" value={formState.ville} onChange={(e) => updateField('ville', e.target.value)} className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  <input type="text" placeholder="Province *" value={formState.province} onChange={(e) => updateField('province', e.target.value)} className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                </div>
                <CustomFieldsRenderer fields={customFields} step={2} values={formState} onChange={updateField} />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Niveau d’études *</label>
                    <select value={formState.niveauEtudes} onChange={(e) => updateField('niveauEtudes', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                      <option>Secondaire / Diplôme d’État</option>
                      <option>Graduat / Licence</option>
                      <option>Master / Doctorat</option>
                      <option>Formation professionnelle</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Établissement ou filière</label>
                    <input type="text" value={formState.etablissement} onChange={(e) => updateField('etablissement', e.target.value)} placeholder="Ex. UNIKIN, ISTA, UPC..." className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Situation actuelle *</label>
                    <select value={formState.situation} onChange={(e) => updateField('situation', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                      <option>Sans emploi</option>
                      <option>Étudiant</option>
                      <option>Employé / Salarié</option>
                      <option>Entrepreneur / Petit commerçant</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Déjà client Lomakrev ?</label>
                    <select value={formState.clientLomakrev} onChange={(e) => updateField('clientLomakrev', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                      <option>Non</option>
                      <option>Oui</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Avez-vous accès à un ordinateur ?</label>
                    <select value={formState.accesOrdinateur} onChange={(e) => updateField('accesOrdinateur', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                      <option>Non</option>
                      <option>Oui</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Niveau en informatique</label>
                    <select value={formState.niveauInfo} onChange={(e) => updateField('niveauInfo', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                      <option>Débutant</option>
                      <option>Intermédiaire</option>
                      <option>Avancé</option>
                    </select>
                  </div>
                </div>
                <CustomFieldsRenderer fields={customFields} step={3} values={formState} onChange={updateField} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <label className="font-medium text-slate-800">Votre motivation *</label>
                    <span className="font-mono-tabular text-xs text-slate-500">{formState.motivation.length}/500</span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={500}
                    value={formState.motivation}
                    onChange={(e) => updateField('motivation', e.target.value)}
                    placeholder="Expliquez pourquoi vous postulez à cette bourse..."
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">Votre projet professionnel</label>
                  <textarea
                    rows={3}
                    value={formState.projetPro}
                    onChange={(e) => updateField('projetPro', e.target.value)}
                    placeholder="Comment cette formation vous aidera-t-elle ?"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base"
                  />
                </div>
                <FileAttachmentPicker
                  label="Pièce d’identité (carte d’électeur, passeport, carte d’étudiant avec date de naissance) + autres pièces"
                  required
                  files={attachments}
                  onChange={setAttachments}
                />
                <CustomFieldsRenderer fields={customFields} step={4} values={formState} onChange={updateField} />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm space-y-1.5">
                  <p><strong>Campagne :</strong> {campaign.title}</p>
                  <p><strong>Candidat :</strong> {formState.prenom} {formState.nom} {formState.postnom}</p>
                  <p><strong>Date de naissance :</strong> {formState.dateNaissance}</p>
                  <p><strong>Téléphone :</strong> {formState.phone} · <strong>Commune :</strong> {formState.commune}</p>
                  <p><strong>Pièces jointes :</strong> {attachments.length} fichier(s)</p>
                </div>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                  <input type="checkbox" checked={formState.declarationHonneur} onChange={(e) => updateField('declarationHonneur', e.target.checked)} className="mt-1 h-4 w-4 accent-[#D90A14]" />
                  <span>Je certifie sur l’honneur l’exactitude des informations fournies et n’avoir déposé qu’une seule candidature pour cette campagne.</span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                  <input type="checkbox" checked={formState.consent} onChange={(e) => updateField('consent', e.target.checked)} className="mt-1 h-4 w-4 accent-[#D90A14]" />
                  <span>J’accepte le traitement de mes données personnelles conformément à la politique de confidentialité de LOMAKREV GROUP.</span>
                </label>
              </div>
            )}

            {error && <p className="text-sm font-medium text-[#D90A14]">{error}</p>}

            <div className="flex items-center justify-between border-t border-slate-200 pt-5">
              {step > 1 ? (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700">
                  Précédent
                </button>
              ) : (
                <span />
              )}
              {step < 5 ? (
                <button type="button" onClick={handleNextStep} className="rounded-lg bg-[#D90A14] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#B80811]">
                  Continuer
                </button>
              ) : (
                <button type="submit" disabled={submitting} className="rounded-lg bg-[#D90A14] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#b80811] disabled:opacity-60">
                  {submitting ? 'Envoi en cours...' : 'Soumettre ma candidature'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
