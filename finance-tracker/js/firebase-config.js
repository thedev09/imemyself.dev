// Wait for Firebase SDK to load
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Firebase only if it hasn't been initialized yet
  if (!firebase.apps.length) {
      const firebaseConfig = {
          apiKey: "AIzaSyARjanzH8bylb2FsQdz60yI2hs8ud-yqwc",
          authDomain: "budget-backend-09.firebaseapp.com",
          projectId: "budget-backend-09",
          storageBucket: "budget-backend-09.firebasestorage.app",
          messagingSenderId: "499758129287",
          appId: "1:499758129287:web:d8764dc451a1e1c6941822",
          measurementId: "G-HBS9QEKQZ8"
      };

      // Initialize Firebase
      firebase.initializeApp(firebaseConfig);
      
      // Initialize Firestore
      const db = firebase.firestore();
      
      // Make db available globally
      window.db = db;
  }
});