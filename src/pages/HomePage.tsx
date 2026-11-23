import React from 'react';
import { ArrowRight, Award, Building2, GraduationCap, Laptop, MapPin, Phone, ShieldCheck, Users, Wrench } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AnimatedPhotoShowcase, PhotoFrame, Reveal, type ShowcaseSlide } from '../components/MotionPrimitives';
import { formatCurrencyCdf, formatCurrencyUsd, formatDateFr } from '../lib/pdfPrint';

const IMG_CEREMONIE_DIPLOMES = '/src/assets/images/ceremonie_remise_diplomes_1795207522397.jpg';
const IMG_ETUDES_ATELIER = '/src/assets/images/etudes_formation_pratique_1795207523291.jpg';

export const HomePage: React.FC = () => {
  const { data, navigate, currency, setCurrency, addToCart, trackEvent } = useApp();
  if (!data) return null;

  const { settings, products, formations, campaigns, photos } = data;
  const featuredProducts = products.filter((p) => p.active && p.featured).slice(0, 3);
  const openCampaign = campaigns.find((c) => {
    const today = new Date().toISOString().slice(0, 10);
    if (c.statusOverride === 'closed') return false;
    if (c.statusOverride === 'open') return true;
    return today >= c.openDate && today <= c.closeDate;
  });

  const dedupeSlides = (list: ShowcaseSlide[]) => {
    const seen = new Set<string>();
    return list.filter((s) => {
      if (!s.url || seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  };

  const heroSlides: ShowcaseSlide[] = dedupeSlides([
    {
      id: 'hero-siege',
      url: settings.heroImageUrl,
      alt: 'Siège LOMAKREV GROUP à Kinshasa Gombe',
      tag: 'Siège LOMAKREV GROUP · Gombe',
      caption: `${settings.address} — ${settings.openingHours}`,
    },
    {
      id: 'hero-ceremonie',
      url: IMG_CEREMONIE_DIPLOMES,
      alt: 'Cérémonie de remise de diplômes et bourses Lomakrev',
      tag: 'Cérémonies & Remise de diplômes',
      caption: 'Remise officielle des certificats et attestations aux lauréats des programmes Lomakrev',
    },
    {
      id: 'hero-etudes',
      url: IMG_ETUDES_ATELIER,
      alt: 'Séance d’études et ateliers pratiques Lomakrev Académie',
      tag: 'Études & Formations pratiques',
      caption: 'Travaux pratiques encadrés en bureautique avancée, cybersécurité et gestion de projet',
    },
    {
      id: 'hero-academie',
      url: settings.academieHeroUrl,
      alt: 'Salle de formation Lomakrev Académie',
      tag: 'Lomakrev Académie',
      caption: '7 parcours certifiants pour les étudiants, professionnels et entreprises à Kinshasa',
    },
    ...(photos || [])
      .filter((p) => p.pole === 'accueil' || p.pole === 'academie')
      .map((p) => ({
        id: `hero-ph-${p.id}`,
        url: p.url,
        alt: p.caption,
        tag: p.edition || 'Vie du campus',
        caption: p.caption,
      })),
  ]);

  const boursesSlides: ShowcaseSlide[] = dedupeSlides([
    {
      id: 'brs-famille',
      url: settings.boursesFamilyImageUrl,
      alt: 'Photo de famille — Première édition du Programme de Bourses Lomakrev',
      tag: 'Programme de Bourses',
      caption: 'Première édition du Programme de Bourses LOMAKREV GROUP — Lauréats et formateurs',
    },
    {
      id: 'brs-ceremonie',
      url: IMG_CEREMONIE_DIPLOMES,
      alt: 'Cérémonie de remise de diplômes des boursiers Lomakrev',
      tag: 'Remise de diplômes & Cérémonie',
      caption: 'Célébration des diplômés et bénéficiaires des bourses de formation numérique',
    },
    {
      id: 'brs-etudes',
      url: IMG_ETUDES_ATELIER,
      alt: 'Ateliers d’études du Programme de Bourses et Académie',
      tag: 'Études & Accompagnement',
      caption: 'Sessions pratiques en présentiel à Gombe avec formateurs et encadreurs',
    },
    ...(photos || [])
      .filter((p) => p.pole === 'bourses' || p.pole === 'academie')
      .map((p) => ({
        id: `brs-ph-${p.id}`,
        url: p.url,
        alt: p.caption,
        tag: p.edition || 'Bourses & Études',
        caption: p.caption,
      })),
  ]);

  const poles = [
    {
      num: '01',
      title: 'Lomakrev Tech',
      desc: 'Vente d’ordinateurs professionnels testés et solutions matérielles pour particuliers et entreprises.',
      cta: 'Voir les ordinateurs',
      to: '/tech',
      icon: Laptop,
      accent: 'text-[#D90A14]',
    },
    {
      num: '02',
      title: 'Lomakrev Académie',
      desc: 'Formations pratiques en bureautique, cybersécurité, IA, entrepreneuriat et gestion de projet.',
      cta: 'Explorer l’Académie',
      to: '/academie',
      icon: GraduationCap,
      accent: 'text-[#B45309]',
    },
    {
      num: '03',
      title: 'Top Maintenance',
      desc: 'Réparation d’ordinateurs, caméras de surveillance, traceurs GPS, réseaux et contrats IT.',
      cta: 'Devis & intervention',
      to: '/maintenance',
      icon: Wrench,
      accent: 'text-[#D90A14]',
    },
    {
      num: '04',
      title: 'Programme de Bourses',
      desc: 'Œuvre sociale offrant des formations financées aux jeunes talents et clients Lomakrev.',
      cta: 'Postuler en ligne',
      to: '/bourses',
      icon: Award,
      accent: 'text-[#B45309]',
    },
  ];

  return (
    <div>
      {/* 1. Hero Section — Red, Yellow & White Brand Presence */}
      <section className="border-b border-[#F4B400]/35 bg-white">
        <div className="mx-auto grid max-w-7xl items-stretch gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:py-16">
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#D90A14]">
              {settings.legalName} · Kinshasa, Gombe
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl text-balance">
              {settings.promise}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              {settings.vision}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/tech')}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#D90A14] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#b80811] whitespace-nowrap shrink-0"
              >
                Voir les ordinateurs
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/suivi')}
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-[#F4B400] bg-[#FEF3C7] px-5 text-sm font-bold text-[#78350F] transition-colors hover:bg-[#FDE68A] whitespace-nowrap shrink-0"
              >
                Suivre mon dossier
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <AnimatedPhotoShowcase
              slides={heroSlides}
              aspectClass="aspect-[16/10] lg:h-full lg:min-h-[340px]"
              className="rounded-xl border border-[#D90A14]/20"
              intervalMs={5200}
              priority
            />
          </div>
        </div>

        {/* 4 Pôles strip directly visible for <10s orientation */}
        <div className="border-t border-[#F4B400]/30 bg-[#FFFDF5]">
          <div className="mx-auto grid max-w-7xl divide-y divide-[#F4B400]/25 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
            {poles.map((pole) => {
              const Icon = pole.icon;
              return (
                <button
                  key={pole.to}
                  type="button"
                  onClick={() => navigate(pole.to)}
                  className="group flex flex-col justify-between p-6 text-left transition-colors hover:bg-white"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono-tabular text-xs font-bold text-[#B45309]">{pole.num}</span>
                      <Icon className={`h-5 w-5 ${pole.accent}`} />
                    </div>
                    <h2 className="mt-3 font-display text-lg font-bold text-slate-900 group-hover:text-[#D90A14]">
                      {pole.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{pole.desc}</p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#D90A14]">
                    {pole.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Ordinateurs vedettes (Pôle Tech) */}
      <Reveal className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#D90A14]">01 · Lomakrev Tech</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              Ordinateurs professionnels disponibles
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-[#F4B400]/50 bg-[#FFFBEB] p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`rounded-md px-3 py-1 transition-colors ${currency === 'USD' ? 'bg-[#D90A14] text-white shadow-sm' : 'text-slate-700 hover:text-[#D90A14]'}`}
              >
                USD
              </button>
              <button
                type="button"
                onClick={() => setCurrency('CDF')}
                className={`rounded-md px-3 py-1 transition-colors ${currency === 'CDF' ? 'bg-[#D90A14] text-white shadow-sm' : 'text-slate-700 hover:text-[#D90A14]'}`}
              >
                CDF
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate('/tech')}
              className="text-sm font-semibold text-[#D90A14] hover:underline whitespace-nowrap"
            >
              Tout le catalogue →
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.map((product) => (
            <article
              key={product.id}
              className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-transform hover:-translate-y-0.5"
            >
              <PhotoFrame
                src={product.images[0]}
                alt={product.model}
                aspectClass="aspect-[4/3]"
                className="border-b border-slate-100"
              />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{product.brand}</span>
                  <span aria-hidden="true">·</span>
                  <span>{product.condition}</span>
                  <span aria-hidden="true">·</span>
                  <span className={product.availability === 'En stock' ? 'font-semibold text-emerald-700' : 'font-semibold text-[#B45309]'}>
                    {product.availability}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-lg font-bold text-slate-900">{product.model}</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  <li>{product.processor} {product.generation}</li>
                  <li>{product.ram} RAM · {product.storage}</li>
                  <li>{product.screen}</li>
                </ul>

                <div className="mt-auto pt-5">
                  <div className="flex items-baseline justify-between border-t border-slate-100 pt-4">
                    <div>
                      <p className="font-mono-tabular text-xl font-bold text-[#D90A14]">
                        {currency === 'USD'
                          ? formatCurrencyUsd(product.priceUsd)
                          : formatCurrencyCdf(product.priceUsd, settings.usdToCdfRate)}
                      </p>
                      {currency === 'CDF' && (
                        <p className="text-[11px] text-slate-500 tabular-nums">
                          {formatCurrencyUsd(product.priceUsd)} (taux du {formatDateFr(settings.rateDate)})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/tech/produits/${product.slug}`)}
                      className="rounded-lg border border-[#F4B400] bg-[#FFFBEB] py-2.5 text-sm font-semibold text-[#78350F] hover:bg-[#FEF3C7]"
                    >
                      Voir
                    </button>
                    <button
                      type="button"
                      onClick={() => addToCart(product, 1)}
                      disabled={product.availability === 'Épuisé'}
                      className="rounded-lg bg-[#D90A14] py-2.5 text-sm font-semibold text-white hover:bg-[#b80811] disabled:opacity-40"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Reveal>

      {/* 3. Campagne de Bourse en cours + Photo de famille 1ère édition */}
      <Reveal className="border-y border-[#F4B400]/35 bg-[#FFFDF5]">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:py-20">
          <div className="lg:col-span-6">
            <AnimatedPhotoShowcase
              slides={boursesSlides}
              aspectClass="aspect-[16/10]"
              className="rounded-xl border border-[#F4B400]/40"
              intervalMs={4600}
            />
          </div>
          <div className="lg:col-span-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#B45309]">04 · Œuvre sociale Lomakrev</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-slate-900 sm:text-3xl text-balance">
              {openCampaign ? openCampaign.title : 'Programme de Bourses Lomakrev'}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              {openCampaign
                ? openCampaign.description
                : 'Des formations gratuites ou partiellement financées dans le numérique et l’entrepreneuriat, exclusivement sur candidature en ligne.'}
            </p>
            {openCampaign && (
              <div className="mt-5 grid grid-cols-2 gap-4 border-y border-[#F4B400]/30 py-4 text-sm sm:grid-cols-3">
                <div>
                  <span className="block text-xs text-slate-500">Prise en charge</span>
                  <span className="font-semibold text-[#D90A14]">{openCampaign.coverageRate}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500">Places</span>
                  <span className="font-mono-tabular font-semibold text-slate-900">{openCampaign.places} places</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500">Clôture</span>
                  <span className="font-mono-tabular font-semibold text-slate-900">{formatDateFr(openCampaign.closeDate)}</span>
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  trackEvent('click_postuler_home');
                  navigate(openCampaign ? `/bourses/postuler?campagne=${openCampaign.slug}` : '/bourses');
                }}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#D90A14] px-6 text-sm font-semibold text-white hover:bg-[#b80811]"
              >
                Postuler en ligne
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/bourses')}
                className="inline-flex h-11 items-center rounded-lg border border-[#F4B400] bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-[#FEF3C7]"
              >
                Critères & éditions
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      {/* 4. Lomakrev Académie + Chiffres clés & Publics */}
      <Reveal className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#D90A14]">02 · Lomakrev Académie — « Way of success »</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-slate-900 sm:text-3xl text-balance">
              7 parcours pratiques pour la relance 2027
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Excel pour les entreprises, Word & PowerPoint, Maintenance informatique, Cybersécurité, IA appliquée, Entrepreneuriat et Gestion de projet.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/academie')}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#D90A14] px-5 text-sm font-semibold text-white hover:bg-[#b80811]"
              >
                Découvrir les 7 formations
              </button>
              <button
                type="button"
                onClick={() => navigate('/maintenance/devis')}
                className="inline-flex h-11 items-center rounded-lg border border-[#F4B400] bg-[#FFFBEB] px-5 text-sm font-semibold text-[#78350F] hover:bg-[#FEF3C7]"
              >
                Formation entreprise
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {formations.slice(0, 5).map((f) => {
                const hasOpen = f.sessions.some((s) => s.isOpen);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => navigate(`/academie/formations/${f.slug}`)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#FFFDF5]"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{f.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {f.durationHours} h · {f.level} · {f.audience}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold whitespace-nowrap ${hasOpen ? 'text-[#D90A14]' : 'text-[#B45309]'}`}>
                      {hasOpen ? 'Session ouverte →' : 'À venir →'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chiffres clés & Clients types */}
        <div className="mt-14 grid gap-6 border-t border-slate-200 pt-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[#F4B400]/40 bg-[#FFFDF5] p-5">
            <p className="font-mono-tabular text-3xl font-extrabold text-[#D90A14]">{settings.stats.ordinateursVendus}</p>
            <p className="mt-1 text-sm text-slate-700">Ordinateurs livrés et contrôlés</p>
          </div>
          <div className="rounded-xl border border-[#F4B400]/40 bg-[#FFFDF5] p-5">
            <p className="font-mono-tabular text-3xl font-extrabold text-[#D90A14]">{settings.stats.apprenantsFormes}</p>
            <p className="mt-1 text-sm text-slate-700">Apprenants et boursiers accompagnés</p>
          </div>
          <div className="rounded-xl border border-[#F4B400]/40 bg-[#FFFDF5] p-5">
            <p className="font-mono-tabular text-3xl font-extrabold text-[#D90A14]">{settings.stats.interventionsReussies}</p>
            <p className="mt-1 text-sm text-slate-700">Interventions Top Maintenance</p>
          </div>
          <div className="rounded-xl border border-[#F4B400]/40 bg-[#FFFDF5] p-5">
            <p className="font-mono-tabular text-3xl font-extrabold text-[#D90A14]">{settings.stats.tauxSatisfaction}</p>
            <p className="mt-1 text-sm text-slate-700">Satisfaction clients & partenaires</p>
          </div>
        </div>

        {/* Publics accompagnés + Coordonnées Gombe (Red + Yellow + White signature block) */}
        <div className="mt-12 grid gap-8 lg:grid-cols-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {[
              { icon: Users, title: 'Jeunes & Étudiants', text: 'Bourses 100 % en ligne et formations pratiques vers l’emploi.' },
              { icon: Laptop, title: 'Particuliers', text: 'Ordinateurs fiables, dépannage rapide en atelier et sécurisation.' },
              { icon: Building2, title: 'Entreprises privées', text: 'Équipement multi-postes, contrats de maintenance, GPS de flotte.' },
              { icon: ShieldCheck, title: 'Institutions & ONG', text: 'Devis officiels avec pièces légales RCCM/IDNat et suivi dédié.' },
            ].map((seg) => {
              const Icon = seg.icon;
              return (
                <div key={seg.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <Icon className="h-5 w-5 text-[#D90A14]" />
                  <h3 className="mt-3 font-display text-base font-bold text-slate-900">{seg.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{seg.text}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col justify-between rounded-xl border-2 border-[#FBBF24] bg-[#C40912] p-6 text-white lg:col-span-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#FBBF24]">Visiter nos bureaux</p>
              <h3 className="mt-2 font-display text-xl font-bold text-white">{settings.address}</h3>
              <p className="mt-2 text-sm text-white/90">{settings.addressLandmarks}</p>
              <div className="mt-5 space-y-2 text-sm text-white">
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#FBBF24]" />
                  <span className="font-mono-tabular font-semibold">{settings.phone}</span>
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#FBBF24]" />
                  <span>{settings.openingHours}</span>
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/contact')}
                className="rounded-lg bg-[#FBBF24] px-5 py-2.5 text-sm font-bold text-[#7A050B] transition-colors hover:bg-[#F4B400]"
              >
                Nous écrire
              </button>
              <button
                type="button"
                onClick={() => navigate('/maintenance/intervention')}
                className="rounded-lg border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                Demander une intervention
              </button>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
};
