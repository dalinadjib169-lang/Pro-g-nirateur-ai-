import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA1Q_FOaIEaQdSDdxX_ov1b4ny_0O39HzU",
  authDomain: "universal-gearbox-45xj8.firebaseapp.com",
  projectId: "universal-gearbox-45xj8",
  storageBucket: "universal-gearbox-45xj8.firebasestorage.app",
  messagingSenderId: "532000019410",
  appId: "1:532000019410:web:92f2f40ee0f11ab0af6e0b"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, "ai-studio-gnrateurpro-efc0cc4b-fcc7-4182-b47c-cf6c999d1213");
export const storage = getStorage(app);
