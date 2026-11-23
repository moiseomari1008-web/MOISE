import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { TechCatalogPage, TechProductDetailPage } from './pages/TechPages';
import { AcademieHomePage, AcademieInscriptionPage, FormationDetailPage } from './pages/AcademiePages';
import {
  MaintenanceDevisPage,
  MaintenanceHomePage,
  MaintenanceInterventionPage,
  MaintenanceServiceDetailPage,
} from './pages/MaintenancePages';
import { BourseCampaignDetailPage, BoursePostulerPage, BoursesHomePage } from './pages/BoursesPages';
import { AProposPage, ContactPage, LegalPage, SuiviDossierPage } from './pages/InfoAndTrackPages';
import { AdminPage } from './pages/AdminPage';

const RouteView: React.FC = () => {
  const { currentPath, loading, navigate } = useApp();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#D90A14]" />
      </div>
    );
  }

  const p = currentPath === '/' ? '/' : currentPath.replace(/\/+$/, '');

  if (p === '/') return <HomePage />;
  if (p === '/tech') return <TechCatalogPage />;
  if (p.startsWith('/tech/produits/')) {
    return <TechProductDetailPage slug={p.replace('/tech/produits/', '')} />;
  }

  if (p === '/academie' || p === '/academy') return <AcademieHomePage />;
  if (p === '/academie/inscription') return <AcademieInscriptionPage />;
  if (p.startsWith('/academie/formations/')) {
    return <FormationDetailPage slug={p.replace('/academie/formations/', '')} />;
  }

  if (p === '/maintenance') return <MaintenanceHomePage />;
  if (p === '/maintenance/devis' || p === '/devis') return <MaintenanceDevisPage />;
  if (p === '/maintenance/intervention') return <MaintenanceInterventionPage />;
  if (p.startsWith('/maintenance/services/')) {
    return <MaintenanceServiceDetailPage slug={p.replace('/maintenance/services/', '')} />;
  }

  if (p === '/bourses') return <BoursesHomePage />;
  if (p === '/bourses/postuler') return <BoursePostulerPage />;
  if (p.startsWith('/bourses/campagnes/')) {
    return <BourseCampaignDetailPage slug={p.replace('/bourses/campagnes/', '')} />;
  }

  if (p === '/suivi') return <SuiviDossierPage />;
  if (p === '/apropos') return <AProposPage />;
  if (p === '/contact') return <ContactPage />;
  if (p === '/mentions-legales') return <LegalPage mode="legal" />;
  if (p === '/confidentialite') return <LegalPage mode="privacy" />;
  if (p === '/admin') return <AdminPage />;

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold text-slate-900">Page introuvable</h1>
      <p className="mt-2 text-sm text-slate-600">Le lien demandé n’existe plus ou a été déplacé.</p>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-5 rounded-lg bg-[#D90A14] px-5 py-2.5 text-sm font-semibold text-white"
      >
        Retour à l’accueil
      </button>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Layout>
        <RouteView />
      </Layout>
    </AppProvider>
  );
}
