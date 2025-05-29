// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Your Firebase config (replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyCVBaG6P3S9MwqP_vzu53NIWEo_DiQ_Tm8",
  authDomain: "propone09.firebaseapp.com",
  projectId: "propone09",
  storageBucket: "propone09.firebasestorage.app",
  messagingSenderId: "1049069221043",
  appId: "1:1049069221043:web:c3037f3b4a77cb8658ecc6",
  measurementId: "G-Z97SFGQ0GG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);