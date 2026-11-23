import type { Dossier, DossierType, SiteSettings } from '../types/lomakrev';

export interface PrintableDocument {
  kind: 'devis' | 'dossier' | 'attestation' | 'presence';
  title: string;
  dossier?: Dossier;
  formationTitle?: string;
  sessionCode?: string;
  participants?: Dossier[];
}

export function formatCurrencyUsd(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} USD`;
}

export function formatCurrencyCdf(amountUsd: number, rate: number): string {
  const cdf = Math.round(amountUsd * rate);
  return `${cdf.toLocaleString('fr-FR')} CDF`;
}

export function buildWhatsAppShareUrl(url: string, text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

export function buildFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function buildWhatsAppDirectContact(whatsappNumber: string, text: string): string {
  const clean = whatsappNumber.replace(/[^0-9]/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

export function formatDateFr(iso: string): string {
  if (!iso) return 'À venir';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatDateTimeFr(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function triggerPrintDocument() {
  window.print();
}

export function getPrintFooterInfo(settings: SiteSettings): string {
  return `${settings.legalName} · ${settings.rccm} · IDNat : ${settings.idNat} · ${settings.address} · ${settings.phone} · ${settings.email}`;
}

const DOSSIER_TYPE_LABELS: Record<DossierType, string> = {
  CMD: 'Commande Lomakrev Tech',
  ACA: 'Inscription Lomakrev Académie',
  BRS: 'Candidature Programme de Bourses',
  DEV: 'Demande de devis technique',
  INT: 'Demande d’intervention technique',
  CTC: 'Message de contact',
  WAITLIST: 'Liste d’intérêt Académie',
};

const POLE_LABELS: Record<Dossier['pole'], string> = {
  tech: 'Lomakrev Tech',
  academie: 'Lomakrev Académie',
  bourses: 'Programme de Bourses',
  maintenance: 'Top Maintenance',
  contact: 'Contact & Orientation',
};

export function getDossierTypeLabel(type: DossierType): string {
  return DOSSIER_TYPE_LABELS[type] || type;
}

export function getPoleLabel(pole: Dossier['pole']): string {
  return POLE_LABELS[pole] || pole;
}

const PAYLOAD_FIELD_LABELS: Record<string, string> = {
  // Identité & coordonnées
  nom: 'Nom',
  postnom: 'Postnom',
  prenom: 'Prénom',
  sexe: 'Sexe',
  dateNaissance: 'Date de naissance',
  age: 'Âge',
  phone: 'Téléphone',
  whatsapp: 'WhatsApp',
  email: 'Adresse e-mail',
  province: 'Province',
  ville: 'Ville',
  commune: 'Commune',
  adresse: 'Adresse d’intervention / livraison',
  profilDemandeur: 'Profil du demandeur',
  organisation: 'Entreprise / Organisation',
  fonction: 'Fonction / Poste',
  personneContact: 'Personne de contact',
  contactPrefere: 'Canal de contact préféré',
  source: 'Source / Comment connu',

  // Commandes Tech
  deliveryMode: 'Mode de retrait / livraison',
  totalUsd: 'Montant total (USD)',
  totalCdf: 'Équivalent estimé (CDF)',
  remarque: 'Remarque / Précision client',

  // Académie
  formationSlug: 'Formation choisie',
  formationChoisie: 'Programme / Formation choisi(e)',
  sessionCode: 'Code de session',
  format: 'Format souhaité',
  typeInscription: 'Type d’inscription',
  nbParticipants: 'Nombre de participants',
  besoinFacture: 'Besoin d’une facture / proforma',
  portable: 'Dispose d’un ordinateur portable',
  attentes: 'Attentes de la formation',

  // Bourses
  campaignSlug: 'Campagne de bourse',
  niveauEtudes: 'Niveau d’études',
  etablissement: 'Établissement / Université',
  situation: 'Situation actuelle',
  clientLomakrev: 'Déjà client Lomakrev',
  accesOrdinateur: 'Accès à un ordinateur personnel',
  niveauInfo: 'Niveau en informatique',
  disponibilite: 'Disponibilité aux dates prévues',
  motivation: 'Lettre / Texte de motivation',
  projetPro: 'Projet professionnel',

  // Maintenance & Devis
  serviceKey: 'Service technique demandé',
  equipement: 'Équipement concerné',
  marqueModele: 'Marque & modèle',
  description: 'Description détaillée',
  depuisQuand: 'Depuis quand / Apparition',
  urgence: 'Niveau d’urgence',
  lieuMode: 'Mode d’intervention',
  creneauSouhaite: 'Créneau souhaité',
  dateSouhaitee: 'Date souhaitée',
  demiJournee: 'Demi-journée souhaitée',
  sousContrat: 'Sous contrat de maintenance',
  numeroContrat: 'Numéro de contrat',
  nbAppareils: 'Nombre d’appareils',
  marques: 'Marques concernées',
  typeTravaux: 'Type de travaux',
  usagePostes: 'Usage principal des postes',
  typeLieu: 'Type de site / bâtiment',
  zoneCamera: 'Zones à couvrir',
  nbCameras: 'Nombre de caméras',
  visionDistance: 'Consultation à distance sur téléphone',
  joursEnregistrement: 'Durée d’enregistrement souhaitée',
  repriseInstallation: 'Reprise d’une installation existante',
  nbVehicules: 'Nombre de véhicules',
  typeVehicules: 'Type de véhicules',
  fonctionsGps: 'Fonctionnalités GPS souhaitées',
  nbPostes: 'Nombre de postes réseau',
  surfaceEtages: 'Surface / Niveaux',
  besoinsReseau: 'Besoins réseau',
  connexionExistante: 'Connexion Internet existante',
  budgetIndicatif: 'Budget indicatif',
  visiteTechnique: 'Visite technique souhaitée',

  // Contact & Liste d’attente
  sujet: 'Objet de la demande',
  pole: 'Pôle concerné',
  message: 'Message détaillé',
};

const SKIPPED_PAYLOAD_KEYS = new Set([
  '_website',
  'consent',
  'sameWhatsapp',
  'declarationHonneur',
  'provenance',
  'items',
]);

export function formatPayloadFieldLabel(key: string): string {
  if (PAYLOAD_FIELD_LABELS[key]) return PAYLOAD_FIELD_LABELS[key];
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatPayloadFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'number') {
    if (key === 'totalUsd' || key.endsWith('Usd')) return formatCurrencyUsd(value);
    if (key === 'totalCdf' || key.endsWith('Cdf')) return `${value.toLocaleString('fr-FR')} CDF`;
    return value.toLocaleString('fr-FR');
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '—';
    if (key === 'dateNaissance' || key === 'dateSouhaitee') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return formatDateFr(trimmed);
    }
    return trimmed;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value
      .map((item) => {
        if (item && typeof item === 'object') {
          return Object.entries(item as Record<string, unknown>)
            .map(([k, v]) => `${formatPayloadFieldLabel(k)} : ${formatPayloadFieldValue(k, v)}`)
            .join(' · ');
        }
        return String(item);
      })
      .join(' ; ');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '—';
    return entries.map(([k, v]) => `${formatPayloadFieldLabel(k)} : ${formatPayloadFieldValue(k, v)}`).join(' · ');
  }
  return String(value);
}

export interface PrintableFieldRow {
  key: string;
  label: string;
  value: string;
}

export function extractOrderedPayloadEntries(dossier: Dossier): PrintableFieldRow[] {
  const raw = dossier.payload || {};
  const rows: PrintableFieldRow[] = [];
  for (const [key, val] of Object.entries(raw)) {
    if (SKIPPED_PAYLOAD_KEYS.has(key)) continue;
    if (val === undefined || val === null || val === '') continue;
    // Avoid repeating top-level identity fields only if identical and empty/noise, otherwise keep structured info readable
    if (key === 'applicantName' && String(val).trim() === dossier.applicantName.trim()) continue;
    if (key === 'phone' && String(val).trim() === dossier.phone.trim()) continue;
    if (key === 'whatsapp' && String(val).trim() === String(dossier.whatsapp || '').trim()) continue;
    if (key === 'email' && String(val).trim() === String(dossier.email || '').trim()) continue;
    rows.push({
      key,
      label: formatPayloadFieldLabel(key),
      value: formatPayloadFieldValue(key, val),
    });
  }
  return rows;
}
