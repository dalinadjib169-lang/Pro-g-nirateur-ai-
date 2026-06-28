import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth, UserData } from '../contexts/AuthContext';
import { Users, Key, Settings, BarChart3, Search, Trash2, Power, Edit } from 'lucide-react';
import { updatePassword } from 'firebase/auth';

export default function AdminDashboard() {
  const { userData } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'keys' | 'codes' | 'settings'>('users');
  
  // Settings state
  const [profilePic, setProfilePic] = useState(userData?.profilePic || '');
  const [newPassword, setNewPassword] = useState('');

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

  useEffect(() => {
    fetchUsers();
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

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default'); // Needs proper preset if configured, or just signature

    // Cloudinary upload
    try {
      const response = await fetch('https://api.cloudinary.com/v1_1/doaxziqm7/image/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if(data.secure_url) {
        setProfilePic(data.secure_url);
        if(userData?.uid) {
          await updateDoc(doc(db, 'users', userData.uid), {
            profilePic: data.secure_url
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

  // Stats
  const totalUsers = users.length;
  const totalGenerations = users.reduce((acc, user) => acc + (user.totalGenerations || 0), 0);
  const activeSubscribers = users.filter(u => u.generationsRemaining > 30).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-64 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <div className="mb-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-slate-200 overflow-hidden mb-3">
            {profilePic ? (
              <img src={profilePic} alt="Admin" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">👤</div>
            )}
          </div>
          <h2 className="font-bold text-slate-800 dark:text-white">{userData?.firstName} {userData?.lastName}</h2>
          <p className="text-xs text-slate-500">لوحة تحكم المسؤول</p>
        </div>

        <nav className="space-y-2">
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <Users size={18} /> المستخدمين
          </button>
          <button onClick={() => setActiveTab('keys')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'keys' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <Key size={18} /> مفاتيح التوليد
          </button>
          <button onClick={() => setActiveTab('codes')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'codes' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <BarChart3 size={18} /> أكواد التفعيل
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <Settings size={18} /> الإعدادات
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="mr-64 p-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-8">لوحة تحكم Pro Générateur AI</h1>
        
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">إجمالي المستخدمين</h3>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{totalUsers}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">إجمالي التوليدات</h3>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{totalGenerations}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">المشتركين (باقة مدفوعة)</h3>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{activeSubscribers}</p>
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
