import React from 'react';
import { useDownloads, DownloadedFile } from '../contexts/DownloadsContext';
import { X, FileText, FileBadge, Trash2, Share2, Download } from 'lucide-react';

interface DownloadsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadsModal({ isOpen, onClose }: DownloadsModalProps) {
  const { files, deleteFile, markAsRead } = useDownloads();

  React.useEffect(() => {
    if (isOpen) {
      markAsRead();
    }
  }, [isOpen, markAsRead]);

  if (!isOpen) return null;

  const handleOpenOrShare = async (file: DownloadedFile) => {
    try {
      if (navigator.share) {
        // Try to share the file (works well on Android WebViews for downloading to device)
        const fileObj = new File([file.blob], file.name, { type: file.blob.type });
        await navigator.share({
          files: [fileObj],
          title: file.name,
        });
      } else {
        // Fallback to object URL download
        const url = URL.createObjectURL(file.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      console.error("Error opening or sharing file:", error);
      // If share fails or is aborted, fallback to simple download
      try {
        const url = URL.createObjectURL(file.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (fallbackError) {
        console.error("Fallback download failed:", fallbackError);
      }
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
                      className="p-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors"
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
    </div>
  );
}
