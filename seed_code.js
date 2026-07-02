import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA1Q_FOaIEaQdSDdxX_ov1b4ny_0O39HzU",
  authDomain: "universal-gearbox-45xj8.firebaseapp.com",
  projectId: "universal-gearbox-45xj8",
  storageBucket: "universal-gearbox-45xj8.firebasestorage.app",
  messagingSenderId: "532000019410",
  appId: "1:532000019410:web:92f2f40ee0f11ab0af6e0b"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-gnrateurpro-efc0cc4b-fcc7-4182-b47c-cf6c999d1213");

async function seed() {
  const code = 'PRO-ADMIN-2024';
  await setDoc(doc(db, 'activation_codes', code), {
    code: code,
    role: 'admin',
    generationsRemaining: 9999,
    createdAt: Date.now(),
    isUsed: false
  });
  console.log('Seeded code:', code);
  process.exit(0);
}
seed().catch(console.error);
