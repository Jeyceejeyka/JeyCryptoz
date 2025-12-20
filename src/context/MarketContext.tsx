// src/context/MarketContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Coin } from '../types';
import { fetchCoins } from '../utils/api';

interface MarketContextType {
  coins: Coin[];
  loading: boolean;
  lastUpdated: Date | null;
  error: string | null;
  refreshCoins: () => Promise<void>;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshCoins = async () => {
    try {
      setLoading(true);
      const data = await fetchCoins(1, 100);
      setCoins(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching coins:', err);
      setError('Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    refreshCoins();

    // Refresh every 5 minutes (300,000 milliseconds)
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing market data...');
      refreshCoins();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, []);

  return (
    <MarketContext.Provider value={{ coins, loading, lastUpdated, error, refreshCoins }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = (): MarketContextType => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
};