// Firebase configuration - using same config as huehue backend
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCVmv46KsUATB3HkzJUKEHQHuGefhJfTMN",
  authDomain: "huehue-signals.firebaseapp.com",
  projectId: "huehue-signals",
  storageBucket: "huehue-signals.firebasestorage.app",
  messagingSenderId: "151713753111",
  appId: "1:151713753111:web:86dd494a47db4f775a9452"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Firebase collections - matching huehue backend structure
export const COLLECTIONS = {
  PRICES: 'prices',
  ANALYSIS_V1: 'analysis_v1',  // Backend uses analysis_v1 for v1 analysis
  ANALYSIS_V2: 'analysis_v2',  // Backend uses analysis_v2 for v2 analysis
  ANALYSIS_V3: 'analysis_v3',  // Backend uses analysis_v3 for v3 analysis
  SIGNALS_V1: 'signals_v1',
  SIGNALS_V2: 'signals_v2',
  SIGNALS_V3: 'signals_v3',
  ACTIVE_TRADES_V1: 'active_trades_v1',
  ACTIVE_TRADES_V2: 'active_trades_v2', 
  ACTIVE_TRADES_V3: 'active_trades_v3',
  TRADE_HISTORY: 'trade_history',
  SYSTEM: 'system'
} as const;