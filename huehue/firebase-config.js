// Firebase Configuration - Complete Setup
const firebaseConfig = {
  apiKey: "AIzaSyCVmv46KsUATB3HkzJUKEHQHuGefhJfTMN",
  authDomain: "huehue-signals.firebaseapp.com",
  projectId: "huehue-signals",
  storageBucket: "huehue-signals.firebasestorage.app",
  messagingSenderId: "151713753111",
  appId: "1:151713753111:web:86dd494a47db4f775a9452",
  measurementId: "G-7MGESGNWQ2"
};

// Initialize Firebase with error handling
let app, db, firebaseStorage;

async function initializeFirebase() {
    try {
        console.log('🔥 Initializing Firebase...');
        
        // Import Firebase modules
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Initialize Firebase
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        
        // Create Firebase Storage class
        class FirebaseStorage {
            constructor() {
                this.db = db;
                this.collection = collection;
                this.addDoc = addDoc;
                this.getDocs = getDocs;
                this.query = query;
                this.orderBy = orderBy;
                this.limit = limit;
                this.doc = doc;
                this.setDoc = setDoc;
                this.getDoc = getDoc;
                console.log('🔥 Firebase Storage ready');
            }

            // Save trading signal
            async saveSignal(signal) {
                try {
                    const docRef = await this.addDoc(this.collection(this.db, 'signals'), {
                        ...signal,
                        timestamp: Date.now(),
                        date: new Date().toISOString().split('T')[0],
                        saved_at: new Date().toISOString()
                    });
                    console.log('💾 Signal saved to Firebase:', signal.symbol, signal.action);
                    return docRef.id;
                } catch (error) {
                    console.error('❌ Error saving signal:', error);
                    return null;
                }
            }

            // Get recent signals
            async getSignals(limitCount = 50) {
                try {
                    const q = this.query(
                        this.collection(this.db, 'signals'), 
                        this.orderBy('timestamp', 'desc'), 
                        this.limit(limitCount)
                    );
                    const querySnapshot = await this.getDocs(q);
                    
                    const signals = [];
                    querySnapshot.forEach((doc) => {
                        signals.push({ id: doc.id, ...doc.data() });
                    });
                    
                    console.log(`📊 Retrieved ${signals.length} signals from Firebase`);
                    return signals;
                } catch (error) {
                    console.error('❌ Error getting signals:', error);
                    return [];
                }
            }

            // Save performance data
            async savePerformance(stats) {
                try {
                    const today = new Date().toISOString().split('T')[0];
                    const docRef = await this.setDoc(this.doc(this.db, 'performance', today), {
                        date: today,
                        ...stats,
                        timestamp: Date.now(),
                        updated_at: new Date().toISOString()
                    });
                    console.log('📈 Performance saved to Firebase');
                    return true;
                } catch (error) {
                    console.error('❌ Error saving performance:', error);
                    return false;
                }
            }

            // Get performance data
            async getPerformance(date = null) {
                try {
                    const targetDate = date || new Date().toISOString().split('T')[0];
                    const docRef = this.doc(this.db, 'performance', targetDate);
                    const docSnap = await this.getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        console.log('📊 Performance data retrieved');
                        return docSnap.data();
                    } else {
                        console.log('📊 No performance data found for', targetDate);
                        return null;
                    }
                } catch (error) {
                    console.error('❌ Error getting performance:', error);
                    return null;
                }
            }

            // Save API key securely
            async saveApiKey(apiKey) {
                try {
                    await this.setDoc(this.doc(this.db, 'config', 'api_key'), {
                        value: apiKey,
                        type: 'twelve_data_api_key',
                        timestamp: Date.now(),
                        created_at: new Date().toISOString()
                    });
                    console.log('🔑 API key saved securely to Firebase');
                    return true;
                } catch (error) {
                    console.error('❌ Error saving API key:', error);
                    return false;
                }
            }

            // Get API key securely
            async getApiKey() {
                try {
                    const docRef = this.doc(this.db, 'config', 'api_key');
                    const docSnap = await this.getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        console.log('🔑 API key retrieved from Firebase');
                        return data.value;
                    } else {
                        console.log('🔑 No API key found in Firebase');
                        return null;
                    }
                } catch (error) {
                    console.error('❌ Error getting API key:', error);
                    return null;
                }
            }

            // Test Firebase connection
            async testConnection() {
                try {
                    const testDoc = await this.setDoc(this.doc(this.db, 'test', 'connection'), {
                        test: true,
                        timestamp: Date.now()
                    });
                    console.log('✅ Firebase connection test successful');
                    return true;
                } catch (error) {
                    console.error('❌ Firebase connection test failed:', error);
                    return false;
                }
            }
        }
        
        // Initialize Firebase Storage
        firebaseStorage = new FirebaseStorage();
        
        // Test connection
        await firebaseStorage.testConnection();
        
        // Make globally available
        window.FirebaseStorage = FirebaseStorage;
        window.firebaseStorage = firebaseStorage;
        
        console.log('✅ Firebase fully initialized and ready');
        return true;
        
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        return false;
    }
}

// Auto-initialize when script loads
initializeFirebase();