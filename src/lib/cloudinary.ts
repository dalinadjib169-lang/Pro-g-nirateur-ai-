import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

const compressImage = (file: File, maxWidth = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Compress with quality 0.7
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

export const uploadImage = async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
  try {
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storageRef = ref(storage, `uploads/${filename}`);
    
    return await new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        async (error) => {
          console.error('Firebase storage error:', error);
          // Fallback to base64 compression if Firebase fails
          try {
            const base64 = await compressImage(file);
            resolve(base64);
          } catch (e) {
            reject(error);
          }
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (err) {
             // Fallback
             try {
               const base64 = await compressImage(file);
               resolve(base64);
             } catch (e) {
               reject(err);
             }
          }
        }
      );
    });
  } catch (error) {
    console.error("Upload failed, trying base64 fallback:", error);
    try {
      return await compressImage(file);
    } catch (e) {
      throw new Error('فشل رفع الصورة. الرجاء المحاولة مرة أخرى.');
    }
  }
};


