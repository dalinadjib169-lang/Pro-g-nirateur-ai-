import React, { useState, useEffect } from 'react';

const ADHKAR = [
  "سبحان الله وبحمده، سبحان الله العظيم",
  "لا إله إلا الله وحده لا شريك له",
  "اللهم صل وسلم على نبينا محمد",
  "استغفر الله الذي لا إله إلا هو الحي القيوم وأتوب إليه",
  "حسبنا الله ونعم الوكيل",
  "لا حول ولا قوة إلا بالله العلي العظيم",
  "يا رب أرزقنا التوفيق والنجاح",
  "اللهم إني أسألك علماً نافعاً ورزقاً طيباً"
];

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [dhikrIndex, setDhikrIndex] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + Math.floor(Math.random() * 15) + 5;
      });
    }, 400);

    // Change Dhikr every 3 seconds
    const dhikrInterval = setInterval(() => {
      setDhikrIndex(i => (i + 1) % ADHKAR.length);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearInterval(dhikrInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-50 text-amber-400" dir="rtl">
      <div className="w-full max-w-md px-8 flex flex-col items-center">
        {/* Logo or Icon area */}
        <div className="w-32 h-32 mb-8 rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-500 to-indigo-600 p-1 shadow-[0_0_40px_rgba(20,184,166,0.4)] relative overflow-hidden group">
          <div className="w-full h-full bg-[#0a0a0a] rounded-[22px] flex items-center justify-center border border-teal-500/30 relative">
             <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400 absolute"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300 absolute bottom-4 right-4"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-12 tracking-wider bg-gradient-to-l from-emerald-300 via-teal-400 to-indigo-400 bg-clip-text text-transparent text-center font-['Cairo']">
          المربي DZ
        </h1>

        {/* Adhkar */}
        <div className="h-16 flex items-center justify-center mb-8 w-full">
          <p className="text-xl md:text-2xl text-center text-amber-200/90 transition-opacity duration-500 animate-pulse" style={{ fontFamily: "'Amiri', 'Tajawal', sans-serif" }}>
            {ADHKAR[dhikrIndex]}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full">
          <div className="flex justify-between text-sm font-semibold mb-2 text-teal-300/80">
            <span>جاري التحميل...</span>
            <span dir="ltr">{Math.min(progress, 100)}%</span>
          </div>
          <div className="w-full h-3 bg-[#1a1a1a] rounded-full overflow-hidden border border-teal-900/50 shadow-inner" dir="ltr">
            <div 
              className="h-full bg-gradient-to-r from-teal-600 via-teal-400 to-emerald-300 transition-all duration-300 ease-out relative"
              style={{ width: `${Math.min(progress, 100)}%` }}
            >
              <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px]" style={{ animation: 'moveStripes 1s linear infinite' }} />
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes moveStripes {
          0% { background-position: 0 0; }
          100% { background-position: 40px 0; }
        }
      `}</style>
    </div>
  );
}
