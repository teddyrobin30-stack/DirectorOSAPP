
import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

const InstallPwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Détection iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Vérifier si déjà installé (Standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone) return;

    // Gestion de l'événement d'installation (Android / Chrome Desktop)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Pour iOS, on affiche le prompt si on est sur mobile mais pas en standalone
    if (isIosDevice && !isStandalone) {
        setShowPrompt(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[300] bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
           <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
              <Download size={20} className="text-white" />
           </div>
           <div>
              <h4 className="font-bold text-sm">Installer HotelOS</h4>
              <p className="text-xs text-slate-400 mt-1 leading-snug">
                {isIOS 
                  ? "Pour installer, appuyez sur Partager puis 'Sur l'écran d'accueil'." 
                  : "Ajoutez l'application sur votre écran d'accueil pour un accès rapide."}
              </p>
           </div>
        </div>
        <button onClick={() => setShowPrompt(false)} className="p-1 text-slate-400 hover:text-white">
           <X size={16}/>
        </button>
      </div>
      
      {!isIOS && deferredPrompt && (
        <button 
          onClick={handleInstallClick}
          className="mt-4 w-full py-3 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-lg"
        >
          📲 Installer l'application
        </button>
      )}
      
      {isIOS && (
         <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-800/50 py-2 rounded-lg">
            <Share size={12} /> Appuyez sur le bouton de partage ci-dessous
         </div>
      )}
    </div>
  );
};

export default InstallPwaPrompt;
