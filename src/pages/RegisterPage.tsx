import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db, googleProvider } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Eye, EyeOff, UserPlus, AlertCircle, Brain, Mic } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [stateName, setStateName] = useState('');
  const [phase, setPhase] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user, userData, loading: authLoading } = useAuth();

  useEffect(() => {
    if (user && userData && !authLoading) {
      navigate('/');
    }
  }, [user, userData, authLoading, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedEmail = email.includes('@') ? email : `${email}@phone.pro-gen.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, formattedEmail, password);
      const user = userCredential.user;

      const isAdmin = formattedEmail.toLowerCase() === 'dalinadjib1990@gmail.com' || formattedEmail === '0550000000@phone.pro-gen.com' || formattedEmail.includes('0771167330');

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        firstName,
        lastName,
        state: stateName,
        phase,
        email,
        phone: '', // Can be added later
        role: isAdmin ? 'admin' : 'user',
        generationsRemaining: isAdmin ? 9999 : 30, // 30 free generations
        totalGenerations: 0,
        isActive: true,
        createdAt: Date.now()
      });
    } catch (err: any) {
      console.warn(err);
      if (err.code === 'auth/network-request-failed') {
        setError('تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت أو محاولة فتح التطبيق في نافذة جديدة.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.');
      } else {
        setError(err.message || 'حدث خطأ أثناء التسجيل');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create new user document
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email || '',
          firstName: user.displayName ? user.displayName.split(' ')[0] : 'أستاذ',
          lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
          state: '',
          phase: '',
          subject: '',
          phone: '',
          role: 'user',
          isPro: false,
          generationsRemaining: 30, // 30 free generation
          totalGenerations: 0,
          profilePic: user.photoURL || '',
          isActive: true,
          createdAt: Date.now()
        });
      }
    } catch (err: any) {
      console.warn(err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('يرجى فتح التطبيق في نافذة جديدة (New Tab) لاستخدام تسجيل الدخول عبر Google.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('تم إغلاق نافذة تسجيل الدخول قبل اكتمال العملية.');
      } else {
        setError('حدث خطأ أثناء التسجيل عبر Google: ' + err.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 dark:border-slate-700">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-700 p-1">
              <div className="w-full h-full bg-[#0a0a0a] rounded-[14px] flex items-center justify-center overflow-hidden relative">
                 <Brain className="w-10 h-10 text-amber-400 absolute" />
                 <Mic className="w-5 h-5 text-amber-200 absolute bottom-2 right-2" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-500 to-yellow-600 font-['Space_Grotesk'] mb-2">PRO GÉNÉRATEUR AI</h1>
          <p className="text-slate-500 dark:text-slate-400">إنشاء حساب جديد</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم</label>
              <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اللقب</label>
              <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الولاية</label>
              <select required value={stateName} onChange={e => setStateName(e.target.value)} className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">اختر الولاية</option>
                {['أدرار', 'الشلف', 'الأغواط', 'أم البواقي', 'باتنة', 'بجاية', 'بسكرة', 'بشار', 'البليدة', 'البويرة', 'تمنراست', 'تبسة', 'تلمسان', 'تيارت', 'تيزي وزو', 'الجزائر', 'الجلفة', 'جيجل', 'سطيف', 'سعيدة', 'سكيكدة', 'سيدي بلعباس', 'عنابة', 'قالمة', 'قسنطينة', 'المدية', 'مستغانم', 'المسيلة', 'معسكر', 'ورقلة', 'وهران', 'البيض', 'إليزي', 'برج بوعريريج', 'بومرداس', 'الطارف', 'تندوف', 'تيسمسيلت', 'الوادي', 'خنشلة', 'سوق أهراس', 'تيبازة', 'ميلة', 'عين الدفلى', 'النعامة', 'عين تموشنت', 'غرداية', 'غليزان', 'تيميمون', 'برج باجي مختار', 'أولاد جلال', 'بني عباس', 'إن صالح', 'إن قزام', 'تقرت', 'جانت', 'المغير', 'المنيعة'].map((w, i) => (
                  <option key={i} value={`${i + 1}- ${w}`}>{i + 1}- {w}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الطور</label>
              <select required value={phase} onChange={e => setPhase(e.target.value)} className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">اختر الطور</option>
                <option value="ابتدائي">ابتدائي</option>
                <option value="متوسط">متوسط</option>
                <option value="ثانوي">ثانوي</option>
                <option value="جامعي">جامعي</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني (أو رقم الهاتف)</label>
            <input type="text" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-left" dir="ltr" placeholder="example@mail.com أو 0550000000" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة السر</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-left" dir="ltr" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 mt-6">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><UserPlus size={18} /> إنشاء حساب</>}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-center">
          <div className="w-full h-[1px] bg-slate-200 dark:bg-slate-700"></div>
          <span className="px-3 text-sm text-slate-500 dark:text-slate-400">أو</span>
          <div className="w-full h-[1px] bg-slate-200 dark:bg-slate-700"></div>
        </div>

        <button 
          onClick={handleGoogleLogin} 
          disabled={loading} 
          className="w-full mt-4 bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 p-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all disabled:opacity-50 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          الدخول باستخدام Google
        </button>

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          لديك حساب بالفعل؟ <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">تسجيل الدخول</Link>
        </div>
      </div>
    </div>
  );
}
