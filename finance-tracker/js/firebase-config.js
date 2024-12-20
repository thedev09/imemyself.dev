// Firebase configuration and initialization with error handling
try {
  if (!window.firebase) {
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
  }

  // Initialize Firestore with enhanced settings
  const db = firebase.firestore();
  
  // Enable offline persistence
  db.settings({
      cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
  });
  
  db.enablePersistence()
      .catch((err) => {
          if (err.code === 'failed-precondition') {
              console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
          } else if (err.code === 'unimplemented') {
              console.warn('The current browser does not support persistence.');
          }
      });

  // Make db available globally
  window.db = db;
} catch (error) {
  console.error('Error initializing Firebase:', error);
  alert('Error initializing application. Please refresh the page.');
}

// Helper functions for common Firebase operations
const FirebaseService = {
  // Create or update document
  async setDocument(collection, docId, data) {
      try {
          const docRef = db.collection(collection).doc(docId);
          await docRef.set(data, { merge: true });
          return { success: true, docId };
      } catch (error) {
          console.error('Error setting document:', error);
          throw error;
      }
  },

  // Get document by ID
  async getDocument(collection, docId) {
      try {
          const doc = await db.collection(collection).doc(docId).get();
          return doc.exists ? { id: doc.id, ...doc.data() } : null;
      } catch (error) {
          console.error('Error getting document:', error);
          throw error;
      }
  },

  // Delete document
  async deleteDocument(collection, docId) {
      try {
          await db.collection(collection).doc(docId).delete();
          return { success: true };
      } catch (error) {
          console.error('Error deleting document:', error);
          throw error;
      }
  },

  // Get collection with query
  async getCollection(collection, queryFn = null) {
      try {
          let query = db.collection(collection);
          if (queryFn) {
              query = queryFn(query);
          }
          const snapshot = await query.get();
          return snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
          }));
      } catch (error) {
          console.error('Error getting collection:', error);
          throw error;
      }
  }
};

// Export FirebaseService for use in other files
window.FirebaseService = FirebaseService;