import { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';

export interface VPSStatusData {
  status: 'online' | 'offline' | 'warning';
  message: string;
  uptime?: string;
  lastHeartbeat?: number;
}

export function useVPSStatus() {
  const [vpsStatus, setVpsStatus] = useState<VPSStatusData>({
    status: 'offline',
    message: 'Loading...'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = dataService.subscribeToVPSStatus((status) => {
      setVpsStatus({
        status: status.status,
        message: status.message || (status.status === 'online' ? 'VPS Online' : 'VPS Offline'),
        uptime: status.uptime?.toString(),
        lastHeartbeat: status.lastHeartbeat
      });
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  return { vpsStatus, isLoading };
}