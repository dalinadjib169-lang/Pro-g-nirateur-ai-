import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { X } from 'lucide-react';

export const CompleteProfileModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { userData, refreshUserData } = useAuth();
  const [stateName, setStateName] = useState('');
  const [phase, setPhase] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData && isOpen) {
      setStateName(userData.state || (userData as any).wilaya || '');
      setPhase(userData.phase || '');
      setSubject((userData as any).subject || '');
    }
  }, [userData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userData.uid), {
        state: stateName,
        wilaya: stateName, // keep backwards compatibility
        phase,
        subject
      });
      await refreshUserData();
      onClose();
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء الحفظ');
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100 dark:border-slate-700 relative"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 left-4 p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <div className="text-center mb-6 mt-2">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">إكمال الملف الشخصي</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">يمكنك تحديث بياناتك هنا لتظهر بشكل صحيح في قاعة الأساتذة</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الولاية</label>
                <select value={stateName} onChange={e => setStateName(e.target.value)} className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">اختر الولاية</option>
                  {['أدرار', 'الشلف', 'الأغواط', 'أم البواقي', 'باتنة', 'بجاية', 'بسكرة', 'بشار', 'البليدة', 'البويرة', 'تمنراست', 'تبسة', 'تلمسان', 'تيارت', 'تيزي وزو', 'الجزائر', 'الجلفة', 'جيجل', 'سطيف', 'سعيدة', 'سكيكدة', 'سيدي بلعباس', 'عنابة', 'قالمة', 'قسنطينة', 'المدية', 'مستغانم', 'المسيلة', 'معسكر', 'ورقلة', 'وهران', 'البيض', 'إليزي', 'برج بوعريريج', 'بومرداس', 'الطارف', 'تندوف', 'تيسمسيلت', 'الوادي', 'خنشلة', 'سوق أهراس', 'تيبازة', 'ميلة', 'عين الدفلى', 'النعامة', 'عين تموشنت', 'غرداية', 'غليزان', 'تيميمون', 'برج باجي مختار', 'أولاد جلال', 'بني عباس', 'إن صالح', 'إن قزام', 'تقرت', 'جانت', 'المغير', 'المنيعة'].map((w, i) => (
                    <option key={i} value={`${i + 1}- ${w}`}>{i + 1}- {w}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الطور</label>
                <select value={phase} onChange={e => setPhase(e.target.value)} className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">اختر الطور</option>
                  <option value="ابتدائي">ابتدائي</option>
                  <option value="متوسط">متوسط</option>
                  <option value="ثانوي">ثانوي</option>
                  <option value="جامعي">جامعي</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">مادة التدريس</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="مثال: رياضيات، لغة عربية..." />
              </div>

              <div className="flex gap-2 mt-6">
                <button type="button" onClick={onClose} className="w-1/3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white p-3 rounded-xl font-bold flex justify-center items-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  إلغاء
                </button>
                <button type="submit" disabled={loading} className="w-2/3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 rounded-xl font-bold flex justify-center items-center hover:opacity-90 transition-opacity disabled:opacity-50">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "حفظ التغييرات"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
