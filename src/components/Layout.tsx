import React, { useState } from 'react';
import {
  Check,
  ChevronRight,
  Laptop,
  GraduationCap,
  Award,
  Wrench,
  Menu,
  MessageCircle,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../lib/i18n';
import { buildWhatsAppDirectContact, formatCurrencyCdf, formatCurrencyUsd } from '../lib/pdfPrint';
import { PWAInstallButton } from './PWAInstallButton';
import { RdcPhoneInput, SubmissionSuccessCard, validateRdcPhone } from './DynamicFormFields';

export const Breadcrumbs: React.FC<{ items: { label: string; to?: string }[] }> = ({ items }) => {
  const { navigate } = useApp();
  return (
    <nav aria-label="Fil d'Ariane" className="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
      <button type="button" onClick={() => navigate('/')} className="hover:text-slate-900">
        Accueil
      </button>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          {item.to ? (
            <button type="button" onClick={() => navigate(item.to!)} className="hover:text-slate-900">
              {item.label}
            </button>
          ) : (
            <span className="text-slate-900">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    data,
    currentPath,
    navigate,
    lang,
    setLang,
    currency,
    setCurrency,
    cart,
    cartOpen,
    setCartOpen,
    updateCartQty,
    removeFromCart,
    clearCart,
    isOnline,
    outboxItems,
    isSyncing,
    syncNow,
    submitForm,
    toasts,
    dismissToast,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form' | 'done'>('cart');
  const [orderName, setOrderName] = useState('');
  const [orderPhone, setOrderPhone] = useState('+243');
  const [orderEmail, setOrderEmail] = useState('');
  const [orderCommune, setOrderCommune] = useState('Gombe');
  const [orderVille, setOrderVille] = useState('Kinshasa');
  const [deliveryMode, setDeliveryMode] = useState('Retrait en boutique (Gombe)');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderConsent, setOrderConsent] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  const settings = data?.settings;
  const copy = t(lang);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const cartTotalUsd = cart.reduce((sum, i) => sum + i.product.priceUsd * i.qty, 0);
  const isAdminRoute = currentPath.startsWith('/admin');

  const navLinks = [
    { label: copy.nav.home, to: '/' },
    { label: copy.nav.tech, to: '/tech' },
    { label: copy.nav.academie, to: '/academie' },
    { label: copy.nav.bourses, to: '/bourses' },
    { label: copy.nav.maintenance, to: '/maintenance' },
  ];

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError('');
    if (!orderName.trim()) {
      setOrderError('Veuillez indiquer votre nom complet.');
      return;
    }
    if (!validateRdcPhone(orderPhone)) {
      setOrderError('Veuillez saisir un numéro RDC valide (+243 suivi de 9 chiffres).');
      return;
    }
    if (!orderConsent) {
      setOrderError('Veuillez accepter le traitement de vos coordonnées pour votre commande.');
      return;
    }
    setOrderSubmitting(true);
    const res = await submitForm('CMD', `Commande ${orderName}`, {
      applicantName: orderName.trim(),
      phone: orderPhone,
      whatsapp: orderPhone,
      email: orderEmail.trim(),
      commune: orderCommune.trim(),
      ville: orderVille.trim(),
      payload: {
        items: cart.map((i) => ({
          productId: i.product.id,
          model: `${i.product.model} (${i.product.processor}, ${i.product.ram}, ${i.product.storage})`,
          qty: i.qty,
          priceUsd: i.product.priceUsd,
        })),
        totalUsd: cartTotalUsd,
        totalCdf: Math.round(cartTotalUsd * (settings?.usdToCdfRate || 2850)),
        deliveryMode,
        remarque: orderNotes.trim(),
      },
    });
    setOrderSubmitting(false);
    if (!res.ok) {
      setOrderError(res.error || 'Erreur lors de l’enregistrement.');
      return;
    }
    clearCart();
    setOrderResult(res);
    setCheckoutStep('done');
  };

  if (isAdminRoute) {
    return (
      <div className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
        {(!isOnline || outboxItems.length > 0) && (
          <div className="no-print border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <WifiOff className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {!isOnline ? copy.status.offlineBanner : `${outboxItems.length} ${copy.status.pendingSync}`}
                </span>
              </div>
              {isOnline && outboxItems.length > 0 && (
                <button
                  type="button"
                  onClick={syncNow}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 rounded bg-amber-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-800"
                >
                  <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  {copy.ctas.syncNow}
                </button>
              )}
            </div>
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-white text-slate-900 pb-16 md:pb-0">
      {/* Offline / Pending Sync Compact Strip */}
      {(!isOnline || outboxItems.length > 0) && (
        <div className="no-print border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <WifiOff className="h-3.5 w-3.5 shrink-0" />
              <span>
                {!isOnline ? copy.status.offlineBanner : `${outboxItems.length} ${copy.status.pendingSync}`}
              </span>
            </div>
            {isOnline && outboxItems.length > 0 && (
              <button
                type="button"
                onClick={syncNow}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 rounded bg-amber-900 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-800"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                {copy.ctas.syncNow}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Clean 3-Zone Top Bar with signature Red + Yellow top accent */}
      <header className="no-print sticky top-0 z-40 border-b border-[#D90A14]/15 bg-white/95 backdrop-blur-sm">
        <div className="h-1 w-full bg-gradient-to-r from-[#D90A14] via-[#FBBF24] to-[#D90A14]" />
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6 lg:gap-8">
          {/* Zone 1: Brand Mark (Official uploaded logo) */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex min-w-0 items-center gap-2 text-left focus:outline-none sm:gap-2.5"
          >
            <img
              src={settings?.logoUrl || '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.31.55_6695b86a.jpeg'}
              alt="Logo officiel Lomakrev"
              className="h-8 w-auto shrink-0 rounded-md border border-[#D90A14]/20 object-contain sm:h-9"
              referrerPolicy="no-referrer"
            />
            <span className="max-w-[140px] truncate font-display text-base font-extrabold tracking-tight text-slate-900 sm:max-w-none sm:text-lg">
              {settings?.siteName || 'Lomakrev'}
            </span>
          </button>

          {/* Zone 2: Primary Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-700">
            {navLinks.map((link) => {
              const active = link.to === '/' ? currentPath === '/' : currentPath.startsWith(link.to);
              return (
                <button
                  key={link.to}
                  type="button"
                  onClick={() => navigate(link.to)}
                  className={`relative py-1 transition-colors whitespace-nowrap shrink-0 ${
                    active ? 'font-bold text-[#D90A14]' : 'hover:text-[#D90A14]'
                  }`}
                >
                  {link.label}
                  {active && <span className="absolute inset-x-0 -bottom-[19px] h-0.5 bg-[#D90A14]" />}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => navigate('/apropos')}
              className={`relative py-1 transition-colors whitespace-nowrap shrink-0 ${
                currentPath === '/apropos' ? 'font-bold text-[#D90A14]' : 'hover:text-[#D90A14]'
              }`}
            >
              {copy.nav.about}
              {currentPath === '/apropos' && <span className="absolute inset-x-0 -bottom-[19px] h-0.5 bg-[#D90A14]" />}
            </button>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className={`relative py-1 transition-colors whitespace-nowrap shrink-0 ${
                currentPath === '/contact' ? 'font-bold text-[#D90A14]' : 'hover:text-[#D90A14]'
              }`}
            >
              {copy.nav.contact}
              {currentPath === '/contact' && <span className="absolute inset-x-0 -bottom-[19px] h-0.5 bg-[#D90A14]" />}
            </button>
          </nav>

          {/* Zone 3: Cart & Primary CTA */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCheckoutStep('cart');
                setCartOpen(true);
              }}
              aria-label="Ouvrir le panier"
              className="relative inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#F4B400]/60 bg-[#FFFBEB] px-3 text-sm font-medium text-slate-900 transition-colors hover:bg-[#FEF3C7] whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="h-4 w-4 text-[#D90A14]" />
              <span className="hidden sm:inline">{copy.nav.cart}</span>
              <span className="font-mono-tabular text-xs font-bold text-[#D90A14]">{cartCount}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/suivi')}
              className="hidden sm:inline-flex h-10 items-center rounded-lg bg-[#D90A14] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#b80811] whitespace-nowrap shrink-0"
            >
              {copy.nav.track}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-1">
              {[...navLinks, { label: copy.nav.about, to: '/apropos' }, { label: copy.nav.contact, to: '/contact' }, { label: copy.nav.track, to: '/suivi' }].map(
                (item) => (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => {
                      navigate(item.to);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex min-h-[44px] items-center justify-between rounded-lg px-3 text-left text-base font-medium ${
                      currentPath === item.to ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                )
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  Langue : {lang.toUpperCase()}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency(currency === 'USD' ? 'CDF' : 'USD')}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  Devise : {currency}
                </button>
              </div>
              <PWAInstallButton />
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Institutional Footer in Lomakrev Red, Yellow & White with Professional Backdrop */}
      <footer className="no-print relative overflow-hidden border-t-4 border-[#FBBF24] bg-[#2C0205] text-white">
        <img
          src="/src/assets/images/footer_laptop_studio_1795448543304.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-85 brightness-100"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#4A0308]/62 via-[#63050B]/52 to-[#3B0307]/62"
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 pb-20 sm:px-6 md:py-12 md:pb-16 lg:py-16">
          <div className="grid gap-8 sm:gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <img
                  src={settings?.logoUrl || '/assets/aistudio/WhatsApp_Image_2026-11-20_at_11.31.55_6695b86a.jpeg'}
                  alt="Logo LOMAKREV GROUP"
                  className="h-10 w-auto rounded-md border border-white/25 object-contain"
                  referrerPolicy="no-referrer"
                />
                <span className="font-display text-lg font-bold text-white">{settings?.legalName || 'LOMAKREV GROUP'}</span>
              </div>
              <p className="text-sm leading-relaxed text-white/90">{settings?.promise}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
                  className="rounded border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
                >
                  {lang === 'fr' ? 'FR / EN' : 'EN / FR'}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency(currency === 'USD' ? 'CDF' : 'USD')}
                  className="rounded border border-[#FBBF24]/70 bg-[#FBBF24] px-2.5 py-1 text-xs font-bold text-[#7A050B] hover:bg-[#F4B400]"
                >
                  Devise : {currency}
                </button>
                <PWAInstallButton />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#FBBF24]">Nos 4 pôles</h3>
              <ul className="mt-3 space-y-2 text-sm text-white/90">
                <li>
                  <button type="button" onClick={() => navigate('/tech')} className="hover:text-[#FBBF24]">
                    Lomakrev Tech — Ordinateurs
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('/academie')} className="hover:text-[#FBBF24]">
                    Lomakrev Académie — Formations
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('/maintenance')} className="hover:text-[#FBBF24]">
                    Top Maintenance — Devis & Dépannage
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('/bourses')} className="hover:text-[#FBBF24]">
                    Programme de Bourses
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#FBBF24]">Guichet en ligne</h3>
              <ul className="mt-3 space-y-2 text-sm text-white/90">
                <li>
                  <button type="button" onClick={() => navigate('/suivi')} className="hover:text-[#FBBF24]">
                    Suivre mon dossier
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('/maintenance/devis')} className="hover:text-[#FBBF24]">
                    Demander un devis
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('/maintenance/intervention')} className="hover:text-[#FBBF24]">
                    Demander une intervention
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate('/contact')} className="hover:text-[#FBBF24]">
                    Contact & Localisation
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#FBBF24]">Coordonnées officielles</h3>
              <div className="mt-3 space-y-1.5 text-sm leading-relaxed text-white/90">
                <p className="font-semibold text-white">{settings?.address}</p>
                <p className="text-xs text-white/80">{settings?.addressLandmarks}</p>
                <p className="pt-1 font-mono-tabular font-semibold text-[#FBBF24]">{settings?.phone}</p>
                <p>{settings?.email}</p>
                <p className="pt-1 text-xs text-white/80">
                  {settings?.rccm} · IDNat {settings?.idNat}
                </p>
                <p className="text-xs text-white/80">Réseaux sociaux : {settings?.socialHandle}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/20 pt-6 text-xs text-white/80">
            <p>© {new Date().getFullYear()} {settings?.legalName || 'LOMAKREV GROUP'}. Tous droits réservés.</p>
            <div className="flex flex-wrap items-center gap-4">
              <button type="button" onClick={() => navigate('/mentions-legales')} className="hover:text-[#FBBF24]">
                Mentions légales
              </button>
              <button type="button" onClick={() => navigate('/confidentialite')} className="hover:text-[#FBBF24]">
                Politique de confidentialité
              </button>
              <button type="button" onClick={() => navigate('/admin')} className="font-semibold text-[#FBBF24] hover:underline">
                Administration
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Quick-Access Bar (4 buttons, compact <= 15% height) */}
      <nav
        aria-label="Accès rapide mobile"
        className="no-print fixed inset-x-0 bottom-0 z-40 grid h-14 grid-cols-4 border-t-2 border-[#D90A14]/20 bg-white md:hidden"
      >
        {[
          { label: 'Ordinateurs', to: '/tech', icon: Laptop },
          { label: 'Formations', to: '/academie', icon: GraduationCap },
          { label: 'Bourses', to: '/bourses', icon: Award },
          { label: 'Maintenance', to: '/maintenance', icon: Wrench },
        ].map((item) => {
          const Icon = item.icon;
          const active = currentPath.startsWith(item.to);
          return (
            <button
              key={item.to}
              type="button"
              onClick={() => navigate(item.to)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                active ? 'bg-[#FFFBEB] text-[#D90A14]' : 'text-slate-700 hover:text-[#D90A14]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Discreet Floating WhatsApp Question Button */}
      {settings?.whatsapp && (
        <a
          href={buildWhatsAppDirectContact(settings.whatsapp, 'Bonjour LOMAKREV GROUP, j’ai une question depuis votre site internet.')}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Poser une question sur WhatsApp"
          className="no-print fixed bottom-16 right-3 z-30 inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 shadow-md transition-transform hover:-translate-y-0.5 sm:right-4 sm:px-4 md:bottom-5"
        >
          <MessageCircle className="h-4 w-4 text-emerald-600" />
          <span className="hidden sm:inline">Poser une question</span>
        </a>
      )}

      {/* Slide-over Cart & Order Checkout Drawer */}
      {cartOpen && (
        <div className="no-print fixed inset-0 z-50 flex justify-end bg-slate-950/50">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                {checkoutStep === 'cart' ? `Votre panier (${cartCount})` : checkoutStep === 'form' ? 'Finaliser la commande' : 'Confirmation'}
              </h2>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {checkoutStep === 'done' && orderResult ? (
                <SubmissionSuccessCard
                  offline={orderResult.offline}
                  localId={orderResult.localId}
                  dossier={orderResult.dossier}
                  onReset={() => {
                    setCartOpen(false);
                    setCheckoutStep('cart');
                  }}
                />
              ) : cart.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm font-medium text-slate-700">Votre panier est vide.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCartOpen(false);
                      navigate('/tech');
                    }}
                    className="mt-4 rounded-lg bg-[#D90A14] px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Voir les ordinateurs
                  </button>
                </div>
              ) : checkoutStep === 'cart' ? (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex gap-3 border-b border-slate-100 pb-4">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.model}
                        className="h-16 w-20 rounded-lg object-cover bg-slate-100"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.product.model}</p>
                        <p className="text-xs text-slate-500">
                          {item.product.processor} · {item.product.ram} · {item.product.storage}
                        </p>
                        <p className="mt-1 font-mono-tabular text-sm font-bold text-slate-900">
                          {formatCurrencyUsd(item.product.priceUsd * item.qty)}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, item.qty - 1)}
                            className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-700 hover:bg-slate-50"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center font-mono-tabular text-sm font-medium">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, item.qty + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-700 hover:bg-slate-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="ml-auto rounded p-1 text-slate-400 hover:text-[#D90A14]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-lg border border-[#F4B400]/40 bg-[#FFFDF5] p-4 text-xs leading-relaxed text-slate-700">
                    Aucun paiement en ligne immédiat. Enregistrez votre demande de commande ; un conseiller commercial Lomakrev vous rappelle pour confirmer la disponibilité et le retrait ou la livraison.
                  </div>
                </div>
              ) : (
                <form id="cart-checkout-form" onSubmit={handleOrderSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">
                      Nom complet <span className="text-[#D90A14]">*</span>
                    </label>
                    <input
                      type="text"
                      value={orderName}
                      onChange={(e) => setOrderName(e.target.value)}
                      placeholder="Ex. Patrick Mukendi"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base outline-none focus:border-[#D90A14]"
                    />
                  </div>
                  <RdcPhoneInput phone={orderPhone} onPhoneChange={setOrderPhone} showWhatsappOption={false} />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">E-mail (facultatif)</label>
                    <input
                      type="email"
                      value={orderEmail}
                      onChange={(e) => setOrderEmail(e.target.value)}
                      placeholder="nom@exemple.com"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base outline-none focus:border-[#D90A14]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-800">Commune</label>
                      <input
                        type="text"
                        value={orderCommune}
                        onChange={(e) => setOrderCommune(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base outline-none focus:border-[#D90A14]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-800">Ville</label>
                      <input
                        type="text"
                        value={orderVille}
                        onChange={(e) => setOrderVille(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-base outline-none focus:border-[#D90A14]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Mode de réception souhaité</label>
                    <select
                      value={deliveryMode}
                      onChange={(e) => setDeliveryMode(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base outline-none focus:border-[#D90A14]"
                    >
                      <option value="Retrait en boutique (Gombe)">Retrait en boutique (Gombe)</option>
                      <option value="Livraison à Kinshasa (modalités confirmées au téléphone)">Livraison à Kinshasa (modalités confirmées au téléphone)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-800">Remarque</label>
                    <textarea
                      rows={2}
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Précisions éventuelles..."
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-base outline-none focus:border-[#D90A14]"
                    />
                  </div>
                  <label className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={orderConsent}
                      onChange={(e) => setOrderConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#D90A14]"
                    />
                    <span>J’accepte que Lomakrev traite ces coordonnées pour enregistrer ma demande de commande.</span>
                  </label>
                  {orderError && <p className="text-xs font-medium text-[#D90A14]">{orderError}</p>}
                </form>
              )}
            </div>

            {cart.length > 0 && checkoutStep !== 'done' && (
              <div className="border-t border-[#F4B400]/40 bg-[#FFFDF5] p-5">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-slate-700">Total estimatif</span>
                  <div className="text-right">
                    <p className="font-mono-tabular text-lg font-bold text-[#D90A14]">{formatCurrencyUsd(cartTotalUsd)}</p>
                    <p className="font-mono-tabular text-xs text-slate-500">
                      ≈ {formatCurrencyCdf(cartTotalUsd, settings?.usdToCdfRate || 2850)}
                    </p>
                  </div>
                </div>
                {checkoutStep === 'cart' ? (
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('form')}
                    className="w-full rounded-lg bg-[#D90A14] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#b80811]"
                  >
                    Passer la demande de commande
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('cart')}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      form="cart-checkout-form"
                      disabled={orderSubmitting}
                      className="flex-1 rounded-lg bg-[#D90A14] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#b80811] disabled:opacity-60"
                    >
                      {orderSubmitting ? 'Enregistrement...' : 'Confirmer la commande'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="no-print fixed right-4 top-20 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex max-w-sm items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-white text-slate-900'
                : toast.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-slate-200 bg-white text-slate-800'
            }`}
          >
            {toast.type === 'success' && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
            <span className="flex-1">{toast.text}</span>
            <button type="button" onClick={() => dismissToast(toast.id)} className="text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
