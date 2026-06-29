import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { X, Lock, ImagePlus, User, Shield } from 'lucide-react';

export const CompleteProfileModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, userData, refreshUserData } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'admin'>('profile');
  
  // Profile state
  const [stateName, setStateName] = useState('');
  const [phase, setPhase] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);

  // Security state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');

  // Admin state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const expertAvatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userData && isOpen) {
      setStateName(userData.state || (userData as any).wilaya || '');
      setPhase(userData.phase || '');
      setSubject((userData as any).subject || '');
      // Reset other states
      setNewPassword('');
      setConfirmPassword('');
      setSecurityError('');
      setSecuritySuccess('');
      setActiveTab('profile');
    }
  }, [userData, isOpen]);

  const handleSubmitProfile = async (e: React.FormEvent) => {
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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSecurityError('');
    setSecuritySuccess('');

    if (newPassword !== confirmPassword) {
      setSecurityError('كلمات المرور غير متطابقة');
      return;
    }

    if (newPassword.length < 6) {
      setSecurityError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
      return;
    }

    setSecurityLoading(true);
    try {
      await updatePassword(user, newPassword);
      setSecuritySuccess('تم تغيير كلمة المرور بنجاح');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        setSecurityError('يرجى تسجيل الخروج وتسجيل الدخول مرة أخرى لتغيير كلمة المرور');
      } else {
        setSecurityError('حدث خطأ أثناء تغيير كلمة المرور');
      }
    }
    setSecurityLoading(false);
  };

  const handleExpertAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData) return;

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'teachers_room');

    try {
      const response = await fetch('https://api.cloudinary.com/v1_1/doaxziqm7/image/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.secure_url) {
        // Save to general settings
        await setDoc(doc(db, 'settings', 'general'), { expertAvatar: data.secure_url }, { merge: true });
        // Also save to local storage as fallback
        localStorage.setItem('expertAvatar', data.secure_url);
        // And update admin's document so the app reacts (if they are the admin)
        await updateDoc(doc(db, 'users', userData.uid), { expertAvatar: data.secure_url });
        await refreshUserData();
        alert('تم تحديث صورة الخبير التربوي بنجاح');
      }
    } catch (err) {
      console.error(err);
      alert('فشل رفع الصورة');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const isAdmin = userData && (userData.role === 'admin' || userData.email === 'dalinadjib1990@gmail.com');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100 dark:border-slate-700 relative overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 left-4 p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors z-10"
            >
              <X size={18} />
            </button>

            <div className="text-center mb-6 mt-2">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">الإعدادات</h2>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'profile' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <div className="flex items-center justify-center gap-1"><User size={16}/> الحساب</div>
              </button>
              <button 
                onClick={() => setActiveTab('security')}
                className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'security' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <div className="flex items-center justify-center gap-1"><Lock size={16}/> الأمان</div>
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'admin' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <div className="flex items-center justify-center gap-1"><Shield size={16}/> الإدارة</div>
                </button>
              )}
            </div>

            {activeTab === 'profile' && (
              <form onSubmit={handleSubmitProfile} className="space-y-4">
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
                  <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 rounded-xl font-bold flex justify-center items-center hover:opacity-90 transition-opacity disabled:opacity-50">
                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "حفظ التغييرات"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {securityError && (
                  <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-bold border border-red-200">
                    {securityError}
                  </div>
                )}
                {securitySuccess && (
                  <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-bold border border-green-200">
                    {securitySuccess}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور الجديدة</label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                    placeholder="أدخل كلمة المرور الجديدة" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تأكيد كلمة المرور</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                    placeholder="أعد إدخال كلمة المرور للتأكيد" 
                  />
                </div>

                <div className="flex gap-2 mt-6">
                  <button type="submit" disabled={securityLoading} className="w-full bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl font-bold flex justify-center items-center transition-colors disabled:opacity-50">
                    {securityLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "تغيير كلمة المرور"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'admin' && isAdmin && (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                  <h3 className="font-bold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
                    <ImagePlus size={18} />
                    صورة الخبير التربوي
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    قم برفع صورة جديدة لتكون الصورة الرمزية الخاصة بالخبير التربوي في قاعة الأساتذة للجميع.
                  </p>
                  
                  <input 
                    type="file" 
                    ref={expertAvatarInputRef} 
                    onChange={handleExpertAvatarUpload} 
                    className="hidden" 
                    accept="image/*" 
                  />
                  
                  <button 
                    onClick={() => expertAvatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="w-full flex justify-center items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white p-3 rounded-lg font-bold transition-colors"
                  >
                    {isUploadingAvatar ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>رفع صورة جديدة</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
