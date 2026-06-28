import React, { useState } from 'react';
import { useDownloads, DownloadedFile } from '../contexts/DownloadsContext';
import { X, FileText, FileBadge, Trash2, Share2, Download, Loader2 } from 'lucide-react';

interface DownloadsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadsModal({ isOpen, onClose }: DownloadsModalProps) {
  const { files, deleteFile, markAsRead } = useDownloads();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      markAsRead();
    }
  }, [isOpen, markAsRead]);

  if (!isOpen) return null;

  const handleOpenOrShare = async (file: DownloadedFile) => {
    try {
      setDownloadingId(file.id);

      // 1. First attempt: Native Web Share API (Works smoothly on many modern mobile browsers)
      if (navigator.share && navigator.canShare) {
        const shareFile = new File([file.blob], file.name, { 
          type: file.type === 'pdf' ? 'application/pdf' : 'application/msword' 
        });
        
        if (navigator.canShare({ files: [shareFile] })) {
          try {
            await navigator.share({
              files: [shareFile],
              title: file.name,
            });
            setDownloadingId(null);
            return; // Success via native share!
          } catch (shareError: any) {
            if (shareError.name !== 'AbortError') {
              console.log("Native share failed, falling back...", shareError);
            } else {
               setDownloadingId(null);
               return; // User cancelled
            }
          }
        }
      }

      // 2. Fallback for AppCreator24 / Standard Browsers now that downloads are enabled
      // Convert blob to base64 Data URI which is highly compatible with WebViews
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const a = document.createElement('a');
        a.href = base64data; // Use base64 Data URI
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDownloadingId(null);
      };
      reader.onerror = () => {
        // Ultimate fallback to Blob URL if FileReader fails
        const objectUrl = URL.createObjectURL(file.blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        setDownloadingId(null);
      };
      reader.readAsDataURL(file.blob);
      
    } catch (error) {
      console.error("Error in download process:", error);
      alert("حدث خطأ أثناء تحميل الملف.");
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
                      onClick={() => handleOpenOrShare(file)}
                      disabled={downloadingId === file.id}
                      className="p-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center min-w-[36px]"
                      title="تنزيل / مشاركة"
                    >
                      {downloadingId === file.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Download size={18} />
                      )}
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
    </div>
  );
}

