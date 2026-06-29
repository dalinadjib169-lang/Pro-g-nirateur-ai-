import React, { useState } from 'react';
import { useDownloads, DownloadedFile } from '../contexts/DownloadsContext';
import { X, FileText, FileBadge, Trash2, Share2, Download, Loader2 } from 'lucide-react';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface DownloadsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadsModal({ isOpen, onClose }: DownloadsModalProps) {
  const { files, deleteFile, markAsRead } = useDownloads();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [readyDownload, setReadyDownload] = useState<{url: string, name: string} | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      markAsRead();
    }
  }, [isOpen, markAsRead]);

  if (!isOpen) return null;

  const isAndroidWebView = /Android.*(wv|\.b|Version\/[0-9]|Build\/)/i.test(navigator.userAgent) || /AppCreator24/i.test(navigator.userAgent);

  const getFirebaseUrl = async (file: DownloadedFile) => {
    try {
      const storageRef = ref(storage, `shared_files/${file.id}_${file.name}`);
      await uploadBytes(storageRef, file.blob);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (e) {
      console.error("Firebase upload failed:", e);
      return null;
    }
  };

  const handleDownload = async (file: DownloadedFile) => {
    try {
      setDownloadingId(file.id);

      // In Android WebView, Blob/Data URLs crash or do nothing. 
      // We must provide a real HTTPS URL for the native DownloadManager.
      if (isAndroidWebView) {
        const url = await getFirebaseUrl(file);
        if (url) {
          // Show a UI button for the user to physically click, because auto-clicks 
          // and JS navigation often fail or crash in AppCreator24.
          setReadyDownload({ url, name: file.name });
          setDownloadingId(null);
          return;
        } else {
          // Fallback if Firebase fails
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            setReadyDownload({ url: dataUrl, name: file.name });
            setDownloadingId(null);
          };
          reader.onerror = () => {
            alert("حدث خطأ أثناء قراءة الملف.");
            setDownloadingId(null);
          };
          reader.readAsDataURL(file.blob);
          return;
        }
      }

      // --- Standard Browsers Handling (Download only) ---
      const objectUrl = URL.createObjectURL(file.blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setDownloadingId(null);

    } catch (error) {
      console.error("Error in download process:", error);
      alert("حدث خطأ أثناء تحميل الملف.");
      setDownloadingId(null);
    }
  };

  const handleOpen = async (file: DownloadedFile) => {
    try {
      setDownloadingId(file.id);

      let shareUrl = "";
      if (isAndroidWebView) {
        // We can't share Blobs in WebView, so we upload to get a real URL
        const uploadedUrl = await getFirebaseUrl(file);
        if (uploadedUrl) {
           shareUrl = uploadedUrl;
        } else {
           alert("يرجى تنزيل الملف أولاً، ثم مشاركته من مجلد التنزيلات الخاص بك.");
           setDownloadingId(null);
           return;
        }
      }

      // 1. Try Native Web Share API first
      if (navigator.share && navigator.canShare) {
        try {
          if (isAndroidWebView && shareUrl) {
            // Share the URL directly
            await navigator.share({
              title: file.name,
              url: shareUrl
            });
            setDownloadingId(null);
            return;
          } else {
            // Standard browser: Share the file
            const shareFile = new File([file.blob], file.name, { 
              type: file.type === 'pdf' ? 'application/pdf' : 'application/msword' 
            });
            if (navigator.canShare({ files: [shareFile] })) {
              await navigator.share({
                files: [shareFile],
                title: file.name,
              });
              setDownloadingId(null);
              return; 
            }
          }
        } catch (shareError: any) {
          if (shareError.name !== 'AbortError') {
            console.log("Native share failed, falling back...");
          } else {
             setDownloadingId(null);
             return; 
          }
        }
      }

      if (isAndroidWebView) {
        // If navigator.share fails in WebView and we have a URL, copy it to clipboard
        if (shareUrl) {
          try {
             await navigator.clipboard.writeText(shareUrl);
             alert("تم نسخ رابط الملف! يمكنك الآن لصقه في واتساب أو أي تطبيق آخر.");
          } catch (e) {
             // Fallback if clipboard fails (sometimes denied in webviews)
             alert(`الرابط (انسخه يدوياً):\n\n${shareUrl}`);
          }
        }
        setDownloadingId(null);
        return;
      }

      // 2. Fallback for standard browsers: Open via Blob URL in new tab
      const objectUrl = URL.createObjectURL(file.blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      if (file.type === 'pdf') {
         a.target = "_blank"; // Open in new tab if possible
      } else {
         a.download = file.name; // Word docs usually can't be opened in a new tab natively
      }
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setDownloadingId(null);

    } catch (error) {
      console.error("Error in open process:", error);
      alert("حدث خطأ أثناء فتح الملف.");
      setDownloadingId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('ar-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
      <div className="bg-[#111] border border-amber-900/50 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-amber-900/30 flex justify-between items-center bg-[#1a1a1a] rounded-t-2xl">
          <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
            <Download size={24} />
            التنزيلات
          </h2>
          <button onClick={onClose} className="p-2 text-amber-500/60 hover:text-amber-400 hover:bg-amber-900/20 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          {files.length === 0 ? (
            <div className="text-center text-amber-500/50 py-12 flex flex-col items-center">
              <FileBadge size={48} className="mb-4 opacity-50" />
              <p>لا توجد ملفات محملة بعد.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map(file => (
                <div key={file.id} className="bg-[#1a1a1a] border border-amber-900/30 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-amber-900/20 flex items-center justify-center shrink-0">
                    <FileText size={24} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-amber-100 truncate" dir="ltr">{file.name}</h3>
                    <p className="text-xs text-amber-500/60">{formatDate(file.date)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => handleDownload(file)}
                      disabled={downloadingId === file.id}
                      className="p-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center min-w-[36px]"
                      title="تنزيل"
                    >
                      {downloadingId === file.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Download size={18} />
                      )}
                    </button>
                    <button 
                      onClick={() => handleOpen(file)}
                      disabled={downloadingId === file.id}
                      className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center min-w-[36px]"
                      title="فتح / مشاركة"
                    >
                      <Share2 size={18} />
                    </button>
                    <button 
                      onClick={() => deleteFile(file.id)}
                      className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manual Download Overlay for WebViews */}
      {readyDownload && (
        <div className="absolute inset-0 bg-[#0a0a0a]/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#1a1a1a] border border-amber-900/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download size={32} />
            </div>
            <h3 className="text-xl font-bold text-amber-50 mb-2">الملف جاهز للتنزيل</h3>
            <p className="text-amber-500/80 text-sm mb-6 leading-relaxed">
              انقر على الزر أدناه لتنزيل الملف أو فتحه.
            </p>
            <div className="flex flex-col gap-3">
              <a 
                href={readyDownload.url}
                target="_blank"
                download={readyDownload.name}
                className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                onClick={() => setReadyDownload(null)}
              >
                <Download size={20} />
                تنزيل الآن
              </a>
              <button 
                onClick={() => setReadyDownload(null)}
                className="w-full py-3 bg-transparent border border-amber-900/50 text-amber-500 font-bold rounded-xl hover:bg-amber-900/20 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

