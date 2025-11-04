import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  RefreshCw,
  Download,
  AlertTriangle,
  Lightbulb,
  User,
  Bot,
  Search,
  Plus,
  X,
  Gauge,
  BarChart3,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import AdvancedOrderDialog from "../components/trading/AdvancedOrderDialog";

const DEFAULT_STOCKS = ["TSLA", "NVDA", "AMD", "AAPL", "PYPL", "PLTR", "COIN", "SOFI", "GME", "BABA"];
const WATCHLIST_STORAGE_KEY = 'manualTrading_watchlist';

export default function ManualTrading() {
  const { language } = useLanguage();
  const [searchSymbol, setSearchSymbol] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [isDataStale, setIsDataStale] = useState(false);
  const [advancedOrderOpen, setAdvancedOrderOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const queryClient = useQueryClient();
  const isInitialMount = useRef(true);

  // 每個股票的數量狀態
  const [quantities, setQuantities] = useState({});

  // 從 localStorage 讀取觀察清單
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load watchlist from localStorage:', error);
    }
    return DEFAULT_STOCKS;
  });

  // 初始化數量狀態
  useEffect(() => {
    const initialQuantities = {};
    watchlist.forEach(symbol => {
      if (!quantities[symbol]) {
        initialQuantities[symbol] = 1;
      }
    });
    if (Object.keys(initialQuantities).length > 0) {
      setQuantities(prev => ({ ...prev, ...initialQuantities }));
    }
  }, [watchlist]);

  // 更新觀察清單並同步到 localStorage
  const updateWatchlist = (newWatchlist) => {
    setWatchlist(newWatchlist);
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(newWatchlist));
    } catch (error) {
      console.error('Failed to save watchlist to localStorage:', error);
    }
  };

  // 更新特定股票的數量
  const updateQuantity = (symbol, value) => {
    const qty = Math.max(1, Math.floor(Number(value) || 1));
    setQuantities(prev => ({
      ...prev,
      [symbol]: qty
    }));
  };

  // 配置參數
  const CONFIG = {
    capital: 2000,
    fee: 0.08,
    slippage: 0.0005,
    delayCompensation: 3
  };

  // 獲取壓力數據
  const { data: pressureData = [], refetch: refetchPressure, isLoading: pressureLoading } = useQuery({
    queryKey: ['stockPressureManual', watchlist],
    queryFn: async () => {
      console.log('🔵 Fetching pressure data for:', watchlist);
      try {
        const allData = await base44.entities.StockPressure.list('-timestamp', 200);
        console.log('📊 All pressure records:', allData.length);
        
        const latestBySymbol = {};
        allData.forEach(record => {
          if (watchlist.includes(record.symbol)) {
            if (!latestBySymbol[record.symbol] || 
                new Date(record.timestamp) > new Date(latestBySymbol[record.symbol].timestamp)) {
              latestBySymbol[record.symbol] = record;
            }
          }
        });
        
        const result = Object.values(latestBySymbol);
        console.log('✅ Filtered pressure data:', result.length, 'stocks');
        return result;
      } catch (error) {
        console.error('Failed to fetch pressure data:', error);
        return [];
      }
    },
    refetchInterval: 10000,
    staleTime: 5000,
    retry: 2
  });

  // 獲取情緒數據
  const { data: sentimentData = [] } = useQuery({
    queryKey: ['sentimentDataManual', watchlist],
    queryFn: async () => {
      try {
        const allData = await base44.entities.SemanticPressure.list('-timestamp', 200);
        const latestBySymbol = {};
        allData.forEach(record => {
          if (watchlist.includes(record.symbol)) {
            if (!latestBySymbol[record.symbol] || 
                new Date(record.timestamp) > new Date(latestBySymbol[record.symbol].timestamp)) {
              latestBySymbol[record.symbol] = record;
            }
          }
        });
        return Object.values(latestBySymbol);
      } catch (error) {
        console.error('Failed to fetch sentiment data:', error);
        return [];
      }
    },
    refetchInterval: 30000,
    retry: 1
  });

  // 獲取手動交易記錄
  const { data: manualTrades = [] } = useQuery({
    queryKey: ['manualTrades'],
    queryFn: async () => {
      console.log('🔵 Fetching manual trades...');
      try {
        const trades = await base44.entities.AutoTrade.list('-entry_time', 100);
        const manualOnly = trades.filter(t => 
          t.entry_reason_en?.toLowerCase().includes('manual') || 
          t.entry_reason_zh?.includes('手動')
        );
        console.log('✅ Manual trades found:', manualOnly.length);
        return manualOnly;
      } catch (error) {
        console.error('Failed to fetch trades:', error);
        return [];
      }
    },
    refetchInterval: 5000,
    retry: 2
  });

  // 獲取進階訂單
  const { data: advancedOrders = [] } = useQuery({
    queryKey: ['advancedOrders'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        const orders = await base44.entities.AdvancedOrder.filter({ user_id: user.email });
        return orders.filter(o => o.status === 'PENDING' || o.status === 'ACTIVE');
      } catch (error) {
        console.error('Failed to fetch advanced orders:', error);
        return [];
      }
    },
    refetchInterval: 5000,
    retry: 1
  });

  // 計算壓力
  const calculatePressureMutation = useMutation({
    mutationFn: async () => {
      console.log('🚀 Starting pressure calculation for:', watchlist);
      const response = await base44.functions.invoke('stockPressureIndexCalculator', {
        symbols: watchlist,
        mode: 'calculate'
      });
      console.log('✅ Pressure calculation response:', response.data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['stockPressureManual']);
      queryClient.invalidateQueries(['sentimentDataManual']);
      refetchPressure();
      setIsDataStale(false);
      toast.success(language === 'en' ? '✅ Pressure data refreshed' : '✅ 壓力數據已更新');
    },
    onError: (error) => {
      console.error('❌ Pressure calculation error:', error);
      setIsDataStale(true);
      toast.error(language === 'en' ? '❌ Failed to refresh pressure' : '❌ 壓力更新失敗');
    }
  });

  // 搜尋並添加股票
  const addStockMutation = useMutation({
    mutationFn: async (symbol) => {
      setIsSearching(true);
      const upperSymbol = symbol.toUpperCase().trim();
      
      if (watchlist.includes(upperSymbol)) {
        throw new Error('Stock already in watchlist');
      }

      console.log('🔍 Adding stock:', upperSymbol);
      const response = await base44.functions.invoke('stockPressureIndexCalculator', {
        symbols: [upperSymbol],
        mode: 'calculate'
      });
      
      return upperSymbol;
    },
    onSuccess: (symbol) => {
      updateWatchlist([...watchlist, symbol]);
      setSearchSymbol("");
      setIsSearching(false);
      queryClient.invalidateQueries(['stockPressureManual']);
      toast.success(
        language === 'en' 
          ? `✅ ${symbol} added to watchlist` 
          : `✅ ${symbol} 已添加到觀察清單`
      );
    },
    onError: (error) => {
      setIsSearching(false);
      if (error.message === 'Stock already in watchlist') {
        toast.error(
          language === 'en' 
            ? '⚠️ Stock already in watchlist' 
            : '⚠️ 股票已在觀察清單中'
        );
      } else {
        toast.error(
          language === 'en' 
            ? '❌ Failed to add stock' 
            : '❌ 添加股票失敗'
        );
      }
    }
  });

  // 刪除股票
  const removeStockMutation = useMutation({
    mutationFn: async (symbol) => {
      const openPosition = manualTrades.find(t => t.symbol === symbol && t.status === 'OPEN');
      
      if (openPosition) {
        throw new Error('Cannot remove stock with open position');
      }

      return symbol;
    },
    onSuccess: (symbol) => {
      const newWatchlist = watchlist.filter(s => s !== symbol);
      updateWatchlist(newWatchlist);
      
      // 清除該股票的數量狀態
      setQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[symbol];
        return newQuantities;
      });
      
      queryClient.invalidateQueries(['stockPressureManual']);
      toast.success(
        language === 'en' 
          ? `✅ ${symbol} removed from watchlist` 
          : `✅ ${symbol} 已從觀察清單移除`
      );
    },
    onError: (error) => {
      if (error.message === 'Cannot remove stock with open position') {
        toast.error(
          language === 'en' 
            ? '❌ Cannot remove stock with open position. Please close position first.' 
            : '❌ 無法移除有持倉的股票，請先平倉。'
        );
      } else {
        toast.error(
          language === 'en' 
            ? '❌ Failed to remove stock' 
            : '❌ 移除股票失敗'
        );
      }
    }
  });

  // 執行手動交易
  const executeTradeMutation = useMutation({
    mutationFn: async ({ symbol, action, price, pressure, shares: tradeShares }) => {
      console.log('🔵 Execute trade mutation called:', { symbol, action, price, pressure, shares: tradeShares });

      if (!price || price <= 0) {
        throw new Error('Invalid price');
      }

      if (!tradeShares || tradeShares <= 0) {
        throw new Error('Invalid shares');
      }

      const totalCost = tradeShares * price;
      const feeAmount = CONFIG.fee;
      const slippageAmount = totalCost * CONFIG.slippage;
      const finalCost = totalCost + feeAmount + slippageAmount;

      // Simulate 3s delay compensation
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayCompensation * 1000));

      if (action === 'BUY') {
        if (finalCost > CONFIG.capital) {
          throw new Error('Insufficient capital');
        }

        console.log('🟢 Processing BUY...');

        const existingPosition = manualTrades.find(t => t.symbol === symbol && t.status === 'OPEN');

        if (existingPosition) {
          const newTotalShares = existingPosition.shares + tradeShares;
          const newTotalCost = existingPosition.total_cost + finalCost;
          const newAvgPrice = newTotalCost / newTotalShares;

          const updateData = {
            shares: newTotalShares,
            total_cost: newTotalCost,
            buy_price: newAvgPrice,
            entry_reason_en: `${existingPosition.entry_reason_en}\nAdded: ${tradeShares} shares @ $${price.toFixed(2)} (Pressure: ${pressure}, Fee: $${feeAmount}, Slippage: $${slippageAmount.toFixed(2)})`,
            entry_reason_zh: `${existingPosition.entry_reason_zh}\n加碼：${tradeShares} 股 @ $${price.toFixed(2)}（壓力：${pressure}，手續費：$${feeAmount}，滑價：$${slippageAmount.toFixed(2)}）`
          };

          await base44.entities.AutoTrade.update(existingPosition.id, updateData);
          
          return {
            action: 'BUY_ADD',
            symbol,
            shares: tradeShares,
            totalShares: newTotalShares,
            price,
            avgPrice: newAvgPrice,
            cost: finalCost,
            totalCost: newTotalCost,
            pressure
          };
        } else {
          const tradeData = {
            symbol,
            company_name: symbol,
            buy_price: price,
            shares: tradeShares,
            total_cost: finalCost,
            entry_time: new Date().toISOString(),
            entry_reason_en: `Manual BUY: ${tradeShares} shares @ $${price.toFixed(2)} (Pressure: ${pressure}, Fee: $${feeAmount}, Slippage: $${slippageAmount.toFixed(2)})`,
            entry_reason_zh: `手動買入：${tradeShares} 股 @ $${price.toFixed(2)}（壓力：${pressure}，手續費：$${feeAmount}，滑價：$${slippageAmount.toFixed(2)}）`,
            entry_confidence: pressure,
            entry_flow_strength: pressure,
            status: 'OPEN',
            pl_percent: 0,
            pl_amount: 0
          };

          await base44.entities.AutoTrade.create(tradeData);
          
          return {
            action: 'BUY',
            symbol,
            shares: tradeShares,
            price,
            cost: finalCost,
            pressure
          };
        }

      } else if (action === 'SELL') {
        console.log('🔴 Processing SELL...');
        
        const openPosition = manualTrades.find(t => t.symbol === symbol && t.status === 'OPEN');
        
        if (!openPosition) {
          throw new Error('No open position');
        }

        if (tradeShares > openPosition.shares) {
          throw new Error('Insufficient shares');
        }

        const sellValue = tradeShares * price;
        const costBasis = openPosition.buy_price * tradeShares;
        const gainAmount = sellValue - costBasis - feeAmount - slippageAmount;
        const gainPercent = (gainAmount / costBasis) * 100;

        if (tradeShares === openPosition.shares) {
          // 全部賣出
          await base44.entities.AutoTrade.update(openPosition.id, {
            sell_price: price,
            exit_time: new Date().toISOString(),
            pl_percent: gainPercent,
            pl_amount: gainAmount,
            exit_reason_en: `Manual SELL: ${tradeShares} shares @ $${price.toFixed(2)} (Pressure: ${pressure}, ${gainPercent >= 0 ? 'Profit' : 'Loss'}: ${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%, Fee: $${feeAmount}, Slippage: $${slippageAmount.toFixed(2)})`,
            exit_reason_zh: `手動賣出：${tradeShares} 股 @ $${price.toFixed(2)}（壓力：${pressure}，${gainPercent >= 0 ? '獲利' : '虧損'}：${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%，手續費：$${feeAmount}，滑價：$${slippageAmount.toFixed(2)}）`,
            status: 'CLOSED',
            trade_type: gainAmount >= 0 ? 'WIN' : 'LOSS'
          });
        } else {
          // 部分賣出
          const remainingShares = openPosition.shares - tradeShares;
          const remainingCost = openPosition.total_cost - costBasis;

          await base44.entities.AutoTrade.update(openPosition.id, {
            shares: remainingShares,
            total_cost: remainingCost,
            entry_reason_en: `${openPosition.entry_reason_en}\nPartial SELL: ${tradeShares} shares @ $${price.toFixed(2)} (${gainPercent >= 0 ? 'Profit' : 'Loss'}: ${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%)`,
            entry_reason_zh: `${openPosition.entry_reason_zh}\n部分賣出：${tradeShares} 股 @ $${price.toFixed(2)}（${gainPercent >= 0 ? '獲利' : '虧損'}：${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%）`
          });
        }

        return {
          action: 'SELL',
          symbol,
          shares: tradeShares,
          remainingShares: tradeShares === openPosition.shares ? 0 : openPosition.shares - tradeShares,
          price,
          gain: gainAmount,
          gainPercent,
          pressure
        };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['manualTrades']);
      
      if (data.action === 'BUY') {
        toast.success(
          language === 'en'
            ? `🟢 Manual BUY: ${data.shares} shares of ${data.symbol} @ $${data.price.toFixed(2)} (Pressure: ${data.pressure})`
            : `🟢 手動買入：${data.symbol} ${data.shares} 股 @ $${data.price.toFixed(2)}（壓力：${data.pressure}）`
        );
      } else if (data.action === 'BUY_ADD') {
        toast.success(
          language === 'en'
            ? `🟢 Added to position: ${data.shares} shares of ${data.symbol} @ $${data.price.toFixed(2)} (Pressure: ${data.pressure})\nTotal: ${data.totalShares} shares @ avg $${data.avgPrice.toFixed(2)}`
            : `🟢 加碼買入：${data.symbol} ${data.shares} 股 @ $${data.price.toFixed(2)}（壓力：${data.pressure}）\n總計：${data.totalShares} 股 @ 均價 $${data.avgPrice.toFixed(2)}`
        );
      } else if (data.action === 'SELL') {
        const isFullSell = data.remainingShares === 0;
        toast.success(
          language === 'en'
            ? `🔴 Manual SELL: ${data.shares} shares of ${data.symbol} @ $${data.price.toFixed(2)} (Pressure: ${data.pressure}, ${data.gainPercent >= 0 ? 'Profit' : 'Loss'}: ${data.gainPercent >= 0 ? '+' : ''}$${Math.abs(data.gain).toFixed(2)})${!isFullSell ? `\nRemaining: ${data.remainingShares} shares` : ''}`
            : `🔴 手動賣出：${data.symbol} ${data.shares} 股 @ $${data.price.toFixed(2)}（壓力：${data.pressure}，${data.gainPercent >= 0 ? '獲利' : '虧損'}：${data.gainPercent >= 0 ? '+' : ''}$${Math.abs(data.gain).toFixed(2)}）${!isFullSell ? `\n剩餘：${data.remainingShares} 股` : ''}`
        );
      }
    },
    onError: (error) => {
      if (error.message === 'No open position') {
        toast.error(language === 'en' ? '❌ No open position for this stock' : '❌ 此股票沒有持倉');
      } else if (error.message === 'Insufficient capital') {
        toast.error(language === 'en' ? '❌ Insufficient capital' : '❌ 資金不足');
      } else if (error.message === 'Invalid price') {
        toast.error(language === 'en' ? '❌ Invalid price data' : '❌ 無效的價格數據');
      } else if (error.message === 'Invalid shares') {
        toast.error(language === 'en' ? '❌ Invalid share quantity' : '❌ 無效的股數');
      } else if (error.message === 'Insufficient shares') {
        toast.error(language === 'en' ? '❌ Insufficient shares in position' : '❌ 持倉股數不足');
      } else {
        toast.error(
          language === 'en' 
            ? `❌ Trade failed: ${error.message}` 
            : `❌ 交易失敗：${error.message}`
        );
      }
    }
  });

  // 計算統計數據
  const calculateStats = () => {
    const closedTrades = manualTrades.filter(t => t.status === 'CLOSED');
    const totalTrades = closedTrades.length;
    const winTrades = closedTrades.filter(t => t.trade_type === 'WIN').length;
    const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;
    const avgReturn = totalTrades > 0
      ? closedTrades.reduce((sum, t) => sum + (t.pl_percent || 0), 0) / totalTrades
      : 0;
    const totalPL = closedTrades.reduce((sum, t) => sum + (t.pl_amount || 0), 0);
    
    return { totalTrades, winRate, avgReturn, totalPL };
  };

  const stats = calculateStats();

  // 檢查數據延遲
  useEffect(() => {
    const checkDataFreshness = () => {
      if (pressureData.length === 0) {
        setIsDataStale(true);
        return;
      }
      
      const oldestUpdate = Math.min(...pressureData.map(p => new Date(p.timestamp).getTime()));
      const now = Date.now();
      const ageSeconds = (now - oldestUpdate) / 1000;
      
      setIsDataStale(ageSeconds > 15);
    };

    checkDataFreshness();
    const interval = setInterval(checkDataFreshness, 5000);
    
    return () => clearInterval(interval);
  }, [pressureData]);

  // 初次載入時自動刷新壓力數據
  useEffect(() => {
    if (isInitialMount.current && watchlist.length > 0) {
      console.log('🚀 Initial mount - calculating pressure for watchlist');
      isInitialMount.current = false;
      calculatePressureMutation.mutate();
    }
  }, []);

  const getPressureColor = (pressure) => {
    if (pressure < 45) return '#00ff88';
    if (pressure <= 70) return '#ffaa00';
    return '#ff4d4d';
  };

  const getButtonState = (pressure, action) => {
    if (isDataStale) {
      return {
        disabled: true,
        className: 'opacity-30 cursor-not-allowed bg-gray-600',
        tooltip: language === 'en' ? '⚠️ Waiting for updated data' : '⚠️ 等待數據更新'
      };
    }

    if (aiMode) {
      return {
        disabled: false,
        className: 'opacity-50',
        tooltip: language === 'en' ? 'AI Mode Active' : 'AI 模式啟用中'
      };
    }

    if (action === 'BUY') {
      if (pressure < 45) {
        return {
          disabled: false,
          className: 'bg-[#00ff88] hover:bg-[#00cc7a] text-black font-bold animate-pulse',
          tooltip: language === 'en' ? 'Low pressure - Good buy opportunity' : '低壓力 - 良好買入機會'
        };
      }
      return {
        disabled: false,
        className: 'bg-gray-600 hover:bg-gray-700 text-white opacity-50',
        tooltip: language === 'en' ? 'Not optimal for buying' : '非最佳買入時機'
      };
    }

    if (action === 'SELL') {
      if (pressure > 70) {
        return {
          disabled: false,
          className: 'bg-[#ff4d4d] hover:bg-[#cc3333] text-white font-bold animate-pulse',
          tooltip: language === 'en' ? 'High pressure - Consider selling' : '高壓力 - 考慮賣出'
        };
      }
      return {
        disabled: false,
        className: 'bg-gray-600 hover:bg-gray-700 text-white opacity-50',
        tooltip: language === 'en' ? 'Not optimal for selling' : '非最佳賣出時機'
      };
    }

    return {
      disabled: false,
      className: 'bg-gray-700 hover:bg-gray-800 text-white',
      tooltip: ''
    };
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchSymbol.trim()) {
      addStockMutation.mutate(searchSymbol);
    }
  };

  const handleRemoveStock = (symbol, e) => {
    e.stopPropagation();
    
    if (watchlist.length <= 1) {
      toast.error(
        language === 'en'
          ? '❌ Cannot remove the last stock from watchlist'
          : '❌ 無法移除最後一個股票'
      );
      return;
    }

    removeStockMutation.mutate(symbol);
  };

  const handleTrade = async (symbol, action, pressure) => {
    const pressureItem = pressureData.find(p => p.symbol === symbol);
    if (!pressureItem) {
      toast.error(language === 'en' ? '❌ No pressure data available' : '❌ 無壓力數據');
      return;
    }

    const price = pressureItem.price;
    const shares = quantities[symbol] || 1;

    executeTradeMutation.mutate({
      symbol,
      action,
      price,
      pressure: Math.round(pressure),
      shares
    });
  };

  const handleAdvancedOrder = (symbol) => {
    const pressureItem = pressureData.find(p => p.symbol === symbol);
    const sentimentItem = sentimentData.find(s => s.symbol === symbol);
    
    setSelectedStock({
      symbol,
      currentPrice: pressureItem?.price || 0,
      pressure: pressureItem?.final_pressure || 50,
      sentiment: sentimentItem?.sentiment || 'neutral'
    });
    setAdvancedOrderOpen(true);
  };

  // Loading state
  if (pressureLoading && pressureData.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="w-12 h-12 text-[#00C6FF] animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{language === 'en' ? 'Loading trading data...' : '載入交易數據中...'}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header - simplified for tab context */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'en' ? '🎯 Smart Manual Trading' : '🎯 智能手動交易'}
        </h2>
        <p className="text-gray-400">
          {language === 'en' 
            ? 'Pressure-guided manual trading with real-time AI insights' 
            : '壓力導向的手動交易與即時 AI 洞察'}
        </p>
      </div>

      <div className="space-y-6">
        {/* Controls */}
        <div className="flex items-center gap-3 justify-end flex-wrap">
          <Button
            onClick={() => calculatePressureMutation.mutate()}
            disabled={calculatePressureMutation.isLoading}
            variant="outline"
            className="border-gray-700 text-gray-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${calculatePressureMutation.isLoading ? 'animate-spin' : ''}`} />
            {language === 'en' ? 'Refresh' : '刷新'}
          </Button>

          <div className="flex items-center gap-2 px-4 py-2 bg-[#1a2332] border border-[#00C6FF]/30 rounded-xl">
            <Label htmlFor="ai-mode" className="text-white text-sm cursor-pointer">
              {aiMode ? (
                <><Bot className="w-4 h-4 inline mr-1" />{language === 'en' ? 'AI Mode' : 'AI 模式'}</>
              ) : (
                <><User className="w-4 h-4 inline mr-1" />{language === 'en' ? 'Manual Mode' : '手動模式'}</>
              )}
            </Label>
            <Switch
              id="ai-mode"
              checked={aiMode}
              onCheckedChange={setAiMode}
            />
          </div>
        </div>

        {/* Data Status Banner */}
        {isDataStale && (
          <Card className="bg-yellow-500/10 border-2 border-yellow-500/50 animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <p className="text-yellow-500 font-semibold">
                  {language === 'en'
                    ? '⚠️ Waiting for updated data - Click Refresh to update'
                    : '⚠️ 等待數據更新 - 點擊刷新按鈕更新'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advanced Orders Summary */}
        {advancedOrders.length > 0 && (
          <Card className="bg-purple-500/10 border-2 border-purple-500/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-semibold">
                    {language === 'en' 
                      ? `${advancedOrders.length} Advanced Order(s) Active`
                      : `${advancedOrders.length} 個進階訂單運行中`}
                  </span>
                </div>
                <Badge className="bg-purple-500 text-white">
                  {language === 'en' ? 'Monitoring' : '監控中'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Bar */}
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                placeholder={language === 'en' ? 'Enter symbol (e.g., AAPL)' : '輸入代號（例如：AAPL）'}
                className="bg-[#0d1b2a] border-gray-700 text-white"
              />
              <Button
                type="submit"
                disabled={isSearching || !searchSymbol.trim()}
                className="bg-[#00C6FF] hover:bg-[#0078FF] text-black"
              >
                {isSearching ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'Add' : '添加'}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Trading Table */}
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-[#00C6FF]" />
              {language === 'en' ? '📊 Smart Trading Dashboard' : '📊 智能交易儀表板'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pressureData.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-white">{language === 'en' ? 'Symbol' : '代號'}</TableHead>
                      <TableHead className="text-white text-right">{language === 'en' ? 'Price' : '價格'}</TableHead>
                      <TableHead className="text-white">{language === 'en' ? 'Pressure Index' : '壓力指數'}</TableHead>
                      <TableHead className="text-white text-center">{language === 'en' ? 'Quantity' : '數量'}</TableHead>
                      <TableHead className="text-white text-center">{language === 'en' ? 'Quick Trade' : '快速交易'}</TableHead>
                      <TableHead className="text-white text-center">{language === 'en' ? 'Advanced' : '進階'}</TableHead>
                      <TableHead className="text-white">{language === 'en' ? 'AI Suggestion' : 'AI 建議'}</TableHead>
                      <TableHead className="text-white text-right">{language === 'en' ? 'P/L %' : '損益 %'}</TableHead>
                      <TableHead className="text-white text-center">{language === 'en' ? 'Remove' : '移除'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pressureData.map((item) => {
                      const openPosition = manualTrades.find(t => t.symbol === item.symbol && t.status === 'OPEN');
                      const currentPL = openPosition 
                        ? ((item.price - openPosition.buy_price) / openPosition.buy_price) * 100 
                        : 0;
                      
                      const buyState = getButtonState(item.final_pressure, 'BUY');
                      const sellState = getButtonState(item.final_pressure, 'SELL');
                      
                      return (
                        <TableRow key={item.symbol} className="border-gray-700 hover:bg-[#0d1b2a]">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-white">{item.symbol}</span>
                              {openPosition && (
                                <Badge className="bg-yellow-500 text-black text-xs">
                                  {language === 'en' ? `OPEN (${openPosition.shares})` : `持倉 (${openPosition.shares})`}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <span className="text-lg font-bold text-white">
                              ${item.price?.toFixed(2) || 'N/A'}
                            </span>
                          </TableCell>
                          
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={item.final_pressure || 0}
                                  className="h-3 bg-[#0d1b2a] w-24"
                                />
                                <span
                                  className="text-lg font-bold"
                                  style={{ color: getPressureColor(item.final_pressure || 0) }}
                                >
                                  {item.final_pressure?.toFixed(0) || 'N/A'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.pressure_zone === 'BUY_ZONE' && '🟢 Buy Zone'}
                                {item.pressure_zone === 'NEUTRAL_ZONE' && '⚪️ Neutral'}
                                {item.pressure_zone === 'SELL_ZONE' && '🔴 Sell Zone'}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="1"
                              value={quantities[item.symbol] || 1}
                              onChange={(e) => updateQuantity(item.symbol, e.target.value)}
                              className="w-20 bg-[#0d1b2a] border-gray-700 text-white text-center"
                            />
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex gap-2 justify-center">
                              <Button
                                onClick={() => handleTrade(item.symbol, 'BUY', item.final_pressure)}
                                disabled={buyState.disabled || executeTradeMutation.isLoading}
                                className={`${buyState.className} min-w-[70px]`}
                                title={buyState.tooltip}
                                size="sm"
                              >
                                <ShoppingCart className="w-4 h-4 mr-1" />
                                BUY
                              </Button>
                              
                              <Button
                                onClick={() => handleTrade(item.symbol, 'SELL', item.final_pressure)}
                                disabled={sellState.disabled || !openPosition || executeTradeMutation.isLoading}
                                className={`${sellState.className} min-w-[70px]`}
                                title={sellState.tooltip}
                                size="sm"
                              >
                                <DollarSign className="w-4 h-4 mr-1" />
                                SELL
                              </Button>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <Button
                              onClick={() => handleAdvancedOrder(item.symbol)}
                              variant="outline"
                              size="sm"
                              className="border-purple-500 text-purple-400 hover:bg-purple-500/20"
                            >
                              <Zap className="w-4 h-4" />
                            </Button>
                          </TableCell>
                          
                          <TableCell>
                            <p className="text-sm text-gray-300">
                              {language === 'en' ? item.ai_suggestion_en : item.ai_suggestion_zh}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </p>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            {openPosition ? (
                              <span className={`text-lg font-bold ${
                                currentPL >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                              }`}>
                                {currentPL >= 0 ? '+' : ''}{currentPL.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-center">
                            <Button
                              onClick={(e) => handleRemoveStock(item.symbol, e)}
                              disabled={!!openPosition || watchlist.length <= 1}
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="mb-4">{language === 'en' ? 'Loading pressure data...' : '載入壓力數據中...'}</p>
                <Button
                  onClick={() => calculatePressureMutation.mutate()}
                  disabled={calculatePressureMutation.isLoading}
                  className="bg-[#00C6FF] hover:bg-[#0078FF] text-black"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${calculatePressureMutation.isLoading ? 'animate-spin' : ''}`} />
                  {language === 'en' ? 'Load Data' : '載入數據'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card className={`border-2 ${
          stats.totalPL >= 0 
            ? 'bg-[#00ff88]/10 border-[#00ff88]/50' 
            : stats.totalPL < -10
            ? 'bg-[#ff4d4d]/10 border-[#ff4d4d]/50'
            : 'bg-[#ffaa00]/10 border-[#ffaa00]/50'
        }`}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              {language === 'en' ? '📈 Manual Trading Performance' : '📈 手動交易績效'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">
                  {language === 'en' ? 'Total Trades' : '總交易數'}
                </div>
                <div className="text-3xl font-bold text-white">{stats.totalTrades}</div>
              </div>

              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">
                  {language === 'en' ? 'Win Rate' : '勝率'}
                </div>
                <div className="text-3xl font-bold text-white">{stats.winRate.toFixed(1)}%</div>
              </div>

              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">
                  {language === 'en' ? 'Avg Return' : '平均回報'}
                </div>
                <div className={`text-3xl font-bold ${
                  stats.avgReturn >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                }`}>
                  {stats.avgReturn >= 0 ? '+' : ''}{stats.avgReturn.toFixed(2)}%
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">
                  {language === 'en' ? 'Total P/L' : '總損益'}
                </div>
                <div className={`text-3xl font-bold ${
                  stats.totalPL >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                }`}>
                  {stats.totalPL >= 0 ? '+' : ''}${stats.totalPL.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-gradient-to-r from-[#00C6FF]/10 to-transparent bg-[#1a2332] border-2 border-[#00C6FF]/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-[#00C6FF] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="mb-2 font-semibold text-white">
                  {language === 'en' ? '💡 Smart Trading Guide:' : '💡 智能交易指南：'}
                </p>
                <ul className="space-y-1">
                  <li>• {language === 'en' ? 'Adjust quantity in the "Quantity" column before trading' : '在「數量」欄位調整股數後再交易'}</li>
                  <li>• {language === 'en' ? 'Pressure < 45: BUY button highlighted (green)' : '壓力 < 45：買入按鈕高亮（綠色）'}</li>
                  <li>• {language === 'en' ? '45 ≤ Pressure ≤ 70: Neutral (gray buttons)' : '45 ≤ 壓力 ≤ 70：中性（灰色按鈕）'}</li>
                  <li>• {language === 'en' ? 'Pressure > 70: SELL button highlighted (red)' : '壓力 > 70：賣出按鈕高亮（紅色）'}</li>
                  <li>• {language === 'en' ? 'Click Advanced (⚡) for stop-loss, take-profit, bracket & OCO orders' : '點擊進階 (⚡) 設定停損、停利、括弧和 OCO 訂單'}</li>
                  <li>• {language === 'en' ? 'Partial selling allowed - enter quantity less than position size' : '支持部分賣出 - 輸入小於持倉數的數量'}</li>
                  <li>• {language === 'en' ? 'Data auto-refreshes every 10 seconds' : '數據每 10 秒自動刷新'}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Order Dialog */}
      {selectedStock && (
        <AdvancedOrderDialog
          isOpen={advancedOrderOpen}
          onClose={() => {
            setAdvancedOrderOpen(false);
            setSelectedStock(null);
          }}
          symbol={selectedStock.symbol}
          currentPrice={selectedStock.currentPrice}
          pressure={selectedStock.pressure}
          sentiment={selectedStock.sentiment}
        />
      )}
    </>
  );
}