import type { Language } from '../types/lomakrev';

export const translations = {
  fr: {
    nav: {
      home: 'Accueil',
      tech: 'Ordinateurs',
      academie: 'Académie',
      bourses: 'Bourses',
      maintenance: 'Maintenance',
      about: 'À propos',
      contact: 'Contact',
      track: 'Suivre mon dossier',
      cart: 'Panier',
    },
    ctas: {
      viewComputers: 'Voir les ordinateurs',
      enroll: 'S’inscrire',
      apply: 'Postuler',
      requestQuote: 'Demander un devis',
      requestIntervention: 'Demander une intervention',
      trackDossier: 'Suivre mon dossier',
      share: 'Partager',
      askQuestion: 'Poser une question',
      notifyOpening: 'Me prévenir de l’ouverture',
      syncNow: 'Synchroniser maintenant',
    },
    status: {
      offlineBanner: 'Mode hors ligne actif — Vos saisies sont sauvegardées localement et seront synchronisées dès le retour de la connexion.',
      pendingSync: 'dossier(s) en attente de synchronisation',
      onlineRestored: 'Connexion rétablie — Synchronisation automatique effectuée.',
      comingSoon: 'À venir',
    },
  },
  en: {
    nav: {
      home: 'Home',
      tech: 'Computers',
      academie: 'Academy',
      bourses: 'Scholarships',
      maintenance: 'Maintenance',
      about: 'About',
      contact: 'Contact',
      track: 'Track Application',
      cart: 'Cart',
    },
    ctas: {
      viewComputers: 'Browse Computers',
      enroll: 'Enroll Now',
      apply: 'Apply Now',
      requestQuote: 'Request a Quote',
      requestIntervention: 'Request Repair',
      trackDossier: 'Track Application',
      share: 'Share',
      askQuestion: 'Ask a Question',
      notifyOpening: 'Notify me at opening',
      syncNow: 'Sync Now',
    },
    status: {
      offlineBanner: 'Offline mode active — Your entries are saved locally and will sync automatically when online.',
      pendingSync: 'item(s) waiting to sync',
      onlineRestored: 'Connection restored — Data synced automatically.',
      comingSoon: 'Coming soon',
    },
  },
} as const;

export function t(lang: Language) {
  return translations[lang];
}
