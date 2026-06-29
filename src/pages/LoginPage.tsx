import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user, userData, loading: authLoading } = useAuth();

  useEffect(() => {
    if (user && userData && !authLoading) {
      navigate('/');
    }
  }, [user, userData, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const formattedEmail = email.includes('@') ? email : `${email}@phone.pro-gen.com`;
      await signInWithEmailAndPassword(auth, formattedEmail, password);
      // Let AuthContext handle the loading and navigation
    } catch (err: any) {
      console.warn(err);
      if (err.code === 'auth/network-request-failed') {
        setError('تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت أو محاولة فتح التطبيق في نافذة جديدة.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('البريد الإلكتروني أو كلمة السر غير صحيحة.');
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setMessage('');
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
        setError('حدث خطأ أثناء تسجيل الدخول عبر Google: ' + err.message);
      }
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('الرجاء إدخال البريد الإلكتروني أولاً لإعادة تعيين كلمة السر.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('تم إرسال رابط إعادة تعيين كلمة السر إلى بريدك الإلكتروني.');
      setError('');
    } catch (err: any) {
      setError('حدث خطأ أثناء إرسال رابط إعادة التعيين.');
    }
  };

  if (loading || authLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 dark:border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-500 to-yellow-600 font-['Space_Grotesk'] mb-2 tracking-tight">PRO GÉNIRATEUR AI</h1>
          <p className="text-slate-500 dark:text-slate-400">مرحباً بك مجدداً</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-2 text-sm">
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني (أو رقم الهاتف)</label>
            <input type="text" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-left transition-all" dir="ltr" placeholder="example@mail.com أو 0550000000" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة السر</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-left transition-all" dir="ltr" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              تذكرني
            </label>
            <button type="button" onClick={handleResetPassword} className="text-indigo-600 dark:text-indigo-400 hover:underline">
              هل نسيت الرقم السري؟
            </button>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 mt-6 shadow-lg shadow-indigo-500/30">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><LogIn size={18} /> دخول</>}
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

        {/* Free Generation Banner */}
        <div className="mt-8 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 border border-amber-200 dark:border-amber-800 p-4 rounded-xl text-center shadow-inner relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-300/30 rounded-full blur-xl"></div>
          <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-orange-300/30 rounded-full blur-xl"></div>
          <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-1 relative z-10 text-lg">🎁 30 توليدة مجانية لكل مشترك جديد!</h3>
          <p className="text-sm text-amber-700 dark:text-amber-400 relative z-10">سجل الآن وجرب التطبيق مجاناً، واحصل على أدوات ذكاء اصطناعي احترافية لإنتاج الدروس والتمارين.</p>
        </div>

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          ليس لديك حساب؟ <Link to="/register" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">إنشاء حساب جديد</Link>
        </div>
      </div>
    </div>
  );
}
