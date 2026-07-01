import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  if (!showInstallBanner) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#111] border border-amber-500/30 w-full max-w-sm rounded-3xl shadow-2xl shadow-amber-500/20 overflow-hidden relative flex flex-col items-center p-8">
        <button
          onClick={() => setShowInstallBanner(false)}
          className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="w-32 h-32 mb-6 rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-700 p-1 relative">
          <div className="w-full h-full bg-[#0a0a0a] rounded-[22px] flex items-center justify-center overflow-hidden">
             <img src="/icon.png" alt="App Icon" className="w-full h-full object-cover rounded-[22px]" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
             <span className="text-4xl font-extrabold bg-gradient-to-br from-amber-200 to-amber-600 bg-clip-text text-transparent absolute">AI</span>
          </div>
        </div>

        <h2 className="text-2xl font-black bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent mb-2 text-center">
          PRO GÉNÉRATEUR AI
        </h2>
        
        <p className="text-slate-300 text-center mb-8 text-sm leading-relaxed">
          قم بتثبيت التطبيق على هاتفك لتجربة أسرع وأفضل (PWA)، تماماً مثل تطبيقات أندرويد الرسمية.
        </p>

        <button
          onClick={handleInstallClick}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-[#0a0a0a] font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all transform hover:scale-105 active:scale-95"
        >
          <Download size={24} />
          <span className="text-lg">تثبيت التطبيق الآن</span>
        </button>
      </div>
    </div>
  );
}
