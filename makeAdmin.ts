import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAkqsGPlm3rbVXzhbqas7qxDDk060Y3cc4",
  authDomain: "gen-lang-client-0694864679.firebaseapp.com",
  projectId: "gen-lang-client-0694864679",
  storageBucket: "gen-lang-client-0694864679.firebasestorage.app",
  messagingSenderId: "233520604904",
  appId: "1:233520604904:web:eec44d74b8d9b147094b5d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, "users"));
  snap.forEach(doc => {
    console.log(doc.id, doc.data().email, doc.data().phone);
  });
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
