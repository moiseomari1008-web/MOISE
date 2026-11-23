import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import * as XLSX from 'xlsx';
import type {
  SiteSettings,
  SitePhotoItem,
  TechProduct,
  Formation,
  MaintenanceService,
  ScholarshipCampaign,
  FormDefinition,
  Dossier,
  DossierType,
  UserRole,
  AdminNotification,
} from './src/types/lomakrev.ts';

const PORT = 3000;
const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'lomakrev.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Security & Password Hashing ---
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, original] = parts;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(original, 'hex'), Buffer.from(derived, 'hex'));
}

function uid(prefix = 'id'): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

// --- Database Schema ---
db.exec(`
  CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    two_factor_enabled INTEGER NOT NULL DEFAULT 0,
    two_factor_code TEXT,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    phone TEXT,
    title TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    verified_2fa INTEGER NOT NULL DEFAULT 0,
    last_activity TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS formations (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS maintenance_services (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS scholarship_campaigns (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS site_photos (
    id TEXT PRIMARY KEY,
    pole TEXT NOT NULL,
    data TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS form_definitions (
    form_key TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dossiers (
    id TEXT PRIMARY KEY,
    reference TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    pole TEXT NOT NULL,
    status TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    provenance TEXT NOT NULL DEFAULT 'direct',
    assigned_to_id TEXT,
    campaign_slug TEXT,
    formation_slug TEXT,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reference_counters (
    prefix_year TEXT PRIMARY KEY,
    seq INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    form_key TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS short_links (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    target_path TEXT NOT NULL,
    label TEXT NOT NULL,
    clicks INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    at TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT
  );

  CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY,
    at TEXT NOT NULL,
    event_name TEXT NOT NULL,
    path TEXT NOT NULL,
    provenance TEXT NOT NULL DEFAULT 'direct'
  );

  CREATE TABLE IF NOT EXISTS admin_notifications (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    pole TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    dossier_id TEXT,
    dossier_ref TEXT,
    target_roles TEXT NOT NULL,
    target_user_id TEXT,
    actor_user_id TEXT,
    link_tab TEXT NOT NULL DEFAULT 'dossiers'
  );

  CREATE TABLE IF NOT EXISTS admin_notification_reads (
    notification_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    read_at TEXT NOT NULL,
    PRIMARY KEY (notification_id, user_id),
    FOREIGN KEY (notification_id) REFERENCES admin_notifications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Safe migration for existing SQLite databases (profile columns on users)
{
  const userCols = (db.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map((c) => c.name);
  if (!userCols.includes('phone')) db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
  if (!userCols.includes('title')) db.exec('ALTER TABLE users ADD COLUMN title TEXT');
  if (!userCols.includes('avatar_url')) db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT');
  if (!userCols.includes('bio')) db.exec('ALTER TABLE users ADD COLUMN bio TEXT');
  if (!userCols.includes('must_change_password')) db.exec('ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0');
}

// --- Initial Seed Data ---
const OFFICIAL_LOGO = '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.31.55_6695b86a.jpeg';
const IMG_HERO = '/src/assets/images/hero_lomakrev_gombe_1795171050463.jpg';
const IMG_LAPTOP_G8 = '/src/assets/images/product_hp_elitebook_840_1795171050572.jpg';
const IMG_LAPTOP_G6 = '/src/assets/images/product_hp_elitebook_g6_1795171050610.jpg';
const IMG_ACADEMIE = '/src/assets/images/academie_formation_salle_1795171050542.jpg';
const IMG_BOURSES = '/src/assets/images/bourses_premiere_edition_1795171050443.jpg';
const IMG_MAINT_TECH = '/src/assets/images/maintenance_atelier_tech_1795171051130.jpg';
const IMG_MAINT_CAM = '/src/assets/images/maintenance_cameras_gps_1795171050154.jpg';

const defaultSettings: SiteSettings = {
  siteName: 'Lomakrev',
  legalName: 'LOMAKREV GROUP',
  promise: 'Nous équipons. Nous formons. Nous maintenons. Nous accompagnons.',
  vision: 'Contribuer à la transformation numérique et au développement des compétences en RDC, avec des technologies accessibles, des services de qualité et des formations adaptées au marché.',
  valuesText: 'Qualité · Professionnalisme · Transparence · Innovation · Accessibilité',
  rccm: 'RCCM/KNG/RCCM25-A-08017',
  idNat: '01-F4300-N86816T',
  address: 'Kinshasa, Gombe, Avenue des Étoiles n° 09',
  addressLandmarks: "En face de la Direction générale d'Africell (repères : cimetière de la Gombe ou LC Waikiki)",
  phone: '+243 99 59 56 534',
  whatsapp: '+243995956534',
  email: 'direction@lomakrev.com',
  domain: 'lomakrev.com',
  openingHours: 'Lundi – Samedi : 08h30 – 17h30',
  socialHandle: '@Lomakrevgroup',
  facebookUrl: 'https://facebook.com/Lomakrevgroup',
  instagramUrl: 'https://instagram.com/Lomakrevgroup',
  linkedinUrl: 'https://linkedin.com/company/lomakrevgroup',
  logoUrl: OFFICIAL_LOGO,
  heroImageUrl: IMG_HERO,
  aboutImageUrl: IMG_HERO,
  academieHeroUrl: IMG_ACADEMIE,
  boursesFamilyImageUrl: IMG_BOURSES,
  maintenanceHeroUrl: IMG_MAINT_TECH,
  usdToCdfRate: 2850,
  rateDate: '2026-11-20',
  responseDelayText: 'Nous vous rappelons sous 24 h ouvrées',
  maintenanceForfaitDiag: '15 USD (déduit si réparation validée)',
  maintenanceForfaitDeplacement: 'Tarif communiqué selon zone à Kinshasa (ou dépôt gratuit à Gombe)',
  stats: {
    ordinateursVendus: '340+',
    apprenantsFormes: '180+',
    interventionsReussies: '520+',
    tauxSatisfaction: '97 %',
  },
  legalNoticeText:
    'LOMAKREV GROUP — RCCM/KNG/RCCM25-A-08017 — Identification nationale (IDNat) : 01-F4300-N86816T. Siège social : Kinshasa, Gombe, Avenue des Étoiles n° 09. Contact : +243 99 59 56 534 · direction@lomakrev.com.',
  privacyPolicyText:
    'LOMAKREV GROUP ne collecte que les données strictement nécessaires au traitement de votre demande (commande, inscription académique, candidature aux bourses, devis ou intervention). Les pièces jointes restent privées et ne sont accessibles qu’aux responsables habilités. Durée de conservation : 2 ans pour les candidatures non retenues, durée légale pour les factures et attestations. Vous pouvez demander l’export ou la suppression de vos données à direction@lomakrev.com.',
  autoMessages: {
    CMD_RECEIVED: 'Bonjour {nom}, votre demande de commande {ref} a bien été enregistrée chez Lomakrev Tech. Un conseiller vous rappelle sous 24 h ouvrées.',
    ACA_RECEIVED: 'Bonjour {nom}, votre inscription {ref} à Lomakrev Académie est enregistrée. Suivez son avancement sur lomakrev.com/suivi.',
    BRS_RECEIVED: 'Bonjour {nom}, votre candidature {ref} au Programme de Bourses Lomakrev a bien été reçue. Elle est en cours de vérification par notre comité (aucune bourse n’est attribuée automatiquement à l’envoi).',
    BRS_APPROVED: 'Félicitations {nom} ! Votre candidature {ref} a été approuvée par le comité Lomakrev Bourses. Notre équipe vous contacte pour la suite.',
    BRS_WAITLIST: 'Bonjour {nom}, votre candidature {ref} est placée en liste d’attente. Nous vous contacterons si une place se libère.',
    BRS_REJECTED: 'Bonjour {nom}, votre candidature {ref} n’a pas été retenue pour cette cohorte. Motif : {motif}.',
    DEV_RECEIVED: 'Bonjour {nom}, votre demande de devis Top Maintenance {ref} a été reçue. Un ingénieur vous contacte sous 24 h ouvrées.',
    INT_RECEIVED: 'Bonjour {nom}, votre demande d’intervention Top Maintenance {ref} est enregistrée. Un technicien confirme votre créneau rapidement.',
    CTC_RECEIVED: 'Bonjour {nom}, votre message {ref} a bien été transmis à l’équipe LOMAKREV GROUP.',
  },
};

function seedIfEmpty() {
  const now = new Date().toISOString();

  // 1. Settings
  const existingSettings = db.prepare('SELECT value FROM kv_store WHERE key = ?').get('site_settings');
  if (!existingSettings) {
    db.prepare('INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)').run(
      'site_settings',
      JSON.stringify(defaultSettings),
      now
    );
  }

  // 2. Users (7 exact roles)
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    const seedUsers: { id: string; name: string; email: string; pass: string; role: UserRole; twoFactor: boolean; code: string | null }[] = [
      { id: 'usr_direction', name: 'Revdie Lomak (Direction)', email: 'direction@lomakrev.com', pass: 'Lomakrev2026!', role: 'DIRECTION', twoFactor: true, code: '202600' },
      { id: 'usr_tech', name: 'Patrick Kabila (Commercial Tech)', email: 'tech@lomakrev.com', pass: 'Tech2026!', role: 'COMMERCIAL_TECH', twoFactor: false, code: null },
      { id: 'usr_academie', name: 'Sarah Mbala (Resp. Académie)', email: 'academie@lomakrev.com', pass: 'Academie2026!', role: 'RESPONSABLE_ACADEMIE', twoFactor: false, code: null },
      { id: 'usr_bourses', name: 'Jean-Paul Mbuyi (Resp. Bourses)', email: 'bourses@lomakrev.com', pass: 'Bourses2026!', role: 'RESPONSABLE_BOURSES', twoFactor: false, code: null },
      { id: 'usr_maint', name: 'Cédric Nzita (Top Maintenance)', email: 'maintenance@lomakrev.com', pass: 'Maint2026!', role: 'TOP_MAINTENANCE', twoFactor: false, code: null },
      { id: 'usr_technicien', name: 'Eric Tshimanga (Technicien)', email: 'technicien@lomakrev.com', pass: 'Technicien2026!', role: 'TECHNICIEN', twoFactor: false, code: null },
      { id: 'usr_lecture', name: 'Audit Direction (Lecture seule)', email: 'lecture@lomakrev.com', pass: 'Lecture2026!', role: 'LECTURE_SEULE', twoFactor: false, code: null },
    ];
    const stmt = db.prepare(
      'INSERT INTO users (id, name, email, password_hash, role, active, two_factor_enabled, two_factor_code, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)'
    );
    for (const u of seedUsers) {
      stmt.run(u.id, u.name, u.email, hashPassword(u.pass), u.role, u.twoFactor ? 1 : 0, u.code, now);
    }
  }

  // 3. Tech Products (Section 5)
  const prodCount = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
  if (prodCount === 0) {
    const seedProducts: TechProduct[] = [
      {
        id: 'prod_1',
        slug: 'hp-elitebook-840-g8-i7',
        brand: 'HP',
        model: 'HP EliteBook 840 G8',
        processor: 'Core i7',
        generation: '11e gén.',
        ram: '16 Go',
        storage: 'SSD 512 Go',
        screen: '14" Full HD IPS antireflet',
        otherSpecs: 'Clavier rétroéclairé, lecteur d’empreintes, Wi-Fi 6, 2x Thunderbolt 4, Windows 11 Pro prêt',
        condition: 'Quasi neuf',
        priceUsd: 599,
        oldPriceUsd: 650,
        availability: 'En stock',
        stockQty: 8,
        warranty: 'Vérifié atelier Lomakrev (modalités précisées à la commande)',
        category: 'Ultrabook Pro',
        images: [IMG_LAPTOP_G8, IMG_LAPTOP_G6],
        featured: true,
        sortOrder: 1,
        active: true,
      },
      {
        id: 'prod_2',
        slug: 'hp-elitebook-840-g8-i5',
        brand: 'HP',
        model: 'HP EliteBook 840 G8',
        processor: 'Core i5',
        generation: '11e gén.',
        ram: '8 Go',
        storage: 'SSD 256 Go',
        screen: '14" Full HD IPS',
        otherSpecs: 'Châssis aluminium fin, audio Bang & Olufsen, autonomie longue durée, USB-C',
        condition: 'Quasi neuf',
        priceUsd: 409,
        oldPriceUsd: null,
        availability: 'En stock',
        stockQty: 12,
        warranty: 'Testé 24 points par Top Maintenance',
        category: 'Ultrabook Pro',
        images: [IMG_LAPTOP_G8],
        featured: true,
        sortOrder: 2,
        active: true,
      },
      {
        id: 'prod_3',
        slug: 'hp-elitebook-840-g6-i7',
        brand: 'HP',
        model: 'HP EliteBook 840 G6',
        processor: 'Core i7',
        generation: '8e gén.',
        ram: '16 Go',
        storage: 'SSD 512 Go',
        screen: '14" Full HD',
        otherSpecs: 'Idéal bureautique avancée, comptabilité, gestion de projet et développement',
        condition: 'Quasi neuf',
        priceUsd: 399,
        oldPriceUsd: 430,
        availability: 'En stock',
        stockQty: 6,
        warranty: 'Contrôlé en atelier à Gombe',
        category: 'Bureautique & Gestion',
        images: [IMG_LAPTOP_G6, IMG_LAPTOP_G8],
        featured: true,
        sortOrder: 3,
        active: true,
      },
      {
        id: 'prod_4',
        slug: 'dell-latitude-5420-i5',
        brand: 'Dell',
        model: 'Dell Latitude 5420',
        processor: 'Core i5',
        generation: '11e gén.',
        ram: '16 Go',
        storage: 'SSD 512 Go',
        screen: '14" Full HD',
        otherSpecs: 'Port RJ45 Ethernet intégré, HDMI, idéal entreprises et ONG',
        condition: 'Reconditionné',
        priceUsd: 379,
        oldPriceUsd: null,
        availability: 'Sur commande',
        stockQty: 0,
        warranty: 'Sur devis et disponibilité confirmée sous 24 h',
        category: 'Entreprise',
        images: [IMG_LAPTOP_G6],
        featured: false,
        sortOrder: 4,
        active: true,
      },
    ];
    const stmt = db.prepare('INSERT INTO products (id, slug, data, sort_order) VALUES (?, ?, ?, ?)');
    for (const p of seedProducts) {
      stmt.run(p.id, p.slug, JSON.stringify(p), p.sortOrder);
    }
  }

  // 4. Académie Formations (7 exact formations from Annexe A)
  const formCount = (db.prepare('SELECT COUNT(*) as c FROM formations').get() as { c: number }).c;
  if (formCount === 0) {
    const seedFormations: Formation[] = [
      {
        id: 'form_1',
        slug: 'excel-entreprises',
        title: 'Excel pour les entreprises',
        summary: 'Produisez des tableaux de suivi, calculs fiables et tableaux de bord professionnels pour le travail quotidien.',
        objective: 'Produire des tableaux de suivi, des calculs et des rapports fiables pour le travail quotidien.',
        audience: 'Employés, comptables, gestionnaires, étudiants',
        prerequisites: 'Notions de base en utilisation d’un ordinateur Windows.',
        level: 'Débutant à avancé',
        durationHours: 24,
        format: 'Présentiel (Gombe) / En ligne',
        location: 'Campus Lomakrev — Kinshasa, Gombe',
        certificate: 'Évaluation pratique finale et attestation Lomakrev Académie (« Way of success »)',
        modules: [
          '1. Prise en main : classeurs, feuilles, saisie, mise en forme, impression.',
          '2. Formules de base : SOMME, MOYENNE, MIN, MAX, références relatives et absolues.',
          '3. Fonctions logiques et de recherche : SI, ET, OU, NB.SI, SOMME.SI, RECHERCHEV / RECHERCHEX.',
          '4. Tableaux de données : tri, filtres, mise en forme conditionnelle, validation des données.',
          '5. Tableaux croisés dynamiques et graphiques.',
          '6. Cas pratiques d’entreprise : facturation, suivi de stock, paie simplifiée, budget, tableau de bord.',
          '7. Niveau avancé (module bourse « Excel avancée ») : Power Query, fonctions avancées, automatisation simple, protection des fichiers.',
        ],
        imageUrl: IMG_ACADEMIE,
        active: true,
        sortOrder: 1,
        sessions: [],
      },
      {
        id: 'form_2',
        slug: 'word-powerpoint',
        title: 'Word et PowerPoint professionnels',
        summary: 'Rédigez des documents longs structurés et concevez des présentations à fort impact.',
        objective: 'Rédiger des documents professionnels et présenter avec impact.',
        audience: 'Secrétaires, assistants, étudiants, entrepreneurs',
        prerequisites: 'Aucun prérequis technique exigé.',
        level: 'Débutant à intermédiaire',
        durationHours: 20,
        format: 'Présentiel (Gombe) / En ligne',
        location: 'Campus Lomakrev — Kinshasa, Gombe',
        certificate: 'Évaluation pratique finale et attestation Lomakrev Académie',
        modules: [
          '1. Word : mise en page, styles, titres, listes, tableaux, en-têtes et pieds de page.',
          '2. Documents longs : table des matières automatique, sections, numérotation, notes.',
          '3. Courriers et documents administratifs : lettres, rapports, CV, publipostage.',
          '4. Relecture : suivi des modifications, commentaires, export PDF.',
          '5. PowerPoint : structure d’une présentation, masques, mise en page, images, icônes.',
          '6. Graphiques, animations sobres et transitions.',
          '7. Présenter en public : messages clés, gestion du temps, exercice final de présentation.',
        ],
        imageUrl: IMG_ACADEMIE,
        active: true,
        sortOrder: 2,
        sessions: [],
      },
      {
        id: 'form_3',
        slug: 'maintenance-ordinateurs',
        title: 'Maintenance des ordinateurs',
        summary: 'Maîtrisez le diagnostic matériel et logiciel, le démontage, le dépannage et l’entretien complet.',
        objective: 'Diagnostiquer, dépanner et entretenir un ordinateur.',
        audience: 'Jeunes techniciens, étudiants, passionnés',
        prerequisites: 'Curiosité technique et motivation pratique.',
        level: 'Débutant',
        durationHours: 30,
        format: 'Présentiel — Atelier Top Maintenance (Gombe)',
        location: 'Atelier Lomakrev — Kinshasa, Gombe',
        certificate: 'Évaluation pratique en atelier et attestation Lomakrev Académie',
        modules: [
          '1. Composants : carte mère, processeur, mémoire, stockage, alimentation ; sécurité électrique.',
          '2. Démontage et remontage d’un ordinateur portable et d’un ordinateur de bureau.',
          '3. Installation et configuration de Windows, pilotes et logiciels.',
          '4. Diagnostic des pannes courantes : démarrage, écran, surchauffe, lenteur.',
          '5. Remplacement de pièces : disque SSD, mémoire, clavier, écran, batterie.',
          '6. Virus et logiciels malveillants : détection, nettoyage, prévention.',
          '7. Sauvegarde et récupération de données ; bases des réseaux (Wi-Fi, partage, imprimante).',
          '8. Accueil client et fiche d’intervention.',
        ],
        imageUrl: IMG_MAINT_TECH,
        active: true,
        sortOrder: 3,
        sessions: [],
      },
      {
        id: 'form_4',
        slug: 'cybersecurite',
        title: 'Cybersécurité',
        summary: 'Protégez vos données personnelles, comptes Mobile Money, réseaux et postes d’entreprise contre les menaces.',
        objective: 'Protéger ses données, ses appareils et ceux de son organisation.',
        audience: 'Employés, responsables IT, entrepreneurs',
        prerequisites: 'Usage courant d’un smartphone et d’un ordinateur.',
        level: 'Débutant à intermédiaire',
        durationHours: 24,
        format: 'Présentiel / En ligne',
        location: 'Campus Lomakrev — Kinshasa, Gombe',
        certificate: 'Évaluation pratique et attestation Lomakrev Académie',
        modules: [
          '1. Les menaces : hameçonnage, arnaques Mobile Money, logiciels malveillants, rançongiciels.',
          '2. Mots de passe solides, gestionnaire de mots de passe, double authentification.',
          '3. Sécuriser un ordinateur et un téléphone : mises à jour, antivirus, chiffrement.',
          '4. Sécurité des réseaux : Wi-Fi, routeur, réseaux publics, VPN.',
          '5. Réseaux sociaux et vie privée : paramètres, usurpation d’identité.',
          '6. Sauvegardes et plan de reprise.',
          '7. Bonnes pratiques en entreprise : règles d’accès, sensibilisation du personnel, réaction à un incident.',
        ],
        imageUrl: IMG_ACADEMIE,
        active: true,
        sortOrder: 4,
        sessions: [
          {
            id: 'sess_cyber_2027_01',
            code: '2027-01',
            formationSlug: 'cybersecurite',
            startDate: '2027-02-08',
            schedule: 'Lun / Mer / Ven · 17h00 – 19h30',
            location: 'Gombe, Avenue des Étoiles n° 09',
            instructor: 'Équipe Cybersécurité Lomakrev',
            format: 'Présentiel',
            priceUsd: 120,
            capacity: 20,
            enrolledCount: 4,
            isOpen: true,
          },
        ],
      },
      {
        id: 'form_5',
        slug: 'intelligence-artificielle',
        title: 'Intelligence artificielle appliquée',
        summary: 'Utilisez concrètement les outils d’IA au bureau pour rédiger, synthétiser, automatiser et produire.',
        objective: 'Utiliser les outils d’IA de manière efficace et responsable au travail.',
        audience: 'Tout public professionnel, étudiants',
        prerequisites: 'Maîtrise de base de la navigation web et de la bureautique.',
        level: 'Débutant',
        durationHours: 20,
        format: 'Présentiel / En ligne',
        location: 'Campus Lomakrev — Kinshasa, Gombe',
        certificate: 'Évaluation pratique et attestation Lomakrev Académie',
        modules: [
          '1. Comprendre l’IA : ce qu’elle fait bien, ses limites, ses erreurs.',
          '2. Les assistants conversationnels : rédiger de bonnes consignes (prompts).',
          '3. Rédaction et synthèse : courriers, rapports, comptes rendus, traductions.',
          '4. IA et bureautique : aide à Excel, à Word et à PowerPoint.',
          '5. Images et contenus pour les réseaux sociaux.',
          '6. Usage responsable : vérification des informations, confidentialité, droits d’auteur.',
          '7. Projet final : automatiser une tâche réelle de son travail ou de son projet.',
        ],
        imageUrl: IMG_ACADEMIE,
        active: true,
        sortOrder: 5,
        sessions: [],
      },
      {
        id: 'form_6',
        slug: 'entrepreneuriat',
        title: 'Entrepreneuriat',
        summary: 'Passez de l’idée au plan d’affaires structuré et apprenez les réalités juridiques et financières en RDC.',
        objective: 'Transformer une idée en activité rentable et structurée.',
        audience: 'Porteurs de projet, jeunes, petits commerçants',
        prerequisites: 'Avoir une idée d’activité ou un projet commercial.',
        level: 'Débutant',
        durationHours: 24,
        format: 'Présentiel (Gombe)',
        location: 'Campus Lomakrev — Kinshasa, Gombe',
        certificate: 'Soutenance devant jury et attestation Lomakrev Académie',
        modules: [
          '1. L’esprit d’entreprendre ; trouver et tester une idée.',
          '2. Étude de marché simple : clients, concurrents, prix.',
          '3. Modèle économique (Business Model Canvas).',
          '4. Gestion financière de base : coûts, prix de vente, marge, trésorerie, séparation caisse personnelle et caisse de l’entreprise.',
          '5. Créer son entreprise en RDC : formes juridiques, Guichet unique, RCCM, impôts.',
          '6. Marketing et vente : marque, réseaux sociaux, WhatsApp Business, relation client.',
          '7. Financement : épargne, microcrédit, concours, partenaires.',
          '8. Plan d’affaires et présentation devant un jury.',
        ],
        imageUrl: IMG_BOURSES,
        active: true,
        sortOrder: 6,
        sessions: [],
      },
      {
        id: 'form_7',
        slug: 'gestion-projet',
        title: 'Gestion de projet',
        summary: 'Pilotez un projet de bout en bout avec cadrage, budget, risques, cadre logique ONG et méthodes agiles.',
        objective: 'Piloter un projet de bout en bout, dans les délais et le budget.',
        audience: 'Chefs d’équipe, cadres, membres d’ONG, étudiants',
        prerequisites: 'Expérience académique ou professionnelle souhaitée.',
        level: 'Débutant à intermédiaire',
        durationHours: 24,
        format: 'Présentiel / En ligne',
        location: 'Campus Lomakrev — Kinshasa, Gombe',
        certificate: 'Étude de cas finale et attestation Lomakrev Académie',
        modules: [
          '1. Qu’est-ce qu’un projet : objectifs, parties prenantes, cycle de vie.',
          '2. Cadrage : besoin, périmètre, cahier des charges, cadre logique (utile pour les ONG).',
          '3. Planification : découpage des tâches, calendrier, diagramme de Gantt.',
          '4. Budget, ressources et suivi des dépenses.',
          '5. Gestion des risques.',
          '6. Suivi et pilotage : réunions, tableaux de bord, rapports d’avancement.',
          '7. Méthodes agiles : Scrum, Kanban, outils numériques (Trello, Excel, MS Project).',
          '8. Communication, leadership et clôture du projet ; étude de cas finale.',
        ],
        imageUrl: IMG_ACADEMIE,
        active: true,
        sortOrder: 7,
        sessions: [],
      },
    ];
    const stmt = db.prepare('INSERT INTO formations (id, slug, data, sort_order) VALUES (?, ?, ?, ?)');
    for (const f of seedFormations) {
      stmt.run(f.id, f.slug, JSON.stringify(f), f.sortOrder);
    }
  }

  // 5. Maintenance Services (Section 8)
  const svcCount = (db.prepare('SELECT COUNT(*) as c FROM maintenance_services').get() as { c: number }).c;
  if (svcCount === 0) {
    const seedServices: MaintenanceService[] = [
      {
        id: 'svc_1',
        slug: 'ordinateurs',
        serviceKey: 'ordinateurs',
        title: 'Maintenance et réparation d’ordinateurs',
        summary: 'Diagnostic matériel et logiciel, remplacement SSD/RAM/écran/batterie, récupération de données et optimisation.',
        description:
          'Intervention en atelier à Gombe ou sur site à Kinshasa pour vos ordinateurs portables et postes de bureau. Chaque appareil bénéficie d’un carnet d’entretien complet.',
        pricingLabel: 'Forfait diagnostic 15 USD (déduit si réparation) · ou sur devis',
        coverageZones: 'Kinshasa (Gombe, Lingwala, Kintambo, Ngaliema, Limete, Bandalungwa...)',
        imageUrl: IMG_MAINT_TECH,
        highlights: ['Diagnostic approfondi', 'Remplacement pièces d’origine', 'Installation Windows & suites pro', 'Récupération de données'],
        active: true,
        sortOrder: 1,
      },
      {
        id: 'svc_2',
        slug: 'cameras-surveillance',
        serviceKey: 'cameras',
        title: 'Installation de caméras de surveillance',
        summary: 'Systèmes HD/IP intérieur et extérieur pour maisons, boutiques, bureaux et dépôts avec accès mobile.',
        description:
          'Étude de site, pose propre, configuration NVR/DVR, enregistrement sécurisé et paramétrage de la vision à distance sur votre téléphone.',
        pricingLabel: 'Sur devis après visite technique',
        coverageZones: 'Kinshasa et provinces sur mission',
        imageUrl: IMG_MAINT_CAM,
        highlights: ['Caméras IP/HD nocturnes', 'Vision en direct sur smartphone', 'Sauvegarde 7 à 30+ jours', 'Reprise d’installations existantes'],
        active: true,
        sortOrder: 2,
      },
      {
        id: 'svc_3',
        slug: 'gps',
        serviceKey: 'gps',
        title: 'Installation de traceurs GPS',
        summary: 'Suivi en direct de voitures, motos et camions : géolocalisation, coupure moteur à distance et alertes.',
        description:
          'Sécurisez vos véhicules personnels et vos flottes d’entreprise avec suivi temps réel sur téléphone, historique des trajets et coupure moteur.',
        pricingLabel: 'Sur devis selon nombre de véhicules',
        coverageZones: 'Kinshasa — pose en atelier ou sur site flotte',
        imageUrl: IMG_MAINT_CAM,
        highlights: ['Suivi temps réel 24/7', 'Coupure moteur à distance', 'Historique & kilométrage', 'Alertes sortie de zone'],
        active: true,
        sortOrder: 3,
      },
      {
        id: 'svc_4',
        slug: 'reseaux',
        serviceKey: 'reseau',
        title: 'Réseaux informatiques',
        summary: 'Câblage structuré RJ45, couverture Wi-Fi d’entreprise, baie de brassage et sécurisation de connexion.',
        description:
          'Conception et déploiement de réseaux filaires et sans-fil fiables pour bureaux, écoles, ONG et cliniques.',
        pricingLabel: 'Sur devis après relevé technique',
        coverageZones: 'Kinshasa et environs',
        imageUrl: IMG_HERO,
        highlights: ['Câblage Cat6 structuré', 'Wi-Fi maillé haute densité', 'Partage imprimantes & NAS', 'Sécurisation routeur'],
        active: true,
        sortOrder: 4,
      },
      {
        id: 'svc_5',
        slug: 'contrats-maintenance',
        serviceKey: 'contrat',
        title: 'Contrats de maintenance pour entreprises',
        summary: 'Infogérance mensuelle ou annuelle : visites préventives, support prioritaire et gestion de parc IT.',
        description:
          'Un contrat sur mesure garantissant la continuité de vos opérations informatiques, caméras et réseaux avec délais d’intervention garantis.',
        pricingLabel: 'Sur devis selon taille du parc',
        coverageZones: 'Entreprises, institutions et ONG à Kinshasa',
        imageUrl: IMG_MAINT_TECH,
        highlights: ['Support prioritaire sous 24 h', 'Visites préventives mensuelles', 'Carnet d’entretien par poste', 'Remplacement temporaire selon contrat'],
        active: true,
        sortOrder: 5,
      },
    ];
    const stmt = db.prepare('INSERT INTO maintenance_services (id, slug, data, sort_order) VALUES (?, ?, ?, ?)');
    for (const s of seedServices) {
      stmt.run(s.id, s.slug, JSON.stringify(s), s.sortOrder);
    }
  }

  // 6. Scholarship Campaigns (Section 7)
  const campCount = (db.prepare('SELECT COUNT(*) as c FROM scholarship_campaigns').get() as { c: number }).c;
  if (campCount === 0) {
    const seedCampaigns: ScholarshipCampaign[] = [
      {
        id: 'camp_1',
        slug: 'excel-avance-2027',
        title: 'Bourse Excel avancée — Cohorte 2027',
        subtitle: 'Œuvre sociale LOMAKREV GROUP · Prise en charge à 100 %',
        description:
          'Programme de formation gratuite en Excel avancé et Power Query destiné aux jeunes, étudiants, chercheurs d’emploi et clients Lomakrev résidant à Kinshasa. Les candidatures sont exclusivement en ligne.',
        formations: ['Excel pour les entreprises (module Excel avancée)'],
        openDate: '2026-11-01',
        closeDate: '2027-01-31',
        trainingStartDate: '2027-02-15',
        places: 30,
        coverageRate: '100 % prise en charge',
        minAge: 18,
        maxAge: 35,
        requireTwoApprovals: false,
        requiredDocuments: ['Pièce d’identité (Carte d’électeur, passeport ou carte d’étudiant avec date de naissance)'],
        imageUrl: IMG_BOURSES,
        statusOverride: 'auto',
        criteria: [
          { id: 'c1', label: 'Âge minimum 18 ans révolus', type: 'eliminatoire', fieldKey: 'age', operator: 'gte', expectedValue: '18', failReason: 'Âge inférieur à 18 ans à la date d’ouverture.' },
          { id: 'c2', label: 'Pièce d’identité jointe', type: 'eliminatoire', fieldKey: 'hasIdCard', operator: 'eq', expectedValue: 'true', failReason: 'Pièce d’identité obligatoire manquante.' },
          { id: 'c3', label: 'Disponibilité aux dates de formation', type: 'eliminatoire', fieldKey: 'disponibilite', operator: 'eq', expectedValue: 'Oui', failReason: 'Indisponible aux dates de la formation.' },
          { id: 'c4', label: 'Situation : Sans emploi (+10 pts)', type: 'automatique', fieldKey: 'situation', operator: 'eq', expectedValue: 'Sans emploi', points: 10 },
          { id: 'c5', label: 'Situation : Étudiant (+5 pts)', type: 'automatique', fieldKey: 'situation', operator: 'eq', expectedValue: 'Étudiant', points: 5 },
          { id: 'c6', label: 'Déjà client Lomakrev (+5 pts)', type: 'automatique', fieldKey: 'clientLomakrev', operator: 'eq', expectedValue: 'Oui', points: 5 },
          { id: 'c7', label: 'Aucun ordinateur personnel (+5 pts)', type: 'automatique', fieldKey: 'accesOrdinateur', operator: 'eq', expectedValue: 'Non', points: 5 },
          { id: 'c8', label: 'Qualité de la motivation', type: 'equipe', maxScore: 20 },
          { id: 'c9', label: 'Cohérence du projet professionnel', type: 'equipe', maxScore: 20 },
          { id: 'c10', label: 'Entretien / vérification finale', type: 'equipe', maxScore: 20 },
        ],
      },
      {
        id: 'camp_2',
        slug: 'cyber-ia-2027',
        title: 'Bourse Cybersécurité & IA appliquée — 2027',
        subtitle: 'Programme d’accès aux métiers numériques · 25 places',
        description:
          'Formation intensive combinant Cybersécurité pratique et Intelligence artificielle appliquée pour renforcer l’employabilité des jeunes talents congolais.',
        formations: ['Cybersécurité', 'Intelligence artificielle appliquée'],
        openDate: '2026-11-15',
        closeDate: '2027-02-20',
        trainingStartDate: '2027-03-01',
        places: 25,
        coverageRate: '100 % prise en charge',
        minAge: 18,
        maxAge: 35,
        requireTwoApprovals: true,
        requiredDocuments: ['Pièce d’identité', 'Carte d’étudiant ou CV (facultatif)'],
        imageUrl: IMG_ACADEMIE,
        statusOverride: 'auto',
        criteria: [
          { id: 'c2_1', label: 'Âge minimum 18 ans révolus', type: 'eliminatoire', fieldKey: 'age', operator: 'gte', expectedValue: '18', failReason: 'Âge inférieur à 18 ans.' },
          { id: 'c2_2', label: 'Pièce d’identité jointe', type: 'eliminatoire', fieldKey: 'hasIdCard', operator: 'eq', expectedValue: 'true', failReason: 'Pièce d’identité manquante.' },
          { id: 'c2_3', label: 'Étudiant ou chercheur d’emploi (+10 pts)', type: 'automatique', fieldKey: 'situation', operator: 'in', expectedValue: 'Sans emploi,Étudiant', points: 10 },
          { id: 'c2_4', label: 'Motivation (/20)', type: 'equipe', maxScore: 20 },
          { id: 'c2_5', label: 'Projet professionnel (/20)', type: 'equipe', maxScore: 20 },
        ],
      },
      {
        id: 'camp_3',
        slug: 'premiere-edition-2026',
        title: 'Première édition — Programme de Bourses 2026',
        subtitle: 'Édition clôturée · 30 lauréats certifiés à Kinshasa',
        description:
          'La première édition du Programme de Bourses LOMAKREV GROUP s’est tenue en 2026 avec succès. Les candidatures pour cette édition sont clôturées.',
        formations: ['Excel pour les entreprises', 'Cybersécurité'],
        openDate: '2026-06-01',
        closeDate: '2026-08-15',
        trainingStartDate: '2026-09-01',
        places: 30,
        coverageRate: '100 % prise en charge',
        minAge: 18,
        maxAge: null,
        requireTwoApprovals: false,
        requiredDocuments: ['Pièce d’identité'],
        imageUrl: IMG_BOURSES,
        statusOverride: 'closed',
        criteria: [],
      },
    ];
    const stmt = db.prepare('INSERT INTO scholarship_campaigns (id, slug, data) VALUES (?, ?, ?)');
    for (const c of seedCampaigns) {
      stmt.run(c.id, c.slug, JSON.stringify(c));
    }
  }

  // 7. Site Photos Gallery (Section 11)
  const photoCount = (db.prepare('SELECT COUNT(*) as c FROM site_photos').get() as { c: number }).c;
  if (photoCount === 0) {
    const seedPhotos: SitePhotoItem[] = [
      { id: 'ph_1', pole: 'bourses', edition: 'Première édition — 2026', url: IMG_BOURSES, caption: 'Photo de famille de la première édition — Lauréats et formateurs à Kinshasa', consentVerified: true, sortOrder: 1 },
      { id: 'ph_6', pole: 'bourses', edition: 'Cérémonie & Remise de diplômes', url: '/src/assets/images/ceremonie_remise_diplomes_1795207522397.jpg', caption: 'Cérémonie officielle de remise des diplômes et certificats aux lauréats', consentVerified: true, sortOrder: 2 },
      { id: 'ph_2', pole: 'academie', edition: 'Première édition — 2026', url: IMG_ACADEMIE, caption: 'Séance pratique de formation en bureautique avancée et cybersécurité', consentVerified: true, sortOrder: 1 },
      { id: 'ph_7', pole: 'academie', edition: 'Études & Ateliers pratiques', url: '/src/assets/images/etudes_formation_pratique_1795207523291.jpg', caption: 'Apprenants en atelier pratique Excel et cybersécurité au campus Gombe', consentVerified: true, sortOrder: 2 },
      { id: 'ph_3', pole: 'accueil', edition: 'Siège Gombe', url: IMG_HERO, caption: 'Espace d’accueil et pôle numérique — Avenue des Étoiles n° 09, Gombe', consentVerified: true, sortOrder: 1 },
      { id: 'ph_4', pole: 'maintenance', edition: 'Atelier Top Maintenance', url: IMG_MAINT_TECH, caption: 'Diagnostic carte mère et maintenance informatique en atelier', consentVerified: true, sortOrder: 1 },
      { id: 'ph_5', pole: 'maintenance', edition: 'Sécurité & GPS', url: IMG_MAINT_CAM, caption: 'Installation de caméras de surveillance HD et suivi GPS de flotte', consentVerified: true, sortOrder: 2 },
    ];
    const stmt = db.prepare('INSERT INTO site_photos (id, pole, data, sort_order) VALUES (?, ?, ?, ?)');
    for (const ph of seedPhotos) {
      stmt.run(ph.id, ph.pole, JSON.stringify(ph), ph.sortOrder);
    }
  }

  // 8. Form Definitions (Section 9)
  const fDefCount = (db.prepare('SELECT COUNT(*) as c FROM form_definitions').get() as { c: number }).c;
  if (fDefCount === 0) {
    const formKeys: FormDefinition['formKey'][] = ['academie', 'bourses', 'devis', 'intervention', 'contact'];
    const stmt = db.prepare('INSERT INTO form_definitions (form_key, data) VALUES (?, ?)');
    for (const k of formKeys) {
      const def: FormDefinition = { formKey: k, version: 1, updatedAt: now, customFields: [] };
      stmt.run(k, JSON.stringify(def));
    }
  }

  // 9. Short Links (Section 4)
  const slCount = (db.prepare('SELECT COUNT(*) as c FROM short_links').get() as { c: number }).c;
  if (slCount === 0) {
    const links = [
      { id: 'sl_1', code: 'excel', target: '/bourses/postuler?campagne=excel-avance-2027', label: 'Campagne Bourse Excel avancée 2027' },
      { id: 'sl_2', code: 'cyber', target: '/academie/inscription?formation=cybersecurite&session=2027-01', label: 'Inscription Cybersécurité 2027-01' },
      { id: 'sl_3', code: 'devis-gps', target: '/maintenance/devis?service=gps', label: 'Devis Traceurs GPS' },
    ];
    const stmt = db.prepare('INSERT INTO short_links (id, code, target_path, label, clicks, created_at) VALUES (?, ?, ?, ?, 0, ?)');
    for (const l of links) {
      stmt.run(l.id, l.code, l.target, l.label, now);
    }
  }

  // 10. Sample Dossiers so Admin & /suivi?ref=BRS-2026-00142 work out of the box!
  const dosCount = (db.prepare('SELECT COUNT(*) as c FROM dossiers').get() as { c: number }).c;
  if (dosCount === 0) {
    const sampleDossiers: Dossier[] = [
      {
        id: 'dos_sample_brs',
        reference: 'BRS-2026-00142',
        type: 'BRS',
        pole: 'bourses',
        status: 'Éligible — En cours d’évaluation',
        applicantName: 'Grace Mukendi Kabongo',
        phone: '+243812345678',
        whatsapp: '+243812345678',
        email: 'grace.mukendi@example.cd',
        commune: 'Gombe',
        ville: 'Kinshasa',
        provenance: 'whatsapp',
        campaignSlug: 'excel-avance-2027',
        formationSlug: 'excel-entreprises',
        eligibilityStatus: 'Éligible',
        autoScore: 15,
        teamScores: { c8: 16, c9: 15 },
        totalScore: 46,
        approvals: [],
        formVersion: 1,
        payload: {
          nom: 'Mukendi',
          postnom: 'Kabongo',
          prenom: 'Grace',
          sexe: 'Féminin',
          dateNaissance: '2001-05-14',
          province: 'Kinshasa',
          niveauEtudes: 'Graduat / Licence',
          etablissement: 'UNIKIN — Sciences Économiques',
          situation: 'Étudiant',
          clientLomakrev: 'Oui',
          accesOrdinateur: 'Non',
          niveauInfo: 'Intermédiaire',
          disponibilite: 'Oui',
          motivation: 'Je souhaite maîtriser Power Query et les tableaux de bord financiers pour mon stage en audit comptable.',
          projetPro: 'Devenir analyste financière dans une PME à Kinshasa.',
        },
        attachments: [{ name: 'carte_etudiant_unikin.pdf', type: 'application/pdf', size: 245120 }],
        internalComments: [{ at: now, author: 'Jean-Paul Mbuyi (Resp. Bourses)', text: 'Pièce d’identité et âge vérifiés (25 ans).' }],
        timeline: [
          { at: now, actor: 'Système', action: 'Candidature reçue (BRS-2026-00142) · Provenance : whatsapp', status: 'Éligible — En cours d’évaluation' },
        ],
        notifications: [
          { at: now, channel: 'SMS/WhatsApp', recipient: '+243812345678', subject: 'Accusé de réception BRS-2026-00142', body: 'Votre candidature BRS-2026-00142 a bien été reçue.' },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'dos_sample_cmd',
        reference: 'CMD-2026-00018',
        type: 'CMD',
        pole: 'tech',
        status: 'Nouvelle',
        applicantName: 'Christian Lukusa',
        phone: '+243998877665',
        whatsapp: '+243998877665',
        email: 'c.lukusa@entreprise.cd',
        commune: 'Limete',
        ville: 'Kinshasa',
        provenance: 'direct',
        formVersion: 1,
        payload: {
          items: [{ productId: 'prod_1', model: 'HP EliteBook 840 G8 (Core i7, 16 Go, 512 Go)', qty: 1, priceUsd: 599 }],
          totalUsd: 599,
          deliveryMode: 'Retrait en boutique (Gombe)',
          remarque: 'Passage prévu demain matin vers 10h.',
        },
        attachments: [],
        internalComments: [],
        timeline: [{ at: now, actor: 'Système', action: 'Demande de commande enregistrée', status: 'Nouvelle' }],
        notifications: [{ at: now, channel: 'SMS/WhatsApp', recipient: '+243998877665', subject: 'Confirmation CMD-2026-00018', body: 'Votre commande CMD-2026-00018 est enregistrée.' }],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'dos_sample_int',
        reference: 'INT-2026-00024',
        type: 'INT',
        pole: 'maintenance',
        status: 'Planifiée',
        applicantName: 'Clinique Espoir Gombe',
        phone: '+243897654321',
        whatsapp: '+243897654321',
        email: 'it@clinique-espoir.cd',
        commune: 'Gombe',
        ville: 'Kinshasa',
        provenance: 'affiche-gombe',
        assignedToId: 'usr_technicien',
        assignedToName: 'Eric Tshimanga (Technicien)',
        serviceKey: 'reseau',
        interventionLog: {
          diagnostic: 'Switch principal du 2e étage hors ligne suite à surtension.',
          partsUsed: 'Vérification alimentation + test ports RJ45',
          timeSpent: '1h30 estimée',
          scheduledSlot: '2026-11-21 · Matin (09h00 - 12h00)',
        },
        formVersion: 1,
        payload: {
          equipement: 'Réseau Wi-Fi & Switch 24 ports',
          marqueModele: 'TP-Link TL-SG1024',
          description: 'Coupure réseau sur tout l’aile administrative depuis ce matin.',
          depuisQuand: 'Aujourd’hui 08h00',
          urgence: 'Bloquante pour mon activité',
          lieuMode: 'Intervention sur place',
          adresse: 'Avenue du Port n° 14, Gombe',
          creneauSouhaite: '2026-11-21 Matin',
          sousContrat: 'Oui — CTR-2026-04',
        },
        attachments: [],
        internalComments: [{ at: now, author: 'Cédric Nzita (Top Maintenance)', text: 'Affecté à Eric Tshimanga en priorité.' }],
        timeline: [
          { at: now, actor: 'Système', action: 'Demande d’intervention créée', status: 'Reçue' },
          { at: now, actor: 'Cédric Nzita (Top Maintenance)', action: 'Technicien affecté : Eric Tshimanga', status: 'Planifiée' },
        ],
        notifications: [],
        createdAt: now,
        updatedAt: now,
      },
    ];

    const stmt = db.prepare(
      'INSERT INTO dossiers (id, reference, type, pole, status, applicant_name, phone, provenance, assigned_to_id, campaign_slug, formation_slug, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const d of sampleDossiers) {
      stmt.run(
        d.id,
        d.reference,
        d.type,
        d.pole,
        d.status,
        d.applicantName,
        d.phone,
        d.provenance,
        d.assignedToId || null,
        d.campaignSlug || null,
        d.formationSlug || null,
        JSON.stringify(d),
        d.createdAt,
        d.updatedAt
      );
    }
    db.prepare('INSERT OR REPLACE INTO reference_counters (prefix_year, seq) VALUES (?, ?)').run('BRS-2026', 142);
    db.prepare('INSERT OR REPLACE INTO reference_counters (prefix_year, seq) VALUES (?, ?)').run('CMD-2026', 18);
    db.prepare('INSERT OR REPLACE INTO reference_counters (prefix_year, seq) VALUES (?, ?)').run('INT-2026', 24);
  }

  // 9. Initial sample notifications aligned with sample dossiers
  const notifCount = (db.prepare('SELECT COUNT(*) as c FROM admin_notifications').get() as { c: number }).c;
  if (notifCount === 0) {
    const seedNotifs = [
      {
        id: 'notif_seed_cmd',
        createdAt: now,
        pole: 'tech',
        category: 'CMD',
        title: 'Nouvelle commande Tech · CMD-2026-00018',
        message: 'Christian Lukusa (+243998877665) — HP EliteBook 840 G8 (599 USD)',
        dossierId: 'dos_sample_cmd',
        dossierRef: 'CMD-2026-00018',
        targetRoles: ['DIRECTION', 'COMMERCIAL_TECH'],
        targetUserId: null,
        linkTab: 'dossiers',
      },
      {
        id: 'notif_seed_brs',
        createdAt: now,
        pole: 'bourses',
        category: 'BRS',
        title: 'Nouvelle candidature de bourse · BRS-2026-00142',
        message: 'Grace Mukendi Kabongo (+243812345678) — Éligible · Score initial 46',
        dossierId: 'dos_sample_brs',
        dossierRef: 'BRS-2026-00142',
        targetRoles: ['DIRECTION', 'RESPONSABLE_BOURSES'],
        targetUserId: null,
        linkTab: 'dossiers',
      },
      {
        id: 'notif_seed_int',
        createdAt: now,
        pole: 'maintenance',
        category: 'INT',
        title: 'Intervention planifiée · INT-2026-00024',
        message: 'Clinique Espoir Gombe (+243897654321) — Réseau Wi-Fi & Switch 24 ports (affectée à Eric Tshimanga)',
        dossierId: 'dos_sample_int',
        dossierRef: 'INT-2026-00024',
        targetRoles: ['DIRECTION', 'TOP_MAINTENANCE'],
        targetUserId: 'usr_technicien',
        linkTab: 'dossiers',
      },
    ];
    const nStmt = db.prepare(
      `INSERT INTO admin_notifications (id, created_at, pole, category, title, message, dossier_id, dossier_ref, target_roles, target_user_id, actor_user_id, link_tab)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`
    );
    for (const n of seedNotifs) {
      nStmt.run(n.id, n.createdAt, n.pole, n.category, n.title, n.message, n.dossierId, n.dossierRef, JSON.stringify(n.targetRoles), n.targetUserId, n.linkTab);
    }
  }
}

seedIfEmpty();

// --- Helper Functions ---
function getSettings(): SiteSettings {
  const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get('site_settings') as { value: string } | undefined;
  return row ? JSON.parse(row.value) : defaultSettings;
}

function nextReference(type: DossierType): string {
  const year = new Date().getFullYear();
  const prefix = type === 'WAITLIST' ? 'WL' : type;
  const key = `${prefix}-${year}`;
  const tx = db.transaction(() => {
    const row = db.prepare('SELECT seq FROM reference_counters WHERE prefix_year = ?').get(key) as { seq: number } | undefined;
    const next = (row?.seq || 0) + 1;
    db.prepare('INSERT OR REPLACE INTO reference_counters (prefix_year, seq) VALUES (?, ?)').run(key, next);
    return `${key}-${String(next).padStart(5, '0')}`;
  });
  return tx();
}

function recordAudit(user: { id: string; name: string; role: string }, action: string, target: string, oldValue?: string, newValue?: string) {
  db.prepare(
    'INSERT INTO audit_logs (id, at, user_id, user_name, role, action, target, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(uid('aud'), new Date().toISOString(), user.id, user.name, user.role, action, target, oldValue || null, newValue || null);
}

// --- Real-Time Role-Scoped Notifications ---
const notificationStreams = new Map<string, { userId: string; role: UserRole; res: Response }>();

function canUserSeeNotification(
  user: { id: string; role: UserRole },
  n: { target_roles: string; target_user_id: string | null; actor_user_id: string | null }
): boolean {
  if (n.actor_user_id && n.actor_user_id === user.id) return false;
  if (user.role === 'LECTURE_SEULE') return false;
  if (user.role === 'TECHNICIEN') {
    return n.target_user_id === user.id;
  }
  const roles = JSON.parse(n.target_roles || '[]') as UserRole[];
  if (n.target_user_id && n.target_user_id === user.id) return true;
  return roles.includes(user.role);
}

function rolesForDossier(dossier: Pick<Dossier, 'pole' | 'type' | 'serviceKey'>): UserRole[] {
  if (dossier.pole === 'tech') return ['DIRECTION', 'COMMERCIAL_TECH'];
  if (dossier.pole === 'academie') return ['DIRECTION', 'RESPONSABLE_ACADEMIE'];
  if (dossier.pole === 'bourses') return ['DIRECTION', 'RESPONSABLE_BOURSES'];
  if (dossier.pole === 'maintenance') {
    if (dossier.type === 'DEV' && dossier.serviceKey === 'multi-postes') {
      return ['DIRECTION', 'TOP_MAINTENANCE', 'COMMERCIAL_TECH'];
    }
    return ['DIRECTION', 'TOP_MAINTENANCE'];
  }
  return ['DIRECTION'];
}

function createNotification(input: {
  pole: AdminNotification['pole'];
  category: AdminNotification['category'];
  title: string;
  message: string;
  dossierId?: string | null;
  dossierRef?: string | null;
  targetRoles: UserRole[];
  targetUserId?: string | null;
  actorUserId?: string | null;
  linkTab?: string;
}) {
  const id = uid('notif');
  const createdAt = new Date().toISOString();
  const targetRolesJson = JSON.stringify(input.targetRoles);
  const linkTab = input.linkTab || 'dossiers';

  db.prepare(
    `INSERT INTO admin_notifications (id, created_at, pole, category, title, message, dossier_id, dossier_ref, target_roles, target_user_id, actor_user_id, link_tab)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    createdAt,
    input.pole,
    input.category,
    input.title,
    input.message,
    input.dossierId || null,
    input.dossierRef || null,
    targetRolesJson,
    input.targetUserId || null,
    input.actorUserId || null,
    linkTab
  );

  const payload: AdminNotification = {
    id,
    createdAt,
    pole: input.pole,
    category: input.category,
    title: input.title,
    message: input.message,
    dossierId: input.dossierId || null,
    dossierRef: input.dossierRef || null,
    targetRoles: input.targetRoles,
    targetUserId: input.targetUserId || null,
    linkTab,
    read: false,
    readAt: null,
  };

  const rowCheck = {
    target_roles: targetRolesJson,
    target_user_id: input.targetUserId || null,
    actor_user_id: input.actorUserId || null,
  };

  for (const [streamId, client] of notificationStreams.entries()) {
    if (!canUserSeeNotification({ id: client.userId, role: client.role }, rowCheck)) continue;
    try {
      client.res.write(`event: notification:created\ndata: ${JSON.stringify(payload)}\n\n`);
    } catch {
      notificationStreams.delete(streamId);
    }
  }
}

function calculateAgeAtDate(birthDateStr: string, targetDateStr: string): number {
  const birth = new Date(birthDateStr);
  const target = new Date(targetDateStr);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(target.getTime())) return -1;
  let age = target.getFullYear() - birth.getFullYear();
  const m = target.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && target.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, '');
}

function createBackupFile(): string {
  const dateTag = new Date().toISOString().slice(0, 10);
  const filePath = path.join(BACKUP_DIR, `lomakrev-backup-${dateTag}.json`);
  const payload = {
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    products: db.prepare('SELECT data FROM products').all().map((r: any) => JSON.parse(r.data)),
    formations: db.prepare('SELECT data FROM formations').all().map((r: any) => JSON.parse(r.data)),
    services: db.prepare('SELECT data FROM maintenance_services').all().map((r: any) => JSON.parse(r.data)),
    campaigns: db.prepare('SELECT data FROM scholarship_campaigns').all().map((r: any) => JSON.parse(r.data)),
    photos: db.prepare('SELECT data FROM site_photos').all().map((r: any) => JSON.parse(r.data)),
    forms: db.prepare('SELECT data FROM form_definitions').all().map((r: any) => JSON.parse(r.data)),
    dossiers: db.prepare('SELECT data FROM dossiers').all().map((r: any) => JSON.parse(r.data)),
    shortLinks: db.prepare('SELECT * FROM short_links').all(),
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return filePath;
}

// Create initial daily backup on boot if missing
try {
  const todayFile = path.join(BACKUP_DIR, `lomakrev-backup-${new Date().toISOString().slice(0, 10)}.json`);
  if (!fs.existsSync(todayFile)) {
    createBackupFile();
  }
} catch {
  // Ignore backup boot errors
}

// --- Express App Setup ---
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
});

app.use(express.json({ limit: '15mb' }));

// Simple rate limiter per key with sliding window and stale-bucket cleanup
const submissionWindow = new Map<string, number[]>();
const twoFaFailedAttempts = new Map<string, number>();

function checkRateLimit(key: string, maxRequests = 10, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  if (submissionWindow.size > 5000) {
    for (const [k, timestamps] of submissionWindow.entries()) {
      const fresh = timestamps.filter((t) => now - t < windowMs);
      if (fresh.length === 0) submissionWindow.delete(k);
      else submissionWindow.set(k, fresh);
    }
  }
  const list = (submissionWindow.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= maxRequests) return false;
  list.push(now);
  submissionWindow.set(key, list);
  return true;
}

const ALLOWED_ROLES: UserRole[] = [
  'DIRECTION',
  'COMMERCIAL_TECH',
  'RESPONSABLE_ACADEMIE',
  'RESPONSABLE_BOURSES',
  'TOP_MAINTENANCE',
  'TECHNICIEN',
  'LECTURE_SEULE',
];

function parseCookie(req: Request, name: string): string {
  const header = req.headers.cookie;
  if (!header) return '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return '';
      }
    }
  }
  return '';
}

function isHttpsRequest(req: Request): boolean {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  return req.secure || proto === 'https';
}

function setSessionCookie(req: Request, res: Response, token: string) {
  const attrs = ['lomakrev_session=' + encodeURIComponent(token), 'Path=/', 'HttpOnly', 'Max-Age=1800'];
  if (isHttpsRequest(req)) {
    attrs.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    attrs.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearSessionCookie(req: Request, res: Response) {
  const attrs = ['lomakrev_session=', 'Path=/', 'HttpOnly', 'Max-Age=0'];
  if (isHttpsRequest(req)) {
    attrs.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    attrs.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function extractSessionToken(req: Request): { token: string; viaCookieOnly: boolean } {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ') && authHeader.slice(7).trim()) {
    return { token: authHeader.slice(7).trim(), viaCookieOnly: false };
  }
  const customHeader = req.headers['x-lomakrev-token'];
  const customToken = Array.isArray(customHeader) ? customHeader[0] : customHeader;
  if (typeof customToken === 'string' && customToken.trim()) {
    return { token: customToken.trim(), viaCookieOnly: false };
  }
  const cookieToken = parseCookie(req, 'lomakrev_session');
  if (cookieToken) {
    return { token: cookieToken, viaCookieOnly: true };
  }
  return { token: '', viaCookieOnly: false };
}

function verifySameOriginForCookieMutation(req: Request): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
  if (req.headers['sec-fetch-site'] === 'same-origin') return true;

  const allowedHosts = new Set<string>();
  for (const candidate of [req.headers.host, req.headers['x-forwarded-host'], req.hostname]) {
    if (!candidate) continue;
    for (const part of String(candidate).split(',')) {
      const clean = part.trim().toLowerCase();
      if (clean) allowedHosts.add(clean);
    }
  }
  if (process.env.APP_URL) {
    try {
      allowedHosts.add(new URL(process.env.APP_URL).host.toLowerCase());
    } catch {
      // ignore invalid APP_URL
    }
  }
  if (allowedHosts.size === 0) return true;

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  if (origin) {
    try {
      const parsed = new URL(origin);
      return allowedHosts.has(parsed.host.toLowerCase()) || allowedHosts.has(parsed.hostname.toLowerCase());
    } catch {
      return false;
    }
  }
  if (referer) {
    try {
      const parsed = new URL(referer);
      return allowedHosts.has(parsed.host.toLowerCase()) || allowedHosts.has(parsed.hostname.toLowerCase());
    } catch {
      return false;
    }
  }
  return true;
}

function isSafeAppPath(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) return false;
  return !/[\r\n\0]/.test(trimmed);
}

function isSafeMediaUrl(val: unknown): boolean {
  if (val === undefined || val === null || val === '') return true;
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return true;
  if (isSafeAppPath(trimmed)) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) return true;
  return false;
}

function isSafeExternalUrl(val: unknown): boolean {
  if (val === undefined || val === null || val === '') return true;
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return true;
  return /^https?:\/\//i.test(trimmed);
}

function sanitizeSpreadsheetCell(value: unknown): string | number {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function canUserAccessDossier(user: { id: string; role: UserRole }, d: Dossier): boolean {
  if (user.role === 'DIRECTION' || user.role === 'LECTURE_SEULE') return true;
  if (user.role === 'TECHNICIEN') return d.type === 'INT' && d.assignedToId === user.id;
  if (user.role === 'COMMERCIAL_TECH') return d.type === 'CMD' || (d.type === 'DEV' && d.serviceKey === 'multi-postes');
  if (user.role === 'RESPONSABLE_ACADEMIE') return d.pole === 'academie';
  if (user.role === 'RESPONSABLE_BOURSES') return d.pole === 'bourses';
  if (user.role === 'TOP_MAINTENANCE') return d.pole === 'maintenance';
  return false;
}

// --- Auth Middleware ---
interface AuthedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    twoFactorEnabled: boolean;
    mustChangePassword: boolean;
    phone?: string;
    title?: string;
    avatarUrl?: string;
    bio?: string;
  };
  sessionToken?: string;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const { token, viaCookieOnly } = extractSessionToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }
  if (viaCookieOnly && !verifySameOriginForCookieMutation(req)) {
    res.status(403).json({ error: 'Origine de requête non autorisée.' });
    return;
  }
  const session = db
    .prepare(
      `SELECT s.*, u.name, u.email, u.role, u.active, u.two_factor_enabled, u.must_change_password, u.phone, u.title, u.avatar_url, u.bio
       FROM auth_sessions s JOIN users u ON s.user_id = u.id
       WHERE s.token = ?`
    )
    .get(token) as any;

  if (!session || !session.active) {
    clearSessionCookie(req, res);
    res.status(401).json({ error: 'Session expirée ou compte inactif.' });
    return;
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
    clearSessionCookie(req, res);
    res.status(401).json({ error: 'Session expirée par sécurité. Veuillez vous reconnecter.' });
    return;
  }
  if (session.two_factor_enabled && !session.verified_2fa) {
    res.status(403).json({ error: 'Validation en deux étapes requise.', require2FA: true });
    return;
  }
  // Sliding 30-min inactivity window
  const newExp = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  db.prepare('UPDATE auth_sessions SET last_activity = ?, expires_at = ? WHERE token = ?').run(new Date().toISOString(), newExp, token);

  req.user = {
    id: session.user_id,
    name: session.name,
    email: session.email,
    role: session.role as UserRole,
    twoFactorEnabled: !!session.two_factor_enabled,
    mustChangePassword: !!session.must_change_password,
    phone: session.phone || '',
    title: session.title || '',
    avatarUrl: session.avatar_url || '',
    bio: session.bio || '',
  };
  req.sessionToken = token;
  next();
}

function requirePasswordUpdated(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.mustChangePassword) {
    res.status(403).json({
      error: 'Mot de passe par défaut actif. Veuillez définir un nouveau mot de passe personnel avant d’accéder à l’espace.',
      mustChangePassword: true,
    });
    return;
  }
  next();
}

function requireRoles(...allowed: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié.' });
      return;
    }
    if (!allowed.includes(req.user.role)) {
      res.status(403).json({ error: 'Accès non autorisé pour votre rôle.' });
      return;
    }
    next();
  };
}

// --- Public API Routes ---
app.get('/api/public/bootstrap', (_req, res) => {
  const settings = getSettings();
  const products = db.prepare('SELECT data FROM products ORDER BY sort_order ASC').all().map((r: any) => JSON.parse(r.data));
  const formations = db.prepare('SELECT data FROM formations ORDER BY sort_order ASC').all().map((r: any) => JSON.parse(r.data));
  const services = db.prepare('SELECT data FROM maintenance_services ORDER BY sort_order ASC').all().map((r: any) => JSON.parse(r.data));
  const campaigns = db.prepare('SELECT data FROM scholarship_campaigns').all().map((r: any) => JSON.parse(r.data));
  const photos = db.prepare('SELECT data FROM site_photos ORDER BY sort_order ASC').all().map((r: any) => JSON.parse(r.data));
  const formRows = db.prepare('SELECT form_key, data FROM form_definitions').all() as { form_key: string; data: string }[];
  const forms: Record<string, FormDefinition> = {};
  for (const r of formRows) forms[r.form_key] = JSON.parse(r.data);
  const shortLinks = db.prepare('SELECT id, code, target_path as targetPath, label, clicks, created_at as createdAt FROM short_links').all();

  res.json({ settings, products, formations, services, campaigns, photos, forms, shortLinks });
});

app.post('/api/public/track', (req, res) => {
  const { eventName, path: pagePath, provenance } = req.body || {};
  if (eventName && pagePath) {
    db.prepare('INSERT INTO analytics_events (id, at, event_name, path, provenance) VALUES (?, ?, ?, ?, ?)').run(
      uid('evt'),
      new Date().toISOString(),
      String(eventName).slice(0, 64),
      String(pagePath).slice(0, 200),
      String(provenance || 'direct').slice(0, 64)
    );
  }
  res.json({ ok: true });
});

// Dossier Draft Save / Resume (Section 7)
app.post('/api/public/drafts', (req, res) => {
  const clientIp = req.ip || 'local';
  if (!checkRateLimit(`drafts:${clientIp}`, 30)) {
    res.status(429).json({ error: 'Trop de sauvegardes récentes. Veuillez patienter.' });
    return;
  }
  const { id, formKey, data } = req.body || {};
  const cleanId = typeof id === 'string' && /^draft_[a-f0-9]{12}$/.test(id) ? id : uid('draft');
  const serialized = JSON.stringify(data || {});
  if (serialized.length > 2 * 1024 * 1024) {
    res.status(413).json({ error: 'Brouillon trop volumineux.' });
    return;
  }
  db.prepare('INSERT OR REPLACE INTO drafts (id, form_key, data, updated_at) VALUES (?, ?, ?, ?)').run(
    cleanId,
    String(formKey || 'bourses').slice(0, 32),
    serialized,
    new Date().toISOString()
  );
  res.json({ id: cleanId, resumeUrl: `/bourses/postuler?draft=${cleanId}` });
});

app.get('/api/public/drafts/:id', (req, res) => {
  const clientIp = req.ip || 'local';
  if (!checkRateLimit(`drafts_read:${clientIp}`, 40)) {
    res.status(429).json({ error: 'Trop de requêtes. Veuillez patienter.' });
    return;
  }
  const row = db.prepare('SELECT * FROM drafts WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: 'Brouillon introuvable ou expiré.' });
    return;
  }
  res.json({ id: row.id, formKey: row.form_key, data: JSON.parse(row.data), updatedAt: row.updated_at });
});

// Unified Form Submission Handler
function processSubmission(
  type: DossierType,
  body: any,
  agentName: string | null = null
): { status: number; result: any } {
  // Honeypot anti-robot
  if (body?._website && String(body._website).trim().length > 0) {
    return { status: 400, result: { error: 'Soumission bloquée (contrôle de sécurité).' } };
  }

  const applicantName = String(body.applicantName || `${body.prenom || ''} ${body.nom || ''}`.trim() || 'Client').trim();
  const phone = normalizePhone(String(body.phone || body.telephone || ''));
  if (!phone || !/^\+?243[0-9]{9}$/.test(phone)) {
    return { status: 400, result: { error: 'Veuillez saisir un numéro de téléphone RDC valide (+243 suivi de 9 chiffres).' } };
  }

  const settings = getSettings();
  const now = new Date().toISOString();
  const provenance = String(body.provenance || 'direct');
  const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 5) : [];

  // Validate file sizes/types
  for (const att of attachments) {
    if (att.size > 10 * 1024 * 1024) {
      return { status: 400, result: { error: `Le fichier ${att.name} dépasse 10 Mo.` } };
    }
  }

  let pole: Dossier['pole'] = 'contact';
  let status = 'Reçue';
  let eligibilityStatus: Dossier['eligibilityStatus'] = null;
  let eligibilityReason: string | null = null;
  let autoScore = 0;

  if (type === 'CMD') {
    pole = 'tech';
    status = 'Nouvelle';
  } else if (type === 'ACA') {
    pole = 'academie';
    status = 'Reçue';
    // Check capacity if session exists
    if (body.formationSlug && body.sessionCode) {
      const fRow = db.prepare('SELECT data FROM formations WHERE slug = ?').get(body.formationSlug) as any;
      if (fRow) {
        const formation: Formation = JSON.parse(fRow.data);
        const sess = formation.sessions.find((s) => s.code === body.sessionCode);
        if (sess) {
          if (sess.enrolledCount >= sess.capacity) {
            status = 'Liste d’attente';
          } else {
            sess.enrolledCount += 1;
            db.prepare('UPDATE formations SET data = ? WHERE slug = ?').run(JSON.stringify(formation), body.formationSlug);
          }
        }
      }
    }
  } else if (type === 'WAITLIST') {
    pole = 'academie';
    status = 'Liste d’intérêt 2027';
  } else if (type === 'DEV') {
    pole = 'maintenance';
    status = 'Reçu';
  } else if (type === 'INT') {
    pole = 'maintenance';
    status = 'Reçue';
  } else if (type === 'CTC') {
    pole = 'contact';
    status = 'Reçu';
  } else if (type === 'BRS') {
    pole = 'bourses';
    const campRow = db.prepare('SELECT data FROM scholarship_campaigns WHERE slug = ?').get(body.campaignSlug) as any;
    if (!campRow) {
      return { status: 404, result: { error: 'Campagne de bourse introuvable.' } };
    }
    const camp: ScholarshipCampaign = JSON.parse(campRow.data);

    // Check campaign open status
    const today = now.slice(0, 10);
    const isClosed =
      camp.statusOverride === 'closed' ||
      (camp.statusOverride !== 'open' && (today > camp.closeDate || today < camp.openDate));
    if (isClosed) {
      return { status: 400, result: { error: `Candidatures clôturées le ${camp.closeDate}.` } };
    }

    // 1. Check Age >= minAge at trainingStartDate (if under minAge -> reject BEFORE storing!)
    const dob = String(body.payload?.dateNaissance || body.dateNaissance || '');
    const age = calculateAgeAtDate(dob, camp.trainingStartDate);
    if (age < 0) {
      return { status: 400, result: { error: 'Date de naissance invalide.' } };
    }
    if (age < (camp.minAge || 18)) {
      return {
        status: 422,
        result: {
          ageRejected: true,
          error: `Ce programme est réservé aux personnes âgées de ${camp.minAge || 18} ans et plus. Aucune donnée n’a été enregistrée.`,
        },
      };
    }
    if (camp.maxAge && age > camp.maxAge) {
      eligibilityStatus = 'Non éligible';
      eligibilityReason = `Âge supérieur au maximum fixé (${camp.maxAge} ans).`;
    }

    // 2. Check duplicate phone per campaign
    const existingBrs = db
      .prepare('SELECT id FROM dossiers WHERE type = ? AND campaign_slug = ? AND phone = ?')
      .get('BRS', camp.slug, phone);
    if (existingBrs) {
      return {
        status: 409,
        result: { error: 'Une seule candidature par numéro de téléphone est autorisée pour cette campagne.' },
      };
    }

    // 3. Evaluate configurable criteria
    const p = body.payload || {};
    const evalContext: Record<string, string> = {
      age: String(age),
      hasIdCard: attachments.length > 0 ? 'true' : 'false',
      disponibilite: String(p.disponibilite || ''),
      situation: String(p.situation || ''),
      clientLomakrev: String(p.clientLomakrev || ''),
      accesOrdinateur: String(p.accesOrdinateur || ''),
      ville: String(body.ville || p.ville || ''),
      province: String(p.province || ''),
    };

    if (!eligibilityStatus) {
      for (const crit of camp.criteria) {
        if (crit.type === 'eliminatoire') {
          const val = evalContext[crit.fieldKey || ''] || '';
          let ok = true;
          if (crit.operator === 'gte') ok = Number(val) >= Number(crit.expectedValue);
          else if (crit.operator === 'lte') ok = Number(val) <= Number(crit.expectedValue);
          else if (crit.operator === 'eq') ok = val.toLowerCase() === String(crit.expectedValue).toLowerCase();
          else if (crit.operator === 'not_empty') ok = val.trim().length > 0;
          if (!ok) {
            eligibilityStatus = 'Non éligible';
            eligibilityReason = crit.failReason || `Critère non rempli : ${crit.label}`;
            break;
          }
        }
      }
    }

    if (!eligibilityStatus) {
      eligibilityStatus = 'Éligible';
      for (const crit of camp.criteria) {
        if (crit.type === 'automatique') {
          const val = evalContext[crit.fieldKey || ''] || '';
          let matched = false;
          if (crit.operator === 'eq') matched = val.toLowerCase() === String(crit.expectedValue).toLowerCase();
          else if (crit.operator === 'in') {
            matched = String(crit.expectedValue || '')
              .split(',')
              .map((s) => s.trim().toLowerCase())
              .includes(val.toLowerCase());
          }
          if (matched) autoScore += crit.points || 0;
        }
      }
      status = 'Éligible — En cours d’évaluation';
    } else {
      status = 'Non éligible';
    }
  }

  const reference = nextReference(type);
  const fDefRow = db.prepare('SELECT data FROM form_definitions WHERE form_key = ?').get(pole === 'tech' ? 'contact' : pole) as any;
  const formVersion = fDefRow ? JSON.parse(fDefRow.data).version : 1;

  // Build automatic confirmation notification
  const msgKey =
    type === 'BRS' && eligibilityStatus === 'Non éligible'
      ? 'BRS_REJECTED'
      : `${type === 'WAITLIST' ? 'ACA' : type}_RECEIVED`;
  const template = settings.autoMessages[msgKey] || 'Bonjour {nom}, votre demande {ref} a bien été enregistrée.';
  const msgBody = template
    .replace('{nom}', applicantName)
    .replace('{ref}', reference)
    .replace('{motif}', eligibilityReason || '');

  const notifications: Dossier['notifications'] = [
    {
      at: now,
      channel: 'SMS/WhatsApp',
      recipient: phone,
      subject: `Confirmation ${reference}`,
      body: msgBody,
    },
  ];
  if (body.email) {
    notifications.push({
      at: now,
      channel: 'E-mail',
      recipient: String(body.email),
      subject: `[Lomakrev] Dossier ${reference}`,
      body: msgBody,
    });
  }

  const dossier: Dossier = {
    id: uid('dos'),
    reference,
    type,
    pole,
    status,
    applicantName,
    phone,
    whatsapp: body.whatsapp ? normalizePhone(String(body.whatsapp)) : phone,
    email: body.email ? String(body.email) : '',
    commune: body.commune ? String(body.commune) : '',
    ville: body.ville ? String(body.ville) : 'Kinshasa',
    provenance,
    enteredByAgent: agentName,
    assignedToId: null,
    assignedToName: null,
    campaignSlug: body.campaignSlug || null,
    formationSlug: body.formationSlug || null,
    sessionCode: body.sessionCode || null,
    serviceKey: body.serviceKey || null,
    eligibilityStatus,
    eligibilityReason,
    autoScore,
    teamScores: {},
    totalScore: autoScore,
    rejectionReason: eligibilityReason,
    approvals: [],
    quoteDetails: null,
    interventionLog: null,
    formVersion,
    payload: body.payload || {},
    attachments,
    internalComments: agentName ? [{ at: now, author: agentName, text: `Saisi au bureau par ${agentName}` }] : [],
    timeline: [
      {
        at: now,
        actor: agentName ? `Agent (${agentName})` : 'Visiteur en ligne',
        action: agentName ? `Dossier saisi au bureau par ${agentName} (${provenance})` : `Soumission en ligne (${provenance})`,
        status,
      },
    ],
    notifications,
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(
    `INSERT INTO dossiers (id, reference, type, pole, status, applicant_name, phone, provenance, assigned_to_id, campaign_slug, formation_slug, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    dossier.id,
    dossier.reference,
    dossier.type,
    dossier.pole,
    dossier.status,
    dossier.applicantName,
    dossier.phone,
    dossier.provenance,
    null,
    dossier.campaignSlug || null,
    dossier.formationSlug || null,
    JSON.stringify(dossier),
    dossier.createdAt,
    dossier.updatedAt
  );

  // Notify only concerned pole responsibles
  const targetRoles = rolesForDossier(dossier);
  let title = `Nouvelle activité · ${dossier.reference}`;
  let detail = `${dossier.applicantName} (${dossier.phone})`;
  const p = (dossier.payload || {}) as Record<string, any>;

  if (dossier.type === 'CMD') {
    title = `Nouvel achat / commande Tech · ${dossier.reference}`;
    const items = Array.isArray(p.items) ? p.items.map((it: any) => `${it.qty || 1}x ${it.model || 'Article'}`).join(', ') : '';
    const total = p.totalUsd ? ` · ${p.totalUsd} USD` : '';
    detail = `${dossier.applicantName} (${dossier.phone})${items ? ` — ${items}` : ''}${total}`;
  } else if (dossier.type === 'ACA') {
    title = `Nouvelle inscription Académie · ${dossier.reference}`;
    detail = `${dossier.applicantName} (${dossier.phone})${dossier.formationSlug ? ` — ${dossier.formationSlug}` : ''} (${dossier.status})`;
  } else if (dossier.type === 'WAITLIST') {
    title = `Liste d’intérêt Académie · ${dossier.reference}`;
    detail = `${dossier.applicantName} (${dossier.phone})${dossier.formationSlug ? ` — ${dossier.formationSlug}` : ''}`;
  } else if (dossier.type === 'BRS') {
    title = `Nouvelle demande de bourse · ${dossier.reference}`;
    detail = `${dossier.applicantName} (${dossier.phone}) — ${dossier.eligibilityStatus || dossier.status}`;
  } else if (dossier.type === 'DEV') {
    title = `Nouvelle demande de devis · ${dossier.reference}`;
    detail = `${dossier.applicantName} (${dossier.phone})${dossier.serviceKey ? ` — ${dossier.serviceKey}` : ''}`;
  } else if (dossier.type === 'INT') {
    title = `Nouvelle demande de maintenance · ${dossier.reference}`;
    detail = `${dossier.applicantName} (${dossier.phone})${p.equipement ? ` — ${p.equipement}` : ''}`;
  } else if (dossier.type === 'CTC') {
    title = `Nouveau message de contact · ${dossier.reference}`;
    detail = `${dossier.applicantName} (${dossier.phone})${p.sujet ? ` — ${p.sujet}` : ''}`;
  }

  createNotification({
    pole: dossier.pole,
    category: dossier.type === 'WAITLIST' ? 'ACA' : dossier.type,
    title,
    message: detail,
    dossierId: dossier.id,
    dossierRef: dossier.reference,
    targetRoles,
    actorUserId: null,
    linkTab: 'dossiers',
  });

  return {
    status: 201,
    result: {
      dossier: {
        reference: dossier.reference,
        type: dossier.type,
        status: dossier.status,
        applicantName: dossier.applicantName,
        eligibilityStatus: dossier.eligibilityStatus,
        eligibilityReason: dossier.eligibilityReason,
        createdAt: dossier.createdAt,
        notifications: dossier.notifications,
      },
    },
  };
}

app.post('/api/public/submit/:type', (req, res) => {
  const typeParam = String(req.params.type).toUpperCase() as DossierType;
  const validTypes: DossierType[] = ['CMD', 'ACA', 'BRS', 'DEV', 'INT', 'CTC', 'WAITLIST'];
  if (!validTypes.includes(typeParam)) {
    res.status(400).json({ error: 'Type de formulaire inconnu.' });
    return;
  }
  const clientIp = req.ip || 'local';
  if (!checkRateLimit(`ip:${clientIp}`, 25)) {
    res.status(429).json({ error: 'Trop de demandes envoyées récemment. Veuillez patienter quelques minutes.' });
    return;
  }
  const { status, result } = processSubmission(typeParam, req.body, null);
  res.status(status).json(result);
});

// Offline Sync Batch Endpoint
app.post('/api/sync/batch', (req, res) => {
  const clientIp = req.ip || 'local';
  if (!checkRateLimit(`sync:${clientIp}`, 15)) {
    res.status(429).json({ error: 'Trop de synchronisations récentes. Veuillez patienter.' });
    return;
  }
  const validTypes: DossierType[] = ['CMD', 'ACA', 'BRS', 'DEV', 'INT', 'CTC', 'WAITLIST'];
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 20) : [];
  const results: any[] = [];
  for (const item of items) {
    const type = String(item?.type || '').toUpperCase() as DossierType;
    if (!validTypes.includes(type)) {
      results.push({ localId: item?.localId, ok: false, status: 400, error: 'Type de formulaire inconnu.' });
      continue;
    }
    const { status, result } = processSubmission(type, item?.payload || {}, null);
    results.push({
      localId: item?.localId,
      ok: status >= 200 && status < 300,
      status,
      ...result,
    });
  }
  res.json({ synced: results });
});

// Public Dossier Tracking (/suivi)
app.get('/api/public/suivi', (req, res) => {
  const clientIp = req.ip || 'local';
  if (!checkRateLimit(`suivi:${clientIp}`, 30)) {
    res.status(429).json({ error: 'Trop de recherches effectuées. Veuillez patienter quelques minutes.' });
    return;
  }
  const ref = String(req.query.ref || '').trim().toUpperCase();
  const phone = normalizePhone(String(req.query.phone || ''));
  if (!ref || !phone) {
    res.status(400).json({ error: 'Veuillez saisir votre numéro de référence et votre numéro de téléphone.' });
    return;
  }
  const row = db.prepare('SELECT data FROM dossiers WHERE UPPER(reference) = ?').get(ref) as { data: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'Aucun dossier trouvé avec cette référence.' });
    return;
  }
  const dossier: Dossier = JSON.parse(row.data);
  if (normalizePhone(dossier.phone) !== phone && normalizePhone(dossier.whatsapp || '') !== phone) {
    res.status(403).json({ error: 'Le numéro de téléphone ne correspond pas à ce dossier.' });
    return;
  }
  // Return safe public view (hide internal comments)
  res.json({
    reference: dossier.reference,
    type: dossier.type,
    pole: dossier.pole,
    status: dossier.status,
    applicantName: dossier.applicantName,
    createdAt: dossier.createdAt,
    updatedAt: dossier.updatedAt,
    eligibilityStatus: dossier.eligibilityStatus,
    eligibilityReason: dossier.eligibilityReason,
    rejectionReason: dossier.rejectionReason,
    timeline: dossier.timeline,
    notifications: dossier.notifications,
    quoteDetails: dossier.quoteDetails,
    interventionLog: dossier.interventionLog,
  });
});

// --- Auth Endpoints ---
app.post('/api/auth/login', (req, res) => {
  const clientIp = req.ip || 'local';
  const emailInput = String(req.body?.email || '').trim().toLowerCase();
  if (!checkRateLimit(`login:${clientIp}:${emailInput}`, 12)) {
    res.status(429).json({ error: 'Trop de tentatives de connexion. Veuillez patienter 10 minutes.' });
    return;
  }
  const { password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(emailInput) as any;
  if (!user || !user.active || !verifyPassword(String(password || ''), user.password_hash)) {
    res.status(401).json({ error: 'Identifiants incorrects ou compte désactivé.' });
    return;
  }
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const verified2fa = user.two_factor_enabled ? 0 : 1;

  db.prepare('INSERT INTO auth_sessions (token, user_id, verified_2fa, last_activity, expires_at) VALUES (?, ?, ?, ?, ?)').run(
    token,
    user.id,
    verified2fa,
    now,
    expiresAt
  );

  setSessionCookie(req, res, token);
  recordAudit({ id: user.id, name: user.name, role: user.role }, 'Connexion', user.email);

  res.json({
    token,
    require2FA: !!user.two_factor_enabled,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      twoFactorEnabled: !!user.two_factor_enabled,
      mustChangePassword: !!user.must_change_password,
      phone: user.phone || '',
      title: user.title || '',
      avatarUrl: user.avatar_url || '',
      bio: user.bio || '',
    },
  });
});

app.post('/api/auth/verify-2fa', (req, res) => {
  const clientIp = req.ip || 'local';
  const extracted = extractSessionToken(req);
  const bodyToken = typeof req.body?.sessionToken === 'string' ? req.body.sessionToken.trim() : '';
  const token = extracted.token || bodyToken;
  const viaCookieOnly = extracted.token ? extracted.viaCookieOnly : false;
  if (!token) {
    res.status(401).json({ error: 'Session invalide. Veuillez vous reconnecter.' });
    return;
  }
  if (viaCookieOnly && !verifySameOriginForCookieMutation(req)) {
    res.status(403).json({ error: 'Origine de requête non autorisée.' });
    return;
  }
  if (!checkRateLimit(`2fa:${clientIp}:${token.slice(0, 12)}`, 10)) {
    res.status(429).json({ error: 'Trop de tentatives 2FA. Veuillez patienter.' });
    return;
  }

  const code = String(req.body?.code || '').replace(/\s+/g, '').trim();
  const session = db
    .prepare(
      'SELECT s.*, u.active, u.two_factor_code, u.must_change_password, u.name, u.email, u.role, u.phone, u.title, u.avatar_url, u.bio FROM auth_sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?'
    )
    .get(token) as any;
  if (!session || !session.active) {
    clearSessionCookie(req, res);
    res.status(401).json({ error: 'Session expirée ou compte inactif. Veuillez vous reconnecter.' });
    return;
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
    clearSessionCookie(req, res);
    res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
    return;
  }
  const expectedCode = String(session.two_factor_code || '202600').trim();
  const matches =
    code.length === expectedCode.length &&
    crypto.timingSafeEqual(Buffer.from(code, 'utf8'), Buffer.from(expectedCode, 'utf8'));
  if (!matches) {
    const attempts = (twoFaFailedAttempts.get(token) || 0) + 1;
    if (attempts >= 5) {
      twoFaFailedAttempts.delete(token);
      db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
      clearSessionCookie(req, res);
      res.status(401).json({ error: 'Trop de codes incorrects. Session fermée par sécurité.' });
      return;
    }
    twoFaFailedAttempts.set(token, attempts);
    res.status(403).json({ error: 'Code de vérification 2FA incorrect.' });
    return;
  }
  twoFaFailedAttempts.delete(token);
  const newExp = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  db.prepare('UPDATE auth_sessions SET verified_2fa = 1, last_activity = ?, expires_at = ? WHERE token = ?').run(
    new Date().toISOString(),
    newExp,
    token
  );
  setSessionCookie(req, res, token);
  res.json({
    ok: true,
    token,
    user: {
      id: session.user_id,
      name: session.name,
      email: session.email,
      role: session.role,
      twoFactorEnabled: true,
      mustChangePassword: !!session.must_change_password,
      phone: session.phone || '',
      title: session.title || '',
      avatarUrl: session.avatar_url || '',
      bio: session.bio || '',
    },
  });
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

app.patch('/api/auth/profile', requireAuth, (req: AuthedRequest, res) => {
  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!current) {
    res.status(404).json({ error: 'Utilisateur introuvable.' });
    return;
  }
  const name = String(req.body?.name ?? current.name).trim();
  const email = String(req.body?.email ?? current.email).trim().toLowerCase();
  const phone = String(req.body?.phone ?? current.phone ?? '').trim();
  const title = String(req.body?.title ?? current.title ?? '').trim();
  const bio = String(req.body?.bio ?? current.bio ?? '').trim();
  const avatarUrl = req.body?.avatarUrl !== undefined ? String(req.body.avatarUrl || '') : (current.avatar_url || '');

  if (!name) {
    res.status(400).json({ error: 'Le nom complet est obligatoire.' });
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Veuillez saisir une adresse e-mail valide.' });
    return;
  }
  if (!isSafeMediaUrl(avatarUrl)) {
    res.status(400).json({ error: 'Format de photo de profil non autorisé.' });
    return;
  }
  const conflict = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?').get(email, current.id);
  if (conflict) {
    res.status(409).json({ error: 'Cette adresse e-mail est déjà utilisée par un autre compte.' });
    return;
  }

  db.prepare('UPDATE users SET name = ?, email = ?, phone = ?, title = ?, avatar_url = ?, bio = ? WHERE id = ?').run(
    name,
    email,
    phone,
    title,
    avatarUrl,
    bio,
    current.id
  );
  recordAudit({ id: current.id, name, role: current.role }, 'Modification profil', email);

  res.json({
    ok: true,
    user: {
      id: current.id,
      name,
      email,
      role: current.role,
      active: !!current.active,
      twoFactorEnabled: !!current.two_factor_enabled,
      mustChangePassword: !!current.must_change_password,
      phone,
      title,
      avatarUrl,
      bio,
      createdAt: current.created_at,
    },
  });
});

app.post('/api/auth/change-password', requireAuth, (req: AuthedRequest, res) => {
  const clientIp = req.ip || 'local';
  if (!checkRateLimit(`pwchange:${clientIp}:${req.user!.id}`, 10)) {
    res.status(429).json({ error: 'Trop de tentatives de modification. Veuillez patienter.' });
    return;
  }
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!current) {
    res.status(404).json({ error: 'Utilisateur introuvable.' });
    return;
  }
  if (!verifyPassword(currentPassword, current.password_hash)) {
    res.status(400).json({ error: 'Le mot de passe actuel est incorrect.' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
    return;
  }
  if (current.must_change_password && newPassword === currentPassword) {
    res.status(400).json({ error: 'Veuillez choisir un mot de passe personnel différent du mot de passe par défaut.' });
    return;
  }
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hashPassword(newPassword), current.id);
  recordAudit(req.user!, 'Changement mot de passe', current.email);
  res.json({ ok: true, mustChangePassword: false });
});

app.post('/api/auth/logout', (req, res) => {
  const { token } = extractSessionToken(req);
  if (token) {
    twoFaFailedAttempts.delete(token);
    db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
  }
  clearSessionCookie(req, res);
  res.json({ ok: true });
});

// --- Admin API Routes ---
app.use('/api/admin', requireAuth, requirePasswordUpdated);

// Role-Scoped Real-Time Notifications
app.get('/api/admin/notifications', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT n.*, r.read_at
       FROM admin_notifications n
       LEFT JOIN admin_notification_reads r ON r.notification_id = n.id AND r.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 150`
    )
    .all(req.user!.id) as any[];

  const visible: AdminNotification[] = [];
  for (const row of rows) {
    if (!canUserSeeNotification(req.user!, row)) continue;
    visible.push({
      id: row.id,
      createdAt: row.created_at,
      pole: row.pole,
      category: row.category,
      title: row.title,
      message: row.message,
      dossierId: row.dossier_id,
      dossierRef: row.dossier_ref,
      targetRoles: JSON.parse(row.target_roles || '[]'),
      targetUserId: row.target_user_id,
      linkTab: row.link_tab || 'dossiers',
      read: !!row.read_at,
      readAt: row.read_at || null,
    });
    if (visible.length >= 60) break;
  }

  const unreadCount = visible.filter((n) => !n.read).length;
  res.json({ notifications: visible, unreadCount });
});

app.get('/api/admin/notifications/stream', requireAuth, (req: AuthedRequest, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const streamId = uid('sse');
  notificationStreams.set(streamId, { userId: req.user!.id, role: req.user!.role, res });
  res.write(': connected\n\n');

  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
      notificationStreams.delete(streamId);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    notificationStreams.delete(streamId);
  });
});

app.post('/api/admin/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
  const row = db.prepare('SELECT * FROM admin_notifications WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: 'Notification introuvable.' });
    return;
  }
  if (!canUserSeeNotification(req.user!, row)) {
    res.status(403).json({ error: 'Accès non autorisé à cette notification.' });
    return;
  }
  const now = new Date().toISOString();
  db.prepare('INSERT OR IGNORE INTO admin_notification_reads (notification_id, user_id, read_at) VALUES (?, ?, ?)').run(
    row.id,
    req.user!.id,
    now
  );
  res.json({ ok: true, id: row.id, readAt: now });
});

app.post('/api/admin/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
  const poleFilter = req.body?.pole ? String(req.body.pole) : null;
  const rows = db.prepare('SELECT id, pole, target_roles, target_user_id, actor_user_id FROM admin_notifications').all() as any[];
  const now = new Date().toISOString();
  const stmt = db.prepare('INSERT OR IGNORE INTO admin_notification_reads (notification_id, user_id, read_at) VALUES (?, ?, ?)');
  let marked = 0;
  for (const row of rows) {
    if (poleFilter && poleFilter !== 'all' && row.pole !== poleFilter) continue;
    if (!canUserSeeNotification(req.user!, row)) continue;
    const info = stmt.run(row.id, req.user!.id, now);
    if (info.changes > 0) marked++;
  }
  res.json({ ok: true, marked });
});

app.get('/api/admin/dashboard', requireAuth, (req: AuthedRequest, res) => {
  const role = req.user!.role;
  const rows = db.prepare('SELECT data FROM dossiers ORDER BY created_at DESC').all() as { data: string }[];
  let all: Dossier[] = rows.map((r) => JSON.parse(r.data));

  // Strict RBAC filtering on server side!
  if (role === 'TECHNICIEN') {
    all = all.filter((d) => d.type === 'INT' && d.assignedToId === req.user!.id);
  } else if (role === 'COMMERCIAL_TECH') {
    all = all.filter((d) => d.type === 'CMD' || (d.type === 'DEV' && d.serviceKey === 'multi-postes'));
  } else if (role === 'RESPONSABLE_ACADEMIE') {
    all = all.filter((d) => d.pole === 'academie');
  } else if (role === 'RESPONSABLE_BOURSES') {
    all = all.filter((d) => d.pole === 'bourses');
  } else if (role === 'TOP_MAINTENANCE') {
    all = all.filter((d) => d.pole === 'maintenance');
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

  const byPole: Record<string, number> = { tech: 0, academie: 0, bourses: 0, maintenance: 0, contact: 0 };
  const byProvenance: Record<string, number> = {};
  let overdueCount = 0;
  let weeklyCount = 0;

  for (const d of all) {
    byPole[d.pole] = (byPole[d.pole] || 0) + 1;
    byProvenance[d.provenance] = (byProvenance[d.provenance] || 0) + 1;
    if (new Date(d.createdAt).getTime() >= weekAgo) weeklyCount++;
    if (['Nouvelle', 'Reçue', 'Reçu'].includes(d.status) && new Date(d.createdAt).getTime() < dayAgo) {
      overdueCount++;
    }
  }

  const events = db.prepare('SELECT event_name, provenance FROM analytics_events').all() as { event_name: string; provenance: string }[];

  res.json({
    totalDossiers: all.length,
    weeklyCount,
    overdueCount,
    byPole,
    byProvenance,
    analyticsCount: events.length,
    recentDossiers: all.slice(0, 8),
  });
});

app.get('/api/admin/dossiers', requireAuth, (req: AuthedRequest, res) => {
  const role = req.user!.role;
  const rows = db.prepare('SELECT data FROM dossiers ORDER BY created_at DESC').all() as { data: string }[];
  let list: Dossier[] = rows.map((r) => JSON.parse(r.data));

  if (role === 'TECHNICIEN') {
    list = list.filter((d) => d.type === 'INT' && d.assignedToId === req.user!.id);
  } else if (role === 'COMMERCIAL_TECH') {
    list = list.filter((d) => d.type === 'CMD' || (d.type === 'DEV' && d.serviceKey === 'multi-postes'));
  } else if (role === 'RESPONSABLE_ACADEMIE') {
    list = list.filter((d) => d.pole === 'academie');
  } else if (role === 'RESPONSABLE_BOURSES') {
    list = list.filter((d) => d.pole === 'bourses');
  } else if (role === 'TOP_MAINTENANCE') {
    list = list.filter((d) => d.pole === 'maintenance');
  }

  res.json({ dossiers: list });
});

app.post('/api/admin/dossiers/office', requireAuth, (req: AuthedRequest, res) => {
  const role = req.user!.role;
  if (role === 'LECTURE_SEULE' || role === 'TECHNICIEN') {
    res.status(403).json({ error: 'Saisie au bureau non autorisée pour votre rôle.' });
    return;
  }
  const type = String(req.body?.type || '').toUpperCase() as DossierType;
  const validTypes: DossierType[] = ['CMD', 'ACA', 'BRS', 'DEV', 'INT', 'CTC', 'WAITLIST'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: 'Type de formulaire inconnu.' });
    return;
  }
  if (role === 'COMMERCIAL_TECH' && type !== 'CMD' && type !== 'DEV') {
    res.status(403).json({ error: 'Accès limité au pôle Lomakrev Tech.' });
    return;
  }
  if (role === 'RESPONSABLE_ACADEMIE' && type !== 'ACA' && type !== 'WAITLIST') {
    res.status(403).json({ error: 'Accès limité au pôle Académie.' });
    return;
  }
  if (role === 'RESPONSABLE_BOURSES' && type !== 'BRS') {
    res.status(403).json({ error: 'Accès limité au Programme de Bourses.' });
    return;
  }
  if (role === 'TOP_MAINTENANCE' && type !== 'DEV' && type !== 'INT') {
    res.status(403).json({ error: 'Accès limité au pôle Top Maintenance.' });
    return;
  }
  const { status, result } = processSubmission(type, { ...req.body, provenance: req.body.provenance || 'bureau' }, req.user!.name);
  if (status >= 200 && status < 300) {
    recordAudit(req.user!, 'Saisie au bureau', result.dossier.reference);
  }
  res.status(status).json(result);
});

app.patch('/api/admin/dossiers/:id', requireAuth, (req: AuthedRequest, res) => {
  const role = req.user!.role;
  if (role === 'LECTURE_SEULE') {
    res.status(403).json({ error: 'Action impossible en lecture seule.' });
    return;
  }
  const row = db.prepare('SELECT data FROM dossiers WHERE id = ?').get(req.params.id) as { data: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'Dossier introuvable.' });
    return;
  }
  const dossier: Dossier = JSON.parse(row.data);

  // Strict cross-pole RBAC enforcement
  if (!canUserAccessDossier(req.user!, dossier)) {
    res.status(403).json({ error: 'Accès non autorisé : ce dossier ne relève pas de votre pôle.' });
    return;
  }

  const now = new Date().toISOString();
  const body = req.body || {};
  const oldStatus = dossier.status;

  if (body.status) {
    // Scholarship approval/rejection rules (Section 7)
    if (dossier.type === 'BRS' && ['Approuvée', 'Refusée', 'Liste d’attente'].includes(body.status)) {
      if (!['DIRECTION', 'RESPONSABLE_BOURSES'].includes(role)) {
        res.status(403).json({ error: 'Seuls Responsable Bourses et Direction peuvent approuver ou refuser.' });
        return;
      }
      if (body.status === 'Refusée' && !String(body.rejectionReason || '').trim()) {
        res.status(400).json({ error: 'Un motif de refus est obligatoire.' });
        return;
      }
      if (body.status === 'Refusée') {
        dossier.rejectionReason = String(body.rejectionReason).trim();
      }
      if (body.status === 'Approuvée') {
        const campRow = db.prepare('SELECT data FROM scholarship_campaigns WHERE slug = ?').get(dossier.campaignSlug) as any;
        const camp: ScholarshipCampaign | null = campRow ? JSON.parse(campRow.data) : null;
        const approvals = dossier.approvals || [];
        if (!approvals.some((a) => a.userId === req.user!.id)) {
          approvals.push({ userId: req.user!.id, userName: req.user!.name, at: now });
        }
        dossier.approvals = approvals;
        if (camp?.requireTwoApprovals && approvals.length < 2) {
          dossier.status = 'Pré-approuvée (1/2 validations)';
        } else {
          dossier.status = 'Approuvée';
        }
      } else {
        dossier.status = body.status;
      }

      // Trigger automatic message to candidate
      const settings = getSettings();
      const msgKey =
        dossier.status === 'Approuvée'
          ? 'BRS_APPROVED'
          : dossier.status === 'Liste d’attente'
          ? 'BRS_WAITLIST'
          : dossier.status === 'Refusée'
          ? 'BRS_REJECTED'
          : '';
      if (msgKey && settings.autoMessages[msgKey]) {
        const msg = settings.autoMessages[msgKey]
          .replace('{nom}', dossier.applicantName)
          .replace('{ref}', dossier.reference)
          .replace('{motif}', dossier.rejectionReason || '');
        dossier.notifications.push({
          at: now,
          channel: 'SMS/WhatsApp',
          recipient: dossier.phone,
          subject: `Décision dossier ${dossier.reference}`,
          body: msg,
        });
      }
    } else {
      dossier.status = String(body.status);
    }

    if (dossier.status !== oldStatus) {
      dossier.timeline.push({
        at: now,
        actor: req.user!.name,
        action: `Statut changé : ${oldStatus} → ${dossier.status}`,
        status: dossier.status,
      });
    }
  }

  // Team scoring for scholarships
  if (body.teamScores && typeof body.teamScores === 'object') {
    if (!['DIRECTION', 'RESPONSABLE_BOURSES'].includes(role) || dossier.type !== 'BRS') {
      res.status(403).json({ error: 'Notation réservée aux responsables des bourses.' });
      return;
    }
    dossier.teamScores = body.teamScores;
    const teamSum = Object.values(dossier.teamScores || {}).reduce((acc, v) => acc + Number(v || 0), 0);
    dossier.totalScore = (dossier.autoScore || 0) + teamSum;
    dossier.timeline.push({ at: now, actor: req.user!.name, action: `Grille d’évaluation mise à jour (Score total : ${dossier.totalScore})` });
  }

  // Assign technician
  if (body.assignedToId !== undefined) {
    if (!['DIRECTION', 'TOP_MAINTENANCE'].includes(role)) {
      res.status(403).json({ error: 'Seule la Direction ou Top Maintenance peut affecter un technicien.' });
      return;
    }
    if (body.assignedToId) {
      const tech = db
        .prepare("SELECT id, name FROM users WHERE id = ? AND role = 'TECHNICIEN' AND active = 1")
        .get(body.assignedToId) as { id: string; name: string } | undefined;
      if (!tech) {
        res.status(400).json({ error: 'Technicien introuvable ou inactif.' });
        return;
      }
      dossier.assignedToId = tech.id;
      dossier.assignedToName = tech.name;
      dossier.timeline.push({ at: now, actor: req.user!.name, action: `Technicien affecté : ${dossier.assignedToName}` });
    } else {
      dossier.assignedToId = null;
      dossier.assignedToName = null;
    }
  }

  // Quote details (Top Maintenance / Commercial Tech)
  if (body.quoteDetails) {
    if (!['DIRECTION', 'TOP_MAINTENANCE', 'COMMERCIAL_TECH'].includes(role)) {
      res.status(403).json({ error: 'Rédaction de devis non autorisée pour votre rôle.' });
      return;
    }
    dossier.quoteDetails = body.quoteDetails;
    dossier.timeline.push({ at: now, actor: req.user!.name, action: 'Devis rédigé et enregistré' });
  }

  // Convert accepted quote into intervention
  if (body.convertToIntervention && dossier.type === 'DEV') {
    if (!['DIRECTION', 'TOP_MAINTENANCE'].includes(role)) {
      res.status(403).json({ error: 'Conversion en intervention réservée à Top Maintenance ou la Direction.' });
      return;
    }
    const intRef = nextReference('INT');
    const intDossier: Dossier = {
      ...dossier,
      id: uid('dos'),
      reference: intRef,
      type: 'INT',
      status: 'Planifiée',
      timeline: [{ at: now, actor: req.user!.name, action: `Créée depuis devis accepté ${dossier.reference}`, status: 'Planifiée' }],
      createdAt: now,
      updatedAt: now,
    };
    db.prepare(
      `INSERT INTO dossiers (id, reference, type, pole, status, applicant_name, phone, provenance, assigned_to_id, data, created_at, updated_at)
       VALUES (?, ?, 'INT', 'maintenance', ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(intDossier.id, intRef, intDossier.status, intDossier.applicantName, intDossier.phone, intDossier.provenance, null, JSON.stringify(intDossier), now, now);
    dossier.status = 'Accepté';
    dossier.timeline.push({ at: now, actor: req.user!.name, action: `Converti en intervention ${intRef}`, status: 'Accepté' });
  }

  // Intervention technical log
  if (body.interventionLog) {
    if (!['DIRECTION', 'TOP_MAINTENANCE', 'TECHNICIEN'].includes(role)) {
      res.status(403).json({ error: 'Carnet technique réservé à Top Maintenance.' });
      return;
    }
    dossier.interventionLog = body.interventionLog;
    dossier.timeline.push({ at: now, actor: req.user!.name, action: 'Carnet d’intervention technique mis à jour' });
  }

  // Internal comment
  if (body.comment && String(body.comment).trim()) {
    dossier.internalComments.push({ at: now, author: req.user!.name, text: String(body.comment).trim() });
  }

  dossier.updatedAt = now;
  db.prepare('UPDATE dossiers SET status = ?, assigned_to_id = ?, data = ?, updated_at = ? WHERE id = ?').run(
    dossier.status,
    dossier.assignedToId || null,
    JSON.stringify(dossier),
    now,
    dossier.id
  );
  recordAudit(req.user!, 'Mise à jour dossier', dossier.reference, oldStatus, dossier.status);

  // Emit scoped notifications for internal dossier activities
  const scopedRoles = rolesForDossier(dossier);
  if (body.assignedToId && dossier.assignedToName) {
    createNotification({
      pole: 'maintenance',
      category: 'ASSIGN',
      title: `Intervention affectée · ${dossier.reference}`,
      message: `${req.user!.name} a affecté ${dossier.applicantName} à ${dossier.assignedToName}`,
      dossierId: dossier.id,
      dossierRef: dossier.reference,
      targetRoles: ['DIRECTION', 'TOP_MAINTENANCE'],
      targetUserId: body.assignedToId,
      actorUserId: req.user!.id,
      linkTab: 'dossiers',
    });
  }
  if (body.convertToIntervention && dossier.type === 'DEV') {
    createNotification({
      pole: 'maintenance',
      category: 'INT',
      title: `Devis converti en intervention · ${dossier.reference}`,
      message: `${req.user!.name} a converti le devis de ${dossier.applicantName} en intervention planifiée.`,
      dossierId: dossier.id,
      dossierRef: dossier.reference,
      targetRoles: ['DIRECTION', 'TOP_MAINTENANCE'],
      actorUserId: req.user!.id,
      linkTab: 'dossiers',
    });
  } else if (body.quoteDetails) {
    createNotification({
      pole: 'maintenance',
      category: 'DEV',
      title: `Devis mis à jour · ${dossier.reference}`,
      message: `${req.user!.name} a enregistré le chiffrage pour ${dossier.applicantName}.`,
      dossierId: dossier.id,
      dossierRef: dossier.reference,
      targetRoles: scopedRoles,
      actorUserId: req.user!.id,
      linkTab: 'dossiers',
    });
  } else if (body.interventionLog) {
    createNotification({
      pole: 'maintenance',
      category: 'INT',
      title: `Rapport technique mis à jour · ${dossier.reference}`,
      message: `${req.user!.name} a complété le carnet d’intervention de ${dossier.applicantName}.`,
      dossierId: dossier.id,
      dossierRef: dossier.reference,
      targetRoles: ['DIRECTION', 'TOP_MAINTENANCE'],
      actorUserId: req.user!.id,
      linkTab: 'dossiers',
    });
  } else if (dossier.status !== oldStatus) {
    createNotification({
      pole: dossier.pole,
      category: 'STATUS',
      title: `Statut mis à jour · ${dossier.reference}`,
      message: `${req.user!.name} : ${oldStatus} → ${dossier.status} (${dossier.applicantName})`,
      dossierId: dossier.id,
      dossierRef: dossier.reference,
      targetRoles: scopedRoles,
      targetUserId: dossier.assignedToId || null,
      actorUserId: req.user!.id,
      linkTab: 'dossiers',
    });
  }

  res.json({ dossier });
});

// Batch approve scholarships
app.post('/api/admin/bourses/batch-approve', requireAuth, requireRoles('DIRECTION', 'RESPONSABLE_BOURSES'), (req: AuthedRequest, res) => {
  const { campaignSlug, dossierIds } = req.body || {};
  if (!Array.isArray(dossierIds)) {
    res.status(400).json({ error: 'Sélection invalide.' });
    return;
  }
  const now = new Date().toISOString();
  const settings = getSettings();
  let approved = 0;

  for (const id of dossierIds) {
    const row = db.prepare('SELECT data FROM dossiers WHERE id = ? AND type = ?').get(id, 'BRS') as any;
    if (!row) continue;
    const d: Dossier = JSON.parse(row.data);
    if (campaignSlug && d.campaignSlug !== campaignSlug) continue;
    d.status = 'Approuvée';
    d.approvals = [...(d.approvals || []), { userId: req.user!.id, userName: req.user!.name, at: now }];
    d.timeline.push({ at: now, actor: req.user!.name, action: 'Approbation groupée', status: 'Approuvée' });
    const msg = (settings.autoMessages.BRS_APPROVED || '').replace('{nom}', d.applicantName).replace('{ref}', d.reference);
    d.notifications.push({ at: now, channel: 'SMS/WhatsApp', recipient: d.phone, subject: `Décision ${d.reference}`, body: msg });
    d.updatedAt = now;
    db.prepare('UPDATE dossiers SET status = ?, data = ?, updated_at = ? WHERE id = ?').run(d.status, JSON.stringify(d), now, d.id);
    approved++;
  }
  recordAudit(req.user!, 'Approbation groupée bourses', `${approved} dossiers`, '', campaignSlug || '');
  if (approved > 0) {
    createNotification({
      pole: 'bourses',
      category: 'BRS',
      title: `Approbation groupée · Programme Bourses`,
      message: `${req.user!.name} a approuvé ${approved} candidature(s)${campaignSlug ? ` (${campaignSlug})` : ''}.`,
      targetRoles: ['DIRECTION', 'RESPONSABLE_BOURSES'],
      actorUserId: req.user!.id,
      linkTab: 'dossiers',
    });
  }
  res.json({ approved });
});

// Unified Client View & RGPD Export/Delete
app.get('/api/admin/clients', requireAuth, (req: AuthedRequest, res) => {
  if (req.user!.role === 'TECHNICIEN') {
    res.status(403).json({ error: 'Accès restreint.' });
    return;
  }
  const rows = db.prepare('SELECT data FROM dossiers ORDER BY created_at DESC').all() as { data: string }[];
  const clientsMap = new Map<string, { phone: string; name: string; email: string; commune: string; dossiers: Dossier[] }>();
  for (const r of rows) {
    const d: Dossier = JSON.parse(r.data);
    if (!canUserAccessDossier(req.user!, d)) continue;
    const key = normalizePhone(d.phone);
    const existing = clientsMap.get(key);
    if (existing) {
      existing.dossiers.push(d);
    } else {
      clientsMap.set(key, {
        phone: d.phone,
        name: d.applicantName,
        email: d.email || '',
        commune: d.commune || '',
        dossiers: [d],
      });
    }
  }
  res.json({ clients: Array.from(clientsMap.values()) });
});

app.delete('/api/admin/clients/:phone', requireAuth, requireRoles('DIRECTION'), (req: AuthedRequest, res) => {
  const phone = normalizePhone(req.params.phone);
  const rows = db.prepare('SELECT id, data FROM dossiers WHERE phone = ?').all(phone) as { id: string; data: string }[];
  for (const r of rows) {
    db.prepare('DELETE FROM dossiers WHERE id = ?').run(r.id);
  }
  recordAudit(req.user!, 'Suppression données RGPD', phone, `${rows.length} dossiers`, 'supprimés');
  res.json({ deleted: rows.length });
});

// Real Excel (.xlsx) Export
app.get('/api/admin/export/xlsx', requireAuth, (req: AuthedRequest, res) => {
  if (req.user!.role === 'TECHNICIEN') {
    res.status(403).json({ error: 'Export non autorisé.' });
    return;
  }
  const rawPole = String(req.query.pole || 'all').trim().toLowerCase();
  const allowedExportPoles = new Set(['all', 'tech', 'academie', 'bourses', 'maintenance', 'contact', 'cmd', 'aca', 'brs', 'dev', 'int', 'ctc']);
  const pole = allowedExportPoles.has(rawPole) ? rawPole : 'all';

  const rows = db.prepare('SELECT data FROM dossiers ORDER BY created_at DESC').all() as { data: string }[];
  const dossiers: Dossier[] = rows
    .map((r) => JSON.parse(r.data))
    .filter((d: Dossier) => canUserAccessDossier(req.user!, d))
    .filter((d: Dossier) => pole === 'all' || d.pole === pole || d.type === pole.toUpperCase());

  const flat = dossiers.map((d) => ({
    Référence: sanitizeSpreadsheetCell(d.reference),
    Type: sanitizeSpreadsheetCell(d.type),
    Pôle: sanitizeSpreadsheetCell(d.pole),
    Statut: sanitizeSpreadsheetCell(d.status),
    Demandeur: sanitizeSpreadsheetCell(d.applicantName),
    Téléphone: sanitizeSpreadsheetCell(d.phone),
    WhatsApp: sanitizeSpreadsheetCell(d.whatsapp || ''),
    Email: sanitizeSpreadsheetCell(d.email || ''),
    Commune: sanitizeSpreadsheetCell(d.commune || ''),
    Ville: sanitizeSpreadsheetCell(d.ville || ''),
    Provenance: sanitizeSpreadsheetCell(d.provenance),
    Éligibilité: sanitizeSpreadsheetCell(d.eligibilityStatus || ''),
    ScoreTotal: sanitizeSpreadsheetCell(d.totalScore ?? ''),
    DateCréation: sanitizeSpreadsheetCell(d.createdAt.slice(0, 16).replace('T', ' ')),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(flat);
  XLSX.utils.book_append_sheet(wb, ws, 'Dossiers Lomakrev');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  recordAudit(req.user!, 'Export Excel', `Pôle: ${pole}`, '', `${flat.length} lignes`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="lomakrev-export-${pole}.xlsx"`);
  res.send(buf);
});

// Admin Catalog & CMS Mutations
app.post('/api/admin/products', requireAuth, requireRoles('DIRECTION', 'COMMERCIAL_TECH'), (req: AuthedRequest, res) => {
  const prod: TechProduct = { ...req.body };
  if (!prod.model || !String(prod.model).trim()) {
    res.status(400).json({ error: 'Le modèle du produit est obligatoire.' });
    return;
  }
  const images = Array.isArray(prod.images) ? prod.images : [];
  if (!images.every((img) => isSafeMediaUrl(img))) {
    res.status(400).json({ error: 'URL ou format d’image non autorisé.' });
    return;
  }
  if (!prod.id) prod.id = uid('prod');
  if (!prod.slug) prod.slug = String(prod.model).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + prod.id.slice(-4);
  const existing = db.prepare('SELECT data FROM products WHERE id = ?').get(prod.id) as any;
  db.prepare('INSERT OR REPLACE INTO products (id, slug, data, sort_order) VALUES (?, ?, ?, ?)').run(
    prod.id,
    prod.slug,
    JSON.stringify(prod),
    prod.sortOrder || 10
  );
  recordAudit(req.user!, existing ? 'Modification produit' : 'Création produit', prod.model, existing?.data, `${prod.priceUsd} USD`);
  createNotification({
    pole: 'tech',
    category: 'CATALOG',
    title: existing ? `Catalogue Tech mis à jour` : `Nouvel article Lomakrev Tech`,
    message: `${req.user!.name} : ${prod.model} (${prod.priceUsd} USD)`,
    targetRoles: ['DIRECTION', 'COMMERCIAL_TECH'],
    actorUserId: req.user!.id,
    linkTab: 'catalog',
  });
  res.json({ product: prod });
});

app.delete('/api/admin/products/:id', requireAuth, requireRoles('DIRECTION', 'COMMERCIAL_TECH'), (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  recordAudit(req.user!, 'Suppression produit', req.params.id);
  res.json({ ok: true });
});

app.post('/api/admin/formations', requireAuth, requireRoles('DIRECTION', 'RESPONSABLE_ACADEMIE'), (req: AuthedRequest, res) => {
  const form: Formation = { ...req.body };
  if (!form.title || !String(form.title).trim()) {
    res.status(400).json({ error: 'Le titre de la formation est obligatoire.' });
    return;
  }
  if (!isSafeMediaUrl(form.imageUrl)) {
    res.status(400).json({ error: 'URL d’image invalide.' });
    return;
  }
  if (!form.id) form.id = uid('form');
  if (!form.slug) form.slug = String(form.title).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  db.prepare('INSERT OR REPLACE INTO formations (id, slug, data, sort_order) VALUES (?, ?, ?, ?)').run(
    form.id,
    form.slug,
    JSON.stringify(form),
    form.sortOrder || 10
  );
  recordAudit(req.user!, 'Mise à jour formation Académie', form.title);
  createNotification({
    pole: 'academie',
    category: 'CATALOG',
    title: `Formation Académie mise à jour`,
    message: `${req.user!.name} : ${form.title}`,
    targetRoles: ['DIRECTION', 'RESPONSABLE_ACADEMIE'],
    actorUserId: req.user!.id,
    linkTab: 'catalog',
  });
  res.json({ formation: form });
});

app.delete('/api/admin/formations/:id', requireAuth, requireRoles('DIRECTION', 'RESPONSABLE_ACADEMIE'), (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM formations WHERE id = ?').run(req.params.id);
  recordAudit(req.user!, 'Suppression formation', req.params.id);
  res.json({ ok: true });
});

app.post('/api/admin/campaigns', requireAuth, requireRoles('DIRECTION', 'RESPONSABLE_BOURSES'), (req: AuthedRequest, res) => {
  const camp: ScholarshipCampaign = { ...req.body };
  if (!camp.title || !String(camp.title).trim()) {
    res.status(400).json({ error: 'Le titre de la campagne est obligatoire.' });
    return;
  }
  if (!isSafeMediaUrl(camp.imageUrl)) {
    res.status(400).json({ error: 'URL d’image invalide.' });
    return;
  }
  if (!camp.id) camp.id = uid('camp');
  if (!camp.slug) camp.slug = String(camp.title).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  db.prepare('INSERT OR REPLACE INTO scholarship_campaigns (id, slug, data) VALUES (?, ?, ?)').run(camp.id, camp.slug, JSON.stringify(camp));
  recordAudit(req.user!, 'Mise à jour campagne bourse', camp.title);
  createNotification({
    pole: 'bourses',
    category: 'CATALOG',
    title: `Campagne de bourse mise à jour`,
    message: `${req.user!.name} : ${camp.title}`,
    targetRoles: ['DIRECTION', 'RESPONSABLE_BOURSES'],
    actorUserId: req.user!.id,
    linkTab: 'catalog',
  });
  res.json({ campaign: camp });
});

app.post('/api/admin/services', requireAuth, requireRoles('DIRECTION', 'TOP_MAINTENANCE'), (req: AuthedRequest, res) => {
  const svc: MaintenanceService = { ...req.body };
  if (!svc.title || !String(svc.title).trim()) {
    res.status(400).json({ error: 'Le titre du service est obligatoire.' });
    return;
  }
  if (!isSafeMediaUrl(svc.imageUrl)) {
    res.status(400).json({ error: 'URL d’image invalide.' });
    return;
  }
  if (!svc.id) svc.id = uid('svc');
  db.prepare('INSERT OR REPLACE INTO maintenance_services (id, slug, data, sort_order) VALUES (?, ?, ?, ?)').run(
    svc.id,
    svc.slug,
    JSON.stringify(svc),
    svc.sortOrder || 10
  );
  recordAudit(req.user!, 'Mise à jour service Top Maintenance', svc.title);
  createNotification({
    pole: 'maintenance',
    category: 'CATALOG',
    title: `Service Top Maintenance mis à jour`,
    message: `${req.user!.name} : ${svc.title}`,
    targetRoles: ['DIRECTION', 'TOP_MAINTENANCE'],
    actorUserId: req.user!.id,
    linkTab: 'catalog',
  });
  res.json({ service: svc });
});

app.post('/api/admin/photos', requireAuth, requireRoles('DIRECTION', 'RESPONSABLE_ACADEMIE', 'RESPONSABLE_BOURSES', 'TOP_MAINTENANCE', 'COMMERCIAL_TECH'), (req: AuthedRequest, res) => {
  const photo: SitePhotoItem = { ...req.body };
  if (!photo.url || !isSafeMediaUrl(photo.url)) {
    res.status(400).json({ error: 'URL ou format d’image invalide.' });
    return;
  }
  if (!photo.id) photo.id = uid('ph');
  db.prepare('INSERT OR REPLACE INTO site_photos (id, pole, data, sort_order) VALUES (?, ?, ?, ?)').run(
    photo.id,
    photo.pole,
    JSON.stringify(photo),
    photo.sortOrder || 1
  );
  recordAudit(req.user!, 'Ajout/Modification photo', `${photo.pole} — ${photo.caption}`);
  res.json({ photo });
});

app.delete('/api/admin/photos/:id', requireAuth, requireRoles('DIRECTION', 'RESPONSABLE_ACADEMIE', 'RESPONSABLE_BOURSES', 'TOP_MAINTENANCE'), (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM site_photos WHERE id = ?').run(req.params.id);
  recordAudit(req.user!, 'Retrait immédiat photo', req.params.id);
  res.json({ ok: true });
});

// Site Vitrine Settings (editable by Direction)
app.put('/api/admin/settings', requireAuth, requireRoles('DIRECTION'), (req: AuthedRequest, res) => {
  const oldSettings = getSettings();
  const body = req.body || {};
  const mediaKeys = ['logoUrl', 'heroImageUrl', 'aboutImageUrl', 'academieHeroUrl', 'boursesFamilyImageUrl', 'maintenanceHeroUrl'] as const;
  for (const key of mediaKeys) {
    if (body[key] !== undefined && !isSafeMediaUrl(body[key])) {
      res.status(400).json({ error: `URL d’image invalide pour ${key}.` });
      return;
    }
  }
  const externalKeys = ['facebookUrl', 'instagramUrl', 'linkedinUrl'] as const;
  for (const key of externalKeys) {
    if (body[key] !== undefined && !isSafeExternalUrl(body[key])) {
      res.status(400).json({ error: `URL externe invalide pour ${key}.` });
      return;
    }
  }
  const nextSettings: SiteSettings = { ...oldSettings, ...body };
  db.prepare('INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)').run(
    'site_settings',
    JSON.stringify(nextSettings),
    new Date().toISOString()
  );
  recordAudit(
    req.user!,
    'Paramètres site vitrine',
    nextSettings.siteName,
    `Taux: ${oldSettings.usdToCdfRate} CDF`,
    `Taux: ${nextSettings.usdToCdfRate} CDF`
  );
  res.json({ settings: nextSettings });
});

// Form Builder
app.put('/api/admin/forms/:formKey', requireAuth, requireRoles('DIRECTION', 'RESPONSABLE_ACADEMIE', 'RESPONSABLE_BOURSES', 'TOP_MAINTENANCE'), (req: AuthedRequest, res) => {
  const formKey = req.params.formKey as FormDefinition['formKey'];
  const existingRow = db.prepare('SELECT data FROM form_definitions WHERE form_key = ?').get(formKey) as any;
  const oldVersion = existingRow ? JSON.parse(existingRow.data).version : 0;
  const nextDef: FormDefinition = {
    formKey,
    version: oldVersion + 1,
    updatedAt: new Date().toISOString(),
    customFields: Array.isArray(req.body?.customFields) ? req.body.customFields : [],
  };
  db.prepare('INSERT OR REPLACE INTO form_definitions (form_key, data) VALUES (?, ?)').run(formKey, JSON.stringify(nextDef));
  recordAudit(req.user!, 'Modification formulaire', formKey, `v${oldVersion}`, `v${nextDef.version}`);
  res.json({ form: nextDef });
});

// Short Links
app.post('/api/admin/shortlinks', requireAuth, requireRoles('DIRECTION', 'RESPONSABLE_ACADEMIE', 'RESPONSABLE_BOURSES', 'TOP_MAINTENANCE', 'COMMERCIAL_TECH'), (req: AuthedRequest, res) => {
  const code = String(req.body?.code || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
  const targetPath = String(req.body?.targetPath || '').trim();
  const label = String(req.body?.label || code).trim();
  if (!code || !targetPath) {
    res.status(400).json({ error: 'Code et URL cible requis.' });
    return;
  }
  if (!isSafeAppPath(targetPath)) {
    res.status(400).json({ error: 'L’URL cible doit être un chemin interne du site (commençant par /).' });
    return;
  }
  const id = uid('sl');
  const now = new Date().toISOString();
  db.prepare('INSERT OR REPLACE INTO short_links (id, code, target_path, label, clicks, created_at) VALUES (?, ?, ?, ?, 0, ?)').run(
    id,
    code,
    targetPath,
    label,
    now
  );
  recordAudit(req.user!, 'Création lien court', `/b/${code} -> ${targetPath}`);
  res.json({ id, code, targetPath, label, clicks: 0, createdAt: now });
});

app.delete('/api/admin/shortlinks/:id', requireAuth, requireRoles('DIRECTION'), (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM short_links WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Users & Roles Management
app.get('/api/admin/users', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      'SELECT id, name, email, role, active, two_factor_enabled as twoFactorEnabled, must_change_password as mustChangePassword, phone, title, avatar_url as avatarUrl, bio, created_at as createdAt FROM users'
    )
    .all() as any[];
  const users = rows.map((u) => ({
    ...u,
    active: !!u.active,
    twoFactorEnabled: !!u.twoFactorEnabled,
    mustChangePassword: !!u.mustChangePassword,
    passwordHashPreview: 'scrypt-512 · ••••••••••••',
  }));
  res.json({ users });
});

app.post('/api/admin/users', requireAuth, requireRoles('DIRECTION'), (req: AuthedRequest, res) => {
  const rawName = String(req.body?.name || '').trim();
  const rawEmail = String(req.body?.email || '').trim().toLowerCase();
  const rawPassword = String(req.body?.password || '');
  const role = String(req.body?.role || '') as UserRole;
  const twoFactorEnabled = Boolean(req.body?.twoFactorEnabled);

  if (!rawName || !rawEmail || !role) {
    res.status(400).json({ error: 'Nom, e-mail et rôle requis.' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    res.status(400).json({ error: 'Adresse e-mail invalide.' });
    return;
  }
  if (!ALLOWED_ROLES.includes(role)) {
    res.status(400).json({ error: 'Rôle invalide.' });
    return;
  }
  const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(rawEmail);
  if (existingUser) {
    res.status(409).json({ error: 'Un compte avec cette adresse e-mail existe déjà.' });
    return;
  }
  if (rawPassword && rawPassword.length < 8) {
    res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    return;
  }

  const effectivePassword = rawPassword || process.env.DEFAULT_RESET_PASSWORD?.trim() || 'Lomakrev2026!';
  const mustChange = rawPassword ? 0 : 1;
  const twoFactorCode = twoFactorEnabled ? String(crypto.randomInt(100000, 999999)) : null;

  const id = uid('usr');
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO users (id, name, email, password_hash, role, active, two_factor_enabled, two_factor_code, must_change_password, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)'
  ).run(id, rawName, rawEmail, hashPassword(effectivePassword), role, twoFactorEnabled ? 1 : 0, twoFactorCode, mustChange, now);
  recordAudit(req.user!, 'Création utilisateur', `${rawEmail} (${role})`);
  res.json({ ok: true, id });
});

app.patch('/api/admin/users/:id', requireAuth, requireRoles('DIRECTION'), (req: AuthedRequest, res) => {
  const { role, active, twoFactorEnabled } = req.body || {};
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Utilisateur introuvable.' });
    return;
  }
  if (role !== undefined && !ALLOWED_ROLES.includes(role)) {
    res.status(400).json({ error: 'Rôle invalide.' });
    return;
  }
  const nextRole = role || existing.role;
  const nextActive = active !== undefined ? (active ? 1 : 0) : existing.active;
  const next2fa = twoFactorEnabled !== undefined ? (twoFactorEnabled ? 1 : 0) : existing.two_factor_enabled;
  const next2faCode = next2fa ? existing.two_factor_code || String(crypto.randomInt(100000, 999999)) : null;

  db.prepare('UPDATE users SET role = ?, active = ?, two_factor_enabled = ?, two_factor_code = ? WHERE id = ?').run(
    nextRole,
    nextActive,
    next2fa,
    next2faCode,
    req.params.id
  );
  if (!nextActive) {
    db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(req.params.id);
  }
  recordAudit(req.user!, 'Modification rôle/statut utilisateur', existing.email, existing.role, nextRole);
  res.json({ ok: true });
});

app.post('/api/admin/users/:id/reset-password', requireAuth, requireRoles('DIRECTION'), (req: AuthedRequest, res) => {
  const existing = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Utilisateur introuvable.' });
    return;
  }
  if (existing.id === req.user!.id) {
    res.status(400).json({ error: 'Utilisez l’onglet « Mon profil » pour modifier votre propre mot de passe.' });
    return;
  }
  const temporaryPassword = process.env.DEFAULT_RESET_PASSWORD?.trim() || 'Lomakrev2026!';
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(
    hashPassword(temporaryPassword),
    existing.id
  );
  db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(existing.id);
  recordAudit(req.user!, 'Réinitialisation mot de passe par défaut', existing.email);
  res.json({
    ok: true,
    temporaryPassword,
    user: {
      id: existing.id,
      name: existing.name,
      email: existing.email,
      mustChangePassword: true,
    },
  });
});

// Audit Logs
app.get('/api/admin/audit', requireAuth, requireRoles('DIRECTION', 'LECTURE_SEULE'), (_req, res) => {
  const logs = db.prepare('SELECT id, at, user_id as userId, user_name as userName, role, action, target, old_value as oldValue, new_value as newValue FROM audit_logs ORDER BY at DESC LIMIT 150').all();
  res.json({ logs });
});

// Backup & Restore
app.get('/api/admin/backup', requireAuth, requireRoles('DIRECTION'), (req: AuthedRequest, res) => {
  const file = createBackupFile();
  recordAudit(req.user!, 'Sauvegarde manuelle', path.basename(file));
  res.download(file);
});

app.post('/api/admin/restore-test', requireAuth, requireRoles('DIRECTION'), (req: AuthedRequest, res) => {
  const file = createBackupFile();
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  recordAudit(req.user!, 'Test de restauration sauvegarde', path.basename(file));
  res.json({
    ok: true,
    verifiedAt: new Date().toISOString(),
    counts: {
      products: parsed.products?.length || 0,
      formations: parsed.formations?.length || 0,
      campaigns: parsed.campaigns?.length || 0,
      dossiers: parsed.dossiers?.length || 0,
    },
  });
});

// --- Redirects & Dynamic SEO/Open Graph ---
app.get('/devis', (_req, res) => res.redirect(301, '/maintenance/devis'));
app.get('/academy', (_req, res) => res.redirect(301, '/academie'));
app.get('/b/:code', (req, res) => {
  const row = db.prepare('SELECT * FROM short_links WHERE LOWER(code) = LOWER(?)').get(req.params.code) as any;
  if (!row || !isSafeAppPath(row.target_path)) {
    res.redirect('/bourses');
    return;
  }
  db.prepare('UPDATE short_links SET clicks = clicks + 1 WHERE id = ?').run(row.id);
  const sep = row.target_path.includes('?') ? '&' : '?';
  res.redirect(`${row.target_path}${sep}src=lien-court-${encodeURIComponent(row.code)}`);
});

app.get('/sitemap.xml', (_req, res) => {
  const settings = getSettings();
  const base = `https://${settings.domain || 'lomakrev.com'}`;
  const urls = ['/', '/tech', '/academie', '/bourses', '/maintenance', '/suivi', '/apropos', '/contact'];
  const prods = db.prepare('SELECT slug FROM products').all() as { slug: string }[];
  const forms = db.prepare('SELECT slug FROM formations').all() as { slug: string }[];
  const camps = db.prepare('SELECT slug FROM scholarship_campaigns').all() as { slug: string }[];
  const svcs = db.prepare('SELECT slug FROM maintenance_services').all() as { slug: string }[];

  for (const p of prods) urls.push(`/tech/produits/${encodeURIComponent(p.slug)}`);
  for (const f of forms) urls.push(`/academie/formations/${encodeURIComponent(f.slug)}`);
  for (const c of camps) urls.push(`/bourses/campagnes/${encodeURIComponent(c.slug)}`);
  for (const s of svcs) urls.push(`/maintenance/services/${encodeURIComponent(s.slug)}`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${escapeXml(base + u)}</loc></url>`)
    .join('\n')}\n</urlset>`;
  res.type('application/xml').send(xml);
});

function resolveOgMeta(reqPath: string) {
  const settings = getSettings();
  let title = `${settings.siteName} — ${settings.legalName}`;
  let description = settings.promise;
  let image = settings.logoUrl;

  if (reqPath.startsWith('/tech/produits/')) {
    const slug = reqPath.replace('/tech/produits/', '');
    const row = db.prepare('SELECT data FROM products WHERE slug = ?').get(slug) as any;
    if (row) {
      const p: TechProduct = JSON.parse(row.data);
      title = `${p.model} (${p.processor}, ${p.ram}) — ${p.priceUsd} USD | Lomakrev Tech`;
      description = `${p.condition} · ${p.storage} · ${p.availability}. Commandez en ligne sur Lomakrev.`;
      image = p.images[0] || settings.logoUrl;
    }
  } else if (reqPath.startsWith('/academie/formations/')) {
    const slug = reqPath.replace('/academie/formations/', '');
    const row = db.prepare('SELECT data FROM formations WHERE slug = ?').get(slug) as any;
    if (row) {
      const f: Formation = JSON.parse(row.data);
      title = `${f.title} (${f.durationHours}h) — Lomakrev Académie`;
      description = f.summary;
      image = f.imageUrl || settings.academieHeroUrl;
    }
  } else if (reqPath.startsWith('/bourses/campagnes/')) {
    const slug = reqPath.replace('/bourses/campagnes/', '');
    const row = db.prepare('SELECT data FROM scholarship_campaigns WHERE slug = ?').get(slug) as any;
    if (row) {
      const c: ScholarshipCampaign = JSON.parse(row.data);
      title = `${c.title} — Programme de Bourses Lomakrev`;
      description = `${c.coverageRate} · ${c.places} places. ${c.description}`;
      image = c.imageUrl || settings.boursesFamilyImageUrl;
    }
  } else if (reqPath.startsWith('/maintenance/services/')) {
    const slug = reqPath.replace('/maintenance/services/', '');
    const row = db.prepare('SELECT data FROM maintenance_services WHERE slug = ?').get(slug) as any;
    if (row) {
      const s: MaintenanceService = JSON.parse(row.data);
      title = `${s.title} — Top Maintenance by Lomakrev`;
      description = s.summary;
      image = s.imageUrl || settings.maintenanceHeroUrl;
    }
  }
  const safeImage = image && !image.startsWith('data:') && isSafeMediaUrl(image) ? image : OFFICIAL_LOGO;
  return { title, description, image: safeImage };
}

function injectOgIntoHtml(html: string, reqPath: string): string {
  const meta = resolveOgMeta(reqPath);
  return html
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
    .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${escapeHtml(meta.description)}" />`)
    .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${escapeHtml(meta.title)}" />`)
    .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${escapeHtml(meta.description)}" />`)
    .replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${escapeHtml(meta.image)}" />`);
}

// --- Vite Integration & Production Static Serving ---
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        let template = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        template = injectOgIntoHtml(template, req.path);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      let html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
      html = injectOgIntoHtml(html, req.path);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    });
  }

  // Stack-safe error handler (never leaks internal stack traces to clients)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Format JSON invalide.' });
      return;
    }
    res.status(500).json({ error: 'Une erreur interne est survenue.' });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Lomakrev server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
