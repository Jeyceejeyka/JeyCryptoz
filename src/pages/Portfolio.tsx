

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Trash2, Edit2, TrendingUp, TrendingDown, 
  Search, Filter, ChevronUp, ChevronDown, 
  RefreshCw, PieChart as PieChartIcon, BarChart3,
  Download, AlertCircle
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { Coin } from '../types';
import { fetchCoins } from '../utils/api';
import { formatCurrency, formatPercentage, getChangeColor } from '../utils/formatters';
import { PageLoader } from '../components/UI/Loader';

// Types for sorting and filtering
type SortField = 'name' | 'currentValue' | 'pnl' | 'pnlPercentage' | 'priceChange' | 'amount';
type SortDirection = 'asc' | 'desc';
type Timeframe = '1d' | '1w' | '1m' | '3m' | '1y' | 'all';

const Portfolio: React.FC = () => {
  const { portfolio, removeFromPortfolio, updatePortfolioItem } = usePortfolio();
  const [currentPrices, setCurrentPrices] = useState<{ [key: string]: Coin }>({});
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [timeframe, setTimeframe] = useState<Timeframe>('1d');
  const [showAssetAllocation, setShowAssetAllocation] = useState(true);
  const [showCharts, setShowCharts] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Auto-refresh prices every 30 seconds
  useEffect(() => {
    const loadCurrentPrices = async () => {
      if (portfolio.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const coins = await fetchCoins(1, 250);
        const pricesMap = coins.reduce((acc, coin) => {
          acc[coin.id] = coin;
          return acc;
        }, {} as { [key: string]: Coin });
        setCurrentPrices(pricesMap);
      } catch (error) {
        console.error('Error loading current prices:', error);
        // Keep existing prices if API fails
      } finally {
        setLoading(false);
      }
    };

    loadCurrentPrices();

    // Set up auto-refresh
    const intervalId = setInterval(() => {
      if (portfolio.length > 0) {
        loadCurrentPrices();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [portfolio]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const coins = await fetchCoins(1, 250);
      const pricesMap = coins.reduce((acc, coin) => {
        acc[coin.id] = coin;
        return acc;
      }, {} as { [key: string]: Coin });
      setCurrentPrices(pricesMap);
    } catch (error) {
      console.error('Error refreshing prices:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditAmount = (coinId: string, currentAmount: number) => {
    setEditingItem(coinId);
    setEditAmount(currentAmount.toString());
  };

  const handleEditPurchase = (item: any) => {
    setEditingItem(item.coinId);
    setEditPurchasePrice(item.purchasePrice.toString());
    setEditPurchaseDate(item.purchaseDate);
  };

  const handleSaveEdit = (coinId: string) => {
    const updates: any = {};
    
    if (editAmount) {
      const amount = parseFloat(editAmount);
      if (amount >= 0) updates.amount = amount;
    }
    
    if (editPurchasePrice) {
      const purchasePrice = parseFloat(editPurchasePrice);
      if (purchasePrice >= 0) updates.purchasePrice = purchasePrice;
    }
    
    if (editPurchaseDate) {
      updates.purchaseDate = editPurchaseDate;
    }
    
    if (Object.keys(updates).length > 0) {
      updatePortfolioItem(coinId, updates);
    }
    
    setEditingItem(null);
    setEditAmount('');
    setEditPurchasePrice('');
    setEditPurchaseDate('');
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) {
      selectedItems.forEach(id => removeFromPortfolio(id));
      setSelectedItems(new Set());
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size === portfolio.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(portfolio.map(item => item.coinId)));
    }
  };

  const handleSelectItem = (coinId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(coinId)) {
      newSelected.delete(coinId);
    } else {
      newSelected.add(coinId);
    }
    setSelectedItems(newSelected);
  };

  const calculatePortfolioValue = () => {
    return portfolio.reduce((total, item) => {
      const currentPrice = currentPrices[item.coinId]?.current_price || 0;
      return total + (item.amount * currentPrice);
    }, 0);
  };

  const calculateTotalPnL = () => {
    return portfolio.reduce((total, item) => {
      const currentPrice = currentPrices[item.coinId]?.current_price || 0;
      const purchaseValue = item.amount * item.purchasePrice;
      const currentValue = item.amount * currentPrice;
      return total + (currentValue - purchaseValue);
    }, 0);
  };

  const calculateTotalInvestment = () => {
    return portfolio.reduce((total, item) => {
      return total + (item.amount * item.purchasePrice);
    }, 0);
  };

  // Calculate asset allocation
  const assetAllocation = useMemo(() => {
    const totalValue = calculatePortfolioValue();
    return portfolio.map(item => {
      const currentPrice = currentPrices[item.coinId]?.current_price || 0;
      const value = item.amount * currentPrice;
      return {
        coinId: item.coinId,
        name: item.name,
        symbol: item.symbol,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
      };
    }).sort((a, b) => b.value - a.value);
  }, [portfolio, currentPrices]);

  // Filter and sort portfolio items
  const filteredAndSortedPortfolio = useMemo(() => {
    let filtered = portfolio;

    // Apply search filter
    if (searchQuery) {
      filtered = portfolio.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: number = 0;
      let bValue: number = 0;
      const currentPriceA = currentPrices[a.coinId]?.current_price || 0;
      const currentPriceB = currentPrices[b.coinId]?.current_price || 0;

      switch (sortField) {
        case 'name':
          aValue = a.name.localeCompare(b.name);
          bValue = b.name.localeCompare(a.name);
          return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
        
        case 'currentValue':
          aValue = a.amount * currentPriceA;
          bValue = b.amount * currentPriceB;
          break;
        
        case 'pnl':
          aValue = (a.amount * currentPriceA) - (a.amount * a.purchasePrice);
          bValue = (b.amount * currentPriceB) - (b.amount * b.purchasePrice);
          break;
        
        case 'pnlPercentage':
          aValue = ((a.amount * currentPriceA) - (a.amount * a.purchasePrice)) / (a.amount * a.purchasePrice) * 100;
          bValue = ((b.amount * currentPriceB) - (b.amount * b.purchasePrice)) / (b.amount * b.purchasePrice) * 100;
          break;
        
        case 'priceChange':
          aValue = currentPrices[a.coinId]?.price_change_percentage_24h || 0;
          bValue = currentPrices[b.coinId]?.price_change_percentage_24h || 0;
          break;
        
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
      }

      return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
    });

    return sorted;
  }, [portfolio, currentPrices, searchQuery, sortField, sortDirection]);

  const totalValue = calculatePortfolioValue();
  const totalPnL = calculateTotalPnL();
  const totalInvestment = calculateTotalInvestment();
  const totalPnLPercentage = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;

  // Calculate best and worst performers
  const bestPerformer = useMemo(() => {
    if (portfolio.length === 0) return null;
    
    return portfolio.reduce((best, item) => {
      const currentPrice = currentPrices[item.coinId]?.current_price || 0;
      const pnlPercentage = ((currentPrice - item.purchasePrice) / item.purchasePrice) * 100;
      
      if (!best || pnlPercentage > best.pnlPercentage) {
        return { ...item, pnlPercentage };
      }
      return best;
    }, null as any);
  }, [portfolio, currentPrices]);

  const worstPerformer = useMemo(() => {
    if (portfolio.length === 0) return null;
    
    return portfolio.reduce((worst, item) => {
      const currentPrice = currentPrices[item.coinId]?.current_price || 0;
      const pnlPercentage = ((currentPrice - item.purchasePrice) / item.purchasePrice) * 100;
      
      if (!worst || pnlPercentage < worst.pnlPercentage) {
        return { ...item, pnlPercentage };
      }
      return worst;
    }, null as any);
  }, [portfolio, currentPrices]);

  const handleExportCSV = () => {
    const csvContent = [
      ['Coin', 'Symbol', 'Amount', 'Avg Purchase Price', 'Current Price', 'Current Value', 'P&L', 'P&L %'],
      ...portfolio.map(item => {
        const currentPrice = currentPrices[item.coinId]?.current_price || 0;
        const currentValue = item.amount * currentPrice;
        const pnl = currentValue - (item.amount * item.purchasePrice);
        const pnlPercentage = ((currentPrice - item.purchasePrice) / item.purchasePrice) * 100;
        
        return [
          item.name,
          item.symbol,
          item.amount.toString(),
          formatCurrency(item.purchasePrice),
          formatCurrency(currentPrice),
          formatCurrency(currentValue),
          formatCurrency(pnl),
          formatPercentage(pnlPercentage)
        ];
      })
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && portfolio.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              My Portfolio
            </h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`p-2 rounded-full ${refreshing ? 'bg-gray-300' : 'bg-purple-100 dark:bg-purple-900'} hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors`}
                title="Refresh prices"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-gray-500' : 'text-purple-600 dark:text-purple-300'}`} />
              </button>
              {portfolio.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  className="p-2 rounded-full bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                  title="Export to CSV"
                >
                  <Download className="w-5 h-5 text-green-600 dark:text-green-300" />
                </button>
              )}
            </div>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Track your cryptocurrency investments
          </p>
        </motion.div>

        {/* Refreshing overlay */}
        {refreshing && (
          <div className="fixed top-20 right-4 bg-purple-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Updating prices...</span>
          </div>
        )}

        {portfolio.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Your portfolio is empty
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Start building your portfolio by adding cryptocurrencies from the market page.
              </p>
              <motion.a
                href="/market"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                <span>Explore Market</span>
              </motion.a>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Controls Bar */}
            <div className="mb-8 space-y-4">
              {/* Search and Filter */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4 flex-1 max-w-lg">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search assets..."
                      className="w-full pl-10 pr-4 py-2 bg-white/10 dark:bg-gray-800/10 backdrop-blur-lg rounded-lg border border-white/20 dark:border-gray-700/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                      className="px-3 py-2 bg-white/10 dark:bg-gray-800/10 backdrop-blur-lg rounded-lg border border-white/20 dark:border-gray-700/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="1d">24h</option>
                      <option value="1w">7d</option>
                      <option value="1m">30d</option>
                      <option value="3m">90d</option>
                      <option value="1y">1y</option>
                      <option value="all">All time</option>
                    </select>
                  </div>
                </div>

                {/* View Toggles */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowAssetAllocation(!showAssetAllocation)}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showAssetAllocation
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 dark:bg-gray-800/10 text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-800/20'
                    }`}
                  >
                    <PieChartIcon className="w-4 h-4" />
                    <span>Allocation</span>
                  </button>
                  <button
                    onClick={() => setShowCharts(!showCharts)}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showCharts
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 dark:bg-gray-800/10 text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-800/20'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Charts</span>
                  </button>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedItems.size > 0 && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors flex items-center space-x-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Selected</span>
                  </button>
                </div>
              )}
            </div>

            {/* Portfolio Summary */}
            <div className="mb-8 space-y-6">
              {/* Total P&L Indicator */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl ${
                  totalPnL >= 0
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Total Portfolio Value
                    </h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(totalValue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getChangeColor(totalPnL)}`}>
                      {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
                    </div>
                    <div className={`text-lg font-medium ${getChangeColor(totalPnL)}`}>
                      {totalPnL >= 0 ? '+' : ''}{formatPercentage(totalPnLPercentage)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Total Investment: {formatCurrency(totalInvestment)}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Detailed Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid md:grid-cols-4 gap-4"
              >
                <div className="p-4 bg-white/10 dark:bg-gray-800/10 backdrop-blur-lg rounded-xl border border-white/20 dark:border-gray-700/20">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Total Assets
                  </h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {portfolio.length}
                  </p>
                </div>
                
                {bestPerformer && (
                  <div className="p-4 bg-white/10 dark:bg-gray-800/10 backdrop-blur-lg rounded-xl border border-white/20 dark:border-gray-700/20">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Best Performer
                    </h4>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {bestPerformer.symbol}
                      </span>
                      <span className="text-green-500 font-bold">
                        {formatPercentage(bestPerformer.pnlPercentage)}
                      </span>
                    </div>
                  </div>
                )}
                
                {worstPerformer && (
                  <div className="p-4 bg-white/10 dark:bg-gray-800/10 backdrop-blur-lg rounded-xl border border-white/20 dark:border-gray-700/20">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Worst Performer
                    </h4>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {worstPerformer.symbol}
                      </span>
                      <span className="text-red-500 font-bold">
                        {formatPercentage(worstPerformer.pnlPercentage)}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="p-4 bg-white/10 dark:bg-gray-800/10 backdrop-blur-lg rounded-xl border border-white/20 dark:border-gray-700/20">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Daily Change
                  </h4>
                  <div className="flex items-center space-x-1">
                    {totalPnL >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    )}
                    <span className={`text-xl font-bold ${getChangeColor(totalPnL)}`}>
                      {formatPercentage(totalPnLPercentage)}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Asset Allocation (if enabled) */}
              {showAssetAllocation && assetAllocation.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-6 bg-white/10 dark:bg-gray-800/10 backdrop-blur-lg rounded-xl border border-white/20 dark:border-gray-700/20"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Asset Allocation
                  </h3>
                  <div className="space-y-3">
                    {assetAllocation.map((asset) => (
                      <div key={asset.coinId} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                            {asset.symbol.substring(0, 3)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {asset.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {asset.symbol}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(asset.value)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {asset.percentage.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Portfolio Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="overflow-x-auto"
            >
              <div className="min-w-full rounded-xl border border-white/20 dark:border-gray-700/20 overflow-hidden">
                {/* Table Header */}
                <div className="bg-white/10 dark:bg-gray-800/10 backdrop-blur-lg grid grid-cols-12 gap-4 p-4 border-b border-white/20 dark:border-gray-700/20">
                  <div className="col-span-1">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === portfolio.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      onClick={() => {
                        setSortField('name');
                        setSortDirection(sortField === 'name' && sortDirection === 'desc' ? 'asc' : 'desc');
                      }}
                      className="flex items-center space-x-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      <span>Asset</span>
                      {sortField === 'name' && (
                        sortDirection === 'asc' ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => {
                        setSortField('amount');
                        setSortDirection(sortField === 'amount' && sortDirection === 'desc' ? 'asc' : 'desc');
                      }}
                      className="flex items-center justify-end space-x-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      <span>Amount</span>
                      {sortField === 'amount' && (
                        sortDirection === 'asc' ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="col-span-2 text-right">
                    <button
                      onClick={() => {
                        setSortField('currentValue');
                        setSortDirection(sortField === 'currentValue' && sortDirection === 'desc' ? 'asc' : 'desc');
                      }}
                      className="flex items-center justify-end space-x-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      <span>Current Value</span>
                      {sortField === 'currentValue' && (
                        sortDirection === 'asc' ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="col-span-2 text-right">
                    <button
                      onClick={() => {
                        setSortField('pnl');
                        setSortDirection(sortField === 'pnl' && sortDirection === 'desc' ? 'asc' : 'desc');
                      }}
                      className="flex items-center justify-end space-x-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      <span>P&L</span>
                      {sortField === 'pnl' && (
                        sortDirection === 'asc' ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="col-span-2 text-right">
                    <button
                      onClick={() => {
                        setSortField('priceChange');
                        setSortDirection(sortField === 'priceChange' && sortDirection === 'desc' ? 'asc' : 'desc');
                      }}
                      className="flex items-center justify-end space-x-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      <span>24h Change</span>
                      {sortField === 'priceChange' && (
                        sortDirection === 'asc' ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-white/10 dark:divide-gray-700/10">
                  {filteredAndSortedPortfolio.map((item, index) => {
                    const currentCoin = currentPrices[item.coinId];
                    const currentPrice = currentCoin?.current_price || 0;
                    const currentValue = item.amount * currentPrice;
                    const purchaseValue = item.amount * item.purchasePrice;
                    const pnl = currentValue - purchaseValue;
                    const pnlPercentage = purchaseValue > 0 ? (pnl / purchaseValue) * 100 : 0;
                    const priceChange = currentCoin?.price_change_percentage_24h || 0;

                    return (
                      <motion.div
                        key={item.coinId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="grid grid-cols-12 gap-4 p-4 hover:bg-white/5 dark:hover:bg-gray-800/5 transition-colors"
                      >
                        {/* Checkbox */}
                        <div className="col-span-1 flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.coinId)}
                            onChange={() => handleSelectItem(item.coinId)}
                            className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                          />
                        </div>

                        {/* Asset */}
                        <div className="col-span-2 flex items-center space-x-3">
                          <img
                            src={item.image.large}
                            alt={item.name}
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {item.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase">
                              {item.symbol}
                            </p>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="col-span-1 text-right flex flex-col justify-center">
                          {editingItem === item.coinId ? (
                            <input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-full px-2 py-1 bg-white/20 dark:bg-gray-800/20 border border-white/30 dark:border-gray-600/30 rounded text-gray-900 dark:text-white text-sm text-right"
                              step="0.00000001"
                              placeholder="Amount"
                            />
                          ) : (
                            <>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {item.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {item.symbol.toUpperCase()}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Current Value */}
                        <div className="col-span-2 text-right flex flex-col justify-center">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(currentValue)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatCurrency(currentPrice)} each
                          </p>
                        </div>

                        {/* P&L */}
                        <div className="col-span-2 text-right flex flex-col justify-center">
                          <div className={`font-semibold ${getChangeColor(pnl)}`}>
                            {formatCurrency(pnl)}
                          </div>
                          <div className={`text-sm ${getChangeColor(pnl)}`}>
                            {formatPercentage(pnlPercentage)}
                          </div>
                        </div>

                        {/* 24h Change */}
                        <div className="col-span-2 text-right flex flex-col justify-center">
                          {currentCoin ? (
                            <div className={`font-semibold ${getChangeColor(priceChange)}`}>
                              {formatPercentage(priceChange)}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-end space-x-1">
                              <AlertCircle className="w-4 h-4" />
                              <span>No data</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 text-right flex items-center justify-end space-x-2">
                          {editingItem === item.coinId ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(item.coinId)}
                                className="p-2 text-green-500 hover:text-green-600 hover:bg-green-500/10 rounded-lg transition-colors"
                                title="Save"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  setEditingItem(null);
                                  setEditAmount('');
                                  setEditPurchasePrice('');
                                  setEditPurchaseDate('');
                                }}
                                className="p-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditAmount(item.coinId, item.amount)}
                                className="p-2 text-gray-500 hover:text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors"
                                title="Edit amount"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditPurchase(item)}
                                className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="Edit purchase details"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => removeFromPortfolio(item.coinId)}
                                className="p-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Additional Features Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8 p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-xl border border-purple-500/20"
            >
              <div className="flex items-start space-x-3">
                <BarChart3 className="w-6 h-6 text-purple-500 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Pro Tip: Track Your Portfolio Growth
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Add historical price tracking to visualize your portfolio's performance over time.
                    Consider integrating with a charting library like Recharts for detailed analytics.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default Portfolio;