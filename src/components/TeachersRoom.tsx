import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, where, deleteDoc, doc } from 'firebase/firestore';
import { useAuth, UserData } from '../contexts/AuthContext';
import { Send, Users, User, Clock, Trash2, X, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderProfilePic?: string;
  timestamp: any;
}

export default function TeachersRoom() {
  const { userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to messages
  useEffect(() => {
    if (!userData || !isOpen) return;

    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => scrollToBottom(), 100);
    });

    return () => unsubscribe();
  }, [userData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userData) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'messages'), {
        text: msgText,
        senderId: userData.uid,
        senderName: `${userData.firstName} ${userData.lastName}`,
        senderEmail: userData.email,
        senderProfilePic: userData.profilePic || '',
        timestamp: serverTimestamp(),
      });
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('خطأ في إرسال الرسالة.');
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!userData || (userData.role !== 'admin' && userData.email !== 'dalinadjib1990@gmail.com')) return;
    
    if (window.confirm('هل أنت متأكد من حذف هذه الرسالة؟')) {
      try {
        await deleteDoc(doc(db, 'messages', msgId));
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  const isAdmin = userData?.role === 'admin' || userData?.email === 'dalinadjib1990@gmail.com';

  if (!userData) return null;

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-xl hover:bg-indigo-700 transition-transform hover:scale-110 flex items-center justify-center group"
      >
        <MessageCircle size={24} />
        <span className="absolute left-full ml-4 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
          غرفة الأساتذة
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] sm:h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">غرفة الأساتذة</h2>
                  <p className="text-indigo-100 text-xs">مساحة للنقاش وتبادل الخبرات</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 flex flex-col gap-4 relative">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <MessageCircle size={48} className="mb-4 opacity-50" />
              <p>لا توجد رسائل بعد. كن أول من يرسل رسالة!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === userData?.uid;
              const timeString = msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }) : '';
              
              return (
                <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isMine ? 'self-end flex-row-reverse' : 'self-start'}`}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shrink-0 overflow-hidden bg-slate-200 dark:bg-slate-700">
                    {msg.senderProfilePic ? (
                      <img src={msg.senderProfilePic} alt={msg.senderName} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName || 'U')}&background=random` }} />
                    ) : (
                      <User className="w-full h-full p-2 text-slate-500" />
                    )}
                  </div>
                  
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 px-1">
                      {msg.senderName}
                    </span>
                    <div className={`px-4 py-2.5 rounded-2xl relative group ${
                      isMine 
                        ? 'bg-indigo-600 text-white rounded-tr-sm' 
                        : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white rounded-tl-sm border border-slate-100 dark:border-slate-600'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      
                      <div className={`flex items-center gap-2 mt-1 ${isMine ? 'text-indigo-200 justify-end' : 'text-slate-400 justify-start'}`}>
                        <span className="text-[10px] flex items-center gap-1">
                          <Clock size={10} /> {timeString}
                        </span>
                        
                        {isAdmin && (
                          <button 
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500"
                            title="حذف الرسالة"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[50px]"
            >
              <Send size={20} className="rtl:-scale-x-100" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )}
</>
);
}
