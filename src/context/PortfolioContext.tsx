
import React, { createContext, useContext } from 'react';
import { PortfolioItem } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface PortfolioContextType {
  portfolio: PortfolioItem[];
  addToPortfolio: (item: Omit<PortfolioItem, 'purchaseDate'>) => void;
  removeFromPortfolio: (coinId: string) => void;
  updatePortfolioItem: (coinId: string, updates: Partial<PortfolioItem>) => void;
  isInPortfolio: (coinId: string) => boolean;
  clearPortfolio: () => void; // Add this line
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};

interface PortfolioProviderProps {
  children: React.ReactNode;
}

export const PortfolioProvider: React.FC<PortfolioProviderProps> = ({ children }) => {
  const [portfolio, setPortfolio] = useLocalStorage<PortfolioItem[]>('portfolio', []);

  const addToPortfolio = (item: Omit<PortfolioItem, 'purchaseDate'>) => {
    const newItem: PortfolioItem = {
      ...item,
      purchaseDate: new Date().toISOString(),
    };
    setPortfolio([...portfolio, newItem]);
  };

  const removeFromPortfolio = (coinId: string) => {
    setPortfolio((Array.isArray(portfolio) ? portfolio : []).filter(item => item.coinId !== coinId));
  };

  const updatePortfolioItem = (coinId: string, updates: Partial<PortfolioItem>) => {
    setPortfolio((Array.isArray(portfolio) ? portfolio : []).map(item => 
      item.coinId === coinId ? { ...item, ...updates } : item
    ));
  };

  const isInPortfolio = (coinId: string) => {
    return portfolio.some(item => item.coinId === coinId);
  };

  const clearPortfolio = () => {
    setPortfolio([]);
  };

  return (
    <PortfolioContext.Provider value={{
      portfolio,
      addToPortfolio,
      removeFromPortfolio,
      updatePortfolioItem,
      isInPortfolio,
      clearPortfolio, // Add this line
    }}>
      {children}
    </PortfolioContext.Provider>
  );
};