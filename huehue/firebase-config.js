// Firebase Configuration - Complete Setup with Real-time Sync
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
        console.log('🔥 Initializing Firebase with real-time sync...');
        
        // Import Firebase modules with real-time features
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { 
            getFirestore, 
            collection, 
            addDoc, 
            getDocs, 
            query, 
            orderBy, 
            limit, 
            doc, 
            setDoc, 
            getDoc,
            onSnapshot,
            serverTimestamp
        } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Initialize Firebase
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        
        // Create Firebase Storage class with real-time features
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
                this.onSnapshot = onSnapshot;
                this.serverTimestamp = serverTimestamp;
                this.listeners = new Map();
                this.signalCallbacks = [];
                this.analysisCallbacks = new Map();
                console.log('🔥 Firebase Storage with real-time sync ready');
                
                // Start listening for updates
                this.startRealtimeListeners();
            }

            // Start all real-time listeners
            startRealtimeListeners() {
                this.listenForSignals();
                this.listenForAnalysis();
            }

            // Save trading signal
            async saveSignal(signal) {
                try {
                    // Only save actual trading signals
                    if (!signal.type || signal.type !== 'TRADING_SIGNAL') {
                        return null;
                    }
                    
                    const docRef = await this.addDoc(this.collection(this.db, 'signals'), {
                        ...signal,
                        timestamp: Date.now(),
                        serverTime: this.serverTimestamp(),
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

            // Listen for real-time signal updates
            listenForSignals() {
                const q = this.query(
                    this.collection(this.db, 'signals'),
                    this.orderBy('timestamp', 'desc'),
                    this.limit(20)
                );
                
                const unsubscribe = this.onSnapshot(q, (snapshot) => {
                    const signals = [];
                    
                    snapshot.forEach((doc) => {
                        signals.push({ id: doc.id, ...doc.data() });
                    });
                    
                    // Sort by timestamp (newest first)
                    signals.sort((a, b) => b.timestamp - a.timestamp);
                    
                    // Notify all registered callbacks
                    this.signalCallbacks.forEach(callback => {
                        try {
                            callback(signals);
                        } catch (error) {
                            console.error('Error in signal callback:', error);
                        }
                    });
                    
                    console.log(`📡 Real-time update: ${signals.length} signals`);
                });
                
                this.listeners.set('signals', unsubscribe);
            }

            // Register callback for signal updates
            onSignalsUpdate(callback) {
                this.signalCallbacks.push(callback);
                console.log('📞 Signal update callback registered');
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

            // Save analysis for a symbol (centralized)
            async saveAnalysis(symbol, analysis) {
                try {
                    const docRef = this.doc(this.db, 'analysis', symbol);
                    await this.setDoc(docRef, {
                        symbol: symbol,
                        bias: analysis.bias,
                        strength: analysis.strength,
                        conditions: analysis.conditions,
                        price: analysis.price,
                        timestamp: Date.now(),
                        serverTime: this.serverTimestamp(),
                        updated_at: new Date().toISOString()
                    });
                    
                    console.log(`📊 Analysis saved for ${symbol}: ${analysis.bias} (${analysis.strength}/6)`);
                    return true;
                } catch (error) {
                    console.error('❌ Error saving analysis:', error);
                    return false;
                }
            }

            // Get latest analysis for a symbol
            async getAnalysis(symbol) {
                try {
                    const docRef = this.doc(this.db, 'analysis', symbol);
                    const docSnap = await this.getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        return docSnap.data();
                    }
                    return null;
                } catch (error) {
                    console.error('❌ Error getting analysis:', error);
                    return null;
                }
            }

            // Listen for real-time analysis updates
            listenForAnalysis() {
                const symbols = ['XAUUSD', 'USDJPY'];
                
                symbols.forEach(symbol => {
                    const docRef = this.doc(this.db, 'analysis', symbol);
                    
                    const unsubscribe = this.onSnapshot(docRef, (doc) => {
                        if (doc.exists()) {
                            const data = doc.data();
                            
                            // Notify callbacks for this symbol
                            const callbacks = this.analysisCallbacks.get(symbol) || [];
                            callbacks.forEach(callback => {
                                try {
                                    callback(data);
                                } catch (error) {
                                    console.error('Error in analysis callback:', error);
                                }
                            });
                            
                            // Also notify the app directly if available
                            if (window.optimizedHueHueApp && window.optimizedHueHueApp.handleAnalysisUpdate) {
                                window.optimizedHueHueApp.handleAnalysisUpdate(symbol, data);
                            }
                            
                            console.log(`🔄 Analysis updated for ${symbol}: ${data.bias}`);
                        }
                    });
                    
                    this.listeners.set(`analysis_${symbol}`, unsubscribe);
                });
            }

            // Register callback for analysis updates
            onAnalysisUpdate(symbol, callback) {
                if (!this.analysisCallbacks.has(symbol)) {
                    this.analysisCallbacks.set(symbol, []);
                }
                this.analysisCallbacks.get(symbol).push(callback);
                console.log(`📞 Analysis update callback registered for ${symbol}`);
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

            // Master session management
            async checkAndBecomeMaster() {
                try {
                    const masterDoc = this.doc(this.db, 'master', 'session');
                    const docSnap = await this.getDoc(masterDoc);
                    
                    const now = Date.now();
                    let shouldBecomeMaster = false;
                    
                    if (!docSnap.exists()) {
                        shouldBecomeMaster = true;
                    } else {
                        const data = docSnap.data();
                        // If master hasn't updated in 3 minutes, take over
                        if (now - data.lastHeartbeat > 180000) {
                            shouldBecomeMaster = true;
                        }
                    }
                    
                    if (shouldBecomeMaster) {
                        const sessionId = this.getSessionId();
                        await this.setDoc(masterDoc, {
                            sessionId: sessionId,
                            lastHeartbeat: now,
                            startTime: now,
                            serverTime: this.serverTimestamp()
                        });
                        console.log('👑 This session is now the MASTER');
                        return true;
                    }
                    
                    return false;
                } catch (error) {
                    console.error('❌ Error checking master status:', error);
                    return false;
                }
            }

            // Update master heartbeat
            async updateMasterHeartbeat() {
                try {
                    const masterDoc = this.doc(this.db, 'master', 'session');
                    await this.setDoc(masterDoc, {
                        sessionId: this.getSessionId(),
                        lastHeartbeat: Date.now(),
                        serverTime: this.serverTimestamp()
                    }, { merge: true });
                    return true;
                } catch (error) {
                    console.error('❌ Error updating master heartbeat:', error);
                    return false;
                }
            }

            // Generate session ID
            getSessionId() {
                let sessionId = sessionStorage.getItem('huehue_session_id');
                if (!sessionId) {
                    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    sessionStorage.setItem('huehue_session_id', sessionId);
                }
                return sessionId;
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

            // Cleanup all listeners
            cleanup() {
                this.listeners.forEach((unsubscribe, key) => {
                    unsubscribe();
                    console.log(`🧹 Cleaned up listener: ${key}`);
                });
                this.listeners.clear();
                this.signalCallbacks = [];
                this.analysisCallbacks.clear();
            }
        }
        
        // Initialize Firebase Storage
        firebaseStorage = new FirebaseStorage();
        
        // Test connection
        await firebaseStorage.testConnection();
        
        // Make globally available
        window.FirebaseStorage = FirebaseStorage;
        window.firebaseStorage = firebaseStorage;
        
        console.log('✅ Firebase fully initialized with real-time sync');
        return true;
        
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        return false;
    }
}

// Auto-initialize when script loads
initializeFirebase();