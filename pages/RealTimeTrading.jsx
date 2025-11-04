
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
  Zap
} from "lucide-react";
import { toast } from "sonner";

// 固定 10 檔主力股票（價格 < $300）
const MAIN_STOCKS = ["TSLA", "NVDA", "AMD", "AAPL", "PYPL", "PLTR", "COIN", "SOFI", "GME", "BABA"];

export default function RealTimeTrading() {
  const { language } = useLanguage();
  const [isAIActive, setIsAIActive] = useState(false);
  const [aiMode, setAiMode] = useState('Active');
  const [pressure, setPressure] = useState(53);
  const [totalTrades, setTotalTrades] = useState(43);
  const [winRate, setWinRate] = useState(69);
  const [netProfit, setNetProfit] = useState(492);
  const [delayWarning, setDelayWarning] = useState(false);
  const queryClient = useQueryClient();

  // 模擬配置
  const SIMULATION_CONFIG = {
    capital: 2000,
    tradePercent: 0.05,
    fee: 0.08,
    slippage: 0.0005,
    holdTime: 60,
    buyThreshold: 2,
    sellThreshold: -2,
    pressureLow: 45,
    pressureHigh: 75,
    refreshInterval: 15
  };

  // 獲取股票報價
  const { data: liveQuotes = [], isLoading } = useQuery({
    queryKey: ['liveQuotesRealTime'],
    queryFn: async () => {
      try {
        const startTime = Date.now();
        const quotes = await base44.entities.LiveQuote.filter({});
        const delay = (Date.now() - startTime) / 1000;
        
        if (delay > 3) {
          setDelayWarning(true);
          setTimeout(() => setDelayWarning(false), 5000);
        }
        
        return quotes.filter(q => MAIN_STOCKS.includes(q.symbol));
      } catch (error) {
        console.error('Failed to fetch quotes:', error);
        return [];
      }
    },
    refetchInterval: isAIActive ? SIMULATION_CONFIG.refreshInterval * 1000 : false,
    retry: 1
  });

  // 獲取當前持倉
  const { data: positions = [] } = useQuery({
    queryKey: ['simulatedPositions'],
    queryFn: async () => {
      try {
        const trades = await base44.entities.AutoTrade.filter({ status: 'OPEN' });
        return trades;
      } catch (error) {
        console.error('Failed to fetch positions:', error);
        return [];
      }
    },
    refetchInterval: isAIActive ? 5000 : false,
    retry: 1
  });

  // 刷新報價
  const refreshQuotesMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('fetchLiveQuotes', { 
        symbols: MAIN_STOCKS 
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['liveQuotesRealTime']);
      toast.success(
        language === 'en' 
          ? '✅ Quotes refreshed' 
          : '✅ 報價已刷新'
      );
    },
    onError: (error) => {
      console.error('Refresh failed:', error);
      toast.error(
        language === 'en' 
          ? '❌ Failed to refresh quotes' 
          : '❌ 刷新報價失敗'
      );
    }
  });

  // 更新壓力值
  useEffect(() => {
    if (isAIActive && liveQuotes.length > 0) {
      const interval = setInterval(() => {
        try {
          const avgChange = liveQuotes.reduce((sum, q) => sum + Math.abs(q.change_pct || 0), 0) / liveQuotes.length;
          const newPressure = Math.min(100, Math.max(0, 50 + avgChange * 10));
          setPressure(Math.round(newPressure));
          
          // AI 模式切換
          if (newPressure > 80) {
            setAiMode('Halt');
          } else if (winRate < 50 && totalTrades > 5) {
            setAiMode('Cooling');
          } else {
            setAiMode('Active');
          }
        } catch (error) {
          console.error('Pressure update error:', error);
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isAIActive, liveQuotes, winRate, totalTrades]);

  // 初始刷新
  useEffect(() => {
    refreshQuotesMutation.mutate();
  }, []);

  const getPositionStatus = (symbol) => {
    try {
      const quote = liveQuotes.find(q => q.symbol === symbol);
      const position = positions.find(p => p.symbol === symbol);
      
      if (!quote) return 'Hold';
      
      if (position) {
        const currentGain = ((quote.last_price - position.buy_price) / position.buy_price) * 100;
        if (currentGain > 2) return 'Sell';
        return 'Hold';
      }
      
      const changePercent = quote.change_pct || 0;
      if (changePercent > SIMULATION_CONFIG.buyThreshold && pressure < SIMULATION_CONFIG.pressureLow) {
        return 'Buy';
      }
      
      return 'Hold';
    } catch (error) {
      console.error('Position status error:', error);
      return 'Hold';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Buy': return 'text-[#00ff88]';
      case 'Sell': return 'text-[#ff4d4d]';
      default: return 'text-[#ffaa00]';
    }
  };

  const getAIModeColor = (mode) => {
    switch (mode) {
      case 'Active': return 'text-[#00ff88]';
      case 'Cooling': return 'text-[#ffaa00]';
      case 'Halt': return 'text-[#ff4d4d]';
      default: return 'text-gray-400';
    }
  };

  const getPressureColor = (value) => {
    if (value <= 30) return '#00ff88';
    if (value <= 50) return '#00C6FF';
    if (value <= 70) return '#ffaa00';
    if (value <= 90) return '#ff4d4d';
    return '#aa00ff';
  };

  const handleToggleAI = () => {
    setIsAIActive(!isAIActive);
    if (!isAIActive) {
      toast.success(
        language === 'en' 
          ? '🤖 AI Trading Monitor Started' 
          : '🤖 AI 交易監控已啟動'
      );
    } else {
      toast.info(
        language === 'en' 
          ? '⏸️ AI Trading Monitor Stopped' 
          : '⏸️ AI 交易監控已停止'
      );
    }
  };

  return (
    <>
      {/* Header - simplified for tab context */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'en' ? '🟢 LIVE AI TRADING MONITOR' : '🟢 即時 AI 交易監控'}
        </h2>
        <div className="flex items-center gap-4">
          <Badge className={`${getAIModeColor(aiMode)} bg-opacity-20 text-sm px-3 py-1`}>
            AI Set {aiMode}
          </Badge>
          {delayWarning && (
            <Badge className="bg-yellow-500/20 text-yellow-500 text-xs">
              {language === 'en' ? '⚠️ Delay Compensation Active' : '⚠️ 延遲補償啟動'}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Controls */}
        <div className="flex items-center gap-3 justify-end">
          <Button
            onClick={() => refreshQuotesMutation.mutate()}
            disabled={refreshQuotesMutation.isLoading}
            variant="outline"
            className="border-gray-700 text-gray-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshQuotesMutation.isLoading ? 'animate-spin' : ''}`} />
            {language === 'en' ? 'Refresh' : '刷新'}
          </Button>
          
          <Button
            onClick={handleToggleAI}
            className={`${isAIActive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#00ff88] hover:bg-[#00cc7a]'} text-black font-semibold`}
          >
            {isAIActive ? (
              <>
                <PauseCircle className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Stop AI' : '停止 AI'}
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Start AI' : '啟動 AI'}
              </>
            )}
          </Button>
        </div>

        {/* Main Trading Monitor */}
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Stock List */}
              <div className="lg:col-span-3">
                <div className="grid grid-cols-4 gap-4 mb-4 pb-2 border-b border-gray-700">
                  <div className="text-sm font-semibold text-gray-400">Symbol</div>
                  <div className="text-sm font-semibold text-gray-400">Price</div>
                  <div className="text-sm font-semibold text-gray-400">Change</div>
                  <div className="text-sm font-semibold text-gray-400">Position</div>
                </div>

                <div className="space-y-3">
                  {MAIN_STOCKS.map(symbol => {
                    const quote = liveQuotes.find(q => q.symbol === symbol);
                    const status = getPositionStatus(symbol);
                    
                    return (
                      <div key={symbol} className="grid grid-cols-4 gap-4 items-center">
                        <div className="text-lg font-bold text-white">{symbol}</div>
                        <div className="text-lg font-bold text-white">
                          {quote?.last_price ? quote.last_price.toFixed(2) : '---'}
                        </div>
                        <div className={`text-base font-semibold ${
                          (quote?.change_pct || 0) >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                        }`}>
                          {quote?.change_pct !== undefined ? `${(quote.change_pct >= 0 ? '+' : '')}${quote.change_pct.toFixed(1)}%` : '---'}
                        </div>
                        <div className={`text-lg font-bold ${getStatusColor(status)}`}>
                          {status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pressure Gauge */}
              <div className="flex flex-col items-center justify-center">
                <div className="text-sm text-gray-400 mb-2">AI PRESSURE</div>
                <div className="relative w-20 h-64 bg-[#0d1b2a] rounded-full overflow-hidden border-2 border-gray-700">
                  <div 
                    className="absolute bottom-0 w-full transition-all duration-1000"
                    style={{
                      height: `${pressure}%`,
                      background: `linear-gradient(to top, ${getPressureColor(pressure)}, ${getPressureColor(pressure)}aa)`
                    }}
                  />
                </div>
                <div className="text-4xl font-bold text-white mt-4">{pressure}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardContent className="p-6 text-center">
              <div className="text-sm text-gray-400 mb-2">
                {language === 'en' ? 'TOTAL TRADES' : '總交易數'}
              </div>
              <div className="text-6xl font-bold text-white">{totalTrades}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardContent className="p-6 text-center">
              <div className="text-sm text-gray-400 mb-2">
                {language === 'en' ? 'WIN RATE' : '勝率'}
              </div>
              <div className="text-6xl font-bold gradient-text">{winRate}%</div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardContent className="p-6 text-center">
              <div className="text-sm text-gray-400 mb-2">
                {language === 'en' ? 'NET PROFIT' : '淨獲利'}
              </div>
              <div className={`text-6xl font-bold ${netProfit >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'}`}>
                {netProfit >= 0 ? '+' : ''}${netProfit}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Config Info */}
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Capital:</span>
                <span className="ml-2 text-white font-semibold">${SIMULATION_CONFIG.capital}</span>
              </div>
              <div>
                <span className="text-gray-400">Per Trade:</span>
                <span className="ml-2 text-white font-semibold">{(SIMULATION_CONFIG.tradePercent * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-gray-400">Hold Time:</span>
                <span className="ml-2 text-white font-semibold">{SIMULATION_CONFIG.holdTime}s</span>
              </div>
              <div>
                <span className="text-gray-400">Refresh:</span>
                <span className="ml-2 text-white font-semibold">{SIMULATION_CONFIG.refreshInterval}s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Learning Boost */}
        {winRate > 70 && totalTrades > 10 && (
          <Card className="bg-gradient-to-r from-[#00ff88]/10 to-transparent border-2 border-[#00ff88]/50 pressure-glow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-[#00ff88]" />
                <p className="text-lg font-bold text-white">
                  {language === 'en' ? '✅ AI Learning Boost Activated!' : '✅ AI 學習加速啟動！'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Notice */}
        <Card className="bg-yellow-500/10 border border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="mb-2">
                  {language === 'en'
                    ? '🎯 This is a demonstration interface showing real-time market monitoring with simulated trading logic.'
                    : '🎯 這是一個展示介面，顯示即時市場監控與模擬交易邏輯。'}
                </p>
                <p>
                  {language === 'en'
                    ? '📊 Statistics shown are for educational purposes. For active trading, please visit AutoTradeAI page.'
                    : '📊 顯示的統計數據僅供教學用途。如需實際交易，請前往 AutoTradeAI 頁面。'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
