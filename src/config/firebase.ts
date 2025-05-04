import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Although not using Firebase Auth directly, good to have initialized if needed elsewhere

const firebaseConfig = {
  apiKey: "AIzaSyBvfau8ulBuySTVPBcGSY2L6Hge_Kr-uZo",

  authDomain: "airpesa-d5c18.firebaseapp.com",

  databaseURL: "https://airpesa-d5c18-default-rtdb.firebaseio.com",

  projectId: "airpesa-d5c18",

  storageBucket: "airpesa-d5c18.firebasestorage.app",

  messagingSenderId: "416494485070",

  appId: "1:416494485070:web:ef5ef6df8052598b388d1f",

  measurementId: "G-JGPSJQ41TV"

};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app); // Initialize auth instance

export { app, db, auth };
