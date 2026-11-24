import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, MessageCircle, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Breadcrumbs } from '../components/Layout';
import { PhotoFrame, Product3DShowcase } from '../components/MotionPrimitives';
import { ShareButton } from '../components/DynamicFormFields';
import { buildWhatsAppDirectContact, formatCurrencyCdf, formatCurrencyUsd, formatDateFr } from '../lib/pdfPrint';

export const TechCatalogPage: React.FC = () => {
  const { data, navigate, currency, setCurrency, addToCart } = useApp();
  const [brand, setBrand] = useState('Tous');
  const [processor, setProcessor] = useState('Tous');
  const [ram, setRam] = useState('Tous');
  const [storage, setStorage] = useState('Tous');
  const [condition, setCondition] = useState('Tous');
  const [maxBudget, setMaxBudget] = useState<number>(1500);

  const products = useMemo(() => (data?.products || []).filter((p) => p.active), [data]);
  const settings = data?.settings;

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (brand !== 'Tous' && p.brand !== brand) return false;
      if (processor !== 'Tous' && !p.processor.includes(processor)) return false;
      if (ram !== 'Tous' && p.ram !== ram) return false;
      if (storage !== 'Tous' && !p.storage.includes(storage)) return false;
      if (condition !== 'Tous' && p.condition !== condition) return false;
      if (p.priceUsd > maxBudget) return false;
      return true;
    });
  }, [products, brand, processor, ram, storage, condition, maxBudget]);

  if (!data || !settings) return null;

  const brands = ['Tous', ...Array.from(new Set(products.map((p) => p.brand)))];
  const rams = ['Tous', ...Array.from(new Set(products.map((p) => p.ram)))];
  const conditions = ['Tous', ...Array.from(new Set(['Neuf', 'Quasi neuf', 'Reconditionné', ...products.map((p) => p.condition).filter(Boolean)]))];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumbs items={[{ label: 'Lomakrev Tech' }]} />

      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[#F4B400]/40 pb-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-[#D90A14]">Pôle 1 · Lomakrev Tech</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Catalogue d’ordinateurs & solutions IT
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Machines testées en atelier à Kinshasa, prêtes pour la bureautique, l’ingénierie et les entreprises.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/maintenance/devis?service=multi-postes')}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#F4B400] bg-[#FFFBEB] px-4 text-sm font-semibold text-[#78350F] hover:bg-[#FEF3C7]"
          >
            Demander un devis pour plusieurs postes
          </button>
          <div className="flex items-center rounded-lg border border-[#F4B400]/50 bg-[#FFFDF5] p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`rounded-md px-3 py-1.5 transition-colors ${currency === 'USD' ? 'bg-[#D90A14] text-white shadow-sm' : 'text-slate-700 hover:text-[#D90A14]'}`}
            >
              USD
            </button>
            <button
              type="button"
              onClick={() => setCurrency('CDF')}
              className={`rounded-md px-3 py-1.5 transition-colors ${currency === 'CDF' ? 'bg-[#D90A14] text-white shadow-sm' : 'text-slate-700 hover:text-[#D90A14]'}`}
            >
              CDF
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 rounded-xl border border-[#F4B400]/40 bg-[#FFFDF5] p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#78350F]">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#D90A14]" />
            Filtrer le catalogue
          </span>
          <span className="text-xs text-slate-600">
            Taux appliqué : 1 USD = {settings.usdToCdfRate.toLocaleString('fr-FR')} CDF ({formatDateFr(settings.rateDate)})
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {brands.map((b) => (
              <option key={b} value={b}>
                Marque : {b}
              </option>
            ))}
          </select>

          <select value={processor} onChange={(e) => setProcessor(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="Tous">Processeur : Tous</option>
            <option value="Core i5">Core i5</option>
            <option value="Core i7">Core i7</option>
          </select>

          <select value={ram} onChange={(e) => setRam(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {rams.map((r) => (
              <option key={r} value={r}>
                RAM : {r}
              </option>
            ))}
          </select>

          <select value={storage} onChange={(e) => setStorage(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="Tous">Stockage : Tous</option>
            <option value="256">SSD 256 Go</option>
            <option value="512">SSD 512 Go</option>
          </select>

          <select value={condition} onChange={(e) => setCondition(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {conditions.map((c) => (
              <option key={c} value={c}>
                État : {c}
              </option>
            ))}
          </select>

          <div className="flex flex-col justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Budget max</span>
              <span className="font-mono-tabular font-semibold">{maxBudget} USD</span>
            </div>
            <input
              type="range"
              min={300}
              max={1500}
              step={50}
              value={maxBudget}
              onChange={(e) => setMaxBudget(Number(e.target.value))}
              className="accent-[#D90A14]"
            />
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="mt-10 rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-base font-medium text-slate-700">Aucun ordinateur ne correspond à vos filtres actuels.</p>
          <button
            type="button"
            onClick={() => {
              setBrand('Tous');
              setProcessor('Tous');
              setRam('Tous');
              setStorage('Tous');
              setCondition('Tous');
              setMaxBudget(1500);
            }}
            className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <article
              key={product.id}
              className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-transform hover:-translate-y-0.5"
            >
              {product.images?.[0] && (
                <PhotoFrame src={product.images[0]} alt={product.model} aspectClass="aspect-[4/3]" className="border-b border-slate-100" />
              )}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{product.brand}</span>
                  <span aria-hidden="true">·</span>
                  <span>{product.condition}</span>
                  <span aria-hidden="true">·</span>
                  <span className={product.availability === 'En stock' ? 'font-medium text-emerald-700' : 'text-amber-700'}>
                    {product.availability}
                  </span>
                </div>
                <h2 className="mt-2 font-display text-lg font-bold text-slate-900">{product.model}</h2>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  <li>{product.processor} {product.generation}</li>
                  <li>{product.ram} RAM · {product.storage}</li>
                  <li>{product.screen}</li>
                </ul>

                <div className="mt-auto pt-5">
                  <div className="flex items-baseline gap-2 border-t border-slate-100 pt-4">
                    <span className="font-mono-tabular text-xl font-bold text-[#D90A14]">
                      {currency === 'USD'
                        ? formatCurrencyUsd(product.priceUsd)
                        : formatCurrencyCdf(product.priceUsd, settings.usdToCdfRate)}
                    </span>
                    {product.oldPriceUsd && currency === 'USD' && (
                      <span className="font-mono-tabular text-sm text-slate-400 line-through">
                        {formatCurrencyUsd(product.oldPriceUsd)}
                      </span>
                    )}
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
                      Ajouter au panier
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export const TechProductDetailPage: React.FC<{ slug: string }> = ({ slug }) => {
  const { data, navigate, currency, addToCart } = useApp();
  const [activeImage, setActiveImage] = useState(0);

  if (!data) return null;
  const product = data.products.find((p) => p.slug === slug);
  const settings = data.settings;

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Produit introuvable</h1>
        <p className="mt-2 text-slate-600">Cet ordinateur n’est plus dans notre catalogue en ligne.</p>
        <button type="button" onClick={() => navigate('/tech')} className="mt-5 rounded-lg bg-[#D90A14] px-5 py-2.5 text-sm font-semibold text-white">
          Voir tous les ordinateurs
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumbs items={[{ label: 'Lomakrev Tech', to: '/tech' }, { label: product.model }]} />

      <div className="grid gap-10 lg:grid-cols-12">
        {product.images.length > 0 && (
          <div className="space-y-4 lg:col-span-7">
            <Product3DShowcase
              src={product.images[activeImage] || product.images[0]}
              alt={product.model}
              brand={product.brand}
              badgeText={product.availability}
              aspectClass="aspect-[4/3]"
              className="rounded-2xl border border-[#F4B400]/50"
              priority
            />
            {product.images.length > 1 && (
              <div className="flex flex-wrap gap-2.5 sm:gap-3">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={`h-16 w-24 overflow-hidden rounded-lg border-2 sm:h-20 sm:w-28 ${activeImage === i ? 'border-[#D90A14]' : 'border-slate-200'}`}
                  >
                    <img src={img} alt={`${product.model} vue ${i + 1}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={product.images.length > 0 ? 'lg:col-span-5' : 'lg:col-span-8 lg:col-start-3'}>
          <div className="rounded-xl border border-[#F4B400]/50 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#D90A14]">{product.brand}</span>
              <span aria-hidden="true">·</span>
              <span>{product.condition}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-emerald-700">{product.availability}</span>
            </div>

            <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">{product.model}</h1>

            <div className="mt-4 border-y border-slate-100 py-4">
              <div className="flex items-baseline gap-3">
                <span className="font-mono-tabular text-3xl font-extrabold text-[#D90A14]">
                  {currency === 'USD'
                    ? formatCurrencyUsd(product.priceUsd)
                    : formatCurrencyCdf(product.priceUsd, settings.usdToCdfRate)}
                </span>
                {product.oldPriceUsd && (
                  <span className="font-mono-tabular text-base text-slate-400 line-through">
                    {formatCurrencyUsd(product.oldPriceUsd)}
                  </span>
                )}
              </div>
              <p className="mt-1 font-mono-tabular text-xs text-slate-500">
                Équivalent : {formatCurrencyCdf(product.priceUsd, settings.usdToCdfRate)} (taux {settings.usdToCdfRate.toLocaleString('fr-FR')} CDF du {formatDateFr(settings.rateDate)})
              </p>
            </div>

            <dl className="mt-5 space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Processeur</dt>
                <dd className="font-medium text-slate-900">{product.processor} {product.generation}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Mémoire vive</dt>
                <dd className="font-medium text-slate-900">{product.ram}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Stockage</dt>
                <dd className="font-medium text-slate-900">{product.storage}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Écran</dt>
                <dd className="font-medium text-slate-900">{product.screen}</dd>
              </div>
              {product.warranty && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Garantie / Contrôle</dt>
                  <dd className="text-right font-medium text-slate-900">{product.warranty}</dd>
                </div>
              )}
            </dl>

            <p className="mt-4 rounded-lg border border-[#F4B400]/30 bg-[#FFFDF5] p-3 text-xs leading-relaxed text-slate-700">{product.otherSpecs}</p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => addToCart(product, 1)}
                disabled={product.availability === 'Épuisé'}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#D90A14] text-sm font-semibold text-white hover:bg-[#b80811] disabled:opacity-40"
              >
                <ShoppingBag className="h-4 w-4" />
                Ajouter au panier
              </button>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <ShareButton title={`${product.model} — ${product.priceUsd} USD chez Lomakrev`} className="w-full justify-center" />
                <a
                  href={buildWhatsAppDirectContact(
                    settings.whatsapp,
                    `Bonjour Lomakrev Tech, j’ai une question sur le ${product.model} (${product.processor}, ${product.ram}) à ${product.priceUsd} USD.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  Poser une question
                </a>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Commande enregistrée sans paiement en ligne préalable ; retrait à Gombe ou livraison à Kinshasa.
              </p>
              <button
                type="button"
                onClick={() => navigate('/maintenance/devis?service=multi-postes')}
                className="mt-2 inline-flex items-center gap-1 font-semibold text-slate-800 hover:text-[#D90A14]"
              >
                Besoin de plusieurs postes pour votre entreprise ?
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
