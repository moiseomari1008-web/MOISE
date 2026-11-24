import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { ArrowLeft, Download, Printer, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  downloadClientFichePdf,
  extractOrderedPayloadEntries,
  formatCurrencyCdf,
  formatCurrencyUsd,
  formatDateFr,
  formatDateTimeFr,
  getDossierTypeLabel,
  getPoleLabel,
  getPrintFooterInfo,
  inferPoleFromType,
  triggerPrintDocument,
  type ClientFicheDossier,
  type UnifiedClientProfile,
} from '../lib/pdfPrint';

export const ClientFicheModal: React.FC<{
  open: boolean;
  onClose: () => void;
  dossier?: ClientFicheDossier | null;
  clientProfile?: UnifiedClientProfile | null;
  onSelectDossier?: (dossier: ClientFicheDossier) => void;
}> = ({ open, onClose, dossier, clientProfile, onSelectDossier }) => {
  const { data, pushToast } = useApp();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('printing-fiche');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('printing-fiche');
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !dossier?.reference || typeof window === 'undefined') {
      setQrDataUrl('');
      return;
    }
    const trackUrl = `${window.location.origin}/suivi?ref=${encodeURIComponent(dossier.reference)}`;
    QRCode.toDataURL(trackUrl, { width: 160, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [open, dossier?.reference]);

  if (!open || !data || (!dossier && !clientProfile)) return null;

  const { settings } = data;
  const activeDossier = dossier || null;
  const payloadEntries = activeDossier ? extractOrderedPayloadEntries(activeDossier) : [];
  const cmdItems =
    activeDossier && Array.isArray((activeDossier.payload as any)?.items)
      ? ((activeDossier.payload as any).items as { model?: string; productId?: string; qty?: number; priceUsd?: number }[])
      : [];
  const devisItems = activeDossier?.quoteDetails?.items || [];
  const devisTotalUsd = devisItems.reduce((sum, it) => sum + it.qty * it.unitUsd, 0);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const filename = await downloadClientFichePdf({
        settings,
        dossier: activeDossier || undefined,
        clientProfile: clientProfile || undefined,
      });
      pushToast('success', `PDF téléchargé : ${filename}`);
    } catch {
      pushToast('error', 'Impossible de générer le PDF. Utilisez le bouton Imprimer.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-3 sm:p-6 print:static print:inset-auto print:overflow-visible print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-label="Visualisation de la fiche client"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Action Toolbar (hidden when printing) */}
      <div className="no-print mx-auto mb-4 flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Fermer
          </button>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-slate-500">Aperçu de la fiche client</p>
            <p className="font-mono-tabular text-sm font-bold text-slate-900">
              {activeDossier ? activeDossier.reference : clientProfile?.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={triggerPrintDocument}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            Imprimer
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#D90A14] px-4 text-sm font-semibold text-white hover:bg-[#b80811] disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4" />
            {downloadingPdf ? 'Préparation PDF...' : 'Garder en PDF'}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l'aperçu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Printable A4 Fiche Client Sheet */}
      <div className="print-sheet mx-auto max-w-4xl overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg print:max-w-none print:rounded-none print:border-none print:shadow-none">
        <div className="h-1.5 w-full bg-[#D90A14]" />
        <div className="p-5 sm:p-8 print:p-0">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#D90A14] pb-5">
            <div className="flex items-start gap-3.5">
              {settings.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt={settings.legalName}
                  className="h-14 w-auto rounded object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <h1 className="font-display text-xl font-extrabold text-slate-900">{settings.legalName}</h1>
                <p className="text-xs text-slate-600">{settings.address}</p>
                <p className="text-xs text-slate-600">
                  {settings.phone} · {settings.email}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {settings.rccm} · IDNat : {settings.idNat}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="text-right text-xs text-slate-700">
                <p className="font-display text-sm font-extrabold uppercase tracking-wide text-[#D90A14]">
                  {activeDossier ? 'Fiche client & dossier' : 'Fiche client unique'}
                </p>
                {activeDossier && (
                  <p className="mt-1 font-mono-tabular text-sm font-bold text-slate-900">
                    Réf. : {activeDossier.reference}
                  </p>
                )}
                <p className="mt-0.5 text-slate-600">
                  Édité le : <span className="font-semibold text-slate-900">{new Date().toLocaleDateString('fr-FR')}</span>
                </p>
                {activeDossier && (
                  <p className="mt-0.5 font-semibold text-slate-900">{activeDossier.status}</p>
                )}
              </div>
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`QR suivi ${activeDossier?.reference}`}
                  className="h-16 w-16 shrink-0 rounded border border-slate-200 p-0.5"
                />
              )}
            </div>
          </div>

          {/* Single Dossier Client Fiche */}
          {activeDossier && (
            <div className="mt-6 space-y-6">
              <div className="print-section">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">
                  1. Identification du client et du dossier
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <tbody>
                      <tr>
                        <th className="w-40 border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                          Référence
                        </th>
                        <td className="border border-slate-300 px-3 py-2 font-mono-tabular font-bold text-slate-900">
                          {activeDossier.reference}
                        </td>
                        <th className="w-40 border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                          Statut actuel
                        </th>
                        <td className="border border-slate-300 px-3 py-2 font-bold text-[#D90A14]">
                          {activeDossier.status}
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                          Pôle concerné
                        </th>
                        <td className="border border-slate-300 px-3 py-2 font-medium text-slate-900">
                          {getPoleLabel(activeDossier.pole || inferPoleFromType(activeDossier.type))}
                        </td>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                          Type de demande
                        </th>
                        <td className="border border-slate-300 px-3 py-2 text-slate-900">
                          {getDossierTypeLabel(activeDossier.type)}
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                          Client / Demandeur
                        </th>
                        <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-900">
                          {activeDossier.applicantName}
                        </td>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                          Téléphone
                        </th>
                        <td className="border border-slate-300 px-3 py-2 font-mono-tabular text-slate-900">
                          {activeDossier.phone || '—'}
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                          WhatsApp
                        </th>
                        <td className="border border-slate-300 px-3 py-2 font-mono-tabular text-slate-900">
                          {activeDossier.whatsapp || activeDossier.phone || '—'}
                        </td>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                          Adresse e-mail
                        </th>
                        <td className="border border-slate-300 px-3 py-2 text-slate-900">
                          {activeDossier.email || '—'}
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                          Ville / Commune
                        </th>
                        <td className="border border-slate-300 px-3 py-2 text-slate-900">
                          {[activeDossier.ville, activeDossier.commune].filter(Boolean).join(', ') || '—'}
                        </td>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                          Date d’enregistrement
                        </th>
                        <td className="border border-slate-300 px-3 py-2 font-mono-tabular text-slate-900">
                          {activeDossier.createdAt
                            ? formatDateTimeFr(activeDossier.createdAt)
                            : formatDateTimeFr(new Date().toISOString())}
                        </td>
                      </tr>
                      {(activeDossier.campaignSlug ||
                        activeDossier.formationSlug ||
                        activeDossier.sessionCode ||
                        activeDossier.serviceKey) && (
                        <tr>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                            Programme / Service
                          </th>
                          <td className="border border-slate-300 px-3 py-2 text-slate-900">
                            {[activeDossier.campaignSlug, activeDossier.formationSlug, activeDossier.serviceKey]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </td>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                            Session
                          </th>
                          <td className="border border-slate-300 px-3 py-2 font-mono-tabular text-slate-900">
                            {activeDossier.sessionCode || '—'}
                          </td>
                        </tr>
                      )}
                      {(activeDossier.eligibilityStatus ||
                        activeDossier.eligibilityReason ||
                        activeDossier.rejectionReason) && (
                        <tr>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                            Éligibilité
                          </th>
                          <td className="border border-slate-300 px-3 py-2 font-medium text-slate-900">
                            {activeDossier.eligibilityStatus || '—'}
                          </td>
                          <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                            Motif / Précision
                          </th>
                          <td className="border border-slate-300 px-3 py-2 text-slate-900">
                            {activeDossier.rejectionReason || activeDossier.eligibilityReason || '—'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {cmdItems.length > 0 && (
                <div className="print-section">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">
                    2. Équipements commandés
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-[#D90A14] text-left text-white">
                          <th className="border border-[#D90A14] px-3 py-2 font-semibold">#</th>
                          <th className="border border-[#D90A14] px-3 py-2 font-semibold">Désignation / Modèle</th>
                          <th className="border border-[#D90A14] px-3 py-2 text-right font-semibold">Qté</th>
                          <th className="border border-[#D90A14] px-3 py-2 text-right font-semibold">PU (USD)</th>
                          <th className="border border-[#D90A14] px-3 py-2 text-right font-semibold">Sous-total (USD)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cmdItems.map((item, idx) => {
                          const qty = Number(item.qty || 1);
                          const priceUsd = Number(item.priceUsd || 0);
                          return (
                            <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                              <td className="border border-slate-300 px-3 py-2 font-mono-tabular text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 font-medium text-slate-900">
                                {item.model || item.productId || 'Équipement'}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular">{qty}</td>
                              <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular">
                                {priceUsd.toLocaleString('fr-FR')}
                              </td>
                              <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular font-semibold">
                                {(qty * priceUsd).toLocaleString('fr-FR')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {payloadEntries.length > 0 && (
                <div className="print-section">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">
                    {cmdItems.length > 0 ? '3. Informations complémentaires' : '2. Détails renseignés par le client'}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-800 text-left text-white">
                          <th className="w-1/3 border border-slate-800 px-3 py-2 font-semibold">Rubrique</th>
                          <th className="border border-slate-800 px-3 py-2 font-semibold">Information renseignée</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payloadEntries.map((row, idx) => (
                          <tr key={row.key} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                            <th className="border border-slate-300 bg-slate-50/80 px-3 py-2 text-left align-top font-semibold text-slate-700">
                              {row.label}
                            </th>
                            <td className="whitespace-pre-wrap border border-slate-300 px-3 py-2 align-top text-slate-900">
                              {row.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeDossier.quoteDetails && devisItems.length > 0 && (
                <div className="print-section">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">
                    Devis technique rattaché
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-[#D90A14] text-left text-white">
                          <th className="border border-[#D90A14] px-3 py-2 font-semibold">Désignation</th>
                          <th className="border border-[#D90A14] px-3 py-2 text-right font-semibold">Qté</th>
                          <th className="border border-[#D90A14] px-3 py-2 text-right font-semibold">PU (USD)</th>
                          <th className="border border-[#D90A14] px-3 py-2 text-right font-semibold">Total (USD)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {devisItems.map((it, idx) => (
                          <tr key={idx}>
                            <td className="border border-slate-300 px-3 py-2">{it.description}</td>
                            <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular">{it.qty}</td>
                            <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular">
                              {it.unitUsd.toLocaleString('fr-FR')}
                            </td>
                            <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular font-semibold">
                              {(it.qty * it.unitUsd).toLocaleString('fr-FR')}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-[#FFFBEB] font-bold">
                          <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right">
                            Total du devis ({formatCurrencyCdf(devisTotalUsd, settings.usdToCdfRate)})
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular text-[#D90A14]">
                            {formatCurrencyUsd(devisTotalUsd)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {activeDossier.quoteDetails.validUntil && (
                    <p className="mt-1.5 text-xs text-slate-600">
                      Validité du devis : {formatDateFr(activeDossier.quoteDetails.validUntil)}
                    </p>
                  )}
                </div>
              )}

              {activeDossier.interventionLog && (
                <div className="print-section">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">
                    Rapport & planification d’intervention
                  </h2>
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <tbody>
                      <tr>
                        <th className="w-48 border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                          Diagnostic technique
                        </th>
                        <td className="border border-slate-300 px-3 py-2 text-slate-900">
                          {activeDossier.interventionLog.diagnostic || '—'}
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                          Pièces / vérifications
                        </th>
                        <td className="border border-slate-300 px-3 py-2 text-slate-900">
                          {activeDossier.interventionLog.partsUsed || '—'}
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                          Durée estimée / passée
                        </th>
                        <td className="border border-slate-300 px-3 py-2 font-mono-tabular text-slate-900">
                          {activeDossier.interventionLog.timeSpent || '—'}
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                          Créneau planifié
                        </th>
                        <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-900">
                          {activeDossier.interventionLog.scheduledSlot || '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activeDossier.attachments && activeDossier.attachments.length > 0 && (
                <div className="print-section">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">
                    Pièces jointes transmises
                  </h2>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-left text-slate-700">
                        <th className="border border-slate-300 px-3 py-2 font-semibold">Document</th>
                        <th className="border border-slate-300 px-3 py-2 font-semibold">Format</th>
                        <th className="border border-slate-300 px-3 py-2 text-right font-semibold">Taille</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDossier.attachments.map((att, idx) => (
                        <tr key={idx}>
                          <td className="border border-slate-300 px-3 py-2 font-medium text-slate-900">
                            {att.name || 'Document'}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 font-mono-tabular text-slate-600">
                            {att.type || 'Document'}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-right font-mono-tabular text-slate-600">
                            {att.size ? `${Math.max(1, Math.round(att.size / 1024))} Ko` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeDossier.timeline && activeDossier.timeline.length > 0 && (
                <div className="print-section">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">
                    Historique du dossier
                  </h2>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-left text-slate-700">
                        <th className="border border-slate-300 px-3 py-2 font-semibold">Date & heure</th>
                        <th className="border border-slate-300 px-3 py-2 font-semibold">Intervenant</th>
                        <th className="border border-slate-300 px-3 py-2 font-semibold">Action / Observation</th>
                        <th className="border border-slate-300 px-3 py-2 font-semibold">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDossier.timeline.map((ev, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                          <td className="border border-slate-300 px-3 py-2 font-mono-tabular text-slate-600">
                            {formatDateTimeFr(ev.at)}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 font-medium text-slate-900">{ev.actor}</td>
                          <td className="border border-slate-300 px-3 py-2 text-slate-800">
                            {ev.action}
                            {ev.note ? ` — ${ev.note}` : ''}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-900">
                            {ev.status || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Unified Client Profile View (for Admin Fiches clients tab) */}
          {!activeDossier && clientProfile && (
            <div className="mt-6 space-y-6">
              <div className="print-section">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">
                  1. Coordonnées du client
                </h2>
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <tbody>
                    <tr>
                      <th className="w-40 border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                        Nom complet
                      </th>
                      <td className="border border-slate-300 px-3 py-2 font-bold text-slate-900">
                        {clientProfile.name}
                      </td>
                      <th className="w-40 border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                        Téléphone
                      </th>
                      <td className="border border-slate-300 px-3 py-2 font-mono-tabular text-slate-900">
                        {clientProfile.phone}
                      </td>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                        Adresse e-mail
                      </th>
                      <td className="border border-slate-300 px-3 py-2 text-slate-900">
                        {clientProfile.email || '—'}
                      </td>
                      <th className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">
                        Commune
                      </th>
                      <td className="border border-slate-300 px-3 py-2 text-slate-900">
                        {clientProfile.commune || '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="print-section">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#D90A14]">
                  2. Dossiers associés ({clientProfile.dossiers.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-left text-white">
                        <th className="border border-slate-800 px-3 py-2 font-semibold">Référence</th>
                        <th className="border border-slate-800 px-3 py-2 font-semibold">Pôle & Type</th>
                        <th className="border border-slate-800 px-3 py-2 font-semibold">Date</th>
                        <th className="border border-slate-800 px-3 py-2 font-semibold">Statut</th>
                        {onSelectDossier && (
                          <th className="no-print border border-slate-800 px-3 py-2 font-semibold">Fiche</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {clientProfile.dossiers.map((d, idx) => (
                        <tr key={d.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                          <td className="border border-slate-300 px-3 py-2 font-mono-tabular font-bold text-slate-900">
                            {d.reference}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-slate-800">
                            {getPoleLabel(d.pole)} · {getDossierTypeLabel(d.type)}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 font-mono-tabular text-slate-600">
                            {formatDateTimeFr(d.createdAt)}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-900">
                            {d.status}
                          </td>
                          {onSelectDossier && (
                            <td className="no-print border border-slate-300 px-3 py-2">
                              <button
                                type="button"
                                onClick={() => onSelectDossier(d)}
                                className="text-xs font-semibold text-[#D90A14] hover:underline"
                              >
                                Ouvrir
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Official Footer */}
          <div className="mt-8 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-500">
            <p>{getPrintFooterInfo(settings)}</p>
            <p className="mt-0.5">
              Document généré depuis l’espace client lomakrev.com — vérifiable en ligne sur lomakrev.com/suivi.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
