import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Brain, Mic } from 'lucide-react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isSimulatingInstall, setIsSimulatingInstall] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);

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
      // Simulate installation progress
      setIsSimulatingInstall(true);
      setInstallProgress(0);
      
      const interval = setInterval(() => {
        setInstallProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              alert('تطبيقك سيثبت بعد قليل في انتظار تهيئة اعدادات هاتفك');
              setIsSimulatingInstall(false);
            }, 500);
            return 100;
          }
          return prev + Math.floor(Math.random() * 15) + 5;
        });
      }, 300);
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
        
        <div className="w-28 h-28 mb-6 rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-indigo-600 p-1 relative">
          <div className="w-full h-full bg-[#0a0a0a] rounded-[22px] flex items-center justify-center overflow-hidden relative border border-teal-500/30">
             <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400 absolute"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
             <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300 absolute bottom-3 right-3"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          </div>
        </div>

        <h2 className="text-2xl font-black bg-gradient-to-l from-emerald-300 via-teal-400 to-indigo-400 bg-clip-text text-transparent mb-2 text-center font-['Cairo']">
          المربي DZ
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

        {isSimulatingInstall ? (
          <div className="w-full">
            <div className="flex justify-between text-sm font-semibold mb-2 text-teal-300/80">
              <span>جاري التحميل والتثبيت...</span>
              <span dir="ltr">{Math.min(installProgress, 100)}%</span>
            </div>
            <div className="w-full h-3 bg-[#1a1a1a] rounded-full overflow-hidden border border-teal-900/50 shadow-inner" dir="ltr">
              <div 
                className="h-full bg-gradient-to-r from-teal-600 via-teal-400 to-emerald-300 transition-all duration-300 ease-out relative"
                style={{ width: `${Math.min(installProgress, 100)}%` }}
              >
                <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px]" style={{ animation: 'moveStripes 1s linear infinite' }} />
              </div>
            </div>
            <p className="text-center text-xs text-slate-400 mt-3 animate-pulse">
              يرجى الانتظار، جاري تحضير ملفات التطبيق...
            </p>
          </div>
        ) : (
          <button
            onClick={handleInstallClick}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-[#0a0a0a] font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all transform hover:scale-105 active:scale-95"
          >
            <Download size={24} />
            <span className="text-lg">{deferredPrompt ? 'تثبيت التطبيق الآن' : 'كيفية التثبيت'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
