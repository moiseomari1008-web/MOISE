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
import { clearFormDraft, loadFormDraft, saveFormDraft } from '../lib/offlineSync';

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
              <PhotoFrame src={svc.imageUrl} alt={svc.title} aspectClass="aspect-[4/3]" className="border-b border-slate-100" />
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
        <div className="lg:col-span-6">
          <PhotoFrame src={service.imageUrl} alt={service.title} aspectClass="aspect-[4/3]" className="rounded-xl border border-slate-200" priority />
        </div>
        <div className="lg:col-span-6">
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

export const MaintenanceDevisPage: React.FC<{ enteredByAgent?: string | null; onDone?: () => void }> = ({
  enteredByAgent = null,
  onDone,
}) => {
  const { data, searchQuery, submitForm, navigate } = useApp();
  const params = new URLSearchParams(searchQuery);
  const preselectedService = params.get('service') || 'ordinateurs';

  const [step, setStep] = useState(1);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [formState, setFormState] = useState<Record<string, any>>({
    serviceKey: preselectedService,
    // Ordinateurs / multi-postes
    nbAppareils: '5',
    marques: '',
    typeTravaux: 'Réparation',
    usagePostes: 'Bureautique & Comptabilité',
    // Caméras
    typeLieu: 'Bureau',
    zoneCamera: 'Intérieur et Extérieur',
    nbCameras: '8',
    visionDistance: 'Oui',
    joursEnregistrement: '30 jours',
    repriseInstallation: 'Non',
    // GPS
    nbVehicules: '3',
    typeVehicules: 'Voiture',
    fonctionsGps: 'Suivi en direct, Coupure moteur, Historique, Alertes',
    // Réseau
    nbPostes: '12',
    surfaceEtages: '1 niveau / ~180 m²',
    besoinsReseau: 'Wi-Fi et Câblage RJ45',
    connexionExistante: 'Oui',
    // Lieu & délai
    adresse: '',
    ville: 'Kinshasa',
    dateSouhaitee: '',
    budgetIndicatif: '',
    visiteTechnique: 'Oui',
    // Demandeur
    profilDemandeur: 'Entreprise',
    applicantName: '',
    organisation: '',
    fonction: '',
    phone: '+243',
    whatsapp: '+243',
    sameWhatsapp: true,
    email: '',
    contactPrefere: 'Téléphone / WhatsApp',
    consent: false,
    _website: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!enteredByAgent) {
      loadFormDraft('devis').then((saved) => {
        if (saved) setFormState((prev) => ({ ...prev, ...saved, serviceKey: params.get('service') || (saved.serviceKey as string) || prev.serviceKey }));
      });
    }
  }, [enteredByAgent]);

  const updateField = (k: string, v: any) => {
    setFormState((prev) => {
      const next = { ...prev, [k]: v };
      if (!enteredByAgent) saveFormDraft('devis', next);
      return next;
    });
  };

  if (!data) return null;
  const customFields = data.forms.devis?.customFields || [];

  const serviceChoices = [
    { key: 'ordinateurs', label: 'Ordinateurs (maintenance / parc)' },
    { key: 'cameras', label: 'Caméras de surveillance' },
    { key: 'gps', label: 'Traceurs GPS' },
    { key: 'reseau', label: 'Réseau informatique' },
    { key: 'contrat', label: 'Contrat de maintenance' },
    { key: 'multi-postes', label: 'Achat de plusieurs ordinateurs' },
    { key: 'autre', label: 'Autre besoin IT' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formState.applicantName.trim()) {
      setError('Veuillez indiquer votre nom.');
      return;
    }
    if (!validateRdcPhone(formState.phone)) {
      setError('Numéro RDC invalide (+243 suivi de 9 chiffres).');
      return;
    }
    if (!formState.consent) {
      setError('Veuillez accepter le traitement de votre demande de devis.');
      return;
    }
    setSubmitting(true);
    const res = await submitForm(
      'DEV',
      `Devis ${formState.serviceKey} — ${formState.applicantName}`,
      {
        applicantName: formState.applicantName,
        phone: formState.phone,
        whatsapp: formState.sameWhatsapp ? formState.phone : formState.whatsapp,
        email: formState.email,
        commune: formState.adresse,
        ville: formState.ville,
        serviceKey: formState.serviceKey,
        attachments,
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
    if (!enteredByAgent) clearFormDraft('devis');
    setResult(res);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      {!enteredByAgent && <Breadcrumbs items={[{ label: 'Top Maintenance', to: '/maintenance' }, { label: 'Demande de devis' }]} />}

      {result ? (
        <SubmissionSuccessCard
          offline={result.offline}
          localId={result.localId}
          dossier={result.dossier}
          onReset={() => {
            setResult(null);
            if (onDone) onDone();
            else navigate('/maintenance');
          }}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#D90A14]">
              {enteredByAgent ? `Saisie au bureau (${enteredByAgent})` : 'Top Maintenance · Mini-cahier des charges'}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900">Demander un devis détaillé</h1>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#FEF3C7]">
              <div className="h-full bg-[#D90A14] transition-all" style={{ width: `${(step / 5) * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Étape {step} sur 5</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 1 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-800">Quel service souhaitez-vous chiffrer ? *</label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {serviceChoices.map((ch) => (
                    <button
                      key={ch.key}
                      type="button"
                      onClick={() => updateField('serviceKey', ch.key)}
                      className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                        formState.serviceKey === ch.key ? 'border-[#D90A14] bg-[#D90A14] text-white' : 'border-slate-300 text-slate-700 hover:bg-[#FFFBEB]'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
                <CustomFieldsRenderer fields={customFields} step={1} values={formState} onChange={updateField} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {(formState.serviceKey === 'ordinateurs' || formState.serviceKey === 'multi-postes' || formState.serviceKey === 'contrat') && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-800">Nombre d’appareils / postes</label>
                      <input type="number" value={formState.nbAppareils} onChange={(e) => updateField('nbAppareils', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-800">Marques / modèles ou usage principal</label>
                      <input type="text" value={formState.marques} onChange={(e) => updateField('marques', e.target.value)} placeholder="Ex. HP EliteBook, postes comptabilité..." className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-800">Type de besoin</label>
                      <select value={formState.typeTravaux} onChange={(e) => updateField('typeTravaux', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                        <option>Réparation</option>
                        <option>Mise à niveau (RAM / SSD)</option>
                        <option>Installation de logiciels</option>
                        <option>Récupération de données</option>
                        <option>Fourniture de postes neufs / quasi neufs</option>
                        <option>Contrat d’entretien annuel</option>
                      </select>
                    </div>
                  </>
                )}

                {formState.serviceKey === 'cameras' && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-800">Type de lieu</label>
                        <select value={formState.typeLieu} onChange={(e) => updateField('typeLieu', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                          <option>Maison</option>
                          <option>Boutique</option>
                          <option>Bureau</option>
                          <option>Dépôt / Entrepôt</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-800">Nombre de caméras souhaitées</label>
                        <input type="number" value={formState.nbCameras} onChange={(e) => updateField('nbCameras', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-800">Vision à distance sur téléphone</label>
                        <select value={formState.visionDistance} onChange={(e) => updateField('visionDistance', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                          <option>Oui</option>
                          <option>Non</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-800">Durée d’enregistrement</label>
                        <select value={formState.joursEnregistrement} onChange={(e) => updateField('joursEnregistrement', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                          <option>7 jours</option>
                          <option>15 jours</option>
                          <option>30 jours</option>
                          <option>60 jours et plus</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {formState.serviceKey === 'gps' && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-800">Nombre de véhicules</label>
                        <input type="number" value={formState.nbVehicules} onChange={(e) => updateField('nbVehicules', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-800">Type de véhicules</label>
                        <select value={formState.typeVehicules} onChange={(e) => updateField('typeVehicules', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                          <option>Voiture</option>
                          <option>Moto</option>
                          <option>Camion / Utilitaire</option>
                          <option>Flotte mixte</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-800">Fonctions souhaitées</label>
                      <input type="text" value={formState.fonctionsGps} onChange={(e) => updateField('fonctionsGps', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                    </div>
                  </>
                )}

                {formState.serviceKey === 'reseau' && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-800">Nombre de postes</label>
                        <input type="number" value={formState.nbPostes} onChange={(e) => updateField('nbPostes', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-800">Surface / étages</label>
                        <input type="text" value={formState.surfaceEtages} onChange={(e) => updateField('surfaceEtages', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-800">Wi-Fi, câblage & connexion existante</label>
                      <input type="text" value={formState.besoinsReseau} onChange={(e) => updateField('besoinsReseau', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                    </div>
                  </>
                )}

                {formState.serviceKey === 'autre' && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Décrivez votre besoin</label>
                    <textarea rows={4} value={formState.marques} onChange={(e) => updateField('marques', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                )}
                <CustomFieldsRenderer fields={customFields} step={2} values={formState} onChange={updateField} />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Adresse ou commune *</label>
                    <input type="text" value={formState.adresse} onChange={(e) => updateField('adresse', e.target.value)} placeholder="Ex. Gombe, Avenue..." className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Ville *</label>
                    <input type="text" value={formState.ville} onChange={(e) => updateField('ville', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Date de réalisation souhaitée</label>
                    <input type="date" value={formState.dateSouhaitee} onChange={(e) => updateField('dateSouhaitee', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Budget indicatif (facultatif)</label>
                    <input type="text" value={formState.budgetIndicatif} onChange={(e) => updateField('budgetIndicatif', e.target.value)} placeholder="Ex. 1 500 USD" className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">Visite technique souhaitée avant devis ?</label>
                  <select value={formState.visiteTechnique} onChange={(e) => updateField('visiteTechnique', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                    <option>Oui</option>
                    <option>Non</option>
                  </select>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Vous êtes *</label>
                    <select value={formState.profilDemandeur} onChange={(e) => updateField('profilDemandeur', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                      <option>Particulier</option>
                      <option>Entreprise</option>
                      <option>Institution / ONG / École</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Nom complet *</label>
                    <input type="text" value={formState.applicantName} onChange={(e) => updateField('applicantName', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                </div>
                {formState.profilDemandeur !== 'Particulier' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input type="text" placeholder="Organisation / Entreprise" value={formState.organisation} onChange={(e) => updateField('organisation', e.target.value)} className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                    <input type="text" placeholder="Fonction" value={formState.fonction} onChange={(e) => updateField('fonction', e.target.value)} className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                )}
                <RdcPhoneInput
                  phone={formState.phone}
                  onPhoneChange={(v) => updateField('phone', v)}
                  whatsapp={formState.whatsapp}
                  onWhatsappChange={(v) => updateField('whatsapp', v)}
                  sameForWhatsapp={formState.sameWhatsapp}
                  onSameChange={(v) => updateField('sameWhatsapp', v)}
                />
                <input type="email" placeholder="E-mail (facultatif)" value={formState.email} onChange={(e) => updateField('email', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <FileAttachmentPicker
                  label="Photos du lieu, plan ou cahier des charges (facultatif)"
                  files={attachments}
                  onChange={setAttachments}
                />
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                  <input type="checkbox" checked={formState.consent} onChange={(e) => updateField('consent', e.target.checked)} className="mt-1 h-4 w-4 accent-[#D90A14]" />
                  <span>J’accepte que LOMAKREV GROUP utilise ces informations pour établir mon devis.</span>
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
                <button type="button" onClick={() => setStep((s) => s + 1)} className="rounded-lg bg-[#D90A14] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#B80811]">
                  Continuer
                </button>
              ) : (
                <button type="submit" disabled={submitting} className="rounded-lg bg-[#D90A14] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#b80811] disabled:opacity-60">
                  {submitting ? 'Envoi...' : 'Envoyer la demande de devis'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export const MaintenanceInterventionPage: React.FC<{ enteredByAgent?: string | null; onDone?: () => void }> = ({
  enteredByAgent = null,
  onDone,
}) => {
  const { data, submitForm, navigate } = useApp();
  const [step, setStep] = useState(1);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [formState, setFormState] = useState<Record<string, any>>({
    equipement: 'Ordinateur portable',
    marqueModele: '',
    description: '',
    depuisQuand: '',
    urgence: 'Normale',
    lieuMode: 'Dépôt à l’atelier (Gombe)',
    adresse: '',
    commune: 'Gombe',
    dateSouhaitee: '',
    demiJournee: 'Matin (09h00 – 12h30)',
    applicantName: '',
    phone: '+243',
    whatsapp: '+243',
    sameWhatsapp: true,
    email: '',
    sousContrat: 'Non',
    numeroContrat: '',
    consent: false,
    _website: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!enteredByAgent) {
      loadFormDraft('intervention').then((saved) => {
        if (saved) setFormState((prev) => ({ ...prev, ...saved }));
      });
    }
  }, [enteredByAgent]);

  const updateField = (k: string, v: any) => {
    setFormState((prev) => {
      const next = { ...prev, [k]: v };
      if (!enteredByAgent) saveFormDraft('intervention', next);
      return next;
    });
  };

  if (!data) return null;
  const settings = data.settings;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formState.applicantName.trim()) {
      setError('Veuillez saisir votre nom.');
      return;
    }
    if (!validateRdcPhone(formState.phone)) {
      setError('Numéro RDC invalide (+243 suivi de 9 chiffres).');
      return;
    }
    if (!formState.consent) {
      setError('Veuillez accepter les conditions de prise en charge.');
      return;
    }
    setSubmitting(true);
    const res = await submitForm(
      'INT',
      `Intervention ${formState.equipement} — ${formState.applicantName}`,
      {
        applicantName: formState.applicantName,
        phone: formState.phone,
        whatsapp: formState.sameWhatsapp ? formState.phone : formState.whatsapp,
        email: formState.email,
        commune: formState.commune,
        ville: 'Kinshasa',
        serviceKey: formState.equipement,
        attachments,
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
    if (!enteredByAgent) clearFormDraft('intervention');
    setResult(res);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      {!enteredByAgent && <Breadcrumbs items={[{ label: 'Top Maintenance', to: '/maintenance' }, { label: 'Demande d’intervention' }]} />}

      {result ? (
        <SubmissionSuccessCard
          offline={result.offline}
          localId={result.localId}
          dossier={result.dossier}
          onReset={() => {
            setResult(null);
            if (onDone) onDone();
            else navigate('/maintenance');
          }}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#D90A14]">
              {enteredByAgent ? `Saisie au bureau (${enteredByAgent})` : 'Top Maintenance · Dépannage'}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900">Demander une intervention technique</h1>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#FEF3C7]">
              <div className="h-full bg-[#D90A14] transition-all" style={{ width: `${(step / 5) * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Étape {step} sur 5</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">Type d’équipement *</label>
                  <select value={formState.equipement} onChange={(e) => updateField('equipement', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                    <option>Ordinateur portable</option>
                    <option>Ordinateur de bureau</option>
                    <option>Caméras de surveillance</option>
                    <option>Traceur GPS</option>
                    <option>Réseau informatique / Wi-Fi</option>
                  </select>
                </div>
                <input type="text" placeholder="Marque et modèle (ex. HP EliteBook 840 G8)" value={formState.marqueModele} onChange={(e) => updateField('marqueModele', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                <textarea rows={3} placeholder="Description de la panne constatée *" value={formState.description} onChange={(e) => updateField('description', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                <input type="text" placeholder="Depuis quand le problème existe-t-il ?" value={formState.depuisQuand} onChange={(e) => updateField('depuisQuand', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                <FileAttachmentPicker label="Photos de la panne (facultatif)" files={attachments} onChange={setAttachments} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-800">Niveau d’urgence *</label>
                {['Normale', 'Urgente (sous 24 h)', 'Bloquante pour mon activité'].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => updateField('urgence', u)}
                    className={`block w-full rounded-lg border px-4 py-3.5 text-left text-sm font-semibold transition-colors ${
                      formState.urgence === u ? 'border-[#D90A14] bg-[#D90A14] text-white' : 'border-slate-300 text-slate-700 hover:bg-[#FFFBEB]'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-800">Lieu d’intervention *</label>
                {['Dépôt à l’atelier (Gombe)', 'Intervention sur place'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => updateField('lieuMode', l)}
                    className={`block w-full rounded-lg border px-4 py-3.5 text-left text-sm font-semibold transition-colors ${
                      formState.lieuMode === l ? 'border-[#D90A14] bg-[#D90A14] text-white' : 'border-slate-300 text-slate-700 hover:bg-[#FFFBEB]'
                    }`}
                  >
                    {l}
                  </button>
                ))}
                {formState.lieuMode === 'Intervention sur place' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input type="text" placeholder="Commune" value={formState.commune} onChange={(e) => updateField('commune', e.target.value)} className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                    <input type="text" placeholder="Adresse complète" value={formState.adresse} onChange={(e) => updateField('adresse', e.target.value)} className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">Date souhaitée</label>
                  <input type="date" value={formState.dateSouhaitee} onChange={(e) => updateField('dateSouhaitee', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-800">Demi-journée souhaitée</label>
                  <select value={formState.demiJournee} onChange={(e) => updateField('demiJournee', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                    <option>Matin (09h00 – 12h30)</option>
                    <option>Après-midi (13h30 – 17h30)</option>
                  </select>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                  <p><strong>Forfait diagnostic :</strong> {settings.maintenanceForfaitDiag || 'Tarif communiqué après diagnostic'}</p>
                  <p className="mt-1"><strong>Déplacement :</strong> {settings.maintenanceForfaitDeplacement || 'Tarif communiqué après diagnostic'}</p>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <input type="text" placeholder="Nom complet *" value={formState.applicantName} onChange={(e) => updateField('applicantName', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                <RdcPhoneInput
                  phone={formState.phone}
                  onPhoneChange={(v) => updateField('phone', v)}
                  whatsapp={formState.whatsapp}
                  onWhatsappChange={(v) => updateField('whatsapp', v)}
                  sameForWhatsapp={formState.sameWhatsapp}
                  onSameChange={(v) => updateField('sameWhatsapp', v)}
                />
                <input type="email" placeholder="E-mail (facultatif)" value={formState.email} onChange={(e) => updateField('email', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select value={formState.sousContrat} onChange={(e) => updateField('sousContrat', e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base">
                    <option value="Non">Client ponctuel</option>
                    <option value="Oui">Déjà client sous contrat</option>
                  </select>
                  {formState.sousContrat === 'Oui' && (
                    <input type="text" placeholder="N° de contrat" value={formState.numeroContrat} onChange={(e) => updateField('numeroContrat', e.target.value)} className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-base" />
                  )}
                </div>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                  <input type="checkbox" checked={formState.consent} onChange={(e) => updateField('consent', e.target.checked)} className="mt-1 h-4 w-4 accent-[#D90A14]" />
                  <span>J’accepte les modalités d’intervention et la politique de confidentialité.</span>
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
                <button type="button" onClick={() => setStep((s) => s + 1)} className="rounded-lg bg-[#D90A14] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#B80811]">
                  Continuer
                </button>
              ) : (
                <button type="submit" disabled={submitting} className="rounded-lg bg-[#D90A14] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#b80811] disabled:opacity-60">
                  {submitting ? 'Enregistrement...' : 'Confirmer la demande'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
