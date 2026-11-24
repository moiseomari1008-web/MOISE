import QRCode from 'qrcode';
import type {
  Dossier,
  DossierNotification,
  DossierTimelineEvent,
  DossierType,
  SiteSettings,
} from '../types/lomakrev';

export interface PrintableDocument {
  kind: 'devis' | 'dossier' | 'attestation' | 'presence';
  title: string;
  dossier?: Dossier;
  formationTitle?: string;
  sessionCode?: string;
  participants?: Dossier[];
}

export interface ClientFicheDossier {
  reference: string;
  type: DossierType;
  pole?: Dossier['pole'];
  status: string;
  applicantName: string;
  phone?: string;
  whatsapp?: string | null;
  email?: string | null;
  commune?: string | null;
  ville?: string | null;
  formationSlug?: string | null;
  sessionCode?: string | null;
  campaignSlug?: string | null;
  serviceKey?: string | null;
  eligibilityStatus?: string | null;
  eligibilityReason?: string | null;
  rejectionReason?: string | null;
  autoMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  payload?: Record<string, unknown>;
  attachments?: { name?: string; type?: string; size?: number; dataUrl?: string }[];
  timeline?: DossierTimelineEvent[];
  notifications?: DossierNotification[];
  quoteDetails?: Dossier['quoteDetails'];
  interventionLog?: Dossier['interventionLog'];
}

export interface UnifiedClientProfile {
  name: string;
  phone: string;
  email?: string;
  commune?: string;
  dossiers: Dossier[];
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

export function getPoleLabel(pole?: Dossier['pole']): string {
  if (!pole) return 'Lomakrev Group';
  return POLE_LABELS[pole] || pole;
}

export function inferPoleFromType(type: DossierType): Dossier['pole'] {
  if (type === 'CMD') return 'tech';
  if (type === 'ACA' || type === 'WAITLIST') return 'academie';
  if (type === 'BRS') return 'bourses';
  if (type === 'DEV' || type === 'INT') return 'maintenance';
  return 'contact';
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
  adresse: 'Adresse',
  pointRepere: 'Point de repère',
  profilDemandeur: 'Profil du demandeur',
  profilClient: 'Profil du client',
  organisation: 'Entreprise / Organisation',
  organisationFonction: 'Organisation et fonction',
  secteurActivite: 'Secteur d’activité',
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
  besoinFacture: 'Facture au nom de l’organisation',
  portable: 'Ordinateur portable pendant la formation',
  attentes: 'Attentes de la formation',
  modePaiement: 'Mode de paiement envisagé',

  // Bourses
  campaignSlug: 'Campagne de bourse',
  niveauEtudes: 'Niveau d’études',
  etablissement: 'Établissement ou filière',
  situation: 'Situation actuelle',
  clientLomakrev: 'Déjà client Lomakrev',
  numeroFacture: 'N° de facture ou de commande',
  accesOrdinateur: 'Accès à un ordinateur',
  niveauInfo: 'Niveau en informatique',
  disponibilite: 'Disponibilité aux dates prévues',
  motivation: 'Motivation pour la formation',
  projetPro: 'Projet après la formation',

  // Maintenance & Devis
  serviceKey: 'Service technique demandé',
  serviceTitle: 'Service choisi',
  equipement: 'Type d’équipement',
  marqueModele: 'Marque et modèle',
  problemePrincipal: 'Problème principal',
  description: 'Description détaillée',
  descriptionBesoin: 'Description du besoin',
  depuisQuand: 'Depuis quand',
  urgence: 'Niveau d’urgence',
  lieuMode: 'Lieu d’intervention',
  creneauSouhaite: 'Créneau souhaité',
  dateSouhaitee: 'Date souhaitée',
  demiJournee: 'Moment de la journée',
  acheteLomakrev: 'Appareil acheté chez Lomakrev',
  sousContrat: 'Sous contrat de maintenance',
  numeroContrat: 'N° de facture ou de contrat',
  nbAppareils: 'Nombre d’appareils',
  marques: 'Marques et modèles',
  travauxSouhaites: 'Travaux souhaités',
  typeTravaux: 'Type de travaux',
  quantitePostes: 'Quantité d’ordinateurs',
  usagePostes: 'Usage prévu',
  budgetParPoste: 'Budget par poste (USD)',
  typeLieu: 'Type de lieu',
  emplacement: 'Emplacement',
  zoneCamera: 'Zones à couvrir',
  nbCameras: 'Nombre de caméras souhaité',
  visionDistance: 'Voir les images sur téléphone',
  joursEnregistrement: 'Durée d’enregistrement souhaitée',
  repriseInstallation: 'Installation existante',
  nbVehicules: 'Nombre de véhicules',
  typesVehicules: 'Types de véhicules',
  typeVehicules: 'Type de véhicules',
  fonctionsGpsList: 'Fonctions GPS souhaitées',
  fonctionsGps: 'Fonctionnalités GPS souhaitées',
  nbPostes: 'Nombre de postes',
  surfaceEtages: 'Surface ou nombre d’étages',
  besoinsReseauList: 'Besoins réseau',
  besoinsReseau: 'Besoins réseau',
  nbEquipementsContrat: 'Nombre d’équipements à entretenir',
  frequenceContrat: 'Fréquence d’entretien souhaitée',
  connexionExistante: 'Connexion Internet existante',
  budgetIndicatif: 'Budget indicatif (USD)',
  visiteTechnique: 'Visite technique souhaitée',

  // Contact & Liste d’attente
  sujet: 'Objet de la demande',
  pole: 'Pôle concerné',
  message: 'Message détaillé',
};

const SKIPPED_PAYLOAD_KEYS = new Set([
  '_website',
  'consent',
  'consentMessages',
  'reglementAccepte',
  'sameWhatsapp',
  'declarationHonneur',
  'provenance',
  'items',
  'communeAutre',
  'communeResolved',
  'serviceLabel',
  'urgenceLabel',
  'formationTitle',
  'sessionLabel',
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

export function extractOrderedPayloadEntries(
  dossier: Pick<ClientFicheDossier, 'applicantName' | 'phone' | 'whatsapp' | 'email' | 'ville' | 'commune' | 'payload'>
): PrintableFieldRow[] {
  const raw = dossier.payload || {};
  const rows: PrintableFieldRow[] = [];
  for (const [key, val] of Object.entries(raw)) {
    if (SKIPPED_PAYLOAD_KEYS.has(key)) continue;
    if (val === undefined || val === null || val === '') continue;
    if (Array.isArray(val) && val.length === 0) continue;
    if (key === 'applicantName' && String(val).trim() === (dossier.applicantName || '').trim()) continue;
    if (key === 'phone' && String(val).trim() === (dossier.phone || '').trim()) continue;
    if (key === 'whatsapp' && String(val).trim() === String(dossier.whatsapp || '').trim()) continue;
    if (key === 'email' && String(val).trim() === String(dossier.email || '').trim()) continue;
    if (key === 'ville' && String(val).trim() === String(dossier.ville || '').trim()) continue;
    if (key === 'commune' && String(val).trim() === String(dossier.commune || '').trim()) continue;
    rows.push({
      key,
      label: formatPayloadFieldLabel(key),
      value: formatPayloadFieldValue(key, val),
    });
  }
  return rows;
}

function cleanPdfText(value: unknown): string {
  return String(value ?? '')
    .replace(/\u202F|\u00A0/g, ' ')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/→/g, '->')
    .replace(/←/g, '<-');
}

export async function downloadClientFichePdf(options: {
  settings: SiteSettings;
  dossier?: ClientFicheDossier;
  clientProfile?: UnifiedClientProfile;
}): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const { settings, dossier, clientProfile } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 18) {
      doc.addPage();
      doc.setFillColor(217, 10, 20);
      doc.rect(0, 0, pageWidth, 2, 'F');
      y = 14;
    }
  };

  const drawSectionHeading = (title: string) => {
    ensureSpace(14);
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(217, 10, 20);
    doc.text(cleanPdfText(title.toUpperCase()), margin, y);
    y += 2;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
    y += 4;
  };

  const drawKeyValueRows = (rows: { label: string; value: string }[]) => {
    const labelW = 56;
    const valW = contentWidth - labelW;
    doc.setFontSize(8.8);
    rows.forEach((row, idx) => {
      const labelLines = doc.splitTextToSize(cleanPdfText(row.label), labelW - 5) as string[];
      const valLines = doc.splitTextToSize(cleanPdfText(row.value || '—'), valW - 6) as string[];
      const lineCount = Math.max(labelLines.length, valLines.length, 1);
      const rowHeight = Math.max(7, lineCount * 4.2 + 3);
      ensureSpace(rowHeight);

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, labelW, rowHeight, 'F');
        doc.setFillColor(255, 255, 255);
        doc.rect(margin + labelW, y, valW, rowHeight, 'F');
      } else {
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, labelW, rowHeight, 'F');
        doc.setFillColor(250, 251, 252);
        doc.rect(margin + labelW, y, valW, rowHeight, 'F');
      }

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.rect(margin, y, labelW, rowHeight);
      doc.rect(margin + labelW, y, valW, rowHeight);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(labelLines, margin + 2.5, y + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(valLines, margin + labelW + 3, y + 4.8);

      y += rowHeight;
    });
  };

  // Top crimson bar
  doc.setFillColor(217, 10, 20);
  doc.rect(0, 0, pageWidth, 2.5, 'F');

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(cleanPdfText(settings.legalName || 'LOMAKREV GROUP'), margin, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text(cleanPdfText(settings.address || 'Kinshasa, Gombe'), margin, y + 9.5);
  doc.text(cleanPdfText(`${settings.phone} | ${settings.email}`), margin, y + 14);
  doc.text(cleanPdfText(`${settings.rccm} | IDNat : ${settings.idNat}`), margin, y + 18.5);

  // Right title box + QR
  const refCode = dossier?.reference || (clientProfile ? clientProfile.phone : 'CLIENT');
  const titleText = dossier ? 'FICHE CLIENT & DOSSIER' : 'FICHE CLIENT UNIQUE';
  let qrAdded = false;
  if (dossier?.reference && typeof window !== 'undefined') {
    try {
      const qrUrl = `${window.location.origin}/suivi?ref=${encodeURIComponent(dossier.reference)}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 180, margin: 1 });
      doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 20, y - 1, 20, 20);
      qrAdded = true;
    } catch {
      qrAdded = false;
    }
  }

  const boxRight = qrAdded ? pageWidth - margin - 23 : pageWidth - margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(217, 10, 20);
  doc.text(cleanPdfText(titleText), boxRight, y + 4, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(cleanPdfText(`Réf. : ${refCode}`), boxRight, y + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(cleanPdfText(`Édité le ${new Date().toLocaleDateString('fr-FR')}`), boxRight, y + 15, { align: 'right' });

  y += 23;
  doc.setDrawColor(217, 10, 20);
  doc.setLineWidth(0.7);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  if (dossier) {
    const pole = dossier.pole || inferPoleFromType(dossier.type);
    const infoRows: { label: string; value: string }[] = [
      { label: 'Référence', value: dossier.reference },
      { label: 'Statut actuel', value: dossier.status || 'Enregistré' },
      { label: 'Pôle concerné', value: getPoleLabel(pole) },
      { label: 'Type de dossier', value: getDossierTypeLabel(dossier.type) },
      { label: 'Client / Demandeur', value: dossier.applicantName || '—' },
      { label: 'Téléphone', value: dossier.phone || '—' },
      { label: 'WhatsApp', value: dossier.whatsapp || dossier.phone || '—' },
      { label: 'Adresse e-mail', value: dossier.email || '—' },
      { label: 'Ville / Commune', value: [dossier.ville, dossier.commune].filter(Boolean).join(', ') || '—' },
      { label: 'Date de soumission', value: dossier.createdAt ? formatDateTimeFr(dossier.createdAt) : formatDateTimeFr(new Date().toISOString()) },
    ];
    if (dossier.campaignSlug || dossier.formationSlug || dossier.sessionCode || dossier.serviceKey) {
      infoRows.push({
        label: 'Programme / Service',
        value: [dossier.campaignSlug, dossier.formationSlug, dossier.sessionCode, dossier.serviceKey].filter(Boolean).join(' · '),
      });
    }
    if (dossier.eligibilityStatus || dossier.eligibilityReason || dossier.rejectionReason) {
      infoRows.push({
        label: 'Éligibilité / Motif',
        value: [dossier.eligibilityStatus, dossier.rejectionReason || dossier.eligibilityReason].filter(Boolean).join(' — '),
      });
    }

    drawSectionHeading('1. Identification du client et du dossier');
    drawKeyValueRows(infoRows);

    const cmdItems = Array.isArray((dossier.payload as any)?.items)
      ? ((dossier.payload as any).items as { model?: string; productId?: string; qty?: number; priceUsd?: number }[])
      : [];

    if (cmdItems.length > 0) {
      drawSectionHeading('2. Équipements commandés');
      drawKeyValueRows(
        cmdItems.map((it, idx) => ({
          label: `Article #${idx + 1}`,
          value: `${it.model || it.productId || 'Équipement'} — Qté : ${Number(it.qty || 1)} · PU : ${formatCurrencyUsd(Number(it.priceUsd || 0))}`,
        }))
      );
    }

    const payloadEntries = extractOrderedPayloadEntries(dossier);
    if (payloadEntries.length > 0) {
      drawSectionHeading(cmdItems.length > 0 ? '3. Informations complémentaires' : '2. Détails du formulaire client');
      drawKeyValueRows(payloadEntries.map((e) => ({ label: e.label, value: e.value })));
    }

    if (dossier.quoteDetails && Array.isArray(dossier.quoteDetails.items) && dossier.quoteDetails.items.length > 0) {
      const totalUsd = dossier.quoteDetails.items.reduce((s, it) => s + it.qty * it.unitUsd, 0);
      drawSectionHeading('Devis technique rattaché');
      drawKeyValueRows([
        ...dossier.quoteDetails.items.map((it, idx) => ({
          label: `Ligne #${idx + 1}`,
          value: `${it.description} (${it.qty} x ${formatCurrencyUsd(it.unitUsd)}) = ${formatCurrencyUsd(it.qty * it.unitUsd)}`,
        })),
        {
          label: 'Total général',
          value: `${formatCurrencyUsd(totalUsd)} (env. ${formatCurrencyCdf(totalUsd, settings.usdToCdfRate)})`,
        },
        ...(dossier.quoteDetails.notes ? [{ label: 'Notes devis', value: dossier.quoteDetails.notes }] : []),
      ]);
    }

    if (dossier.interventionLog) {
      drawSectionHeading("Rapport & planification d'intervention");
      drawKeyValueRows([
        { label: 'Diagnostic technique', value: dossier.interventionLog.diagnostic || '—' },
        { label: 'Pièces / vérifications', value: dossier.interventionLog.partsUsed || '—' },
        { label: 'Durée estimée', value: dossier.interventionLog.timeSpent || '—' },
        { label: 'Créneau planifié', value: dossier.interventionLog.scheduledSlot || '—' },
      ]);
    }

    if (dossier.attachments && dossier.attachments.length > 0) {
      drawSectionHeading('Pièces jointes transmises');
      drawKeyValueRows(
        dossier.attachments.map((att, idx) => ({
          label: `Document #${idx + 1}`,
          value: `${att.name || 'Fichier'} (${att.type || 'Document'}${att.size ? `, ${Math.max(1, Math.round(att.size / 1024))} Ko` : ''})`,
        }))
      );
    }

    if (dossier.timeline && dossier.timeline.length > 0) {
      drawSectionHeading('Historique du traitement');
      drawKeyValueRows(
        dossier.timeline.map((ev) => ({
          label: formatDateTimeFr(ev.at),
          value: `${ev.action}${ev.note ? ` — ${ev.note}` : ''}${ev.status ? ` [${ev.status}]` : ''}`,
        }))
      );
    }
  } else if (clientProfile) {
    drawSectionHeading('1. Coordonnées du client');
    drawKeyValueRows([
      { label: 'Nom complet', value: clientProfile.name },
      { label: 'Téléphone', value: clientProfile.phone },
      { label: 'Adresse e-mail', value: clientProfile.email || '—' },
      { label: 'Commune', value: clientProfile.commune || '—' },
      { label: 'Nombre de dossiers', value: String(clientProfile.dossiers.length) },
    ]);

    drawSectionHeading('2. Historique des dossiers du client');
    drawKeyValueRows(
      clientProfile.dossiers.map((d) => ({
        label: d.reference,
        value: `${getPoleLabel(d.pole)} — ${getDossierTypeLabel(d.type)} | Statut : ${d.status} | Créé le ${formatDateTimeFr(d.createdAt)}`,
      }))
    );
  }

  // Page numbers & official footer on all pages
  const totalPages = doc.getNumberOfPages();
  const footerLine = cleanPdfText(getPrintFooterInfo(settings));
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 13, margin + contentWidth, pageHeight - 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(footerLine, margin, pageHeight - 8.5, { maxWidth: contentWidth - 22 });
    doc.text(`Page ${p} / ${totalPages}`, margin + contentWidth, pageHeight - 8.5, { align: 'right' });
  }

  const safeRef = (dossier?.reference || clientProfile?.name || 'LOMAKREV').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const filename = `Fiche_Client_${safeRef}.pdf`;
  doc.save(filename);
  return filename;
}
