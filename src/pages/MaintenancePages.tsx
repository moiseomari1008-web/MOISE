import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, FileText, Wrench } from 'lucide-react';
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
import {
  PdfCallout,
  PdfCheckboxGroup,
  PdfField,
  PdfFormActions,
  PdfFormShell,
  PdfRadioGroup,
  PdfStepCard,
} from '../components/PdfFormKit';
import { clearFormDraft, loadFormDraft, saveFormDraft } from '../lib/offlineSync';
import { KINSHASA_COMMUNES } from '../lib/rdcGeo';
import { OfficeAwareSelect } from '../components/DualSelectInput';

export const MaintenanceHomePage: React.FC = () => {
  const { data, navigate } = useApp();
  if (!data) return null;
  const services = data.services.filter((s) => s.active);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumbs items={[{ label: 'Top Maintenance' }]} />

      {/* Top Two Distinct Paths */}
      <div className="rounded-2xl border border-[#F4B400]/50 bg-[#FFFDF5] p-6 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-wider text-[#D90A14]">Pôle 3 · Top Maintenance by Lomakrev</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl text-balance">
          Maintenance IT, caméras de surveillance, traceurs GPS & réseaux
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600">
          Choisissez directement votre parcours : un chiffrage pour un nouveau projet ou une intervention technique sur un équipement en panne.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-xl border border-[#F4B400]/40 bg-white p-6">
            <div>
              <FileText className="h-6 w-6 text-[#D90A14]" />
              <h2 className="mt-3 font-display text-xl font-bold text-slate-900">Demander un devis</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Pour un projet à chiffrer : installer 8 caméras, équiper une flotte de GPS, câbler un bureau, commander plusieurs ordinateurs ou souscrire un contrat annuel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/maintenance/devis')}
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#D90A14] px-5 text-sm font-semibold text-white hover:bg-[#b80811]"
            >
              Demander un devis
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-[#F4B400]/40 bg-white p-6">
            <div>
              <Wrench className="h-6 w-6 text-[#B45309]" />
              <h2 className="mt-3 font-display text-xl font-bold text-slate-900">Demander une intervention</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Pour une panne à régler : ordinateur bloqué, caméra hors service, réseau coupé. Précisez l’urgence et choisissez l’atelier à Gombe ou un déplacement.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/maintenance/intervention')}
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#F4B400] bg-[#FBBF24] px-5 text-sm font-bold text-[#7A050B] hover:bg-[#F4B400]"
            >
              Demander une intervention
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="mt-12">
        <h2 className="font-display text-2xl font-bold text-slate-900">Nos domaines d’intervention</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => (
            <article key={svc.id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
              {svc.imageUrl && (
                <PhotoFrame src={svc.imageUrl} alt={svc.title} aspectClass="aspect-[4/3]" className="border-b border-slate-100" />
              )}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-lg font-bold text-slate-900">{svc.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{svc.summary}</p>
                <p className="mt-3 text-xs font-medium text-slate-500">{svc.pricingLabel}</p>
                <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                  <button
                    type="button"
                    onClick={() => navigate(`/maintenance/services/${svc.slug}`)}
                    className="rounded-lg border border-[#F4B400] bg-[#FFFBEB] py-2.5 text-sm font-semibold text-[#78350F] hover:bg-[#FEF3C7]"
                  >
                    Détails
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/maintenance/devis?service=${svc.serviceKey}`)}
                    className="rounded-lg bg-[#D90A14] py-2.5 text-sm font-semibold text-white hover:bg-[#b80811]"
                  >
                    Devis
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export const MaintenanceServiceDetailPage: React.FC<{ slug: string }> = ({ slug }) => {
  const { data, navigate } = useApp();
  if (!data) return null;
  const service = data.services.find((s) => s.slug === slug);

  if (!service) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Service introuvable</h1>
        <button type="button" onClick={() => navigate('/maintenance')} className="mt-4 rounded-lg bg-[#D90A14] px-5 py-2.5 text-sm font-semibold text-white">
          Retour à Top Maintenance
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumbs items={[{ label: 'Top Maintenance', to: '/maintenance' }, { label: service.title }]} />
      <div className="grid gap-10 lg:grid-cols-12">
        {service.imageUrl && (
          <div className="lg:col-span-6">
            <PhotoFrame src={service.imageUrl} alt={service.title} aspectClass="aspect-[4/3]" className="rounded-xl border border-slate-200" priority />
          </div>
        )}
        <div className={service.imageUrl ? 'lg:col-span-6' : 'lg:col-span-12 max-w-3xl'}>
          <p className="text-xs font-bold uppercase tracking-wider text-[#D90A14]">Top Maintenance by Lomakrev</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900">{service.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">{service.description}</p>

          <ul className="mt-6 space-y-2.5">
            {service.highlights.map((h) => (
              <li key={h} className="flex items-center gap-2.5 text-sm text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-[#D90A14]" />
                <span>{h}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-xl border border-[#F4B400]/50 bg-[#FFFDF5] p-4 text-sm">
            <p><strong>Tarifs :</strong> {service.pricingLabel}</p>
            <p className="mt-1"><strong>Zones couvertes :</strong> {service.coverageZones}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(`/maintenance/devis?service=${service.serviceKey}`)}
              className="rounded-lg bg-[#D90A14] px-6 py-3 text-sm font-semibold text-white hover:bg-[#b80811]"
            >
              Demander un devis
            </button>
            <button
              type="button"
              onClick={() => navigate('/maintenance/intervention')}
              className="rounded-lg border border-[#F4B400] bg-[#FBBF24] px-6 py-3 text-sm font-bold text-[#7A050B] hover:bg-[#F4B400]"
            >
              Demander une intervention
            </button>
            <ShareButton title={`${service.title} — Top Maintenance Lomakrev`} />
          </div>
        </div>
      </div>
    </div>
  );
};

const DEVIS_SERVICE_CARDS = [
  {
    key: 'ordinateurs',
    title: 'Ordinateurs',
    subtitle: 'Maintenance, réparation, mise à niveau',
    smsLabel: 'ordinateurs',
  },
  {
    key: 'cameras',
    title: 'Caméras de surveillance',
    subtitle: 'Installation, extension, reprise',
    smsLabel: 'caméras',
  },
  {
    key: 'gps',
    title: 'Traceurs GPS',
    subtitle: 'Motos, voitures, camions, flottes',
    smsLabel: 'traceurs GPS',
  },
  {
    key: 'reseau',
    title: 'Réseau informatique',
    subtitle: 'Wi-Fi, câblage, partage',
    smsLabel: 'réseau informatique',
  },
  {
    key: 'contrat',
    title: 'Contrat de maintenance',
    subtitle: 'Entretien régulier pour entreprises',
    smsLabel: 'contrat de maintenance',
  },
  {
    key: 'multi-postes',
    title: 'Plusieurs ordinateurs',
    subtitle: 'Équiper un bureau ou une école',
    smsLabel: 'plusieurs ordinateurs',
  },
];

const DEVIS_AUTRE_OPTION = {
  key: 'autre',
  title: 'Autre besoin',
  subtitle: 'Partenariat, audit ou demande spécifique',
  smsLabel: 'autre besoin',
};

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:text-base text-slate-900 outline-none transition-colors focus:border-[#057A55] placeholder:text-slate-400';

export const MaintenanceDevisPage: React.FC<{ enteredByAgent?: string | null; onDone?: () => void }> = ({
  enteredByAgent = null,
  onDone,
}) => {
  const { data, searchQuery, submitForm, navigate, pushToast } = useApp();
  const params = new URLSearchParams(searchQuery);
  const preselectedService = params.get('service') || '';
  const draftParam = params.get('draft') || '';

  const [step, setStep] = useState(1);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [resumeLink, setResumeLink] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formState, setFormState] = useState<Record<string, any>>({
    serviceKey: preselectedService || 'cameras',
    // Ordinateurs
    nbAppareils: '',
    marques: '',
    travauxSouhaites: [] as string[],
    // Caméras
    typeLieu: '',
    nbCameras: '',
    emplacement: '',
    visionDistance: '',
    repriseInstallation: '',
    // GPS
    nbVehicules: '',
    typesVehicules: [] as string[],
    fonctionsGpsList: [] as string[],
    // Réseau
    nbPostes: '',
    surfaceEtages: '',
    besoinsReseauList: [] as string[],
    // Contrat
    nbEquipementsContrat: '',
    frequenceContrat: '',
    // Plusieurs ordinateurs
    quantitePostes: '',
    usagePostes: '',
    budgetParPoste: '',
    // Commun étape 2
    descriptionBesoin: '',
    // Étape 3 : Lieu & délai
    ville: 'Kinshasa',
    commune: '',
    communeAutre: '',
    adresse: '',
    dateSouhaitee: '',
    visiteTechnique: '',
    budgetIndicatif: '',
    // Étape 4 : Demandeur
    profilDemandeur: '',
    applicantName: '',
    organisationFonction: '',
    phone: '+243',
    whatsapp: '+243',
    sameWhatsapp: true,
    email: '',
    contactPrefere: '',
    // Étape 5
    consent: false,
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
      loadFormDraft('devis').then((saved) => {
        if (saved) {
          setFormState((prev) => ({
            ...prev,
            ...saved,
            serviceKey: preselectedService || (saved.serviceKey as string) || prev.serviceKey,
          }));
        }
      });
    }
  }, [draftParam, enteredByAgent, preselectedService, pushToast]);

  const updateField = (k: string, v: any) => {
    setFieldErrors((prev) => {
      if (!prev[k]) return prev;
      const copy = { ...prev };
      delete copy[k];
      return copy;
    });
    setFormState((prev) => {
      const next = { ...prev, [k]: v };
      if (!enteredByAgent) saveFormDraft('devis', next);
      return next;
    });
  };

  if (!data) return null;
  const customFields = data.forms.devis?.customFields || [];
  const allServices = [...DEVIS_SERVICE_CARDS, DEVIS_AUTRE_OPTION];
  const currentServiceObj = allServices.find((s) => s.key === formState.serviceKey) || DEVIS_SERVICE_CARDS[0];
  const resolvedCommune =
    formState.commune === 'Autre' ? String(formState.communeAutre || '').trim() : String(formState.commune || '').trim();
  const isEmailRequired =
    formState.profilDemandeur === 'Entreprise' || formState.profilDemandeur === 'Institution publique';

  const handleSaveDraft = async () => {
    await saveFormDraft('devis', formState);
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/public/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: draftParam || undefined, formKey: 'devis', data: formState }),
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

  const validateStep = (targetStep: number): boolean => {
    const errs: Record<string, string> = {};
    if (targetStep === 1) {
      if (!formState.serviceKey) {
        errs.serviceKey = 'Veuillez sélectionner un service.';
      }
    } else if (targetStep === 2) {
      const sk = formState.serviceKey;
      if (sk === 'ordinateurs') {
        if (!String(formState.nbAppareils || '').trim()) errs.nbAppareils = "Veuillez indiquer le nombre d'appareils.";
        if (!Array.isArray(formState.travauxSouhaites) || formState.travauxSouhaites.length === 0) {
          errs.travauxSouhaites = 'Veuillez cocher au moins un type de travaux.';
        }
      } else if (sk === 'cameras') {
        if (!formState.typeLieu) errs.typeLieu = 'Veuillez choisir le type de lieu.';
        if (!String(formState.nbCameras || '').trim()) errs.nbCameras = 'Veuillez préciser le nombre de caméras souhaité.';
        if (!formState.emplacement) errs.emplacement = "Veuillez préciser l'emplacement.";
      } else if (sk === 'gps') {
        if (!String(formState.nbVehicules || '').trim()) errs.nbVehicules = 'Veuillez indiquer le nombre de véhicules.';
        if (!Array.isArray(formState.typesVehicules) || formState.typesVehicules.length === 0) {
          errs.typesVehicules = 'Veuillez cocher au moins un type de véhicule.';
        }
      } else if (sk === 'reseau') {
        if (!String(formState.nbPostes || '').trim()) errs.nbPostes = 'Veuillez indiquer le nombre de postes.';
        if (!Array.isArray(formState.besoinsReseauList) || formState.besoinsReseauList.length === 0) {
          errs.besoinsReseauList = 'Veuillez sélectionner au moins un besoin réseau.';
        }
      } else if (sk === 'contrat') {
        if (!String(formState.nbEquipementsContrat || '').trim()) {
          errs.nbEquipementsContrat = "Veuillez indiquer le nombre d'équipements à entretenir.";
        }
        if (!formState.frequenceContrat) errs.frequenceContrat = 'Veuillez choisir la fréquence souhaitée.';
      } else if (sk === 'multi-postes') {
        if (!String(formState.quantitePostes || '').trim()) errs.quantitePostes = "Veuillez préciser la quantité d'ordinateurs.";
      }
      if (!String(formState.descriptionBesoin || '').trim()) {
        errs.descriptionBesoin = 'Veuillez décrire votre besoin.';
      }
    } else if (targetStep === 3) {
      if (!String(formState.ville || '').trim()) errs.ville = 'Veuillez saisir la ville.';
      if (!formState.commune) {
        errs.commune = 'Veuillez choisir la commune.';
      } else if (formState.commune === 'Autre' && !String(formState.communeAutre || '').trim()) {
        errs.communeAutre = 'Veuillez préciser votre commune.';
      }
      if (!formState.visiteTechnique) errs.visiteTechnique = 'Veuillez indiquer si vous souhaitez une visite technique.';
    } else if (targetStep === 4) {
      if (!formState.profilDemandeur) errs.profilDemandeur = 'Veuillez préciser votre profil.';
      if (!String(formState.applicantName || '').trim()) errs.applicantName = 'Veuillez saisir votre nom complet.';
      if (formState.profilDemandeur && formState.profilDemandeur !== 'Particulier' && !String(formState.organisationFonction || '').trim()) {
        errs.organisationFonction = "Veuillez indiquer votre organisation et fonction.";
      }
      if (!validateRdcPhone(formState.phone)) {
        errs.phone = 'Numéro RDC invalide : 9 chiffres requis après +243.';
      }
      if (!formState.sameWhatsapp && String(formState.whatsapp || '').replace(/[^0-9]/g, '').length > 3 && !validateRdcPhone(formState.whatsapp)) {
        errs.whatsapp = 'Numéro WhatsApp RDC invalide (9 chiffres après +243).';
      }
      if (isEmailRequired && !String(formState.email || '').trim()) {
        errs.email = "L'adresse e-mail est obligatoire pour recevoir le devis PDF.";
      } else if (String(formState.email || '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(formState.email).trim())) {
        errs.email = 'Adresse e-mail invalide.';
      }
      if (!formState.contactPrefere) errs.contactPrefere = 'Veuillez choisir votre moyen de contact préféré.';
    } else if (targetStep === 5) {
      if (!formState.consent) errs.consent = 'Veuillez accepter le traitement de vos données pour établir ce devis.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(5, s + 1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(5)) return;

    const payload = {
      ...formState,
      serviceLabel: currentServiceObj.smsLabel,
      serviceTitle: currentServiceObj.title,
      communeResolved: resolvedCommune,
    };

    setSubmitting(true);
    const res = await submitForm(
      'DEV',
      `Devis ${currentServiceObj.title} — ${formState.applicantName}`,
      {
        applicantName: formState.applicantName,
        phone: formState.phone,
        whatsapp: formState.sameWhatsapp ? formState.phone : formState.whatsapp,
        email: formState.email,
        commune: resolvedCommune,
        ville: formState.ville,
        serviceKey: formState.serviceKey,
        attachments,
        _website: formState._website,
        payload,
      },
      enteredByAgent
    );
    setSubmitting(false);

    if (!res.ok) {
      setFieldErrors({ submit: res.error || 'Erreur lors de l’envoi de votre demande.' });
      return;
    }
    if (!enteredByAgent) clearFormDraft('devis');
    setResult(res);
  };

  const devisSteps = [
    { key: 1, num: '1', label: 'Service' },
    { key: 2, num: '2', label: 'Besoin' },
    { key: 3, num: '3', label: 'Lieu' },
    { key: 4, num: '4', label: 'Demandeur' },
    { key: 5, num: '5', label: 'Envoi' },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      {!enteredByAgent && <Breadcrumbs items={[{ label: 'Top Maintenance', to: '/maintenance' }, { label: 'Demande de devis' }]} />}

      {result ? (
        <SubmissionSuccessCard
          offline={result.offline}
          localId={result.localId}
          dossier={result.dossier}
          title="Demande de devis bien reçue"
          bulletPoints={[
            'Un conseiller vous contacte sous 24 h ouvrées.',
            'Si une visite technique est nécessaire, elle est planifiée avec vous.',
            'Le devis vous est envoyé par e-mail ou WhatsApp en PDF.',
          ]}
          smsPreview={
            result.dossier?.autoMessage ||
            (result.dossier?.reference
              ? `LOMAKREV TOP MAINTENANCE : demande de devis ${result.dossier.reference} (${currentServiceObj.smsLabel}) reçue. Un conseiller vous appelle sous 24 h ouvrées. Suivi : lomakrev.com/suivi`
              : undefined)
          }
          resetLabel={onDone ? 'Fermer' : 'Retour à Top Maintenance'}
          onReset={() => {
            setResult(null);
            if (onDone) onDone();
            else navigate('/maintenance');
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={formState._website}
            onChange={(e) => updateField('_website', e.target.value)}
            className="hidden"
            aria-hidden="true"
          />

          <PdfFormShell
            tone="devis"
            poleLabel="TOP MAINTENANCE BY LOMAKREV"
            title="Demande de devis"
            urlHint="lomakrev.com/maintenance/devis?service=…"
            refPreview="DEV-AAAA-00000"
            introText="Décrivez votre projet : nous vous envoyons un devis gratuit, après une visite technique si nécessaire. Les questions s'adaptent au service choisi."
            steps={devisSteps}
            activeStepIndex={step - 1}
            onStepClick={(idx) => setStep(idx + 1)}
            enteredByAgent={enteredByAgent}
            resumeLink={resumeLink}
          >
            {step === 1 && (
              <PdfStepCard tone="devis" stepNum="1" title="Service" stepMeta="Étape 1 sur 5">
                <PdfField
                  label="Quel service vous intéresse ?"
                  required
                  helper="Présélectionné par le lien partagé ; « Autre besoin » est proposé sous les cartes."
                  error={fieldErrors.serviceKey}
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    {DEVIS_SERVICE_CARDS.map((card) => {
                      const active = formState.serviceKey === card.key;
                      return (
                        <button
                          key={card.key}
                          type="button"
                          onClick={() => updateField('serviceKey', card.key)}
                          className={`flex flex-col rounded-lg border p-3.5 text-left transition-all ${
                            active
                              ? 'border-2 border-[#057A55] bg-[#ECFDF5]/60 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                          }`}
                        >
                          <span className="text-sm font-bold text-slate-900">{card.title}</span>
                          <span className="mt-1 text-xs leading-snug text-slate-500">{card.subtitle}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => updateField('serviceKey', DEVIS_AUTRE_OPTION.key)}
                    className={`mt-3 flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-all ${
                      formState.serviceKey === DEVIS_AUTRE_OPTION.key
                        ? 'border-2 border-[#057A55] bg-[#ECFDF5]/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-bold text-slate-900">{DEVIS_AUTRE_OPTION.title}</span>
                      <span className="ml-2 text-xs text-slate-500">— {DEVIS_AUTRE_OPTION.subtitle}</span>
                    </div>
                  </button>
                </PdfField>

                <CustomFieldsRenderer
                  fields={customFields}
                  step={1}
                  values={formState}
                  onChange={updateField}
                  officeMode={Boolean(enteredByAgent)}
                />

                <PdfFormActions
                  canGoBack={false}
                  showSaveDraft={false}
                  isLastStep={false}
                  onNext={handleNext}
                  submitLabel="Demander mon devis"
                />
              </PdfStepCard>
            )}

            {step === 2 && (
              <PdfStepCard
                tone="devis"
                stepNum="2"
                title={`Votre besoin — ${currentServiceObj.title}`}
                subtitle="Seul le bloc du service choisi est affiché"
                stepMeta="Étape 2 sur 5"
              >
                {formState.serviceKey === 'ordinateurs' && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <PdfField label="Nombre d'appareils" required error={fieldErrors.nbAppareils}>
                        <input
                          type="number"
                          min={1}
                          value={formState.nbAppareils}
                          onChange={(e) => updateField('nbAppareils', e.target.value)}
                          placeholder="Ex. : 4"
                          className={INPUT_CLASS}
                        />
                      </PdfField>
                      <PdfField label="Marques et modèles">
                        <input
                          type="text"
                          value={formState.marques}
                          onChange={(e) => updateField('marques', e.target.value)}
                          placeholder="Ex. : HP, Dell"
                          className={INPUT_CLASS}
                        />
                      </PdfField>
                    </div>
                    <PdfField label="Travaux souhaités" required error={fieldErrors.travauxSouhaites}>
                      <PdfCheckboxGroup
                        tone="devis"
                        values={Array.isArray(formState.travauxSouhaites) ? formState.travauxSouhaites : []}
                        onChange={(next) => updateField('travauxSouhaites', next)}
                        options={[
                          'Réparation',
                          'Mise à niveau (SSD, mémoire)',
                          'Installation de logiciels',
                          'Récupération de données',
                          'Entretien / nettoyage',
                        ]}
                      />
                    </PdfField>
                  </>
                )}

                {formState.serviceKey === 'cameras' && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <PdfField
                        label="Type de lieu"
                        required
                        helper="Choix : Maison · Boutique · Bureau · Dépôt / entrepôt · École · Autre"
                        error={fieldErrors.typeLieu}
                      >
                        <OfficeAwareSelect
                          officeMode={Boolean(enteredByAgent)}
                          fieldKey="office_devis_type_lieu"
                          value={formState.typeLieu}
                          onChange={(val) => updateField('typeLieu', val)}
                          options={[
                            ...(!enteredByAgent ? [{ value: '', label: 'Choisir…' }] : []),
                            'Maison',
                            'Boutique',
                            'Bureau',
                            'Dépôt / entrepôt',
                            'École',
                            'Autre',
                          ]}
                          className={INPUT_CLASS}
                        />
                      </PdfField>
                      <PdfField label="Nombre de caméras souhaité" required error={fieldErrors.nbCameras}>
                        <input
                          type="text"
                          value={formState.nbCameras}
                          onChange={(e) => updateField('nbCameras', e.target.value)}
                          placeholder="Ex. : 8 (ou « je ne sais pas »)"
                          className={INPUT_CLASS}
                        />
                      </PdfField>
                      <PdfField label="Emplacement" required error={fieldErrors.emplacement}>
                        <PdfRadioGroup
                          tone="devis"
                          name="devis_emplacement"
                          value={formState.emplacement}
                          onChange={(v) => updateField('emplacement', v)}
                          options={['Intérieur', 'Extérieur', 'Les deux']}
                        />
                      </PdfField>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <PdfField label="Voir les images sur votre téléphone ?">
                        <PdfRadioGroup
                          tone="devis"
                          name="devis_vision_tel"
                          value={formState.visionDistance}
                          onChange={(v) => updateField('visionDistance', v)}
                          options={['Oui', 'Non']}
                        />
                      </PdfField>
                      <PdfField label="Une installation existe déjà ?">
                        <PdfRadioGroup
                          tone="devis"
                          name="devis_reprise"
                          value={formState.repriseInstallation}
                          onChange={(v) => updateField('repriseInstallation', v)}
                          options={['Oui, à reprendre', 'Non']}
                        />
                      </PdfField>
                    </div>
                  </>
                )}

                {formState.serviceKey === 'gps' && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <PdfField label="Nombre de véhicules" required error={fieldErrors.nbVehicules}>
                      <input
                        type="number"
                        min={1}
                        value={formState.nbVehicules}
                        onChange={(e) => updateField('nbVehicules', e.target.value)}
                        placeholder="Ex. : 12"
                        className={INPUT_CLASS}
                      />
                    </PdfField>
                    <PdfField label="Types de véhicules" required error={fieldErrors.typesVehicules}>
                      <PdfCheckboxGroup
                        tone="devis"
                        values={Array.isArray(formState.typesVehicules) ? formState.typesVehicules : []}
                        onChange={(next) => updateField('typesVehicules', next)}
                        options={['Moto', 'Voiture', 'Camion', 'Engin']}
                      />
                    </PdfField>
                    <PdfField label="Fonctions souhaitées">
                      <PdfCheckboxGroup
                        tone="devis"
                        values={Array.isArray(formState.fonctionsGpsList) ? formState.fonctionsGpsList : []}
                        onChange={(next) => updateField('fonctionsGpsList', next)}
                        options={['Suivi en direct', 'Historique', 'Coupure moteur', 'Alertes']}
                      />
                    </PdfField>
                  </div>
                )}

                {formState.serviceKey === 'reseau' && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <PdfField label="Nombre de postes" required error={fieldErrors.nbPostes}>
                      <input
                        type="number"
                        min={1}
                        value={formState.nbPostes}
                        onChange={(e) => updateField('nbPostes', e.target.value)}
                        placeholder="Ex. : 15"
                        className={INPUT_CLASS}
                      />
                    </PdfField>
                    <PdfField label="Surface ou nombre d'étages">
                      <input
                        type="text"
                        value={formState.surfaceEtages}
                        onChange={(e) => updateField('surfaceEtages', e.target.value)}
                        placeholder="Ex. : 2 étages"
                        className={INPUT_CLASS}
                      />
                    </PdfField>
                    <PdfField label="Besoins" required error={fieldErrors.besoinsReseauList}>
                      <PdfCheckboxGroup
                        tone="devis"
                        values={Array.isArray(formState.besoinsReseauList) ? formState.besoinsReseauList : []}
                        onChange={(next) => updateField('besoinsReseauList', next)}
                        options={['Wi-Fi', 'Câblage', 'Partage de fichiers', 'Internet']}
                      />
                    </PdfField>
                  </div>
                )}

                {formState.serviceKey === 'contrat' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PdfField label="Nombre d'équipements à entretenir" required error={fieldErrors.nbEquipementsContrat}>
                      <input
                        type="number"
                        min={1}
                        value={formState.nbEquipementsContrat}
                        onChange={(e) => updateField('nbEquipementsContrat', e.target.value)}
                        placeholder="Ex. : 30"
                        className={INPUT_CLASS}
                      />
                    </PdfField>
                    <PdfField label="Fréquence souhaitée" required error={fieldErrors.frequenceContrat}>
                      <PdfRadioGroup
                        tone="devis"
                        name="devis_frequence"
                        value={formState.frequenceContrat}
                        onChange={(v) => updateField('frequenceContrat', v)}
                        options={['Mensuelle', 'Trimestrielle', 'Semestrielle']}
                      />
                    </PdfField>
                  </div>
                )}

                {formState.serviceKey === 'multi-postes' && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <PdfField label="Quantité d'ordinateurs" required error={fieldErrors.quantitePostes}>
                      <input
                        type="number"
                        min={1}
                        value={formState.quantitePostes}
                        onChange={(e) => updateField('quantitePostes', e.target.value)}
                        placeholder="Ex. : 10"
                        className={INPUT_CLASS}
                      />
                    </PdfField>
                    <PdfField label="Usage prévu">
                      <input
                        type="text"
                        value={formState.usagePostes}
                        onChange={(e) => updateField('usagePostes', e.target.value)}
                        placeholder="Ex. : bureautique"
                        className={INPUT_CLASS}
                      />
                    </PdfField>
                    <PdfField label="Budget par poste (USD)">
                      <input
                        type="text"
                        value={formState.budgetParPoste}
                        onChange={(e) => updateField('budgetParPoste', e.target.value)}
                        placeholder="Facultatif"
                        className={INPUT_CLASS}
                      />
                    </PdfField>
                  </div>
                )}

                <PdfField label="Décrivez votre besoin" required error={fieldErrors.descriptionBesoin}>
                  <textarea
                    rows={3}
                    value={formState.descriptionBesoin}
                    onChange={(e) => updateField('descriptionBesoin', e.target.value)}
                    placeholder="Tout ce qui peut nous aider à préparer le devis…"
                    className={INPUT_CLASS}
                  />
                </PdfField>

                <CustomFieldsRenderer
                  fields={customFields}
                  step={2}
                  values={formState}
                  onChange={updateField}
                  officeMode={Boolean(enteredByAgent)}
                />

                <PdfFormActions
                  canGoBack
                  onBack={() => setStep(1)}
                  onSaveDraft={handleSaveDraft}
                  showSaveDraft={!enteredByAgent}
                  isLastStep={false}
                  onNext={handleNext}
                  submitLabel="Demander mon devis"
                />
              </PdfStepCard>
            )}

            {step === 3 && (
              <PdfStepCard tone="devis" stepNum="3" title="Lieu et délai" stepMeta="Étape 3 sur 5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <PdfField label="Ville" required error={fieldErrors.ville}>
                    <input
                      type="text"
                      value={formState.ville}
                      onChange={(e) => updateField('ville', e.target.value)}
                      placeholder="Ex. : Kinshasa"
                      className={INPUT_CLASS}
                    />
                  </PdfField>
                  <PdfField label="Commune" required helper="Choix : Gombe · Limete · Ngaliema · … (liste)" error={fieldErrors.commune}>
                    <OfficeAwareSelect
                      officeMode={Boolean(enteredByAgent)}
                      fieldKey="office_devis_commune"
                      value={formState.commune}
                      onChange={(val) => updateField('commune', val)}
                      options={[
                        ...(!enteredByAgent ? [{ value: '', label: 'Choisir…' }] : []),
                        ...KINSHASA_COMMUNES,
                        'Autre',
                      ]}
                      className={INPUT_CLASS}
                    />
                  </PdfField>
                  <PdfField label="Adresse ou point de repère">
                    <input
                      type="text"
                      value={formState.adresse}
                      onChange={(e) => updateField('adresse', e.target.value)}
                      placeholder="Facultatif"
                      className={INPUT_CLASS}
                    />
                  </PdfField>
                </div>

                {formState.commune === 'Autre' && (
                  <PdfField label="Précisez la commune" required error={fieldErrors.communeAutre}>
                    <input
                      type="text"
                      value={formState.communeAutre}
                      onChange={(e) => updateField('communeAutre', e.target.value)}
                      placeholder="Nom de la commune"
                      className={INPUT_CLASS}
                    />
                  </PdfField>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField label="Date souhaitée pour les travaux">
                    <input
                      type="date"
                      value={formState.dateSouhaitee}
                      onChange={(e) => updateField('dateSouhaitee', e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </PdfField>
                  <PdfField label="Souhaitez-vous une visite technique ?" required error={fieldErrors.visiteTechnique}>
                    <PdfRadioGroup
                      tone="devis"
                      name="devis_visite"
                      value={formState.visiteTechnique}
                      onChange={(v) => updateField('visiteTechnique', v)}
                      options={['Oui', 'Non', 'Je ne sais pas']}
                    />
                  </PdfField>
                </div>

                <PdfField
                  label="Budget indicatif (USD)"
                  helper="Choix : Moins de 200 · 200 – 500 · 500 – 1 500 · Plus de 1 500 · Je ne sais pas"
                >
                  <OfficeAwareSelect
                    officeMode={Boolean(enteredByAgent)}
                    fieldKey="office_devis_budget"
                    value={formState.budgetIndicatif}
                    onChange={(val) => updateField('budgetIndicatif', val)}
                    options={[
                      ...(!enteredByAgent ? [{ value: '', label: 'Choisir…' }] : []),
                      'Moins de 200',
                      '200 – 500',
                      '500 – 1 500',
                      'Plus de 1 500',
                      'Je ne sais pas',
                    ]}
                    className={INPUT_CLASS}
                  />
                </PdfField>

                <CustomFieldsRenderer
                  fields={customFields}
                  step={3}
                  values={formState}
                  onChange={updateField}
                  officeMode={Boolean(enteredByAgent)}
                />

                <PdfFormActions
                  canGoBack
                  onBack={() => setStep(2)}
                  onSaveDraft={handleSaveDraft}
                  showSaveDraft={!enteredByAgent}
                  isLastStep={false}
                  onNext={handleNext}
                  submitLabel="Demander mon devis"
                />
              </PdfStepCard>
            )}

            {step === 4 && (
              <PdfStepCard tone="devis" stepNum="4" title="Vos coordonnées" stepMeta="Étape 4 sur 5">
                <PdfField label="Vous êtes" required error={fieldErrors.profilDemandeur}>
                  <PdfRadioGroup
                    tone="devis"
                    name="devis_profil"
                    value={formState.profilDemandeur}
                    onChange={(v) => updateField('profilDemandeur', v)}
                    options={['Particulier', 'Entreprise', 'Institution publique', 'ONG / association', 'École']}
                  />
                </PdfField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField label="Nom complet" required error={fieldErrors.applicantName}>
                    <input
                      type="text"
                      value={formState.applicantName}
                      onChange={(e) => updateField('applicantName', e.target.value)}
                      placeholder="Ex. : Patrick Kasongo"
                      className={INPUT_CLASS}
                    />
                  </PdfField>

                  {formState.profilDemandeur && formState.profilDemandeur !== 'Particulier' && (
                    <PdfField label="Organisation et fonction" required error={fieldErrors.organisationFonction}>
                      <input
                        type="text"
                        value={formState.organisationFonction}
                        onChange={(e) => updateField('organisationFonction', e.target.value)}
                        placeholder="Ex. : Hôtel ABC — Responsable logistique"
                        className={INPUT_CLASS}
                      />
                    </PdfField>
                  )}
                </div>

                <RdcPhoneInput
                  layout="grid"
                  phone={formState.phone}
                  onPhoneChange={(v) => updateField('phone', v)}
                  whatsapp={formState.whatsapp}
                  onWhatsappChange={(v) => updateField('whatsapp', v)}
                  sameForWhatsapp={formState.sameWhatsapp}
                  onSameChange={(v) => updateField('sameWhatsapp', v)}
                  error={fieldErrors.phone}
                  whatsappError={fieldErrors.whatsapp}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField
                    label="Adresse e-mail"
                    required={isEmailRequired}
                    helper="Obligatoire pour une entreprise ou institution : le devis PDF est envoyé par e-mail."
                    error={fieldErrors.email}
                  >
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="exemple@entreprise.cd"
                      className={INPUT_CLASS}
                    />
                  </PdfField>

                  <PdfField label="Comment préférez-vous être contacté ?" required error={fieldErrors.contactPrefere}>
                    <PdfRadioGroup
                      tone="devis"
                      name="devis_contact_prefere"
                      value={formState.contactPrefere}
                      onChange={(v) => updateField('contactPrefere', v)}
                      options={['Appel', 'WhatsApp', 'E-mail']}
                    />
                  </PdfField>
                </div>

                <CustomFieldsRenderer
                  fields={customFields}
                  step={4}
                  values={formState}
                  onChange={updateField}
                  officeMode={Boolean(enteredByAgent)}
                />

                <PdfFormActions
                  canGoBack
                  onBack={() => setStep(3)}
                  onSaveDraft={handleSaveDraft}
                  showSaveDraft={!enteredByAgent}
                  isLastStep={false}
                  onNext={handleNext}
                  submitLabel="Demander mon devis"
                />
              </PdfStepCard>
            )}

            {step === 5 && (
              <PdfStepCard tone="devis" stepNum="5" title="Pièces jointes et envoi" stepMeta="Étape 5 sur 5">
                <FileAttachmentPicker
                  label="Photos, plan ou cahier des charges"
                  files={attachments}
                  onChange={setAttachments}
                  maxFiles={5}
                  maxSizeMb={10}
                  accept=".jpg,.jpeg,.png,.pdf"
                  helperText="JPG, PNG ou PDF — jusqu'à 5 fichiers de 10 Mo"
                />

                <CustomFieldsRenderer
                  fields={customFields}
                  step={5}
                  values={formState}
                  onChange={updateField}
                  officeMode={Boolean(enteredByAgent)}
                />

                <div>
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-800 select-none">
                    <input
                      type="checkbox"
                      checked={formState.consent}
                      onChange={(e) => updateField('consent', e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#057A55]"
                    />
                    <span>
                      J'accepte que Lomakrev Group traite mes données pour établir ce devis.{' '}
                      <span className="text-[#D90A14]">*</span>
                    </span>
                  </label>
                  {fieldErrors.consent && <p className="mt-1 text-xs font-medium text-[#D90A14]">{fieldErrors.consent}</p>}
                </div>

                {fieldErrors.submit && (
                  <PdfCallout variant="danger" title="Impossible d'envoyer la demande">
                    {fieldErrors.submit}
                  </PdfCallout>
                )}

                <PdfFormActions
                  canGoBack
                  onBack={() => setStep(4)}
                  onSaveDraft={handleSaveDraft}
                  showSaveDraft={!enteredByAgent}
                  isLastStep
                  submitting={submitting}
                  submittingLabel="Envoi en cours..."
                  submitLabel="Demander mon devis"
                />
              </PdfStepCard>
            )}
          </PdfFormShell>
        </form>
      )}
    </div>
  );
};

const EQUIPEMENT_OPTIONS = [
  'Ordinateur portable',
  'Ordinateur de bureau',
  'Imprimante',
  'Caméra / enregistreur',
  'Traceur GPS',
  'Réseau / Wi-Fi',
  'Autre',
];

const PROBLEMES_BY_EQUIPEMENT: Record<string, string[]> = {
  'Ordinateur portable': ['Ne démarre pas', 'Écran', 'Très lent', 'Virus', 'Surchauffe / bruit', 'Clavier / batterie', 'Autre'],
  'Ordinateur de bureau': ['Ne démarre pas', 'Écran / affichage', 'Très lent', 'Virus', 'Surchauffe / bruit', 'Alimentation / ports', 'Autre'],
  Imprimante: ["N'imprime pas", 'Bourrage papier', "Qualité d'impression", 'Connexion Wi-Fi / USB', 'Cartouche / toner', 'Autre'],
  'Caméra / enregistreur': [
    "Pas d'image",
    'Enregistreur NVR/DVR hors ligne',
    'Accès téléphone impossible',
    'Disque dur / enregistrement',
    'Câble ou alimentation',
    'Autre',
  ],
  'Traceur GPS': ['Ne répond plus', 'Position incorrecte', 'Application / carte SIM', 'Coupure moteur', 'Batterie / câblage', 'Autre'],
  'Réseau / Wi-Fi': [
    "Plus d'Internet",
    'Wi-Fi lent ou instable',
    'Routeur / switch en panne',
    'Câblage endommagé',
    'Partage réseau impossible',
    'Autre',
  ],
  Autre: ["Ne s'allume pas", 'Dysfonctionnement matériel', 'Problème logiciel / configuration', 'Autre'],
};

const INT_INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:text-base text-slate-900 outline-none transition-colors focus:border-[#B45309] placeholder:text-slate-400';

export const MaintenanceInterventionPage: React.FC<{ enteredByAgent?: string | null; onDone?: () => void }> = ({
  enteredByAgent = null,
  onDone,
}) => {
  const { data, searchQuery, submitForm, navigate, pushToast } = useApp();
  const params = new URLSearchParams(searchQuery);
  const draftParam = params.get('draft') || '';

  const [step, setStep] = useState(1);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [resumeLink, setResumeLink] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formState, setFormState] = useState<Record<string, any>>({
    // Étape 1 : Le problème
    equipement: 'Ordinateur portable',
    marqueModele: '',
    problemePrincipal: '',
    depuisQuand: '',
    description: '',
    // Étape 2 : Urgence et lieu
    urgence: '',
    lieuMode: '',
    adresse: '',
    commune: '',
    communeAutre: '',
    pointRepere: '',
    // Étape 3 : Rendez-vous souhaité
    dateSouhaitee: '',
    demiJournee: '',
    // Étape 4 : Coordonnées
    applicantName: '',
    profilClient: '',
    phone: '+243',
    whatsapp: '+243',
    sameWhatsapp: true,
    email: '',
    organisation: '',
    acheteLomakrev: '',
    numeroContrat: '',
    consent: false,
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
      loadFormDraft('intervention').then((saved) => {
        if (saved) setFormState((prev) => ({ ...prev, ...saved }));
      });
    }
  }, [draftParam, enteredByAgent, pushToast]);

  const updateField = (k: string, v: any) => {
    setFieldErrors((prev) => {
      if (!prev[k]) return prev;
      const copy = { ...prev };
      delete copy[k];
      return copy;
    });
    setFormState((prev) => {
      const next = { ...prev, [k]: v };
      if (!enteredByAgent) saveFormDraft('intervention', next);
      return next;
    });
  };

  if (!data) return null;
  const settings = data.settings;
  const customFields = data.forms.intervention?.customFields || [];
  const problemeOptions = PROBLEMES_BY_EQUIPEMENT[formState.equipement] || PROBLEMES_BY_EQUIPEMENT.Autre;
  const isDeplacement = formState.lieuMode === 'Un technicien se déplace';
  const isAtelier = formState.lieuMode === "Je dépose l'appareil à l'atelier (Gombe)";
  const resolvedCommune = isDeplacement
    ? formState.commune === 'Autre'
      ? String(formState.communeAutre || '').trim()
      : String(formState.commune || '').trim()
    : 'Gombe';

  const isSundaySelected = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const d = new Date(`${dateStr}T00:00:00`);
    return !Number.isNaN(d.getTime()) && d.getDay() === 0;
  };

  const handleSaveDraft = async () => {
    await saveFormDraft('intervention', formState);
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/public/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: draftParam || undefined, formKey: 'intervention', data: formState }),
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

  const validateStep = (targetStep: number): boolean => {
    const errs: Record<string, string> = {};
    if (targetStep === 1) {
      if (!formState.equipement) errs.equipement = "Veuillez choisir le type d'équipement.";
      if (!formState.problemePrincipal) errs.problemePrincipal = 'Veuillez sélectionner le problème principal.';
      if (!String(formState.description || '').trim()) errs.description = 'Veuillez décrire le problème constaté.';
    } else if (targetStep === 2) {
      if (!formState.urgence) errs.urgence = "Veuillez sélectionner le niveau d'urgence.";
      if (!formState.lieuMode) errs.lieuMode = "Veuillez préciser où se fait l'intervention.";
      if (isDeplacement) {
        if (!String(formState.adresse || '').trim()) errs.adresse = "Veuillez saisir l'adresse d'intervention.";
        if (!formState.commune) {
          errs.commune = 'Veuillez choisir la commune.';
        } else if (formState.commune === 'Autre' && !String(formState.communeAutre || '').trim()) {
          errs.communeAutre = 'Veuillez préciser la commune.';
        }
      }
    } else if (targetStep === 3) {
      if (!formState.dateSouhaitee) {
        errs.dateSouhaitee = 'Veuillez sélectionner une date souhaitée.';
      } else if (isSundaySelected(formState.dateSouhaitee)) {
        errs.dateSouhaitee = "L'atelier est fermé le dimanche. Veuillez choisir un jour entre lundi et samedi.";
      }
      if (!formState.demiJournee) errs.demiJournee = 'Veuillez sélectionner un moment de la journée.';
    } else if (targetStep === 4) {
      if (!String(formState.applicantName || '').trim()) errs.applicantName = 'Veuillez saisir votre nom complet.';
      if (!formState.profilClient) errs.profilClient = 'Veuillez préciser si vous êtes un particulier ou une entreprise.';
      if (!validateRdcPhone(formState.phone)) {
        errs.phone = 'Numéro RDC invalide : 9 chiffres requis après +243.';
      }
      if (!formState.sameWhatsapp && String(formState.whatsapp || '').replace(/[^0-9]/g, '').length > 3 && !validateRdcPhone(formState.whatsapp)) {
        errs.whatsapp = 'Numéro WhatsApp RDC invalide (9 chiffres après +243).';
      }
      if (formState.profilClient === 'Entreprise / institution' && !String(formState.organisation || '').trim()) {
        errs.organisation = "Veuillez indiquer le nom de votre organisation.";
      }
      if (String(formState.email || '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(formState.email).trim())) {
        errs.email = 'Adresse e-mail invalide.';
      }
      if (!formState.consent) {
        errs.consent = 'Veuillez accepter le traitement de vos données pour cette intervention.';
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(4, s + 1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    const urgenceShort = formState.urgence === 'Urgente (sous 24 h)' ? 'urgente' : String(formState.urgence || 'normale').toLowerCase();
    const payload = {
      ...formState,
      communeResolved: resolvedCommune,
      urgence: urgenceShort,
      urgenceLabel: formState.urgence,
    };

    setSubmitting(true);
    const res = await submitForm(
      'INT',
      `Intervention ${formState.equipement} — ${formState.applicantName}`,
      {
        applicantName: formState.applicantName,
        phone: formState.phone,
        whatsapp: formState.sameWhatsapp ? formState.phone : formState.whatsapp,
        email: formState.email,
        commune: resolvedCommune,
        ville: 'Kinshasa',
        serviceKey: formState.equipement,
        attachments,
        _website: formState._website,
        payload,
      },
      enteredByAgent
    );
    setSubmitting(false);

    if (!res.ok) {
      setFieldErrors({ submit: res.error || 'Erreur lors de l’envoi.' });
      return;
    }
    if (!enteredByAgent) clearFormDraft('intervention');
    setResult(res);
  };

  const intSteps = [
    { key: 1, num: '1', label: 'Problème' },
    { key: 2, num: '2', label: 'Urgence et lieu' },
    { key: 3, num: '3', label: 'Rendez-vous' },
    { key: 4, num: '4', label: 'Coordonnées' },
  ];

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      {!enteredByAgent && <Breadcrumbs items={[{ label: 'Top Maintenance', to: '/maintenance' }, { label: 'Demande d’intervention' }]} />}

      {result ? (
        <SubmissionSuccessCard
          offline={result.offline}
          localId={result.localId}
          dossier={result.dossier}
          title="Demande d'intervention bien reçue"
          bulletPoints={[
            'Un technicien vous appelle pour confirmer le rendez-vous.',
            `En cas d'urgence, appelez le ${settings.phone || '+243 99 59 56 534'} en indiquant ce numéro.`,
            'Suivez l’avancement (planifiée, en cours, terminée) sur lomakrev.com/suivi.',
          ]}
          smsPreview={
            result.dossier?.autoMessage ||
            (result.dossier?.reference
              ? `LOMAKREV TOP MAINTENANCE : demande ${result.dossier.reference} reçue (${String(formState.equipement || '').toLowerCase()}, ${
                  formState.urgence === 'Urgente (sous 24 h)' ? 'urgente' : String(formState.urgence || 'normale').toLowerCase()
                }). Un technicien vous appelle pour fixer le rendez-vous.`
              : undefined)
          }
          resetLabel={onDone ? 'Fermer' : 'Retour à Top Maintenance'}
          onReset={() => {
            setResult(null);
            if (onDone) onDone();
            else navigate('/maintenance');
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={formState._website}
            onChange={(e) => updateField('_website', e.target.value)}
            className="hidden"
            aria-hidden="true"
          />

          <PdfFormShell
            tone="intervention"
            poleLabel="TOP MAINTENANCE BY LOMAKREV"
            title="Demande d'intervention"
            urlHint="lomakrev.com/maintenance/intervention"
            refPreview="INT-AAAA-00000"
            introText="Un appareil en panne ? Décrivez le problème, choisissez l'atelier ou le déplacement, et un technicien vous rappelle pour confirmer le rendez-vous."
            steps={intSteps}
            activeStepIndex={step - 1}
            onStepClick={(idx) => setStep(idx + 1)}
            enteredByAgent={enteredByAgent}
            resumeLink={resumeLink}
          >
            {step === 1 && (
              <PdfStepCard tone="intervention" stepNum="1" title="Le problème" stepMeta="Étape 1 sur 4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField
                    label="Type d'équipement"
                    required
                    helper="Choix : Ordinateur portable · Ordinateur de bureau · Imprimante · Caméra / enregistreur · Traceur GPS · Réseau / Wi-Fi · Autre"
                    error={fieldErrors.equipement}
                  >
                    <OfficeAwareSelect
                      officeMode={Boolean(enteredByAgent)}
                      fieldKey="office_int_equipement"
                      value={formState.equipement}
                      onChange={(val) => {
                        setFormState((prev) => {
                          const next = { ...prev, equipement: val, problemePrincipal: '' };
                          if (!enteredByAgent) saveFormDraft('intervention', next);
                          return next;
                        });
                        setFieldErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.equipement;
                          delete copy.problemePrincipal;
                          return copy;
                        });
                      }}
                      options={EQUIPEMENT_OPTIONS}
                      className={INT_INPUT_CLASS}
                    />
                  </PdfField>

                  <PdfField label="Marque et modèle">
                    <input
                      type="text"
                      value={formState.marqueModele}
                      onChange={(e) => updateField('marqueModele', e.target.value)}
                      placeholder="Ex. : HP EliteBook 840 G6"
                      className={INT_INPUT_CLASS}
                    />
                  </PdfField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField
                    label="Problème principal"
                    required
                    helper="La liste change selon l'équipement (ex. : « Pas d'image » pour une caméra)."
                    error={fieldErrors.problemePrincipal}
                  >
                    <OfficeAwareSelect
                      officeMode={Boolean(enteredByAgent)}
                      fieldKey={`office_int_probleme_${formState.equipement}`}
                      value={formState.problemePrincipal}
                      onChange={(val) => updateField('problemePrincipal', val)}
                      options={[
                        ...(!enteredByAgent ? [{ value: '', label: 'Choisir…' }] : []),
                        ...problemeOptions,
                      ]}
                      className={INT_INPUT_CLASS}
                    />
                  </PdfField>

                  <PdfField
                    label="Depuis quand ?"
                    helper="Choix : Aujourd'hui · Quelques jours · Plus d'une semaine"
                  >
                    <OfficeAwareSelect
                      officeMode={Boolean(enteredByAgent)}
                      fieldKey="office_int_depuis_quand"
                      value={formState.depuisQuand}
                      onChange={(val) => updateField('depuisQuand', val)}
                      options={[
                        ...(!enteredByAgent ? [{ value: '', label: 'Choisir…' }] : []),
                        "Aujourd'hui",
                        'Quelques jours',
                        "Plus d'une semaine",
                      ]}
                      className={INT_INPUT_CLASS}
                    />
                  </PdfField>
                </div>

                <PdfField label="Décrivez le problème" required error={fieldErrors.description}>
                  <textarea
                    rows={3}
                    value={formState.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Ce qui se passe, messages d'erreur, ce que vous avez déjà essayé…"
                    className={INT_INPUT_CLASS}
                  />
                </PdfField>

                <FileAttachmentPicker
                  label="Photo ou courte vidéo"
                  files={attachments}
                  onChange={setAttachments}
                  maxFiles={3}
                  maxSizeMb={20}
                  accept=".jpg,.jpeg,.png,.mp4"
                  helperText="JPG, PNG, MP4 — 20 Mo max."
                />

                <CustomFieldsRenderer
                  fields={customFields}
                  step={1}
                  values={formState}
                  onChange={updateField}
                  officeMode={Boolean(enteredByAgent)}
                />

                <PdfFormActions
                  canGoBack={false}
                  showSaveDraft={false}
                  isLastStep={false}
                  onNext={handleNext}
                  submitLabel="Envoyer ma demande"
                />
              </PdfStepCard>
            )}

            {step === 2 && (
              <PdfStepCard tone="intervention" stepNum="2" title="Urgence et lieu" stepMeta="Étape 2 sur 4">
                <PdfField label="Niveau d'urgence" required error={fieldErrors.urgence}>
                  <PdfRadioGroup
                    tone="intervention"
                    name="int_urgence"
                    value={formState.urgence}
                    onChange={(v) => updateField('urgence', v)}
                    options={['Normale', 'Urgente (sous 24 h)', 'Bloquante pour mon activité']}
                  />
                </PdfField>

                <PdfField label="Où se fait l'intervention ?" required error={fieldErrors.lieuMode}>
                  <PdfRadioGroup
                    tone="intervention"
                    name="int_lieu"
                    value={formState.lieuMode}
                    onChange={(v) => updateField('lieuMode', v)}
                    options={["Je dépose l'appareil à l'atelier (Gombe)", 'Un technicien se déplace']}
                  />
                </PdfField>

                {isDeplacement && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <PdfField label="Adresse d'intervention" required error={fieldErrors.adresse}>
                        <input
                          type="text"
                          value={formState.adresse}
                          onChange={(e) => updateField('adresse', e.target.value)}
                          placeholder="Avenue, numéro, quartier"
                          className={INT_INPUT_CLASS}
                        />
                      </PdfField>
                      <PdfField label="Commune" required helper="Choix : Gombe · Limete · Ngaliema · … (liste)" error={fieldErrors.commune}>
                        <OfficeAwareSelect
                          officeMode={Boolean(enteredByAgent)}
                          fieldKey="office_int_commune"
                          value={formState.commune}
                          onChange={(val) => updateField('commune', val)}
                          options={[
                            ...(!enteredByAgent ? [{ value: '', label: 'Choisir…' }] : []),
                            ...KINSHASA_COMMUNES,
                            'Autre',
                          ]}
                          className={INT_INPUT_CLASS}
                        />
                      </PdfField>
                    </div>

                    {formState.commune === 'Autre' && (
                      <PdfField label="Précisez votre commune" required error={fieldErrors.communeAutre}>
                        <input
                          type="text"
                          value={formState.communeAutre}
                          onChange={(e) => updateField('communeAutre', e.target.value)}
                          placeholder="Nom de la commune"
                          className={INT_INPUT_CLASS}
                        />
                      </PdfField>
                    )}

                    <PdfField label="Point de repère">
                      <input
                        type="text"
                        value={formState.pointRepere}
                        onChange={(e) => updateField('pointRepere', e.target.value)}
                        placeholder="Ex. : en face de la pharmacie…"
                        className={INT_INPUT_CLASS}
                      />
                    </PdfField>
                  </>
                )}

                {isAtelier && (
                  <PdfCallout variant="info" title="Atelier Top Maintenance — Gombe">
                    <p>
                      <strong>Adresse :</strong> {settings.address} ({settings.addressLandmarks})
                    </p>
                    <p className="mt-1">
                      <strong>Horaires d'ouverture :</strong> {settings.openingHours}
                    </p>
                    <p className="mt-1">
                      <strong>Diagnostic :</strong> {settings.maintenanceForfaitDiag}
                    </p>
                  </PdfCallout>
                )}

                {isDeplacement && (
                  <PdfCallout variant="info" title="Intervention sur place à Kinshasa">
                    <p>
                      <strong>Zones couvertes :</strong> {data.services[0]?.coverageZones || 'Kinshasa (Gombe, Lingwala, Limete, Ngaliema, Kintambo, Bandalungwa, Kalamu et environs)'}
                    </p>
                    <p className="mt-1">
                      <strong>Frais de déplacement :</strong> {settings.maintenanceForfaitDeplacement || 'Communiqués lors de la confirmation par le technicien.'}
                    </p>
                  </PdfCallout>
                )}

                <CustomFieldsRenderer
                  fields={customFields}
                  step={2}
                  values={formState}
                  onChange={updateField}
                  officeMode={Boolean(enteredByAgent)}
                />

                <PdfFormActions
                  canGoBack
                  onBack={() => setStep(1)}
                  onSaveDraft={handleSaveDraft}
                  showSaveDraft={!enteredByAgent}
                  isLastStep={false}
                  onNext={handleNext}
                  submitLabel="Envoyer ma demande"
                />
              </PdfStepCard>
            )}

            {step === 3 && (
              <PdfStepCard tone="intervention" stepNum="3" title="Rendez-vous souhaité" stepMeta="Étape 3 sur 4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField
                    label="Date souhaitée"
                    required
                    helper="Lundi à samedi (les dimanches sont fermés). Le créneau est confirmé par notre équipe."
                    error={fieldErrors.dateSouhaitee}
                  >
                    <input
                      type="date"
                      min={todayIso}
                      value={formState.dateSouhaitee}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateField('dateSouhaitee', val);
                        if (isSundaySelected(val)) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            dateSouhaitee: "L'atelier est fermé le dimanche. Veuillez choisir un jour entre lundi et samedi.",
                          }));
                        }
                      }}
                      className={INT_INPUT_CLASS}
                    />
                  </PdfField>

                  <PdfField label="Moment de la journée" required error={fieldErrors.demiJournee}>
                    <PdfRadioGroup
                      tone="intervention"
                      name="int_moment"
                      value={formState.demiJournee}
                      onChange={(v) => updateField('demiJournee', v)}
                      options={['Matin', 'Après-midi', 'Indifférent']}
                    />
                  </PdfField>
                </div>

                <CustomFieldsRenderer
                  fields={customFields}
                  step={3}
                  values={formState}
                  onChange={updateField}
                  officeMode={Boolean(enteredByAgent)}
                />

                <PdfFormActions
                  canGoBack
                  onBack={() => setStep(2)}
                  onSaveDraft={handleSaveDraft}
                  showSaveDraft={!enteredByAgent}
                  isLastStep={false}
                  onNext={handleNext}
                  submitLabel="Envoyer ma demande"
                />
              </PdfStepCard>
            )}

            {step === 4 && (
              <PdfStepCard tone="intervention" stepNum="4" title="Vos coordonnées" stepMeta="Étape 4 sur 4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField label="Nom complet" required error={fieldErrors.applicantName}>
                    <input
                      type="text"
                      value={formState.applicantName}
                      onChange={(e) => updateField('applicantName', e.target.value)}
                      placeholder="Ex. : Sarah Nsimba"
                      className={INT_INPUT_CLASS}
                    />
                  </PdfField>

                  <PdfField label="Vous êtes" required error={fieldErrors.profilClient}>
                    <PdfRadioGroup
                      tone="intervention"
                      name="int_profil"
                      value={formState.profilClient}
                      onChange={(v) => updateField('profilClient', v)}
                      options={['Particulier', 'Entreprise / institution']}
                    />
                  </PdfField>
                </div>

                <RdcPhoneInput
                  layout="grid"
                  phone={formState.phone}
                  onPhoneChange={(v) => updateField('phone', v)}
                  whatsapp={formState.whatsapp}
                  onWhatsappChange={(v) => updateField('whatsapp', v)}
                  sameForWhatsapp={formState.sameWhatsapp}
                  onSameChange={(v) => updateField('sameWhatsapp', v)}
                  error={fieldErrors.phone}
                  whatsappError={fieldErrors.whatsapp}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField label="Adresse e-mail" error={fieldErrors.email}>
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="Facultatif"
                      className={INT_INPUT_CLASS}
                    />
                  </PdfField>

                  {formState.profilClient === 'Entreprise / institution' && (
                    <PdfField label="Organisation" required error={fieldErrors.organisation}>
                      <input
                        type="text"
                        value={formState.organisation}
                        onChange={(e) => updateField('organisation', e.target.value)}
                        placeholder="Ex. : Clinique XYZ"
                        className={INT_INPUT_CLASS}
                      />
                    </PdfField>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PdfField label="Appareil acheté chez Lomakrev ?">
                    <PdfRadioGroup
                      tone="intervention"
                      name="int_achete_lomakrev"
                      value={formState.acheteLomakrev}
                      onChange={(v) => updateField('acheteLomakrev', v)}
                      options={['Oui', 'Non']}
                    />
                  </PdfField>

                  {(formState.acheteLomakrev === 'Oui' || formState.profilClient === 'Entreprise / institution') && (
                    <PdfField label="N° de facture ou de contrat">
                      <input
                        type="text"
                        value={formState.numeroContrat}
                        onChange={(e) => updateField('numeroContrat', e.target.value)}
                        placeholder="Pour vérifier garantie ou contrat"
                        className={INT_INPUT_CLASS}
                      />
                    </PdfField>
                  )}
                </div>

                <CustomFieldsRenderer
                  fields={customFields}
                  step={4}
                  values={formState}
                  onChange={updateField}
                  officeMode={Boolean(enteredByAgent)}
                />

                <PdfCallout variant="info" title="Mention affichée avant l'envoi">
                  Le diagnostic peut être facturé selon les conditions de Top Maintenance. Le prix de la réparation vous est toujours communiqué avant tout travail.
                </PdfCallout>

                <div>
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-800 select-none">
                    <input
                      type="checkbox"
                      checked={formState.consent}
                      onChange={(e) => updateField('consent', e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#B45309]"
                    />
                    <span>
                      J'accepte que Lomakrev Group traite mes données pour cette intervention.{' '}
                      <span className="text-[#D90A14]">*</span>
                    </span>
                  </label>
                  {fieldErrors.consent && <p className="mt-1 text-xs font-medium text-[#D90A14]">{fieldErrors.consent}</p>}
                </div>

                {fieldErrors.submit && (
                  <PdfCallout variant="danger" title="Impossible d'envoyer la demande">
                    {fieldErrors.submit}
                  </PdfCallout>
                )}

                <PdfFormActions
                  canGoBack
                  onBack={() => setStep(3)}
                  onSaveDraft={handleSaveDraft}
                  showSaveDraft={!enteredByAgent}
                  isLastStep
                  submitting={submitting}
                  submittingLabel="Envoi en cours..."
                  submitLabel="Envoyer ma demande"
                />
              </PdfStepCard>
            )}
          </PdfFormShell>
        </form>
      )}
    </div>
  );
};
