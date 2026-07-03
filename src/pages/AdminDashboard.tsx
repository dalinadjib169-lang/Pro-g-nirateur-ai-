import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Settings, BarChart3, Trash2, Edit, Plus, RefreshCw, Home, User, Lock, KeyRound, Copy, CheckCircle2 } from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { uploadImage } from '../lib/cloudinary';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'codes' | 'settings'>('codes');
  
  // Settings state
  const [profilePic, setProfilePic] = useState(userData?.profilePic || '');
  const [newPassword, setNewPassword] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [codes, setCodes] = useState<any[]>([]);

  const fetchCodes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'activation_codes'));
      const codesData: any[] = [];
      querySnapshot.forEach((doc) => {
        codesData.push({ id: doc.id, ...doc.data() });
      });
      // Sort by createdAt descending
      codesData.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      });
      setCodes(codesData);
    } catch (error) {
      console.error('Error fetching codes:', error);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadImage(file);
      if(url) {
        setProfilePic(url);
        if(userData?.uid) {
          await updateDoc(doc(db, 'users', userData.uid), {
            profilePic: url
          });
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleChangePassword = async () => {
    if(!newPassword) return;
    try {
      if(auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        alert('تم تغيير كلمة السر بنجاح');
        setNewPassword('');
      }
    } catch (error) {
      console.error('Password change error:', error);
      alert('خطأ في تغيير كلمة السر. قد تحتاج لتسجيل الدخول مجدداً.');
    }
  };

  const handleGenerateCode = async () => {
    try {
      // Generate random 12-char alphanumeric code
      const code = Math.random().toString(36).substring(2, 14).toUpperCase();
      
      await addDoc(collection(db, 'activation_codes'), {
        code,
        generations: 250,
        isUsed: false,
        usedBy: null,
        createdAt: serverTimestamp()
      });
      fetchCodes();
    } catch (error) {
      console.error('Error generating code:', error);
      alert('خطأ في توليد الكود.');
    }
  };

  const handleDeleteCode = async (id: string) => {
    if(window.confirm('هل أنت متأكد من حذف هذا الكود؟')) {
      try {
        await deleteDoc(doc(db, 'activation_codes', id));
        fetchCodes();
      } catch (error) {
        console.error('Error deleting code:', error);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans" dir="rtl">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 flex items-center justify-center border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-wider text-indigo-400">لوحة التحكم</h1>
        </div>
        
        <div className="flex flex-col p-4 flex-1 gap-2">
          <button 
            onClick={() => setActiveTab('codes')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'codes' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <KeyRound size={20} />
            <span className="font-medium">إنشاء الأكواد</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('settings')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <User size={20} />
            <span className="font-medium">الإعدادات الشخصية</span>
          </button>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <Home size={20} />
            <span className="font-medium">العودة للرئيسية</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          
          {activeTab === 'codes' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">قسم إنشاء الأكواد</h2>
                  <p className="text-slate-500">قم بتوليد وإدارة أكواد تفعيل الحسابات (كل كود يمنح 250 توليدة).</p>
                </div>
                <button 
                  onClick={handleGenerateCode} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <Plus size={20} />
                  إنشاء كود مفتاح جديد
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-semibold">الكود (المفتاح)</th>
                        <th className="px-6 py-4 font-semibold">تاريخ التوليد</th>
                        <th className="px-6 py-4 font-semibold">الحالة</th>
                        <th className="px-6 py-4 font-semibold text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {codes.map(code => (
                        <tr key={code.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-lg text-slate-800 tracking-wider bg-slate-100 px-3 py-1 rounded-lg" dir="ltr">
                                {code.code}
                              </span>
                              <button 
                                onClick={() => copyToClipboard(code.code)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="نسخ الكود"
                              >
                                {copiedCode === code.code ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {code.createdAt?.toDate ? code.createdAt.toDate().toLocaleDateString('ar-DZ') : ''}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${code.isUsed ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${code.isUsed ? 'bg-slate-400' : 'bg-emerald-500'}`}></span>
                              {code.isUsed ? 'مستعمل' : 'متاح للاستخدام'}
                            </span>
                          </td>
                          <td className="px-6 py-4 flex justify-center">
                            <button 
                              onClick={() => handleDeleteCode(code.id)} 
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                              title="حذف الكود"
                            >
                              <Trash2 size={20} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {codes.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <KeyRound size={48} className="text-slate-300" />
                              <p>لم يتم توليد أي أكواد مفاتيح بعد.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">الإعدادات الشخصية والبروفايل</h2>
                <p className="text-slate-500">إدارة معلومات حسابك وصورتك الشخصية.</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8">
                
                {/* Profile Picture Section */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-slate-100">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-md flex-shrink-0">
                    {profilePic ? (
                      <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-300">
                        <User size={40} />
                      </div>
                    )}
                  </div>
                  <div className="text-center sm:text-right">
                    <h3 className="font-bold text-lg text-slate-800 mb-1">{userData?.firstName} {userData?.lastName}</h3>
                    <p className="text-slate-500 text-sm mb-4">{userData?.email}</p>
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-block">
                      تغيير الصورة
                      <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                    </label>
                  </div>
                </div>

                {/* Password Section */}
                <div>
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Lock size={18} className="text-slate-400" />
                    الأمان وكلمة المرور
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      placeholder="أدخل كلمة المرور الجديدة" 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" 
                    />
                    <button 
                      onClick={handleChangePassword} 
                      disabled={!newPassword}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold shadow-sm transition-colors whitespace-nowrap"
                    >
                      حفظ التغييرات
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
