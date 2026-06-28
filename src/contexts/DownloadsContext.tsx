import React, { createContext, useContext, useState, useEffect } from 'react';
import localforage from 'localforage';

export interface DownloadedFile {
  id: string;
  name: string;
  type: 'pdf' | 'word';
  blob: Blob;
  date: number;
}

interface DownloadsContextType {
  files: DownloadedFile[];
  addFile: (name: string, type: 'pdf' | 'word', blob: Blob) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  unreadCount: number;
  markAsRead: () => void;
}

const DownloadsContext = createContext<DownloadsContextType | null>(null);

export function DownloadsProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<DownloadedFile[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load files on mount
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const keys = await localforage.keys();
      const loadedFiles: DownloadedFile[] = [];
      
      for (const key of keys) {
        if (key.startsWith('file_')) {
          const file = await localforage.getItem<DownloadedFile>(key);
          if (file) {
            loadedFiles.push(file);
          }
        }
      }
      
      // Sort by date descending
      loadedFiles.sort((a, b) => b.date - a.date);
      setFiles(loadedFiles);
    } catch (error) {
      console.error("Error loading files from localforage:", error);
    }
  };

  const addFile = async (name: string, type: 'pdf' | 'word', blob: Blob) => {
    try {
      const newFile: DownloadedFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        type,
        blob,
        date: Date.now()
      };
      
      await localforage.setItem(newFile.id, newFile);
      setFiles(prev => [newFile, ...prev]);
      setUnreadCount(prev => prev + 1);
    } catch (error) {
      console.error("Error saving file to localforage:", error);
    }
  };

  const deleteFile = async (id: string) => {
    try {
      await localforage.removeItem(id);
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <DownloadsContext.Provider value={{ files, addFile, deleteFile, unreadCount, markAsRead }}>
      {children}
    </DownloadsContext.Provider>
  );
}

export function useDownloads() {
  const context = useContext(DownloadsContext);
  if (!context) {
    throw new Error('useDownloads must be used within a DownloadsProvider');
  }
  return context;
}
