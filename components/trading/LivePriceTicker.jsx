import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "../../Layout";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

export default function LivePriceTicker({ symbols = [], refreshInterval = 5000 }) {
  const { language } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  // 確保 symbols 是陣列
  const validSymbols = Array.isArray(symbols) && symbols.length > 0 ? symbols : ["TSLA", "NVDA", "AAPL"];

  const { data: liveQuotes = [], isLoading, isFetching, isError } = useQuery({
    queryKey: ['livePriceTicker', validSymbols.join(',')],
    queryFn: async () => {
      try {
        console.log('🔵 Fetching live quotes for:', validSymbols);
        const quotes = await base44.entities.LiveQuote.filter({});
        const filtered = quotes.filter(q => validSymbols.includes(q.symbol));
        console.log('✅ Live quotes fetched:', filtered.length);
        return filtered;
      } catch (error) {
        console.error('Failed to fetch live quotes:', error);
        return [];
      }
    },
    refetchInterval: refreshInterval,
    retry: 2,
    staleTime: refreshInterval / 2
  });

  // 自動輪播
  useEffect(() => {
    if (liveQuotes.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % liveQuotes.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [liveQuotes.length]);

  if (isLoading && liveQuotes.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Activity className="w-8 h-8 text-[#00C6FF] animate-spin" />
      </div>
    );
  }

  if (isError || liveQuotes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">
          {language === 'en' 
            ? 'No live data available. Waiting for updates...' 
            : '無即時數據。等待更新中...'}
        </p>
      </div>
    );
  }

  const currentQuote = liveQuotes[currentIndex];
  
  if (!currentQuote) return null;

  const changePercent = currentQuote.change_pct || 0;
  const lastPrice = currentQuote.last_price || 0;
  const isPositive = changePercent >= 0;
  const isNeutral = Math.abs(changePercent) < 0.01;

  const getIcon = () => {
    if (isNeutral) return <Minus className="w-6 h-6" />;
    return isPositive 
      ? <TrendingUp className="w-6 h-6" /> 
      : <TrendingDown className="w-6 h-6" />;
  };

  const getColor = () => {
    if (isNeutral) return 'text-[#ffaa00]';
    return isPositive ? 'text-[#00ff88]' : 'text-[#ff4d4d]';
  };

  return (
    <div className="relative">
      {/* Live Status Indicator */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        {isFetching ? (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
            <Activity className="w-3 h-3 mr-1 animate-spin" />
            {language === 'en' ? 'Updating' : '更新中'}
          </Badge>
        ) : (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
            <Activity className="w-3 h-3 mr-1 animate-pulse" />
            {language === 'en' ? 'Live (5s)' : '即時 (5秒)'}
          </Badge>
        )}
      </div>

      {/* Main Display */}
      <div className="flex items-center justify-between bg-[#0d1b2a] rounded-xl p-6 border border-[#00C6FF]/20">
        <div className="flex items-center gap-4">
          <div className={`${getColor()}`}>
            {getIcon()}
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold text-white">
                {currentQuote.symbol}
              </span>
              <Badge 
                className={`${
                  currentQuote.market_session === 'PRE' ? 'bg-blue-500/20 text-blue-400' :
                  currentQuote.market_session === 'REG' ? 'bg-green-500/20 text-green-400' :
                  currentQuote.market_session === 'POST' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}
              >
                {currentQuote.market_session || 'CLOSED'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-white">
                ${lastPrice.toFixed(2)}
              </span>
              <span className={`text-xl font-semibold ${getColor()}`}>
                {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">
            {language === 'en' ? 'Volume' : '成交量'}
          </div>
          <div className="text-lg font-semibold text-gray-300">
            {((currentQuote.volume || 0) / 1000000).toFixed(2)}M
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            {language === 'en' ? 'Source' : '來源'}: {currentQuote.source_used || 'N/A'}
          </div>
        </div>
      </div>

      {/* Ticker Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {liveQuotes.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex 
                ? 'bg-[#00C6FF] w-8' 
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
          />
        ))}
      </div>

      {/* Mini Grid View */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
        {liveQuotes.map((quote, index) => {
          const qChangePercent = quote.change_pct || 0;
          const qIsPositive = qChangePercent >= 0;
          
          return (
            <button
              key={quote.symbol}
              onClick={() => setCurrentIndex(index)}
              className={`p-3 rounded-lg border transition-all ${
                index === currentIndex
                  ? 'bg-[#00C6FF]/20 border-[#00C6FF]'
                  : 'bg-[#0d1b2a] border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="text-sm font-bold text-white mb-1">
                {quote.symbol}
              </div>
              <div className="text-lg font-bold text-white">
                ${(quote.last_price || 0).toFixed(2)}
              </div>
              <div className={`text-xs font-semibold ${
                qIsPositive ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
              }`}>
                {qChangePercent >= 0 ? '+' : ''}{qChangePercent.toFixed(2)}%
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}