export const uploadImage = async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
  // Accounts to try in order
  const accounts = [
    { cloudName: 'doaxziqm7', uploadPreset: 'teachers_room' },
    { cloudName: 'doaxziqm7', uploadPreset: 'ml_default' },
    { cloudName: 'dhwnalx80', uploadPreset: 'teachers_room' },
    { cloudName: 'dhwnalx80', uploadPreset: 'ml_default' },
  ];

  let lastError: any = null;

  for (const account of accounts) {
    try {
      const result = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${account.cloudName}/image/upload`);
        
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
            let errorMessage = 'Upload failed';
            try {
              const err = JSON.parse(xhr.responseText);
              errorMessage = err.error?.message || errorMessage;
            } catch (e) {}
            reject(new Error(errorMessage));
          }
        };

        xhr.onerror = () => reject(new Error('Network error (Failed to fetch)'));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', account.uploadPreset);
        xhr.send(formData);
      });

      return result; // If successful, return the URL immediately
    } catch (err) {
      console.warn(`Upload failed for ${account.cloudName} with preset ${account.uploadPreset}:`, err);
      lastError = err;
      // Continue to next account
    }
  }

  throw new Error('فشل رفع الصورة: ' + (lastError?.message || 'Unknown error'));
};
