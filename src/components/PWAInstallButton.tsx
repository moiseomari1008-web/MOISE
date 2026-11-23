import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return { isInstallable: !!deferredPrompt, isInstalled, isIOS, install };
}

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center gap-2 rounded-lg border border-[#FBBF24] bg-white px-3.5 py-2 text-xs font-semibold text-[#99060D] transition-colors hover:bg-[#FFFBEB] whitespace-nowrap shrink-0 ${className}`}
      >
        <Download className="h-3.5 w-3.5 text-[#D90A14]" />
        Installer l’application
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-2 rounded-lg border border-[#FBBF24] bg-white px-3.5 py-2 text-xs font-semibold text-[#99060D] transition-colors hover:bg-[#FFFBEB] whitespace-nowrap shrink-0 ${className}`}
        >
          <Download className="h-3.5 w-3.5 text-[#D90A14]" />
          Installer sur iPhone
        </button>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 text-slate-900">
            <div className="w-full max-w-sm rounded-xl border border-[#F4B400]/60 bg-white p-6 shadow-xl">
              <h3 className="text-base font-bold text-slate-900">Installer Lomakrev sur iPhone / iPad</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                1. Appuyez sur le bouton <strong>Partager</strong> dans la barre Safari.<br />
                2. Faites défiler et choisissez <strong>Sur l’écran d’accueil</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-[#D90A14] py-2.5 text-sm font-semibold text-white hover:bg-[#B80811]"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
