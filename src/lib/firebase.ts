import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAkqsGPlm3rbVXzhbqas7qxDDk060Y3cc4",
  authDomain: "gen-lang-client-0694864679.firebaseapp.com",
  projectId: "gen-lang-client-0694864679",
  storageBucket: "gen-lang-client-0694864679.firebasestorage.app",
  messagingSenderId: "233520604904",
  appId: "1:233520604904:web:eec44d74b8d9b147094b5d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
