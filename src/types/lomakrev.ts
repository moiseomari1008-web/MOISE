export type Language = 'fr' | 'en';

export type UserRole =
  | 'DIRECTION'
  | 'COMMERCIAL_TECH'
  | 'RESPONSABLE_ACADEMIE'
  | 'RESPONSABLE_BOURSES'
  | 'TOP_MAINTENANCE'
  | 'TECHNICIEN'
  | 'LECTURE_SEULE';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  twoFactorEnabled: boolean;
  mustChangePassword?: boolean;
  phone?: string;
  title?: string;
  avatarUrl?: string;
  bio?: string;
  passwordHashPreview?: string;
  createdAt: string;
}

export interface SitePhotoItem {
  id: string;
  pole: 'accueil' | 'tech' | 'academie' | 'bourses' | 'maintenance';
  edition?: string;
  url: string;
  caption: string;
  consentVerified: boolean;
  sortOrder: number;
}

export interface SiteSettings {
  siteName: string;
  legalName: string;
  promise: string;
  vision: string;
  valuesText: string;
  rccm: string;
  idNat: string;
  address: string;
  addressLandmarks: string;
  phone: string;
  whatsapp: string;
  email: string;
  domain: string;
  openingHours: string;
  socialHandle: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  logoUrl: string;
  heroImageUrl: string;
  aboutImageUrl: string;
  academieHeroUrl: string;
  boursesFamilyImageUrl: string;
  maintenanceHeroUrl: string;
  usdToCdfRate: number;
  rateDate: string;
  responseDelayText: string;
  maintenanceForfaitDiag: string;
  maintenanceForfaitDeplacement: string;
  stats: {
    ordinateursVendus: string;
    apprenantsFormes: string;
    interventionsReussies: string;
    tauxSatisfaction: string;
  };
  legalNoticeText: string;
  privacyPolicyText: string;
  autoMessages: Record<string, string>;
}

export interface TechProduct {
  id: string;
  slug: string;
  brand: string;
  model: string;
  processor: string;
  generation: string;
  ram: string;
  storage: string;
  screen: string;
  otherSpecs: string;
  condition: 'Neuf' | 'Quasi neuf' | 'Reconditionné';
  priceUsd: number;
  oldPriceUsd?: number | null;
  availability: 'En stock' | 'Sur commande' | 'Épuisé';
  stockQty: number;
  warranty: string;
  category: string;
  images: string[];
  featured: boolean;
  sortOrder: number;
  active: boolean;
}

export interface FormationSession {
  id: string;
  code: string;
  formationSlug: string;
  startDate: string;
  schedule: string;
  location: string;
  instructor: string;
  format: 'Présentiel' | 'En ligne' | 'Hybride';
  priceUsd: number | null;
  capacity: number;
  enrolledCount: number;
  isOpen: boolean;
}

export interface Formation {
  id: string;
  slug: string;
  title: string;
  summary: string;
  objective: string;
  audience: string;
  prerequisites: string;
  level: string;
  durationHours: number;
  format: string;
  location: string;
  certificate: string;
  modules: string[];
  imageUrl: string;
  active: boolean;
  sortOrder: number;
  sessions: FormationSession[];
}

export interface MaintenanceService {
  id: string;
  slug: string;
  serviceKey: string;
  title: string;
  summary: string;
  description: string;
  pricingLabel: string;
  coverageZones: string;
  imageUrl: string;
  highlights: string[];
  active: boolean;
  sortOrder: number;
}

export interface ScholarshipCriterion {
  id: string;
  label: string;
  type: 'eliminatoire' | 'automatique' | 'equipe';
  fieldKey?: string;
  operator?: 'gte' | 'lte' | 'eq' | 'in' | 'not_empty';
  expectedValue?: string;
  points?: number;
  maxScore?: number;
  failReason?: string;
}

export interface ScholarshipCampaign {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  formations: string[];
  openDate: string;
  closeDate: string;
  trainingStartDate: string;
  places: number;
  coverageRate: string;
  minAge: number;
  maxAge?: number | null;
  requireTwoApprovals: boolean;
  requiredDocuments: string[];
  imageUrl: string;
  criteria: ScholarshipCriterion[];
  statusOverride?: 'auto' | 'open' | 'closed';
}

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'tel'
  | 'email'
  | 'number'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'consent';

export interface CustomFormField {
  id: string;
  step: number;
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  conditionField?: string;
  conditionValue?: string;
  sortOrder: number;
}

export interface FormDefinition {
  formKey: 'academie' | 'bourses' | 'devis' | 'intervention' | 'contact';
  version: number;
  updatedAt: string;
  customFields: CustomFormField[];
}

export type DossierType = 'CMD' | 'ACA' | 'BRS' | 'DEV' | 'INT' | 'CTC' | 'WAITLIST';

export interface DossierTimelineEvent {
  at: string;
  actor: string;
  action: string;
  status?: string;
  note?: string;
}

export interface DossierNotification {
  at: string;
  channel: 'SMS/WhatsApp' | 'E-mail';
  recipient: string;
  subject: string;
  body: string;
}

export interface Dossier {
  id: string;
  reference: string;
  type: DossierType;
  pole: 'tech' | 'academie' | 'bourses' | 'maintenance' | 'contact';
  status: string;
  applicantName: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  commune?: string;
  ville?: string;
  provenance: string;
  enteredByAgent?: string | null;
  assignedToId?: string | null;
  assignedToName?: string | null;
  campaignSlug?: string | null;
  formationSlug?: string | null;
  sessionCode?: string | null;
  serviceKey?: string | null;
  eligibilityStatus?: 'Éligible' | 'Non éligible' | null;
  eligibilityReason?: string | null;
  autoScore?: number;
  teamScores?: Record<string, number>;
  totalScore?: number;
  rejectionReason?: string | null;
  approvals?: { userId: string; userName: string; at: string }[];
  quoteDetails?: {
    items: { description: string; qty: number; unitUsd: number }[];
    notes: string;
    validUntil: string;
  } | null;
  interventionLog?: {
    diagnostic: string;
    partsUsed: string;
    timeSpent: string;
    scheduledSlot: string;
  } | null;
  formVersion?: number;
  payload: Record<string, unknown>;
  attachments: { name: string; type: string; size: number; dataUrl?: string }[];
  internalComments: { at: string; author: string; text: string }[];
  timeline: DossierTimelineEvent[];
  notifications: DossierNotification[];
  createdAt: string;
  updatedAt: string;
}

export interface ShortLink {
  id: string;
  code: string;
  targetPath: string;
  label: string;
  clicks: number;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  at: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  target: string;
  oldValue?: string;
  newValue?: string;
}

export interface AdminNotification {
  id: string;
  createdAt: string;
  pole: 'tech' | 'academie' | 'bourses' | 'maintenance' | 'contact';
  category: 'CMD' | 'ACA' | 'BRS' | 'DEV' | 'INT' | 'CTC' | 'ASSIGN' | 'STATUS' | 'CATALOG';
  title: string;
  message: string;
  dossierId?: string | null;
  dossierRef?: string | null;
  targetRoles: UserRole[];
  targetUserId?: string | null;
  linkTab: string;
  read: boolean;
  readAt?: string | null;
}

export interface PublicBootstrapData {
  settings: SiteSettings;
  photos: SitePhotoItem[];
  products: TechProduct[];
  formations: Formation[];
  services: MaintenanceService[];
  campaigns: ScholarshipCampaign[];
  forms: Record<string, FormDefinition>;
  shortLinks: ShortLink[];
}
