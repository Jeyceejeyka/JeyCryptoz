import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Filter, SortAsc, SortDesc, RefreshCw } from 'lucide-react';
import { SortOption, SortDirection } from '../types';
import { useMarket } from '../context/MarketContext'; // Import the hook
import CoinCard from '../components/UI/CoinCard';
import SearchBar from '../components/UI/SearchBar';
import { PageLoader } from '../components/UI/Loader';

const Market: React.FC = () => {
  const { coins, loading, lastUpdated, error, refreshCoins } = useMarket(); // Use context
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('market_cap');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshCoins();
    setRefreshing(false);
  };

  const filteredAndSortedCoins = useMemo(() => {
    let filtered = Array.isArray(coins) ? coins : [];

    // Apply search filter
    if (searchQuery) {
      filtered = (Array.isArray(coins) ? coins : []).filter(
        (coin) =>
          coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Create a copy to avoid mutating the original array
    const sorted = [...filtered];
    
    // Apply sorting
    sorted.sort((a, b) => {
      let aValue: number = 0;
      let bValue: number = 0;

      switch (sortBy) {
        case 'price':
          aValue = a.current_price || 0;
          bValue = b.current_price || 0;
          break;
        case 'volume':
          aValue = a.total_volume || 0;
          bValue = b.total_volume || 0;
          break;
        case 'change':
          aValue = a.price_change_percentage_24h || 0;
          bValue = b.price_change_percentage_24h || 0;
          break;
        case 'market_cap':
        default:
          aValue = a.market_cap || 0;
          bValue = b.market_cap || 0;
          break;
      }

      return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
    });

    return sorted;
  }, [coins, searchQuery, sortBy, sortDirection]);

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDirection('desc');
    }
  };

  if (loading && coins.length === 0) {
    return <PageLoader />;
  }

  if (error && coins.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={refreshCoins}
            className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
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
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Cryptocurrency Market
            </h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`p-2 rounded-full ${refreshing ? 'bg-gray-300' : 'bg-purple-100 dark:bg-purple-900'} hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors`}
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-gray-500' : 'text-purple-600 dark:text-purple-300'}`} />
            </button>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Explore and analyze the top cryptocurrencies
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </motion.div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <SearchBar
            onSearch={setSearchQuery}
            placeholder="Search cryptocurrencies..."
          />
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 dark:bg-gray-800/10 backdrop-blur-lg rounded-lg border border-white/20 dark:border-gray-700/20 hover:bg-white/20 dark:hover:bg-gray-800/20 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredAndSortedCoins.length} of {coins.length} cryptocurrencies
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex items-center space-x-2">
              {[
                { key: 'market_cap', label: 'Market Cap' },
                { key: 'price', label: 'Price' },
                { key: 'volume', label: 'Volume' },
                { key: 'change', label: '24h Change' },
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleSort(option.key as SortOption)}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === option.key
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 dark:bg-gray-800/10 text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-800/20'
                  }`}
                >
                  <span>{option.label}</span>
                  {sortBy === option.key && (
                    sortDirection === 'asc' ? 
                      <SortAsc className="w-3 h-3" /> : 
                      <SortDesc className="w-3 h-3" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Display refreshing overlay if refreshing with existing data */}
        {refreshing && coins.length > 0 && (
          <div className="fixed top-20 right-4 bg-purple-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Updating...</span>
          </div>
        )}

        {/* Coins Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {(Array.isArray(filteredAndSortedCoins) ? filteredAndSortedCoins : []).map((coin, index) => (
            <CoinCard key={coin.id} coin={coin} index={index} />
          ))}
        </motion.div>

        {/* No Results */}
        {filteredAndSortedCoins.length === 0 && searchQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-xl text-gray-600 dark:text-gray-400">
              No cryptocurrencies found matching "{searchQuery}".
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Market;