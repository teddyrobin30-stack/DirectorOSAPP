import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBf_xOZGIsrWGUwlatk59lnRZ128HSD_-A",
  authDomain: "hoteldirectoros.firebaseapp.com",
  projectId: "hoteldirectoros",
  storageBucket: "hoteldirectoros.firebasestorage.app",
  messagingSenderId: "64980475345",
  appId: "1:64980475345:web:25e08a9d4368b9c5ad94f0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;