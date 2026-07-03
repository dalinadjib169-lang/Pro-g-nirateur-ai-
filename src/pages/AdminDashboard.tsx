import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth, UserData } from '../contexts/AuthContext';
import { Users, Key, Settings, BarChart3, Search, Trash2, Power, Edit, Plus, RefreshCw, Home, Copy, Shield, Upload, Lock, MonitorPlay } from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { uploadImage } from '../lib/cloudinary';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'generate' | 'users' | 'keys' | 'settings'>('generate');
  
  // Settings state
  const [profilePic, setProfilePic] = useState(userData?.profilePic || '');
  const [newPassword, setNewPassword] = useState('');
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);

  const [keys, setKeys] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData: UserData[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push(doc.data() as UserData);
      });
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKeys = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'api_keys'));
      const keysData: any[] = [];
      querySnapshot.forEach((doc) => {
        keysData.push({ id: doc.id, ...doc.data() });
      });
      setKeys(keysData);
    } catch (error) {
      console.error('Error fetching keys:', error);
    }
  };

  const fetchCodes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'activation_codes'));
      let codesData: any[] = [];
      querySnapshot.forEach((doc) => {
        codesData.push({ id: doc.id, ...doc.data() });
      });
      // Sort in memory by createdAt descending
      codesData.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      });
      setCodes(codesData);
    } catch (error: any) {
      console.error('Error fetching codes:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchKeys();
    fetchCodes();
    
    // Listen for realtime updates on keys to see which one is generating
    const unsubscribeKeys = onSnapshot(collection(db, 'api_keys'), (snapshot) => {
      const keysData: any[] = [];
      snapshot.forEach((doc) => {
        keysData.push({ id: doc.id, ...doc.data() });
      });
      setKeys(keysData);
    });
    
    return () => {
      unsubscribeKeys();
    };
  }, []);

  useEffect(() => {
    if (userData?.profilePic) {
      setProfilePic(userData.profilePic);
    }
  }, [userData]);

  const handleUpdateGenerations = async (uid: string, newAmount: number) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        generationsRemaining: newAmount
      });
      fetchUsers();
    } catch (error) {
      console.error('Error updating generations:', error);
    }
  };

  const handleToggleUserStatus = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        isActive: !currentStatus
      });
      fetchUsers();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if(window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProfile(true);
    try {
      const url = await uploadImage(file);
      if(url) {
        setProfilePic(url);
        if(userData?.uid) {
          await updateDoc(doc(db, 'users', userData.uid), {
            profilePic: url
          });
        }
        alert('تم تغيير الصورة بنجاح');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('خطأ في تحميل الصورة، حاول مجدداً.');
    } finally {
      setIsUploadingProfile(false);
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
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      let randomPart = '';
      for (let i = 0; i < 8; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const code = `PRO-${randomPart.substring(0, 4)}-${randomPart.substring(4, 8)}`;
      
      await addDoc(collection(db, 'activation_codes'), {
        code,
        type: 'pro',
        generations: 500,
        isUsed: false,
        usedBy: null,
        createdAt: serverTimestamp()
      });
      fetchCodes();
      
      window.prompt('تم توليد كود تفعيل الوضع الاحترافي بنجاح. انسخ الكود التالي:', code);
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
      } catch (error: any) {
        console.error('Error deleting code:', error);
      }
    }
  };

  const handleAddKey = async () => {
    const key = window.prompt('أدخل مفتاح الـ API الجديد:');
    if (!key) return;
    
    const provider = window.prompt('أدخل اسم المزود (مثال: gemini أو openai):') || 'gemini';

    try {
      await addDoc(collection(db, 'api_keys'), {
        key,
        provider,
        isActive: true,
        error: null,
        useCount: 0,
        createdAt: serverTimestamp()
      });
      alert('تم إضافة المفتاح بنجاح.');
    } catch (error) {
      console.error('Error adding API key:', error);
      alert('خطأ في إضافة المفتاح.');
    }
  };

  const handleToggleKeyStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'api_keys', id), {
        isActive: !currentStatus
      });
    } catch (error) {
      console.error('Error toggling key status:', error);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if(window.confirm('هل أنت متأكد من حذف هذا المفتاح؟')) {
      try {
        await deleteDoc(doc(db, 'api_keys', id));
      } catch (error) {
        console.error('Error deleting key:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      {/* Top Navbar */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-indigo-500">
                {profilePic ? (
                  <img src={profilePic} alt="Admin" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-700">👤</div>
                )}
              </div>
              <div className="hidden sm:block">
                <h2 className="font-bold text-slate-800 dark:text-white text-sm">{userData?.firstName} {userData?.lastName}</h2>
                <p className="text-xs text-slate-500">لوحة تحكم المسؤول (الإصدار الجديد)</p>
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2 space-x-reverse overflow-x-auto pb-1">
              <button onClick={() => setActiveTab('generate')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'generate' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400'}`}>
                <Shield size={18} /> <span className="hidden sm:inline">قسم التوليد</span>
              </button>
              <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'users' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400'}`}>
                <Users size={18} /> <span className="hidden sm:inline">المستخدمين</span>
              </button>
              <button onClick={() => setActiveTab('keys')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'keys' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 font-bold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400'}`}>
                <Key size={18} /> <span className="hidden sm:inline">المفاتيح</span>
              </button>
              <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 font-bold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400'}`}>
                <Settings size={18} /> <span className="hidden sm:inline">الإعدادات والبروفايل</span>
              </button>
              <button onClick={() => navigate('/')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-slate-600 hover:bg-slate-50 dark:text-slate-400`}>
                <Home size={18} /> <span className="hidden sm:inline">الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {activeTab === 'generate' && (
          <div className="space-y-6">
             <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-4">
                  <Shield className="text-indigo-600 dark:text-indigo-400 w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">توليد أكواد احترافية تعمل بشكل مضمون</h2>
                <p className="text-slate-500 mb-8 max-w-md">قم بالنقر على الزر أدناه لتوليد كود يمكن للمستخدمين استعماله للوصول إلى الميزات الاحترافية وتوليد المحتوى بشكل لا محدود.</p>
                <button 
                  onClick={handleGenerateCode} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-3 text-lg transition-transform hover:scale-105"
                >
                  <RefreshCw size={24} /> 
                  توليد كود جديد الآن
                </button>
             </div>

             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-slate-800 dark:text-white">الأكواد المُولدة مسبقاً</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right text-slate-600 dark:text-slate-400">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="px-6 py-3">الكود</th>
                      <th className="px-6 py-3">الحالة</th>
                      <th className="px-6 py-3">تاريخ التوليد</th>
                      <th className="px-6 py-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map(code => (
                      <tr key={code.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                          {code.code}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${code.isUsed ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>
                            {code.isUsed ? 'مستعمل' : 'جديد / متاح'}
                          </span>
                        </td>
                        <td className="px-6 py-4">{code.createdAt?.toDate ? code.createdAt.toDate().toLocaleDateString('ar-DZ') : ''}</td>
                        <td className="px-6 py-4 flex justify-center gap-2">
                           <button onClick={() => {
                              navigator.clipboard.writeText(code.code);
                              alert('تم نسخ الكود!');
                            }} className="p-2 text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100" title="نسخ الكود">
                              <Copy size={16} />
                            </button>
                            <button onClick={() => handleDeleteCode(code.id)} className="p-2 text-red-600 bg-red-50 rounded hover:bg-red-100" title="حذف">
                              <Trash2 size={16} />
                            </button>
                        </td>
                      </tr>
                    ))}
                    {codes.length === 0 && (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">لا يوجد أكواد مولدة.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between">
              <h2 className="font-bold text-slate-800 dark:text-white">إدارة المستخدمين</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right text-slate-600 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-3">المستخدم</th>
                    <th className="px-6 py-3">البريد</th>
                    <th className="px-6 py-3">الرصيد المتبقي</th>
                    <th className="px-6 py-3">الحالة</th>
                    <th className="px-6 py-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.uid} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{user.firstName} {user.lastName}</td>
                      <td className="px-6 py-4" dir="ltr" style={{textAlign: 'right'}}>{user.email}</td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          defaultValue={user.generationsRemaining}
                          onBlur={(e) => handleUpdateGenerations(user.uid, parseInt(e.target.value))}
                          className="w-20 p-1 border border-slate-200 rounded text-center dark:bg-slate-900 dark:border-slate-600"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {user.isActive ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex justify-center gap-2">
                        <button onClick={() => handleToggleUserStatus(user.uid, user.isActive)} className="text-amber-500 bg-amber-50 p-2 rounded" title="إيقاف/تفعيل">
                          <Power size={18} />
                        </button>
                        <button onClick={() => handleDeleteUser(user.uid)} className="text-red-500 bg-red-50 p-2 rounded" title="حذف">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'keys' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="font-bold text-slate-800 dark:text-white">مفاتيح التوليد (API Keys)</h2>
              <button onClick={handleAddKey} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-bold">
                <Plus size={16} /> إضافة مفتاح
              </button>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-sm border-b border-blue-100 dark:border-blue-800 flex gap-2">
              <MonitorPlay className="shrink-0 mt-0.5" size={18} />
              <p>
                هنا يمكنك مراقبة مفاتيح التوليد. المفاتيح النشطة ستظهر بعدد مرات الاستخدام. إذا واجه المفتاح مشكلة فسيظهر خطأ.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right text-slate-600 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-3">المفتاح</th>
                    <th className="px-6 py-3">عدد التوليدات (استخدام)</th>
                    <th className="px-6 py-3">الحالة الأخيرة</th>
                    <th className="px-6 py-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map(key => (
                    <tr key={key.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-white" dir="ltr">
                        {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-bold">
                          {key.useCount || 0} مرات
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${key.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          <span className={`w-2 h-2 rounded-full ${key.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          {key.isActive ? 'يعمل' : (key.error || 'موقوف')}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex justify-center gap-2">
                        <button onClick={() => handleToggleKeyStatus(key.id, key.isActive)} className="text-amber-600 bg-amber-50 p-2 rounded" title="إيقاف/تفعيل">
                          <Power size={18} />
                        </button>
                        <button onClick={() => handleDeleteKey(key.id)} className="text-red-600 bg-red-50 p-2 rounded" title="حذف">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {keys.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">لا توجد مفاتيح مضافة بعد.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-slate-800 dark:text-white text-center border-b pb-4">إعدادات الحساب والبروفايل</h2>
            
            <div className="mb-8 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full overflow-hidden mb-4 ring-4 ring-indigo-50 border-4 border-white shadow-lg bg-slate-100">
                {profilePic ? (
                  <img src={profilePic} alt="Admin" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Users size={48} />
                  </div>
                )}
              </div>
              <label className="cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-6 py-2 rounded-full font-medium transition-colors flex items-center gap-2">
                <Upload size={18} />
                {isUploadingProfile ? 'جاري الرفع...' : 'تحميل صورة بروفايل جديدة'}
                <input type="file" onChange={handleImageUpload} accept="image/*" className="hidden" disabled={isUploadingProfile} />
              </label>
            </div>

            <div className="mb-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <Lock size={18} /> تغيير كلمة المرور
              </h3>
              <div className="flex flex-col gap-3">
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="أدخل كلمة المرور الجديدة" className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" />
                <button onClick={handleChangePassword} className="bg-slate-800 hover:bg-slate-900 text-white w-full py-3 rounded-lg font-bold transition-colors">
                  حفظ كلمة المرور
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
