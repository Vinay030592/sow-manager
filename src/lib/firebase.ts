import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAy9fceWLYCKtenDxSSeiwLWwqcuY0nnSA",
  authDomain: "sow-manager-2026.firebaseapp.com",
  projectId: "sow-manager-2026",
  storageBucket: "sow-manager-2026.firebasestorage.app",
  messagingSenderId: "664589839509",
  appId: "1:664589839509:web:7507ceffe972cb2e153f9c"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
