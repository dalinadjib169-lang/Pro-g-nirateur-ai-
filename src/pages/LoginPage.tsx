import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
      // Firebase auth persists state by default, rememberMe can be mapped to local/session persistence if needed, but default is fine for now.
    } catch (err: any) {
      console.warn(err);
      if (err.code === 'auth/network-request-failed') {
        setError('تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت أو محاولة فتح التطبيق في نافذة جديدة.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('البريد الإلكتروني أو كلمة السر غير صحيحة.');
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      }
    } finally {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 dark:border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 font-['Space_Grotesk'] mb-2 tracking-tight">Pro Générateur AI</h1>
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
