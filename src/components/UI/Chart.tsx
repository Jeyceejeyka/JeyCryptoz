import React from 'react';
import { motion } from 'framer-motion';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';
import { PriceData } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface ChartProps {
  data: PriceData;
  days: number;
  isPositive: boolean;
}

const Chart: React.FC<ChartProps> = ({ data, days, isPositive }) => {
  const chartData = data.prices.map(([timestamp, price]) => ({
    time: timestamp,
    price: price,
    date: new Date(timestamp).toLocaleDateString(),
    formattedDate: new Date(timestamp).toLocaleString(),
  }));

  // Calculate min and max for better visualization
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  const formatXAxis = (tickItem: number) => {
    const date = new Date(tickItem);
    if (days <= 1) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days <= 7) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg p-3 rounded-lg border border-gray-300 dark:border-gray-700 shadow-lg"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {new Date(label).toLocaleString()}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatCurrency(payload[0].value)}
          </p>
        </motion.div>
      );
    }
    return null;
  };

  // Custom dot component that always returns an element
  const CustomDot = (props: any) => {
    const { cx, cy, index } = props;
    
    // Show dots only for every 5th point to avoid clutter
    if (index % 5 !== 0) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={0}
          fill="transparent"
          stroke="transparent"
          strokeWidth={0}
        />
      );
    }
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={2}
        fill="#FFFFFF"
        stroke={isPositive ? "#059669" : "#DC2626"}
        strokeWidth={1.5}
      />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-80 p-4 bg-white/10 dark:bg-gray-800/10 backdrop-blur-lg rounded-xl border border-white/20 dark:border-gray-700/20"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            {/* Sharp gradient for clear definition */}
            <linearGradient id="sharpGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={isPositive ? "#059669" : "#DC2626"}
                stopOpacity={0.8}
              />
              <stop
                offset="50%"
                stopColor={isPositive ? "#059669" : "#DC2626"}
                stopOpacity={0.4}
              />
              <stop
                offset="100%"
                stopColor={isPositive ? "#059669" : "#DC2626"}
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
          
          {/* Grid with subtle lines */}
          <CartesianGrid 
            strokeDasharray="1 1" 
            stroke="rgba(156, 163, 175, 0.2)" 
            vertical={false}
          />
          
          {/* X Axis with better styling */}
          <XAxis
            dataKey="time"
            tickFormatter={formatXAxis}
            axisLine={{ stroke: 'rgba(156, 163, 175, 0.5)' }}
            tickLine={false}
            tick={{ fill: 'rgba(107, 114, 128, 0.9)', fontSize: 11, fontWeight: 500 }}
            padding={{ left: 10, right: 10 }}
          />
          
          {/* Y Axis with better styling */}
          <YAxis
            tickFormatter={(value) => formatCurrency(value)}
            axisLine={{ stroke: 'rgba(156, 163, 175, 0.5)' }}
            tickLine={false}
            tick={{ fill: 'rgba(107, 114, 128, 0.9)', fontSize: 11, fontWeight: 500 }}
            domain={[minPrice - priceRange * 0.05, maxPrice + priceRange * 0.05]}
          />
          
          {/* Custom tooltip */}
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ 
              stroke: isPositive ? '#059669' : '#DC2626',
              strokeWidth: 1,
              strokeDasharray: "5 5",
            }}
          />
          
          {/* Main area with sharp edges */}
          <Area
            type="linear" // Changed from "monotone" to "linear" for sharper edges
            dataKey="price"
            stroke={isPositive ? "#059669" : "#DC2626"}
            strokeWidth={2.5}
            fill="url(#sharpGradient)"
            dot={<CustomDot />}
            activeDot={{
              r: 6,
              fill: "#FFFFFF",
              stroke: isPositive ? "#059669" : "#DC2626",
              strokeWidth: 3,
            }}
            connectNulls={true}
          />
          
          {/* Optional: Add reference lines for important levels */}
          {priceRange > 0 && (
            <>
              <ReferenceLine
                y={minPrice}
                stroke="rgba(239, 68, 68, 0.3)"
                strokeWidth={1}
                strokeDasharray="3 3"
                label={{ 
                  value: 'Low', 
                  position: 'insideBottomRight',
                  fill: 'rgba(239, 68, 68, 0.8)',
                  fontSize: 10 
                }}
              />
              <ReferenceLine
                y={maxPrice}
                stroke="rgba(34, 197, 94, 0.3)"
                strokeWidth={1}
                strokeDasharray="3 3"
                label={{ 
                  value: 'High', 
                  position: 'insideTopRight',
                  fill: 'rgba(34, 197, 94, 0.8)',
                  fontSize: 10 
                }}
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default Chart;