import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useAuth, UserData } from '../contexts/AuthContext';
import { Users, Key, Settings, BarChart3, Search, Trash2, Power, Edit, Plus, RefreshCw, Home, Copy } from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { uploadImage } from '../lib/cloudinary';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'keys' | 'codes' | 'settings'>('users');
  
  // Settings state
  const [profilePic, setProfilePic] = useState(userData?.profilePic || '');
  const [newPassword, setNewPassword] = useState('');

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
      alert('خطأ في جلب الأكواد: ' + error.message);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchKeys();
    fetchCodes();
  }, []);

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
      
      // Use window.prompt so it's easy to copy on mobile devices
      window.prompt('تم توليد الكود بنجاح. انسخ الكود التالي:', code);
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
        alert('تم حذف الكود بنجاح');
      } catch (error: any) {
        console.error('Error deleting code:', error);
        alert('خطأ في حذف الكود: ' + error.message);
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
        createdAt: serverTimestamp()
      });
      fetchKeys();
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
      fetchKeys();
    } catch (error) {
      console.error('Error toggling key status:', error);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if(window.confirm('هل أنت متأكد من حذف هذا المفتاح؟')) {
      try {
        await deleteDoc(doc(db, 'api_keys', id));
        fetchKeys();
      } catch (error) {
        console.error('Error deleting key:', error);
      }
    }
  };

  // Stats
  const totalUsers = users.length;
  const totalGenerations = users.reduce((acc, user) => acc + (user.totalGenerations || 0), 0);
  const activeSubscribers = users.filter(u => u.generationsRemaining > 30).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      {/* Top Navbar */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]">
                {profilePic ? (
                  <img src={profilePic} alt="Admin" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">👤</div>
                )}
              </div>
              <div className="hidden sm:block">
                <h2 className="font-bold text-slate-800 dark:text-white text-sm">{userData?.firstName} {userData?.lastName}</h2>
                <p className="text-xs text-slate-500 mb-0.5">لوحة تحكم المسؤول</p>
                <p className="text-[10px] text-indigo-500 font-semibold">المهندس المطور dali nadjib</p>
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2 space-x-reverse overflow-x-auto no-scrollbar pb-1">
              <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'users' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                <Users size={18} className="text-blue-500" /> <span className="hidden sm:inline">المستخدمين</span>
              </button>
              <button onClick={() => setActiveTab('keys')} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'keys' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                <Key size={18} className="text-amber-500" /> <span className="hidden sm:inline">المفاتيح</span>
              </button>
              <button onClick={() => setActiveTab('codes')} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'codes' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                <BarChart3 size={18} className="text-emerald-500" /> <span className="hidden sm:inline">الأكواد</span>
              </button>
              <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                <Settings size={18} className="text-purple-500" /> <span className="hidden sm:inline">الإعدادات</span>
              </button>
              <button onClick={() => navigate('/')} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700`}>
                <Home size={18} className="text-slate-400" /> <span className="hidden sm:inline">الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-6 sm:mb-8">لوحة تحكم Pro Générateur AI</h1>
        
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mb-1">إجمالي المستخدمين</h3>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">{totalUsers}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Users className="text-blue-500" size={24} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mb-1">إجمالي التوليدات</h3>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">{totalGenerations}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <BarChart3 className="text-purple-500" size={24} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mb-1">المشتركين (باقة مدفوعة)</h3>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">{activeSubscribers}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <Users className="text-emerald-500" size={24} />
            </div>
          </div>
        </div>

        {/* Dynamic Content */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="font-bold text-slate-800 dark:text-white">إدارة المستخدمين</h2>
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="بحث..." className="pl-4 pr-10 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-64" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right text-slate-600 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-3">المستخدم</th>
                    <th className="px-6 py-3">البريد</th>
                    <th className="px-6 py-3">الطور/الولاية</th>
                    <th className="px-6 py-3">الرصيد المتبقي</th>
                    <th className="px-6 py-3">إجمالي التوليد</th>
                    <th className="px-6 py-3">الحالة</th>
                    <th className="px-6 py-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.uid} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{user.firstName} {user.lastName}</td>
                      <td className="px-6 py-4" dir="ltr" style={{textAlign: 'right'}}>{user.email}</td>
                      <td className="px-6 py-4">{user.phase} / {user.state}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            defaultValue={user.generationsRemaining}
                            onBlur={(e) => handleUpdateGenerations(user.uid, parseInt(e.target.value))}
                            className="w-16 p-1 border border-slate-200 rounded text-center dark:bg-slate-900 dark:border-slate-600"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">{user.totalGenerations || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {user.isActive ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex justify-center gap-2">
                        <button onClick={() => handleToggleUserStatus(user.uid, user.isActive)} className="text-slate-400 hover:text-amber-500" title="إيقاف/تفعيل">
                          <Power size={18} />
                        </button>
                        <button onClick={() => handleDeleteUser(user.uid)} className="text-slate-400 hover:text-red-500" title="حذف">
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
              <h2 className="font-bold text-slate-800 dark:text-white">إدارة مفاتيح الـ API</h2>
              <button onClick={handleAddKey} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <Plus size={16} /> إضافة مفتاح
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right text-slate-600 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-3">المزود</th>
                    <th className="px-6 py-3">المفتاح</th>
                    <th className="px-6 py-3">الحالة</th>
                    <th className="px-6 py-3">تاريخ الإضافة</th>
                    <th className="px-6 py-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map(key => (
                    <tr key={key.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white uppercase">{key.provider}</td>
                      <td className="px-6 py-4" dir="ltr">{key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${key.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          <span className={`w-2 h-2 rounded-full ${key.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          {key.isActive ? 'يعمل' : (key.error || 'موقوف')}
                        </span>
                      </td>
                      <td className="px-6 py-4">{key.createdAt?.toDate ? key.createdAt.toDate().toLocaleDateString('ar-DZ') : ''}</td>
                      <td className="px-6 py-4 flex justify-center gap-2">
                        <button onClick={() => handleToggleKeyStatus(key.id, key.isActive)} className="text-slate-400 hover:text-amber-500" title="إيقاف/تفعيل">
                          <Power size={18} />
                        </button>
                        <button onClick={() => handleDeleteKey(key.id)} className="text-slate-400 hover:text-red-500" title="حذف">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {keys.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">لا توجد مفاتيح مضافة بعد.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'codes' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="font-bold text-slate-800 dark:text-white">أكواد التفعيل (250 توليدة)</h2>
              <button onClick={handleGenerateCode} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <RefreshCw size={16} /> توليد كود جديد
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right text-slate-600 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-3">الكود</th>
                    <th className="px-6 py-3">عدد التوليدات</th>
                    <th className="px-6 py-3">الحالة</th>
                    <th className="px-6 py-3">مستعمل بواسطة</th>
                    <th className="px-6 py-3">تاريخ التوليد</th>
                    <th className="px-6 py-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map(code => (
                    <tr key={code.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                        <div className="flex items-center gap-2">
                          <span>{code.code}</span>
                          <button onClick={() => {
                            navigator.clipboard.writeText(code.code);
                            alert('تم نسخ الكود!');
                          }} className="text-slate-400 hover:text-indigo-500" title="نسخ الكود">
                            <Copy size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-emerald-600 font-bold">+{code.generations}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${code.isUsed ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                          {code.isUsed ? 'مستعمل' : 'متاح'}
                        </span>
                      </td>
                      <td className="px-6 py-4">{code.usedBy || '-'}</td>
                      <td className="px-6 py-4">{code.createdAt?.toDate ? code.createdAt.toDate().toLocaleDateString('ar-DZ') : ''}</td>
                      <td className="px-6 py-4 flex justify-center gap-2">
                        <button onClick={() => handleDeleteCode(code.id)} className="text-slate-400 hover:text-red-500" title="حذف">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {codes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">لم يتم توليد أي كود بعد.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 max-w-2xl">
            <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">إعدادات الحساب</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">تغيير صورة البروفايل</label>
              <input type="file" onChange={handleImageUpload} accept="image/*" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-400" />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">تغيير كلمة السر</label>
              <div className="flex gap-4">
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="كلمة السر الجديدة" className="flex-1 p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                <button onClick={handleChangePassword} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">تحديث</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
