import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Search, Send, Image as ImageIcon, Smile, Check, CheckCheck, Clock, MapPin, BookOpen, GraduationCap, User, Sparkles, Settings, ImagePlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, orderBy, setDoc } from 'firebase/firestore';
import { profileModalEmitter } from '../App';

export const uploadToCloudinary = async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
  const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
  if (!cloudName || !uploadPreset) {
    console.warn("Cloudinary not configured. Falling back to base64.");
    return new Promise((resolve) => {
      if (onProgress) onProgress(50);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (onProgress) onProgress(100);
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.secure_url);
      } else {
        reject(new Error('Upload failed'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    xhr.send(formData);
  });
};

interface Teacher {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePic?: string;
  wilaya?: string;
  phase?: string;
  subject?: string;
  isOnline?: boolean;
}

interface ChatSession {
  id: string;
  user1Id: string;
  user2Id: string;
  status: 'pending' | 'accepted' | 'rejected';
  initiatorId: string;
  updatedAt: any;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  createdAt: any;
}

export const TeachersRoom: React.FC = () => {
  const { userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [activeChat, setActiveChat] = useState<Teacher | null>(null);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [allSessions, setAllSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [roomBanner, setRoomBanner] = useState<string | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Fetch room banner
  useEffect(() => {
    if (!isOpen) return;
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().roomBanner) {
        setRoomBanner(docSnap.data().roomBanner);
      }
    });
    return () => unsub();
  }, [isOpen]);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const response = await fetch('https://api.cloudinary.com/v1_1/doaxziqm7/image/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.secure_url) {
        await setDoc(doc(db, 'settings', 'general'), { roomBanner: data.secure_url }, { merge: true });
      }
    } catch (err) {
      console.error(err);
      alert('فشل رفع صورة القاعة');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // Fetch teachers
  useEffect(() => {
    if (!isOpen || !userData) return;

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedTeachers: Teacher[] = [];
      querySnapshot.forEach((doc) => {
        if (doc.id !== userData.uid) {
          fetchedTeachers.push({ uid: doc.id, ...doc.data() } as Teacher);
        }
      });

      // Add developer if not present, for demo
      const devExists = fetchedTeachers.find(t => t.email === 'dalinadjib1990@gmail.com');
      if (!devExists) {
        fetchedTeachers.push({
          uid: 'dev_dali_nadjib',
          firstName: 'دالي',
          lastName: 'نجيب',
          email: 'dalinadjib1990@gmail.com',
          wilaya: 'الجزائر',
          phase: 'الجميع',
          subject: 'المطور',
          isOnline: true,
          profilePic: '/icon.png'
        });
      }

      // Sorting:
      // 1. Developer first
      // 2. Same wilaya (state)
      // 3. Same phase
      // 4. Same subject
      // 5. Random
      fetchedTeachers.sort((a, b) => {
        if (a.email === 'dalinadjib1990@gmail.com') return -1;
        if (b.email === 'dalinadjib1990@gmail.com') return 1;
        
        let scoreA = 0;
        let scoreB = 0;
        const userState = userData.state || (userData as any).wilaya;
        const aState = (a as any).state || a.wilaya;
        const bState = (b as any).state || b.wilaya;

        if (aState === userState) scoreA += 3;
        if (a.phase === userData.phase) scoreA += 2;
        if (a.subject === (userData as any).subject) scoreA += 1;
        
        if (bState === userState) scoreB += 3;
        if (b.phase === userData.phase) scoreB += 2;
        if (b.subject === (userData as any).subject) scoreB += 1;
        
        if (scoreA !== scoreB) return scoreB - scoreA;
        return Math.random() - 0.5; // Randomize the rest
      });

      setTeachers(fetchedTeachers);
    }, (error) => {
      console.error("Error fetching teachers", error);
    });

    return () => unsubscribe();
  }, [isOpen, userData]);

  // Listen to all chat sessions to show notifications
  useEffect(() => {
    if (!isOpen || !userData) return;
    
    const q1 = query(collection(db, 'chat_sessions'), where('user1Id', '==', userData.uid));
    const q2 = query(collection(db, 'chat_sessions'), where('user2Id', '==', userData.uid));
    
    let sessions1: ChatSession[] = [];
    let sessions2: ChatSession[] = [];

    const updateAllSessions = () => {
      const combined = [...sessions1, ...sessions2];
      // remove duplicates just in case (shouldn't happen but safe)
      const uniqueSessions = combined.filter((s, index, self) => 
        index === self.findIndex((t) => t.id === s.id)
      );
      setAllSessions(uniqueSessions);
    };

    const unsub1 = onSnapshot(q1, (snapshot) => {
      sessions1 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
      updateAllSessions();
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      sessions2 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
      updateAllSessions();
    });
    
    return () => {
      unsub1();
      unsub2();
    };
  }, [isOpen, userData]);

  useEffect(() => {
    if (!activeChat || !userData) {
      setChatSession(null);
      setMessages([]);
      return;
    }

    const session = allSessions.find(s => 
      (s.user1Id === userData.uid && s.user2Id === activeChat.uid) ||
      (s.user1Id === activeChat.uid && s.user2Id === userData.uid)
    );

    if (!session) {
      setChatSession(null);
      setMessages([]);
      return;
    }

    setChatSession(session);

    // Listen to messages
    const messagesRef = collection(db, 'chat_sessions', session.id, 'messages');
    const qMsg = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsubMessages = onSnapshot(qMsg, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    
    return () => unsubMessages();
  }, [activeChat, userData, allSessions]);

  const startChat = async () => {
    if (!userData || !activeChat) return;
    
    // Developer auto-accepts
    const status = activeChat.email === 'dalinadjib1990@gmail.com' ? 'accepted' : 'pending';
    
    const newSession = {
      user1Id: userData.uid,
      user2Id: activeChat.uid,
      status: status,
      initiatorId: userData.uid,
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'chat_sessions'), newSession);
    setChatSession({ id: docRef.id, ...newSession, updatedAt: new Date() } as ChatSession);
    
    if (activeChat.email === 'dalinadjib1990@gmail.com') {
      // Auto reply from developer
      await addDoc(collection(db, 'chat_sessions', docRef.id, 'messages'), {
        chatId: docRef.id,
        senderId: activeChat.uid,
        text: 'سوف يتواصل معك الأستاذ المطور dali nadjib رقم الهاتف 0771167330 و ذلك لإرسال كود تفعيل الوضع الاحترافي',
        createdAt: serverTimestamp()
      });
    }
  };

  const acceptChat = async () => {
    if (!chatSession) return;
    await updateDoc(doc(db, 'chat_sessions', chatSession.id), {
      status: 'accepted',
      updatedAt: serverTimestamp()
    });
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !chatSession || !userData) return;

    const msgText = newMessage;
    setNewMessage('');
    
    await addDoc(collection(db, 'chat_sessions', chatSession.id, 'messages'), {
      chatId: chatSession.id,
      senderId: userData.uid,
      text: msgText,
      createdAt: serverTimestamp()
    });
    
    if (activeChat?.email === 'dalinadjib1990@gmail.com') {
      setTimeout(async () => {
        await addDoc(collection(db, 'chat_sessions', chatSession.id, 'messages'), {
          chatId: chatSession.id,
          senderId: activeChat.uid,
          text: 'سوف يتواصل معك الأستاذ المطور dali nadjib رقم الهاتف 0771167330 و ذلك لإرسال كود تفعيل الوضع الاحترافي',
          createdAt: serverTimestamp()
        });
      }, 1000);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatSession || !userData) return;

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const url = await uploadToCloudinary(file, setUploadProgress);
      await addDoc(collection(db, 'chat_sessions', chatSession.id, 'messages'), {
        chatId: chatSession.id,
        senderId: userData.uid,
        text: '',
        imageUrl: url,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Upload failed", error);
      alert('فشل رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  if (!userData) return null;

  return (
    <>
      <motion.div
        drag
        dragMomentum={false}
        className="fixed bottom-6 left-6 z-[100] cursor-grab active:cursor-grabbing"
      >
        <div className="relative group">
          {/* Neon Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-fuchsia-500 via-cyan-500 to-amber-500 rounded-full blur opacity-70 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
          
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 border-2 border-white/20 shadow-2xl overflow-hidden"
            title="قاعة الأساتذة"
          >
            {userData.profilePic ? (
              <img src={userData.profilePic} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={28} className="text-white" />
            )}
            {/* Overlay Icon */}
            <div className="absolute bottom-0 right-0 bg-indigo-500 rounded-full p-1 border-2 border-slate-900">
              <MessageCircle size={14} className="text-white" />
            </div>
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 left-6 z-[99] w-[380px] max-w-[calc(100vw-48px)] h-[550px] max-h-[calc(100vh-120px)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
            dir="rtl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex items-center justify-between shadow-md z-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full blur-sm opacity-80 animate-pulse"></div>
                  <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-white relative overflow-hidden">
                    {userData.profilePic ? (
                      <img src={userData.profilePic} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-full h-full p-2 text-indigo-300" />
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">{userData.firstName} {userData.lastName}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-indigo-100 mt-1 opacity-90">
                    <span className="flex items-center gap-0.5"><MapPin size={10} /> {(userData as any).state || (userData as any).wilaya || 'الولاية'}</span>
                    <span className="flex items-center gap-0.5"><GraduationCap size={10} /> {userData.phase || 'الطور'}</span>
                    <span className="flex items-center gap-0.5"><BookOpen size={10} /> {userData.subject || 'الاختصاص'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => profileModalEmitter.dispatchEvent(new Event('open'))} className="p-1.5 hover:bg-white/20 rounded-full transition-colors relative z-10" title="تحديث الملف الشخصي">
                  <Settings size={18} />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors relative z-10">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
              {!activeChat ? (
                // Teachers List
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                  {/* Room Banner */}
                  {(roomBanner || (userData?.email === 'dalinadjib1990@gmail.com' || userData?.role === 'admin')) && (
                    <div className="mb-4 relative rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 h-32 group">
                      {roomBanner ? (
                        <img src={roomBanner} alt="تجمع الأساتذة" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-bold">
                          صورة قاعة الأساتذة العامة
                        </div>
                      )}
                      
                      {/* Banner overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-3 right-3 text-white font-bold text-sm">
                        قاعة الأساتذة العامة
                      </div>

                      {(userData?.email === 'dalinadjib1990@gmail.com' || userData?.role === 'admin') && (
                        <>
                          <input type="file" ref={bannerInputRef} onChange={handleBannerUpload} className="hidden" accept="image/*" />
                          <button 
                            onClick={() => bannerInputRef.current?.click()}
                            disabled={isUploadingBanner}
                            className="absolute top-2 left-2 bg-black/40 hover:bg-black/60 backdrop-blur text-white p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs shadow-lg"
                          >
                            {isUploadingBanner ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <ImagePlus size={14} />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="ابحث عن أستاذ..." 
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-10 pl-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <button 
                      onClick={() => {
                        import('../App').then(m => m.expertChatEmitter.dispatchEvent(new Event('open')));
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-gradient-to-l from-amber-500/10 to-yellow-600/10 hover:from-amber-500/20 hover:to-yellow-600/20 rounded-xl border border-amber-500/30 transition-all text-right group"
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500 shadow-lg shadow-amber-500/20 flex items-center justify-center bg-slate-800">
                          {userData?.expertAvatar || localStorage.getItem('expertAvatar') ? (
                            <img src={userData?.expertAvatar || localStorage.getItem('expertAvatar')!} alt="الخبير التربوي" className="w-full h-full object-cover" />
                          ) : (
                            <img src="/icon.png" alt="الخبير التربوي" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 z-10"></div>
                      </div>
                      
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center mb-0.5">
                          <h5 className="font-bold text-sm text-slate-800 dark:text-white truncate flex items-center gap-1">
                            الخبير التربوي دالي <Sparkles size={12} className="text-amber-500" />
                          </h5>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          ذكاء اصطناعي خبير في البيداغوجيا والقوانين
                        </p>
                      </div>
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 px-1 uppercase tracking-wider">الأساتذة المتاحين</h4>
                  
                  <div className="space-y-2">
                    {teachers.map(teacher => {
                      const session = allSessions.find(s => 
                        (s.user1Id === userData?.uid && s.user2Id === teacher.uid) ||
                        (s.user1Id === teacher.uid && s.user2Id === userData?.uid)
                      );
                      const hasPendingRequest = session?.status === 'pending' && session.initiatorId === teacher.uid;
                      const hasActiveChat = session?.status === 'accepted';

                      return (
                      <button 
                        key={teacher.uid}
                        onClick={() => setActiveChat(teacher)}
                        className="w-full flex items-center gap-3 p-3 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl border border-slate-100 dark:border-slate-700/50 transition-all text-right group relative"
                      >
                        {hasPendingRequest && (
                          <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-bounce shadow-sm">
                            طلب جديد
                          </div>
                        )}
                        {hasActiveChat && !hasPendingRequest && (
                          <div className="absolute top-2 left-2 bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                            محادثة نشطة
                          </div>
                        )}
                        <div className="relative">
                          <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${teacher.email === 'dalinadjib1990@gmail.com' ? 'border-amber-500' : 'border-indigo-100 dark:border-indigo-900'}`}>
                            {teacher.profilePic ? (
                              <img src={teacher.profilePic} alt={teacher.firstName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-500">
                                <User size={20} />
                              </div>
                            )}
                          </div>
                          {teacher.isOnline !== false && (
                            <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 overflow-hidden">
                          <div className="flex justify-between items-center mb-0.5">
                            <h5 className="font-bold text-sm text-slate-800 dark:text-white truncate">
                              {teacher.firstName} {teacher.lastName}
                              {teacher.email === 'dalinadjib1990@gmail.com' && <span className="text-amber-500 mr-1" title="المطور">⭐</span>}
                            </h5>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                            {((teacher as any).state || teacher.wilaya) && <span className="bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded flex items-center gap-0.5"><MapPin size={8} /> {(teacher as any).state || teacher.wilaya}</span>}
                            {teacher.phase && <span className="bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded flex items-center gap-0.5"><GraduationCap size={8} /> {teacher.phase}</span>}
                            {teacher.subject && <span className="bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded flex items-center gap-0.5"><BookOpen size={8} /> {teacher.subject}</span>}
                          </div>
                        </div>
                      </button>
                    )})}
                    
                    {teachers.length === 0 && (
                      <div className="text-center py-10 text-slate-500 text-sm">لا يوجد أساتذة متصلين حالياً.</div>
                    )}
                  </div>
                </div>
              ) : (
                // Chat Window
                <div className="flex-1 flex flex-col h-full">
                  <div className="p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    <button onClick={() => { setActiveChat(null); setChatSession(null); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500">
                      <span className="text-lg">➔</span>
                    </button>
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 overflow-hidden">
                      {activeChat.profilePic ? (
                        <img src={activeChat.profilePic} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="w-full h-full p-1.5 text-indigo-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white">{activeChat.firstName} {activeChat.lastName}</h4>
                      <p className="text-[10px] text-emerald-500">متصل الآن</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
                    {!chatSession ? (
                      <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-500 mb-4">
                          <MessageCircle size={32} />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white mb-2">تواصل مع {activeChat.firstName}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">يجب إرسال دعوة محادثة أولاً لبدء النقاش وتبادل الخبرات.</p>
                        <button 
                          onClick={startChat}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 transition-transform active:scale-95"
                        >
                          إرسال دعوة للمحادثة
                        </button>
                      </div>
                    ) : chatSession.status === 'pending' ? (
                      <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        {chatSession.initiatorId === userData.uid ? (
                          <>
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center text-amber-500 mb-4 animate-pulse">
                              <Clock size={24} />
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-white mb-2">في انتظار القبول...</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">لقد تم إرسال دعوة المحادثة إلى {activeChat.firstName} بنجاح.</p>
                          </>
                        ) : (
                          <>
                            <h3 className="font-bold text-slate-800 dark:text-white mb-2">دعوة محادثة جديدة</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">يريد {activeChat.firstName} التواصل معك.</p>
                            <button 
                              onClick={acceptChat}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/30 transition-transform active:scale-95"
                            >
                              قبول الدعوة
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        {messages.map(msg => {
                          const isMe = msg.senderId === userData.uid;
                          return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-100 dark:border-slate-700 rounded-tl-none shadow-sm'}`}>
                                {msg.imageUrl && (
                                  <a href={msg.imageUrl} target="_blank" rel="noreferrer">
                                    <img src={msg.imageUrl} alt="Attachment" className="rounded-xl mb-2 max-w-full h-auto cursor-pointer" />
                                  </a>
                                )}
                                {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                                <div className={`text-[9px] mt-1 flex items-center gap-1 ${isMe ? 'text-indigo-200 justify-end' : 'text-slate-400 justify-start'}`}>
                                  {msg.createdAt?.toDate().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                                  {isMe && <CheckCheck size={10} />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>
                  
                  {chatSession?.status === 'accepted' && (
                    <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                      {isUploading && (
                        <div className="mb-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-indigo-500 h-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      )}
                      <form onSubmit={sendMessage} className="flex items-end gap-2">
                        <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-end p-1 transition-colors focus-within:border-indigo-500 dark:focus-within:border-indigo-500">
                          <button type="button" className="p-2 text-slate-400 hover:text-amber-500 transition-colors">
                            <Smile size={20} />
                          </button>
                          <textarea 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder="اكتب رسالتك هنا..."
                            className="flex-1 bg-transparent border-none text-sm p-2 outline-none resize-none min-h-[40px] max-h-[100px] text-slate-800 dark:text-white"
                            rows={1}
                          />
                          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors" title="إرفاق صورة">
                            <ImageIcon size={20} />
                          </button>
                        </div>
                        <button 
                          type="submit" 
                          disabled={!newMessage.trim() || isUploading}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-transform active:scale-95"
                        >
                          <Send size={18} className="rtl:rotate-180" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
