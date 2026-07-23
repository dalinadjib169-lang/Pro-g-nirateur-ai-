import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  projectId: "gen-lang-client-0979365555",
  appId: "1:382616983995:web:e9731b2c4ae19f5c9c4c9e",
  apiKey: "AIzaSyD8uAxueM2WAzAojdgkAsz5_9RjPND2dis",
  authDomain: "gen-lang-client-0979365555.firebaseapp.com",
  storageBucket: "gen-lang-client-0979365555.firebasestorage.app",
  messagingSenderId: "382616983995",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, "ai-studio-d43b3ba5-e913-4101-8012-f9c30198ee36");
export const storage = getStorage(app);
