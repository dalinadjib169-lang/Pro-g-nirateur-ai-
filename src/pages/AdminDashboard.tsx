import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth, UserData } from '../contexts/AuthContext';
import { Settings, BarChart3, Trash2, Edit, Plus, RefreshCw, Home, User, Lock, KeyRound, Copy, CheckCircle2, Users, Key, Power, Search, ImageMinus } from 'lucide-react';
import { updatePassword, updateEmail } from 'firebase/auth';
import { uploadImage } from '../lib/cloudinary';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'keys' | 'codes' | 'settings'>('users');
  
  // Settings state
  const [profilePic, setProfilePic] = useState(userData?.profilePic || '');
  const [firstName, setFirstName] = useState(userData?.firstName || '');
  const [lastName, setLastName] = useState(userData?.lastName || '');
  const [email, setEmail] = useState(userData?.email || '');
  const [newPassword, setNewPassword] = useState('');
  
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [codes, setCodes] = useState<any[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [keys, setKeys] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData: UserData[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ uid: doc.id, ...doc.data() } as UserData);
      });
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
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
    fetchUsers();
    fetchKeys();
    fetchCodes();
  }, []);

  useEffect(() => {
    if (userData) {
      setProfilePic(userData.profilePic || '');
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      setEmail(userData.email || '');
    }
  }, [userData]);

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

  const handleRemoveProfilePic = async () => {
    try {
      setProfilePic('');
      if(userData?.uid) {
        await updateDoc(doc(db, 'users', userData.uid), {
          profilePic: ''
        });
      }
    } catch (error) {
      console.error('Remove pic error:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      if(userData?.uid) {
        await updateDoc(doc(db, 'users', userData.uid), {
          firstName,
          lastName,
          email
        });
      }
      
      if(newPassword && auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setNewPassword('');
      }
      
      alert('تم حفظ الإعدادات الشخصية بنجاح');
    } catch (error) {
      console.error('Profile update error:', error);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    }
  };

  const handleGenerateCode = async () => {
    const inputCode = window.prompt('أدخل كود التفعيل المخصص (أو اتركه فارغاً لتوليد كود عشوائي):');
    if (inputCode === null) return; // User cancelled the prompt

    try {
      const code = inputCode.trim() !== '' 
        ? inputCode.replace(/\s+/g, '').toUpperCase() 
        : Math.random().toString(36).substring(2, 14).toUpperCase();
      
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

  // User Handlers
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

  const handleActivateUserWithCode = async (uid: string, codeStr: string) => {
    const code = codeStr.replace(/\s+/g, '').toUpperCase();
    if(!code) return;
    
    try {
      const q = query(collection(db, 'activation_codes'), where('code', '==', code));
      const querySnapshot = await getDocs(q);
      
      if(querySnapshot.empty) {
        alert('الكود غير صالح.');
        return;
      }
      
      const codeDoc = querySnapshot.docs[0];
      if(codeDoc.data().isUsed) {
        alert('تم استخدام هذا الكود من قبل.');
        return;
      }
      
      const generationsToAdd = codeDoc.data().generations || 250;
      
      // Mark code as used
      await updateDoc(doc(db, 'activation_codes', codeDoc.id), {
        isUsed: true,
        usedBy: uid,
        usedAt: new Date()
      });
      
      // Add generations to user and set isActive to true
      await updateDoc(doc(db, 'users', uid), {
        generationsRemaining: increment(generationsToAdd),
        isActive: true
      });
      
      alert(`تم تفعيل حساب المستخدم بنجاح! تم إضافة ${generationsToAdd} توليدة.`);
      fetchUsers();
      fetchCodes();
      
    } catch (error: any) {
      console.error('Error redeeming code:', error);
      alert('حدث خطأ أثناء تفعيل الكود.');
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

  // Key Handlers
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

  const filteredUsers = users.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans" dir="rtl">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 flex items-center justify-center border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-wider text-indigo-400">لوحة التحكم</h1>
        </div>
        
        <div className="flex flex-col p-4 flex-1 gap-2">
          <button 
            onClick={() => setActiveTab('users')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Users size={20} />
            <span className="font-medium">إدارة المستخدمين</span>
          </button>

          <button 
            onClick={() => setActiveTab('keys')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'keys' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Key size={20} />
            <span className="font-medium">مفاتيح الـ API</span>
          </button>

          <button 
            onClick={() => setActiveTab('codes')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'codes' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <KeyRound size={20} />
            <span className="font-medium">أكواد التفعيل</span>
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
        <div className="max-w-6xl mx-auto">
          
          {activeTab === 'users' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">إدارة المستخدمين</h2>
                  <p className="text-slate-500">تعديل الأرصدة، وتفعيل أو حذف حسابات المستخدمين.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن مستخدم..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-semibold">المستخدم</th>
                        <th className="px-6 py-4 font-semibold">البريد</th>
                        <th className="px-6 py-4 font-semibold">الرصيد المتبقي</th>
                        <th className="px-6 py-4 font-semibold">إجمالي التوليد</th>
                        <th className="px-6 py-4 font-semibold">الحالة</th>
                        <th className="px-6 py-4 font-semibold text-center">تفعيل بالكود</th>
                        <th className="px-6 py-4 font-semibold text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map(user => (
                        <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-800">{user.firstName} {user.lastName}</td>
                          <td className="px-6 py-4 text-slate-600" dir="ltr" style={{textAlign: 'right'}}>
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {user.email}
                          </td>
                          <td className="px-6 py-4">
                            <input 
                              type="number" 
                              defaultValue={user.generationsRemaining}
                              onBlur={(e) => handleUpdateGenerations(user.uid!, parseInt(e.target.value))}
                              className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </td>
                          <td className="px-6 py-4 text-slate-600">{user.totalGenerations || 0}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {user.isActive ? 'نشط' : 'موقوف'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 justify-center">
                              <input 
                                id={`activation-code-${user.uid}`} 
                                type="text" 
                                placeholder="الكود..." 
                                className="w-24 px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                dir="ltr" 
                              />
                              <button 
                                onClick={() => {
                                  const input = document.getElementById(`activation-code-${user.uid}`) as HTMLInputElement;
                                  if(input && input.value) {
                                    handleActivateUserWithCode(user.uid!, input.value);
                                    input.value = '';
                                  }
                                }} 
                                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                              >
                                تفعيل
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 flex justify-center gap-2">
                            <button onClick={() => handleToggleUserStatus(user.uid!, user.isActive)} className="p-2 text-slate-400 hover:text-amber-500 bg-slate-50 hover:bg-amber-50 rounded-lg transition-colors" title="إيقاف/تفعيل">
                              <Power size={18} />
                            </button>
                            <button onClick={() => handleDeleteUser(user.uid!)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-500">لا يوجد مستخدمين.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'keys' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">مفاتيح الـ API</h2>
                  <p className="text-slate-500">إدارة مفاتيح التشغيل للذكاء الاصطناعي والمزودين.</p>
                </div>
                <button 
                  onClick={handleAddKey} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <Plus size={20} />
                  إضافة مفتاح جديد
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-semibold">المزود</th>
                        <th className="px-6 py-4 font-semibold">المفتاح</th>
                        <th className="px-6 py-4 font-semibold">الحالة</th>
                        <th className="px-6 py-4 font-semibold">تاريخ الإضافة</th>
                        <th className="px-6 py-4 font-semibold text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {keys.map(key => (
                        <tr key={key.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800 uppercase">{key.provider}</td>
                          <td className="px-6 py-4 text-slate-600 font-mono" dir="ltr">{key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${key.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${key.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              {key.isActive ? 'يعمل' : (key.error || 'موقوف')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">{key.createdAt?.toDate ? key.createdAt.toDate().toLocaleDateString('ar-DZ') : ''}</td>
                          <td className="px-6 py-4 flex justify-center gap-2">
                            <button onClick={() => handleToggleKeyStatus(key.id, key.isActive)} className="p-2 text-slate-400 hover:text-amber-500 bg-slate-50 hover:bg-amber-50 rounded-lg transition-colors" title="إيقاف/تفعيل">
                              <Power size={18} />
                            </button>
                            <button onClick={() => handleDeleteKey(key.id)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {keys.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-500">لا توجد مفاتيح مضافة.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'codes' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">أكواد التفعيل</h2>
                  <p className="text-slate-500">قم بتوليد وإدارة أكواد تفعيل الحسابات (كل كود يمنح 250 توليدة).</p>
                </div>
                <button 
                  onClick={handleGenerateCode} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <Plus size={20} />
                  إنشاء كود جديد
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-semibold">الكود (المفتاح)</th>
                        <th className="px-6 py-4 font-semibold">تاريخ التوليد</th>
                        <th className="px-6 py-4 font-semibold">مستعمل بواسطة</th>
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
                          <td className="px-6 py-4 text-slate-500">{code.usedBy || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${code.isUsed ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${code.isUsed ? 'bg-slate-400' : 'bg-emerald-500'}`}></span>
                              {code.isUsed ? 'مستعمل' : 'متاح للاستخدام'}
                            </span>
                          </td>
                          <td className="px-6 py-4 flex justify-center">
                            <button 
                              onClick={() => handleDeleteCode(code.id)} 
                              className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors" 
                              title="حذف الكود"
                            >
                              <Trash2 size={20} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {codes.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
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
                <h2 className="text-3xl font-bold text-slate-800 mb-2">الإعدادات الشخصية</h2>
                <p className="text-slate-500">إدارة معلومات حسابك وصورتك الشخصية وكلمة المرور.</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8">
                
                {/* Profile Picture Section */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-slate-100">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-md flex-shrink-0 relative group">
                    {profilePic ? (
                      <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-300">
                        <User size={40} />
                      </div>
                    )}
                  </div>
                  <div className="text-center sm:text-right flex flex-col items-center sm:items-start gap-2">
                    <h3 className="font-bold text-lg text-slate-800 mb-1">{userData?.firstName} {userData?.lastName}</h3>
                    <div className="flex gap-2">
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-block">
                        تغيير الصورة
                        <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                      </label>
                      {profilePic && (
                        <button onClick={handleRemoveProfilePic} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
                          <ImageMinus size={16} /> حذف
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Personal Info Section */}
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <User size={18} className="text-slate-400" />
                    المعلومات الشخصية
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">الاسم</label>
                      <input 
                        type="text" 
                        value={firstName} 
                        onChange={e => setFirstName(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">اللقب</label>
                      <input 
                        type="text" 
                        value={lastName} 
                        onChange={e => setLastName(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" 
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm text-slate-600 mb-1">البريد الإلكتروني</label>
                      <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" 
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Section */}
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Lock size={18} className="text-slate-400" />
                    كلمة المرور
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      placeholder="كلمة المرور الجديدة (اختياري)" 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={handleUpdateProfile} 
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-sm transition-colors"
                  >
                    حفظ جميع التغييرات
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

