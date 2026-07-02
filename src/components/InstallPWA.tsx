import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsStandalone(true);
      return;
    }

    // Check if iOS
    const ua = window.navigator.userAgent;
    const webkit = !!ua.match(/WebKit/i);
    const isIPad = !!ua.match(/iPad/i);
    const isIPhone = !!ua.match(/iPhone/i);
    const isIOSDevice = isIPad || isIPhone;
    setIsIOS(isIOSDevice && webkit && !ua.match(/CriOS/i));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show banner anyway after 3 seconds if not standalone, to give manual instructions
    const timer = setTimeout(() => {
      if (!isStandalone) {
        setShowInstallBanner(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    } else {
      // If no prompt, just close or show a message (handled by UI below)
      alert('لتثبيت التطبيق، يرجى فتح القائمة في متصفحك واختيار "الإضافة إلى الشاشة الرئيسية" (Add to Home screen)');
    }
  };

  if (!showInstallBanner || isStandalone) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in" dir="rtl">
      <div className="bg-[#111] border border-amber-500/30 w-full max-w-sm rounded-3xl shadow-2xl shadow-amber-500/20 overflow-hidden relative flex flex-col items-center p-8">
        <button
          onClick={() => setShowInstallBanner(false)}
          className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="w-28 h-28 mb-6 rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-700 p-1 relative">
          <div className="w-full h-full bg-[#0a0a0a] rounded-[22px] flex items-center justify-center overflow-hidden">
             <img src="/icon.png" alt="App Icon" className="w-full h-full object-cover rounded-[22px]" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
        </div>

        <h2 className="text-2xl font-black bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent mb-2 text-center">
          PRO GÉNÉRATEUR AI
        </h2>
        
        <div className="text-slate-300 text-center mb-8 text-sm leading-relaxed space-y-3">
          <p>قم بتثبيت التطبيق على هاتفك لتجربة أسرع وأفضل (PWA)، تماماً مثل تطبيقات أندرويد الرسمية.</p>
          
          {!deferredPrompt && isIOS && (
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 mt-4 text-xs flex flex-col items-center gap-2">
              <p>لتثبيت التطبيق على الآيفون:</p>
              <div className="flex items-center gap-2">
                <span>1. اضغط على زر المشاركة</span>
                <Share size={16} className="text-blue-400" />
              </div>
              <div className="flex items-center gap-2">
                <span>2. اختر "إضافة للشاشة الرئيسية"</span>
                <PlusSquare size={16} className="text-slate-400" />
              </div>
            </div>
          )}

          {!deferredPrompt && !isIOS && (
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 mt-4 text-xs text-amber-200/80">
              ملاحظة: إذا كنت تتصفح من داخل تطبيق (مثل فيسبوك)، يرجى فتح الرابط في متصفح Chrome أولاً لتتمكن من تثبيته. أو من قائمة المتصفح اختر "الإضافة إلى الشاشة الرئيسية".
            </div>
          )}
        </div>

        <button
          onClick={handleInstallClick}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-[#0a0a0a] font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all transform hover:scale-105 active:scale-95"
        >
          <Download size={24} />
          <span className="text-lg">{deferredPrompt ? 'تثبيت التطبيق الآن' : 'كيفية التثبيت'}</span>
        </button>
      </div>
    </div>
  );
}
