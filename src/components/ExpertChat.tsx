import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Bot, User, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export const ExpertChat: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { userData } = useAuth();
  
  // Greeting message based on user requirements
  const greetingText = `مرحبا زميلي الأستاذ مع الخبير التربوي دالي. وحد الله وصلّ على محمد، وسيجيبك الأستاذ دالي نجيب على كل أسئلتك التربوية والبيداغوجية وكل ما يخص مسارك المهني.`;
  
  const [messages, setMessages] = useState<Message[]>([
    { id: 'greeting', role: 'model', content: greetingText }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if user is pro, admin, or developer
  const isPro = userData && (userData.role === 'admin' || userData.email === 'dalinadjib1990@gmail.com' || userData.isPro);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || !isPro) return;

    const userMessage = input.trim();
    setInput('');
    
    const newMessages: Message[] = [
      ...messages,
      { id: Date.now().toString(), role: 'user', content: userMessage }
    ];
    
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Exclude greeting id and map to what API expects
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      
      const response = await fetch('/api/expert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages })
      });

      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'model', content: data.content }
      ]);
    } catch (error) {
      console.error("Error communicating with Expert API:", error);
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'model', content: 'عذراً، حدث خطأ في الاتصال بالخبير التربوي. يرجى المحاولة مرة أخرى.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-24 right-6 z-[100] w-[380px] max-w-[calc(100vw-48px)] h-[550px] max-h-[calc(100vh-120px)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-900/50 flex flex-col overflow-hidden"
          dir="rtl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-yellow-600 p-4 text-white flex items-center justify-between shadow-md relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-10"></div>
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-300 to-amber-300 rounded-full blur-sm opacity-80 animate-pulse"></div>
                <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-white relative overflow-hidden flex items-center justify-center">
                  <img src="/icon.png" alt="Expert" className="w-full h-full object-cover" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1">
                  الخبير التربوي <Sparkles size={12} className="text-yellow-200" />
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-amber-100 mt-1 opacity-90">
                  <span>الأستاذ دالي نجيب</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors relative z-10">
              <X size={18} />
            </button>
          </div>

          {!isPro ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-950">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">خاصية للمحترفين فقط</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                هذه الخاصية متاحة فقط في الوضع الاحترافي. يمكنك من خلالها التحدث مع الخبير التربوي دالي نجيب لطرح أسئلتك عن القوانين، الواجبات، البيداغوجيا، الترقيات، وغيرها.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50 dark:bg-slate-950 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] bg-opacity-5">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && (
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 overflow-hidden flex-shrink-0 ml-2 mt-1 border border-amber-200 dark:border-amber-800">
                          <img src="/icon.png" alt="Expert" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div 
                        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                          isUser 
                            ? 'bg-amber-600 text-white rounded-tr-none' 
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-100 dark:border-slate-700 rounded-tl-none'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 overflow-hidden flex-shrink-0 ml-2 mt-1 border border-amber-200 dark:border-amber-800">
                      <img src="/icon.png" alt="Expert" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
                <form onSubmit={handleSend} className="flex items-end gap-2">
                  <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-end p-1 transition-colors focus-within:border-amber-500 dark:focus-within:border-amber-500">
                    <textarea 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="اسأل الخبير التربوي..."
                      className="flex-1 bg-transparent border-none text-sm p-2 outline-none resize-none min-h-[40px] max-h-[120px] text-slate-800 dark:text-white"
                      rows={1}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={!input.trim() || isLoading}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-transform active:scale-95"
                  >
                    <Send size={18} className="rtl:rotate-180" />
                  </button>
                </form>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
