import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Search, Send, Image as ImageIcon, User, Sparkles, MapPin, GraduationCap, BookOpen, Clock, Settings, ImagePlus, UserPlus, Check, UserMinus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, orderBy, setDoc, getDoc, updateDoc, where } from 'firebase/firestore';
import { profileModalEmitter, expertChatEmitter } from '../App';
import { uploadImage } from '../lib/cloudinary';

interface Teacher {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePic?: string;
  state?: string;
  wilaya?: string;
  phase?: string;
  subject?: string;
  isOnline?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  createdAt: any;
}

interface ChatSession {
  id: string;
  user1Id: string;
  user2Id: string;
  status: 'pending' | 'accepted' | 'rejected';
  initiatorId: string;
}

export const TeachersRoom: React.FC = () => {
  const { userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChat, setActiveChat] = useState<Teacher | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roomBanner, setRoomBanner] = useState<string | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const constraintsRef = useRef(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Helper to get consistent chat ID
  const getChatId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  // Fetch banner
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
      const url = await uploadImage(file);
      await setDoc(doc(db, 'settings', 'general'), { roomBanner: url }, { merge: true });
    } catch (err) {
      console.error(err);
      alert('فشل رفع صورة القاعة');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // Fetch teachers list and chat sessions
  useEffect(() => {
    if (!isOpen || !userData) return;

    // Fetch Users
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (querySnapshot) => {
      const fetchedTeachers: Teacher[] = [];
      querySnapshot.forEach((docSnap) => {
        if (docSnap.id !== userData.uid) {
          fetchedTeachers.push({ uid: docSnap.id, ...docSnap.data() } as Teacher);
        }
      });

      // Developer mock user
      if (!fetchedTeachers.find(t => t.email === 'dalinadjib1990@gmail.com')) {
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

      setTeachers(fetchedTeachers);
    });

    // Fetch Sessions (both where user is user1 or user2)
    // Firestore OR queries are possible but we can just subscribe to all sessions involving user
    const qSessions1 = query(collection(db, 'chat_sessions'), where('user1Id', '==', userData.uid));
    const unsubSessions1 = onSnapshot(qSessions1, handleSessionsSnapshot);
    const qSessions2 = query(collection(db, 'chat_sessions'), where('user2Id', '==', userData.uid));
    const unsubSessions2 = onSnapshot(qSessions2, handleSessionsSnapshot);

    const activeSessions: Record<string, ChatSession> = {};
    function handleSessionsSnapshot(snapshot: any) {
      snapshot.forEach((docSnap: any) => {
        activeSessions[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as ChatSession;
      });
      setChatSessions(Object.values(activeSessions));
    }

    return () => { unsubUsers(); unsubSessions1(); unsubSessions2(); };
  }, [isOpen, userData]);

  // Fetch messages for active chat
  useEffect(() => {
    if (!activeChat || !userData) {
      setMessages([]);
      return;
    }

    const chatId = getChatId(userData.uid, activeChat.uid);
    const messagesRef = collection(db, 'chat_sessions', chatId, 'messages');
    const qMsg = query(messagesRef, orderBy('createdAt', 'asc'));
    
    const unsubMessages = onSnapshot(qMsg, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach(docSnap => msgs.push({ id: docSnap.id, ...docSnap.data() } as Message));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    
    return () => unsubMessages();
  }, [activeChat, userData]);

  const sendFriendRequest = async (teacherUid: string) => {
    if (!userData) return;
    const chatId = getChatId(userData.uid, teacherUid);
    await setDoc(doc(db, 'chat_sessions', chatId), {
      user1Id: userData.uid,
      user2Id: teacherUid,
      status: 'pending',
      initiatorId: userData.uid,
      updatedAt: serverTimestamp()
    });
  };

  const acceptFriendRequest = async (chatId: string) => {
    await updateDoc(doc(db, 'chat_sessions', chatId), {
      status: 'accepted',
      updatedAt: serverTimestamp()
    });
  };

  const rejectFriendRequest = async (chatId: string) => {
    await updateDoc(doc(db, 'chat_sessions', chatId), {
      status: 'rejected',
      updatedAt: serverTimestamp()
    });
  };

  const getSessionForTeacher = (teacherUid: string) => {
    if (!userData) return null;
    const chatId = getChatId(userData.uid, teacherUid);
    return chatSessions.find(s => s.id === chatId);
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !activeChat || !userData) return;

    const msgText = newMessage;
    setNewMessage('');
    
    const chatId = getChatId(userData.uid, activeChat.uid);
    await addDoc(collection(db, 'chat_sessions', chatId, 'messages'), {
      senderId: userData.uid,
      text: msgText,
      createdAt: serverTimestamp()
    });

    // Auto-reply from developer
    if (activeChat.email === 'dalinadjib1990@gmail.com') {
      setTimeout(async () => {
        await addDoc(collection(db, 'chat_sessions', chatId, 'messages'), {
          senderId: activeChat.uid,
          text: 'سوف يتواصل معك الأستاذ المطور dali nadjib رقم الهاتف 0771167330 و ذلك لإرسال كود تفعيل الوضع الاحترافي',
          createdAt: serverTimestamp()
        });
      }, 1000);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat || !userData) return;

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const url = await uploadImage(file, setUploadProgress);
      const chatId = getChatId(userData.uid, activeChat.uid);
      await addDoc(collection(db, 'chat_sessions', chatId, 'messages'), {
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

  const filteredTeachers = teachers.filter(t => 
    `${t.firstName} ${t.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!userData) return null;

  return (
    <>
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[90]" />
      
      <motion.div
        drag
        dragConstraints={constraintsRef}
        className="fixed bottom-6 left-6 z-[100] cursor-grab active:cursor-grabbing pointer-events-auto"
      >
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-fuchsia-500 via-cyan-500 to-amber-500 rounded-full blur opacity-70 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
          
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 border-2 border-white/20 shadow-2xl overflow-hidden"
            title="قاعة الأساتذة"
          >
            <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=200&auto=format&fit=crop" alt="قاعة الأساتذة" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex items-center justify-between shadow-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-white overflow-hidden">
                  {userData.profilePic ? (
                    <img src={userData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-full h-full p-2 text-indigo-300" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{userData.firstName} {userData.lastName}</h3>
                  <div className="text-[10px] text-indigo-100 mt-1">تواصل مع زملائك الأساتذة</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => profileModalEmitter.dispatchEvent(new Event('open'))} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                  <Settings size={18} />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
              {!activeChat ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                  {/* Banner */}
                  <div className="mb-4 relative rounded-xl overflow-hidden shadow-sm h-32 group border border-slate-200 dark:border-slate-700">
                    <img 
                      src={roomBanner || "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800&auto=format&fit=crop"} 
                      alt="تجمع الأساتذة" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-3 right-3 text-white font-bold text-sm">قاعة الأساتذة العامة</div>
                    
                    {(userData?.email === 'dalinadjib1990@gmail.com' || userData?.role === 'admin') && (
                      <>
                        <input type="file" ref={bannerInputRef} onChange={handleBannerUpload} className="hidden" accept="image/*" />
                        <button 
                          onClick={() => bannerInputRef.current?.click()}
                          disabled={isUploadingBanner}
                          className="absolute top-2 left-2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs"
                        >
                          <ImagePlus size={14} />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="mb-4 relative">
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث عن أستاذ..." 
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-10 pl-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Search size={16} className="absolute right-3 top-2.5 text-slate-400" />
                  </div>

                  <div className="mb-4">
                    <button 
                      onClick={() => expertChatEmitter.dispatchEvent(new Event('open'))}
                      className="w-full flex items-center gap-3 p-3 bg-gradient-to-l from-amber-500/10 to-yellow-600/10 hover:from-amber-500/20 rounded-xl border border-amber-500/30 transition-all text-right group"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500 shadow-lg bg-slate-800 flex-shrink-0">
                         <img src={userData?.expertAvatar || localStorage.getItem('expertAvatar') || "/icon.png"} alt="الخبير" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h5 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1">
                          الخبير التربوي دالي <Sparkles size={12} className="text-amber-500" />
                        </h5>
                        <p className="text-xs text-slate-500 truncate">ذكاء اصطناعي خبير في البيداغوجيا</p>
                      </div>
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-slate-500 mb-3 px-1">الأساتذة المتاحين</h4>
                  
                  <div className="space-y-2">
                    {filteredTeachers.map(teacher => {
                      const session = getSessionForTeacher(teacher.uid);
                      const isDeveloper = teacher.email === 'dalinadjib1990@gmail.com';
                      const isAdmin = userData?.email === 'dalinadjib1990@gmail.com';
                      
                      return (
                        <div 
                          key={teacher.uid}
                          className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 transition-all"
                        >
                          <div className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer" onClick={() => {
                            if (session?.status === 'accepted' || isDeveloper || isAdmin) {
                              setActiveChat(teacher);
                            }
                          }}>
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-100 flex-shrink-0 relative">
                              {teacher.profilePic ? (
                                <img src={teacher.profilePic} alt={teacher.firstName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-400"><User size={20} /></div>
                              )}
                              {teacher.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>}
                            </div>
                            <div className="flex-1 overflow-hidden text-right">
                              <h5 className="font-bold text-sm text-slate-800 dark:text-white truncate">
                                {teacher.firstName} {teacher.lastName}
                                {isDeveloper && <span className="text-amber-500 mr-1" title="المطور">⭐</span>}
                              </h5>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                {(teacher.state || teacher.wilaya) && <span className="bg-slate-100 px-1.5 rounded">{teacher.state || teacher.wilaya}</span>}
                                {teacher.phase && <span className="bg-slate-100 px-1.5 rounded">{teacher.phase}</span>}
                              </div>
                            </div>
                          </div>
                          
                          {/* Connection Actions */}
                          <div className="flex-shrink-0 flex items-center gap-2 pr-2 border-r border-slate-100 dark:border-slate-700">
                            {isDeveloper || isAdmin ? (
                               <button 
                                onClick={() => setActiveChat(teacher)}
                                className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center hover:bg-indigo-200 transition-colors"
                              >
                                <MessageCircle size={16} />
                              </button>
                            ) : !session ? (
                              <button 
                                onClick={() => sendFriendRequest(teacher.uid)}
                                className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1"
                              >
                                <UserPlus size={14} /> إضافة
                              </button>
                            ) : session.status === 'pending' ? (
                              session.initiatorId === userData.uid ? (
                                <span className="text-[10px] bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg font-medium">
                                  قيد الانتظار
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => acceptFriendRequest(session.id)} className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200">
                                    <Check size={14} />
                                  </button>
                                  <button onClick={() => rejectFriendRequest(session.id)} className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200">
                                    <X size={14} />
                                  </button>
                                </div>
                              )
                            ) : session.status === 'accepted' ? (
                              <button 
                                onClick={() => setActiveChat(teacher)}
                                className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center hover:bg-indigo-200 transition-colors"
                              >
                                <MessageCircle size={16} />
                              </button>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg font-medium">
                                مرفوض
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {filteredTeachers.length === 0 && (
                      <div className="text-center py-10 text-slate-500 text-sm">لا يوجد أساتذة متاحين.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900">
                  <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-800">
                    <button onClick={() => setActiveChat(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500">
                      <span className="text-lg">➔</span>
                    </button>
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200">
                      {activeChat.profilePic ? (
                        <img src={activeChat.profilePic} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-full h-full p-1.5 text-indigo-500 bg-indigo-50" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white">{activeChat.firstName} {activeChat.lastName}</h4>
                      <p className="text-[10px] text-emerald-500">متصل الآن</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
                    {messages.map(msg => {
                      const isMe = msg.senderId === userData.uid;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-tl-none border border-slate-200 dark:border-slate-700'}`}>
                            {msg.imageUrl && (
                              <a href={msg.imageUrl} target="_blank" rel="noreferrer">
                                <img src={msg.imageUrl} alt="Attachment" className="rounded-xl mb-2 max-w-full h-auto cursor-pointer" />
                              </a>
                            )}
                            {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                            <div className={`text-[9px] mt-1 flex justify-end ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                              {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {messages.length === 0 && (
                       <div className="text-center py-10 text-slate-400 text-sm">
                         بداية المحادثة مع الأستاذ {activeChat.firstName}
                       </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    {isUploading && (
                      <div className="mb-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-500 h-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    )}
                    <form onSubmit={sendMessage} className="flex items-end gap-2">
                      <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center p-1 focus-within:border-indigo-500">
                        <textarea 
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                          placeholder="اكتب رسالتك..."
                          className="flex-1 bg-transparent border-none text-sm p-2 outline-none resize-none min-h-[40px] max-h-[100px] text-slate-800 dark:text-white"
                          rows={1}
                        />
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors">
                          <ImageIcon size={20} />
                        </button>
                      </div>
                      <button 
                        type="submit" 
                        disabled={!newMessage.trim() || isUploading}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 flex-shrink-0"
                      >
                        <Send size={18} className="rtl:rotate-180" />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

