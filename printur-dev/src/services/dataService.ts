import { collection, doc, onSnapshot, query, limit, getDocs, Unsubscribe } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import type { AssetSymbol, Engine, VPSStatus, MarketPrice, EngineBias, LiveTrade, SystemInfo } from '../types';

// Add system status type
export interface SystemStatus {
  vps: {
    status: 'online' | 'offline' | 'warning';
    uptime: string;
    cpu: number;
    memory: number;
    disk: number;
    location: string;
    specs?: {
      cores: number;
      cpuModel: string;
      cpuSpeed: number;
      totalMemoryGB: number;
      totalDiskGB: number;
    };
  };
  engines: {
    v1: {
      status: 'active' | 'inactive' | 'error';
      lastActivity: number;
      signalsToday: number;
      avgConfidence: number;
      errors: number;
    };
    v2: {
      status: 'active' | 'inactive' | 'error';
      lastActivity: number;
      signalsToday: number;
      avgConfidence: number;
      errors: number;
    };
    v3: {
      status: 'active' | 'inactive' | 'error';
      lastActivity: number;
      signalsToday: number;
      avgConfidence: number;
      errors: number;
    };
  };
  database: {
    status: 'connected' | 'disconnected' | 'warning';
    latency: number;
    documents: number;
    collections?: string[];
  };
  network: {
    status: 'stable' | 'unstable' | 'disconnected';
    latency: number;
    bandwidth: string;
    endpoints?: {
      firebase: number;
      twelvedata: number;
      discord: number;
    };
  };
  sessions: {
    tokyo: boolean;
    london: boolean;
    newyork: boolean;
  };
}

export class DataService {
  private subscriptions: Map<string, Unsubscribe> = new Map();

  // Subscribe to VPS status
  subscribeToVPSStatus(callback: (status: VPSStatus) => void): () => void {
    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.SYSTEM, 'generator'),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const now = Date.now();
          const lastHeartbeat = data.lastHeartbeat;
          const timeSinceHeartbeat = now - lastHeartbeat;
          const offlineThreshold = 3 * 60 * 1000; // 3 minutes like huehue
          
          let actualStatus: 'online' | 'offline';
          let message: string;
          
          // Prioritize the status field for instant updates in both directions
          if (data.status !== 'active') {
            actualStatus = 'offline';
            message = 'System offline';
          } else if (data.status === 'active' && lastHeartbeat && timeSinceHeartbeat <= offlineThreshold) {
            // If status is active AND we have a valid recent heartbeat, immediately show online
            actualStatus = 'online';
            message = 'System operational';
          } else if (data.status === 'active' && (!lastHeartbeat || timeSinceHeartbeat > offlineThreshold)) {
            // Status is active but heartbeat is stale - this means VPS just started
            // Give it benefit of the doubt for faster response
            actualStatus = 'online';
            message = 'System operational (starting up)';
          } else {
            actualStatus = 'offline';
            message = 'System offline - No data';
          }
          
          const status: VPSStatus = {
            status: actualStatus,
            lastHeartbeat: data.lastHeartbeat,
            uptime: data.stats?.uptime,
            message: message
          };
          callback(status);
        } else {
          callback({
            status: 'offline',
            message: 'System offline - No data'
          });
        }
      },
      (error) => {
        console.error('Error subscribing to VPS status:', error);
        callback({
          status: 'offline',
          message: 'Connection error'
        });
      }
    );

    this.subscriptions.set('vps-status', unsubscribe);
    return () => {
      unsubscribe();
      this.subscriptions.delete('vps-status');
    };
  }

  // Subscribe to market prices
  subscribeToMarketPrices(callback: (prices: MarketPrice[]) => void): () => void {
    if (!COLLECTIONS.PRICES) {
      console.error('PRICES collection name is undefined');
      callback([]);
      return () => {};
    }

    console.log('Subscribing to Firebase prices collection:', COLLECTIONS.PRICES);

    const unsubscribe = onSnapshot(
      collection(db, COLLECTIONS.PRICES),
      (snapshot) => {
        const prices: MarketPrice[] = [];
        console.log('Firebase prices snapshot size:', snapshot.size);
        console.log('Firebase prices snapshot empty?', snapshot.empty);
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Price document ID:', doc.id);
          console.log('Price document data:', JSON.stringify(data, null, 2));
          
          // More flexible data parsing - check for different field names
          const symbol = data.symbol;
          const price = data.price || data.currentPrice || data.value;
          
          // Fix symbol mapping: Firebase stores "XAU/USD" but we need "XAUUSD"
          const symbolMap: { [key: string]: AssetSymbol } = {
            'XAU/USD': 'XAUUSD',
            'USD/JPY': 'USDJPY', 
            'BTC/USD': 'BTCUSD'
          };
          
          const mappedSymbol = symbolMap[symbol] || symbol;
          
          if (price && symbol) {
            const marketPrice: MarketPrice = {
              symbol: mappedSymbol as AssetSymbol,
              price: typeof price === 'string' ? parseFloat(price) : price,
              change: data.change || 0,
              changePercent: data.changePercent || 0,
              timestamp: data.timestamp || data.fetchedAt || Date.now(),
              quality: data.quality || data.cacheStatus || 'VALIDATED'
            };
            
            console.log('Adding price:', marketPrice);
            prices.push(marketPrice);
          } else {
            console.log('Skipping document - missing price or symbol:', {
              symbol,
              price,
              hasPrice: !!price,
              hasSymbol: !!symbol
            });
          }
        });
        
        console.log('Final processed prices:', prices);
        callback(prices);
      },
      (error) => {
        console.error('Error subscribing to market prices:', error);
        callback([]);
      }
    );

    this.subscriptions.set('market-prices', unsubscribe);
    return () => {
      unsubscribe();
      this.subscriptions.delete('market-prices');
    };
  }

  // Subscribe to engine analysis for a specific engine
  subscribeToEngineBias(engine: Engine, callback: (biases: EngineBias[]) => void): () => void {
    // Based on server.js analysis, data is stored in analysis_v1, analysis_v2, analysis_v3 collections
    let collectionName: string;
    switch (engine) {
      case 'v1':
        collectionName = COLLECTIONS.ANALYSIS_V1;
        break;
      case 'v2':
        collectionName = COLLECTIONS.ANALYSIS_V2;
        break;
      case 'v3':
        collectionName = COLLECTIONS.ANALYSIS_V3;
        break;
      default:
        collectionName = COLLECTIONS.ANALYSIS_V1;
    }

    if (!collectionName) {
      console.error(`Collection name for engine ${engine} is undefined`);
      callback([]);
      return () => {};
    }
    
    console.log(`Subscribing to ${engine} analysis in collection: ${collectionName}`);


    // Subscribe to all symbol documents in the analysis collection
    const symbols: AssetSymbol[] = ['XAUUSD', 'USDJPY', 'BTCUSD'];
    const unsubscribers: (() => void)[] = [];
    let allBiases: EngineBias[] = [];

    const updateBiases = () => {
      callback(allBiases);
    };

    symbols.forEach(symbol => {
      const unsubscribe = onSnapshot(
        doc(db, collectionName, symbol),
        (docSnapshot) => {
          // Remove existing bias for this symbol and engine
          allBiases = allBiases.filter(bias => !(bias.symbol === symbol && bias.engine === engine));
          
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            console.log(`${engine} ${symbol} raw Firebase data:`, JSON.stringify(data, null, 2));
            
            if (data) {
              // Convert backend format to our format - handle all possible field combinations
              let bias = data.bias;
              
              // Handle different bias field names from server
              if (!bias && data.action) {
                bias = data.action === 'BUY' ? 'BULLISH' : data.action === 'SELL' ? 'BEARISH' : 'NEUTRAL';
              }
              if (!bias && data.direction) {
                bias = data.direction === 'BUY' ? 'BULLISH' : data.direction === 'SELL' ? 'BEARISH' : 'NEUTRAL';
              }
              
              // Default bias if none found
              if (!bias) {
                bias = 'NEUTRAL';
              }
              
              // Ensure we have at least some confidence value
              const confidence = data.confidence || 0;
              
              console.log(`${engine} ${symbol} field mapping:`, {
                originalBias: data.bias,
                originalAction: data.action,
                originalDirection: data.direction,
                finalBias: bias,
                confidence: confidence,
                hasData: !!data
              });
              
              // Always create an entry, even if data is minimal
              const biasEntry = {
                engine,
                symbol: data.symbol || symbol,
                bias: bias,
                confidence: confidence,
                timestamp: data.timestamp || data.serverTime?.toMillis?.() || Date.now(),
                reasoning: data.reasoning || data.type || data.source || 'Unknown',
                entry: data.entry || data.price,
                takeProfit: data.takeProfit,
                stopLoss: data.stopLoss
              };
              
              allBiases.push(biasEntry);
              console.log(`✅ ${engine} ${symbol} final bias added:`, biasEntry);
            }
          } else {
            console.log(`❌ Document ${collectionName}/${symbol} does not exist`);
          }
          
          updateBiases();
        },
        (error) => {
          console.error(`Error subscribing to ${engine} ${symbol} analysis:`, error);
        }
      );
      
      unsubscribers.push(unsubscribe);
    });

    this.subscriptions.set(`engine-${engine}`, () => {
      unsubscribers.forEach(unsub => unsub());
    });
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
      this.subscriptions.delete(`engine-${engine}`);
    };
  }

  // Subscribe to live trades from all engines
  subscribeToLiveTrades(callback: (trades: LiveTrade[]) => void): () => void {
    const engines = ['v1', 'v2', 'v3'] as const;
    const unsubscribeFunctions: (() => void)[] = [];
    let allActiveTrades: LiveTrade[] = [];
    let allTradeHistory: LiveTrade[] = [];

    const updateCallback = () => {
      // Combine active trades and history
      const combinedTrades = [...allActiveTrades, ...allTradeHistory];
      callback(combinedTrades);
    };

    // Subscribe to active trades for each engine
    engines.forEach((engine) => {
      const collectionName = `active_trades_${engine}` as keyof typeof COLLECTIONS;
      
      console.log(`📥 Subscribing to active trades for ${engine}...`);
      
      const activeTradesUnsubscribe = onSnapshot(
        collection(db, `active_trades_${engine}`),
        (snapshot) => {
          console.log(`📊 Found ${snapshot.size} active trades for ${engine}`);
          
          // Remove existing trades for this engine
          allActiveTrades = allActiveTrades.filter(trade => trade.engine !== engine);
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`${engine} trade data:`, data);
            
            if (data.symbol && data.direction) {
              const currentPrice = data.currentPrice || data.entry || 0;
              const entry = data.entry || 0;
              // Use pnlPips from Firebase if available, otherwise calculate in dollars as fallback
              const pnl = data.pnlPips || (data.direction === 'BUY' 
                ? (currentPrice - entry) 
                : (entry - currentPrice));
              const pnlPercent = entry > 0 ? (pnl / entry) * 100 : 0;

              // Handle both timestamp and openTime fields (huehue uses openTime)
              let timestamp = data.timestamp;
              if (data.openTime) {
                timestamp = data.openTime?.toMillis?.() || data.openTime;
              } else if (data.timestamp) {
                timestamp = data.timestamp?.toMillis?.() || data.timestamp;
              } else {
                timestamp = Date.now();
              }

              allActiveTrades.push({
                id: doc.id,
                engine: engine as Engine,
                symbol: data.symbol as AssetSymbol,
                direction: data.direction,
                entry,
                currentPrice,
                pnl,
                pnlPercent,
                takeProfit: data.takeProfit,
                stopLoss: data.stopLoss,
                timestamp,
                status: 'ACTIVE'
              });
            }
          });
          
          updateCallback();
        },
        (error) => {
          console.error(`Error subscribing to active trades ${engine}:`, error);
        }
      );

      unsubscribeFunctions.push(activeTradesUnsubscribe);
    });

    // Load trade history using getDocs (one-time read) like huehue
    console.log('📥 Loading trade history...');
    
    const loadTradeHistory = async () => {
      try {
        const historySnapshot = await getDocs(
          query(
            collection(db, COLLECTIONS.TRADE_HISTORY),
            limit(100)
          )
        );
        
        console.log(`📊 Found ${historySnapshot.size} historical trades`);
        
        allTradeHistory = [];
        historySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('History trade data:', data);
          
          if (data.symbol && data.direction) {
            const currentPrice = data.currentPrice || data.exitPrice || data.entry || 0;
            const entry = data.entry || 0;
            // Use pnlPips from Firebase if available, otherwise use pnl field, or calculate as fallback
            const pnl = data.pnlPips || data.pnl || (data.direction === 'BUY' 
              ? (currentPrice - entry) 
              : (entry - currentPrice));
            const pnlPercent = entry > 0 ? (pnl / entry) * 100 : 0;

            // Handle both timestamp and openTime fields (huehue uses openTime)
            let timestamp = data.timestamp;
            if (data.openTime) {
              timestamp = data.openTime?.toMillis?.() || data.openTime;
            } else if (data.timestamp) {
              timestamp = data.timestamp?.toMillis?.() || data.timestamp;
            } else {
              timestamp = Date.now();
            }

            allTradeHistory.push({
              id: doc.id,
              engine: data.engine as Engine,
              symbol: data.symbol as AssetSymbol,
              direction: data.direction,
              entry,
              currentPrice,
              pnl,
              pnlPercent,
              takeProfit: data.takeProfit,
              stopLoss: data.stopLoss,
              timestamp,
              status: data.status || 'CLOSED'
            });
          }
        });
        
        // Sort by timestamp descending (most recent first)
        allTradeHistory.sort((a, b) => b.timestamp - a.timestamp);
        
        updateCallback();
      } catch (error) {
        console.error('Error loading trade history:', error);
      }
    };

    // Load trade history initially
    loadTradeHistory();
    
    // Set up interval to reload trade history every 30 seconds
    const historyInterval = setInterval(loadTradeHistory, 30000);
    
    unsubscribeFunctions.push(() => clearInterval(historyInterval));

    this.subscriptions.set('live-trades', () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    });
    
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      this.subscriptions.delete('live-trades');
    };
  }

  // Subscribe to system info
  subscribeToSystemInfo(callback: (info: SystemInfo) => void): () => void {
    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.SYSTEM, 'generator'),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const info: SystemInfo = {
            mode: data.stats?.mode || 'Unknown',
            engines: ['v1', 'v2', 'v3'],
            assets: ['XAUUSD', 'USDJPY', 'BTCUSD'],
            apiCalls: data.stats?.apiCalls || 0,
            uptime: data.stats?.uptime || 0,
            performance: data.stats?.performance || {
              v1: { signals: 0, avgConfidence: 0, errors: 0 },
              v2: { signals: 0, avgConfidence: 0, errors: 0 },
              v3: { signals: 0, avgConfidence: 0, errors: 0 }
            }
          };
          callback(info);
        }
      },
      (error) => {
        console.error('Error subscribing to system info:', error);
      }
    );

    this.subscriptions.set('system-info', unsubscribe);
    return () => {
      unsubscribe();
      this.subscriptions.delete('system-info');
    };
  }

  // Subscribe to detailed system status for status page
  subscribeToSystemStatus(callback: (status: SystemStatus) => void): () => void {
    let systemData: any = null;
    let vpsStatusData: any = null;
    
    const updateStatus = () => {
      if (!systemData) return;
      
      // Calculate VPS status using the SAME logic as TopBar/Sidebar (heartbeat check)
      let vpsStatus: 'online' | 'offline' | 'warning' = 'offline';
      
      if (vpsStatusData) {
        const now = Date.now();
        const lastHeartbeat = vpsStatusData.lastHeartbeat;
        const timeSinceHeartbeat = now - lastHeartbeat;
        const offlineThreshold = 2 * 60 * 1000; // 2 minutes like other components
        
        console.log('Status page VPS check:', {
          now,
          lastHeartbeat, 
          timeSinceHeartbeat: Math.floor(timeSinceHeartbeat / 1000) + 's',
          status: vpsStatusData.status,
          offlineThreshold: Math.floor(offlineThreshold / 1000) + 's'
        });
        
        // Use SAME logic as TopBar/Sidebar for consistency
        if (vpsStatusData.status !== 'active') {
          vpsStatus = 'offline';
          console.log('Status page VPS: Offline (status not active)');
        } else if (vpsStatusData.status === 'active' && lastHeartbeat && timeSinceHeartbeat <= offlineThreshold) {
          vpsStatus = 'online';
          console.log('Status page VPS: Online (status active + recent heartbeat)');
        } else if (vpsStatusData.status === 'active' && (!lastHeartbeat || timeSinceHeartbeat > offlineThreshold)) {
          vpsStatus = 'online';
          console.log('Status page VPS: Online (status active, assuming startup)');
        } else {
          vpsStatus = 'offline';
          console.log('Status page VPS: Offline (fallback)');
        }
      }
      
      console.log('Status page final VPS status:', vpsStatus);
      
      // If VPS is offline, override everything to show offline/inactive status
      const isVpsOnline = vpsStatus === 'online';
      
      const status: SystemStatus = {
        vps: {
          status: vpsStatus,
          uptime: isVpsOnline ? (systemData.vps?.uptime || '0d 0h 0m') : '0d 0h 0m',
          cpu: isVpsOnline ? (systemData.vps?.cpu || 0) : 0,
          memory: isVpsOnline ? (systemData.vps?.memory || 0) : 0,
          disk: isVpsOnline ? (systemData.vps?.disk || 0) : 0,
          location: systemData.vps?.location || 'Unknown',
          specs: systemData.vps?.specs
        },
        engines: {
          v1: {
            status: isVpsOnline ? (systemData.engines?.v1?.status || 'inactive') : 'inactive',
            lastActivity: isVpsOnline ? (systemData.engines?.v1?.lastActivity || 0) : 0,
            signalsToday: isVpsOnline ? (systemData.engines?.v1?.signalsToday || 0) : 0,
            avgConfidence: isVpsOnline ? (systemData.engines?.v1?.avgConfidence || 0) : 0,
            errors: isVpsOnline ? (systemData.engines?.v1?.errors || 0) : 0
          },
          v2: {
            status: isVpsOnline ? (systemData.engines?.v2?.status || 'inactive') : 'inactive',
            lastActivity: isVpsOnline ? (systemData.engines?.v2?.lastActivity || 0) : 0,
            signalsToday: isVpsOnline ? (systemData.engines?.v2?.signalsToday || 0) : 0,
            avgConfidence: isVpsOnline ? (systemData.engines?.v2?.avgConfidence || 0) : 0,
            errors: isVpsOnline ? (systemData.engines?.v2?.errors || 0) : 0
          },
          v3: {
            status: isVpsOnline ? (systemData.engines?.v3?.status || 'inactive') : 'inactive',
            lastActivity: isVpsOnline ? (systemData.engines?.v3?.lastActivity || 0) : 0,
            signalsToday: isVpsOnline ? (systemData.engines?.v3?.signalsToday || 0) : 0,
            avgConfidence: isVpsOnline ? (systemData.engines?.v3?.avgConfidence || 0) : 0,
            errors: isVpsOnline ? (systemData.engines?.v3?.errors || 0) : 0
          }
        },
        database: {
          status: isVpsOnline ? (systemData.database?.status || 'disconnected') : 'disconnected',
          latency: isVpsOnline ? (systemData.database?.latency || 0) : 0,
          documents: isVpsOnline ? (systemData.database?.documents || 0) : 0,
          collections: isVpsOnline ? systemData.database?.collections : []
        },
        network: {
          status: isVpsOnline ? (systemData.network?.status || 'disconnected') : 'disconnected',
          latency: isVpsOnline ? (systemData.network?.latency || 0) : 0,
          bandwidth: isVpsOnline ? (systemData.network?.bandwidth || '0 Mbps') : '0 Mbps',
          endpoints: isVpsOnline ? systemData.network?.endpoints : undefined
        },
        sessions: {
          tokyo: isVpsOnline ? (systemData.sessions?.tokyo || false) : false,
          london: isVpsOnline ? (systemData.sessions?.london || false) : false,
          newyork: isVpsOnline ? (systemData.sessions?.newyork || false) : false
        }
      };
      
      console.log('Status page final system status:', {
        vpsOnline: isVpsOnline,
        enginesActive: [status.engines.v1.status, status.engines.v2.status, status.engines.v3.status],
        databaseStatus: status.database.status,
        networkStatus: status.network.status
      });
      
      callback(status);
    };

    // Subscribe to system/status for detailed system info
    const systemStatusUnsubscribe = onSnapshot(
      doc(db, COLLECTIONS.SYSTEM, 'status'),
      (doc) => {
        if (doc.exists()) {
          systemData = doc.data();
          console.log('System status data received:', systemData);
          updateStatus();
        } else {
          console.log('System status document does not exist');
        }
      },
      (error) => {
        console.error('Error subscribing to system status:', error);
      }
    );

    // Subscribe to system/generator for VPS heartbeat status (same as TopBar/Sidebar)
    const vpsStatusUnsubscribe = onSnapshot(
      doc(db, COLLECTIONS.SYSTEM, 'generator'),
      (doc) => {
        if (doc.exists()) {
          vpsStatusData = doc.data();
          console.log('VPS status data received:', vpsStatusData);
          updateStatus();
        } else {
          console.log('VPS status document does not exist');
        }
      },
      (error) => {
        console.error('Error subscribing to VPS status:', error);
      }
    );

    this.subscriptions.set('system-status', () => {
      systemStatusUnsubscribe();
      vpsStatusUnsubscribe();
    });
    
    return () => {
      systemStatusUnsubscribe();
      vpsStatusUnsubscribe();
      this.subscriptions.delete('system-status');
    };
  }

  // FIXED: Add method to load historical trades for analytics
  async loadHistoricalTrades(): Promise<LiveTrade[]> {
    try {
      console.log('📊 Loading historical trades for analytics...');
      
      const historySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.TRADE_HISTORY),
          limit(500) // Load more for analytics
        )
      );
      
      const historicalTrades: LiveTrade[] = [];
      
      historySnapshot.forEach((doc) => {
        const data = doc.data();
        
        if (data.symbol && data.direction) {
          const currentPrice = data.currentPrice || data.exitPrice || data.entry || 0;
          const entry = data.entry || 0;
          
          // FIXED: Properly handle pnlPips vs pnl fields
          const pnl = data.pnlPips !== undefined ? data.pnlPips : (
            data.pnl || (data.direction === 'BUY' 
              ? (currentPrice - entry) 
              : (entry - currentPrice))
          );
          
          const pnlPercent = entry > 0 ? (pnl / entry) * 100 : 0;

          // Handle timestamp fields
          let timestamp = data.timestamp;
          if (data.openTime) {
            timestamp = data.openTime?.toMillis?.() || data.openTime;
          } else if (data.timestamp) {
            timestamp = data.timestamp?.toMillis?.() || data.timestamp;
          } else {
            timestamp = Date.now();
          }

          historicalTrades.push({
            id: doc.id,
            engine: data.engine as Engine,
            symbol: data.symbol as AssetSymbol,
            direction: data.direction,
            entry,
            currentPrice,
            pnl,
            pnlPercent,
            takeProfit: data.takeProfit,
            stopLoss: data.stopLoss,
            timestamp,
            status: data.status || 'CLOSED',
            // FIXED: Add additional fields for analytics
            confidence: data.confidence,
            pnlPips: data.pnlPips,
            openedAt: data.openTime || data.timestamp,
            closedAt: data.closeTime || data.exitTime,
            error: data.error
          });
        }
      });
      
      console.log(`📊 Loaded ${historicalTrades.length} historical trades for analytics`);
      return historicalTrades;
      
    } catch (error) {
      console.error('Error loading historical trades:', error);
      return [];
    }
  }

  // Clean up all subscriptions
  cleanup(): void {
    this.subscriptions.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.subscriptions.clear();
  }
}

export const dataService = new DataService();