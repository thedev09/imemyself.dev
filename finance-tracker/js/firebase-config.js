// firebase-config.js
document.addEventListener('DOMContentLoaded', function() {
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
      
      // Initialize Firestore with settings
      const db = firebase.firestore();
      
      // Enable offline persistence
      db.enablePersistence()
          .catch((err) => {
              if (err.code == 'failed-precondition') {
                  console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
              } else if (err.code == 'unimplemented') {
                  console.warn('The current browser does not support persistence.');
              }
          });

      window.db = db;
  }
});