// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBf_xOZGIsrWGUwlatk59lnRZ128HSD_-A",
  authDomain: "hoteldirectoros.firebaseapp.com",
  projectId: "hoteldirectoros",
  storageBucket: "hoteldirectoros.firebasestorage.app",
  messagingSenderId: "64980475345",
  appId: "1:64980475345:web:25e08a9d4368b9c5ad94f0",
  measurementId: "G-H5HR7XR6XW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };
