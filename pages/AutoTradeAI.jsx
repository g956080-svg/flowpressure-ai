
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../Layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  AlertTriangle, 
  Sparkles, 
  TrendingUp, 
  Shield, 
  RefreshCw, 
  Activity,
  Wrench
} from "lucide-react";
import AutoTradeSettings from "../components/autotrade/AutoTradeSettings";
import AutoTradeJournal from "../components/autotrade/AutoTradeJournal";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function AutoTradeAI() {
  const { language } = useLanguage();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isLoadingHotStocks, setIsLoadingHotStocks] = useState(false);
  const [isRepairingSystem, setIsRepairingSystem] = useState(false);
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['autoTradeConfig'],
    queryFn: async () => {
      const configs = await base44.entities.AutoTradeConfig.list();
      if (configs.length === 0) {
        return await base44.entities.AutoTradeConfig.create({
          is_enabled: false,
          starting_balance: 2000,
          current_balance: 2000,
          max_trade_per_stock: 100,
          max_open_positions: 3,
          profit_target_percent: 3.5,
          stop_loss_percent: -1.8,
          scan_frequency_seconds: 15,
          protect_when_off: true,
          total_trades_today: 0,
          total_pl_today: 0,
          win_rate: 0,
          has_accepted_disclaimer: false
        });
      }
      return configs[0];
    }
  });

  const { data: hotStocks = [] } = useQuery({
    queryKey: ['hotStocksForAI'],
    queryFn: async () => {
      const symbols = ["TSLA", "NVDA", "AAPL", "GME", "COIN", "PLTR", "AMD", "BABA", "PYPL"];
      const stocks = await base44.entities.WatchedStock.filter({});
      
      const existingSymbols = stocks.map(s => s.symbol);
      const missingSymbols = symbols.filter(sym => !existingSymbols.includes(sym));
      
      for (const symbol of missingSymbols) {
        await base44.entities.WatchedStock.create({
          symbol,
          company_name: symbol,
          added_by: 'system',
          is_hot: true,
          flow_score: 50,
          last_updated: new Date().toISOString()
        });
      }
      
      return symbols.map(symbol => {
        const stock = stocks.find(s => s.symbol === symbol);
        return stock || {
          symbol,
          company_name: symbol,
          flow_score: 50,
          is_hot: true,
          id: symbol
        };
      });
    },
    refetchInterval: 60000
  });

  const { data: liveQuotes = [] } = useQuery({
    queryKey: ['liveQuotesForAI'],
    queryFn: async () => {
      if (hotStocks.length === 0) return [];
      const symbols = hotStocks.map(s => s.symbol);
      const quotes = await base44.entities.LiveQuote.filter({});
      return quotes.filter(q => symbols.includes(q.symbol));
    },
    enabled: hotStocks.length > 0,
    refetchInterval: 10000
  });

  const { data: openTrades = [] } = useQuery({
    queryKey: ['openAutoTrades'],
    queryFn: async () => {
      const trades = await base44.entities.AutoTrade.list();
      return trades.filter(t => t.status === "OPEN");
    },
    refetchInterval: 5000
  });

  const { data: recentErrors = [] } = useQuery({
    queryKey: ['recentErrors'],
    queryFn: async () => {
      const errors = await base44.entities.ErrorLog.list('-timestamp', 5);
      return errors.filter(e => e.severity === 'critical' || e.severity === 'warning');
    },
    refetchInterval: 30000
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AutoTradeConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoTradeConfig'] });
    },
  });

  const createTradeMutation = useMutation({
    mutationFn: (data) => base44.entities.AutoTrade.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openAutoTrades'] });
      queryClient.invalidateQueries({ queryKey: ['autoTrades'] });
    },
  });

  const updateTradeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AutoTrade.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openAutoTrades'] });
      queryClient.invalidateQueries({ queryKey: ['autoTrades'] });
    },
  });

  const loadHotStocksMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('getHotStocks', { 
        count: 9,
        force_refresh: false
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.data.success) {
        queryClient.invalidateQueries(['hotStocksForAI']);
        const symbols = data.data.stocks.map(s => s.symbol);
        fetchQuotesMutation.mutate(symbols);
        toast.success(
          language === 'en' 
            ? `✅ Loaded ${data.data.stocks.length} hot stocks`
            : `✅ 已載入 ${data.data.stocks.length} 檔熱門股票`
        );
      }
    }
  });

  const fetchQuotesMutation = useMutation({
    mutationFn: async (symbols) => {
      const response = await base44.functions.invoke('fetchLiveQuotes', { symbols });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['liveQuotesForAI']);
    }
  });

  const repairSystemMutation = useMutation({
    mutationFn: async () => {
      const repairs = [];
      
      // 1. 檢查並修復配置
      if (config) {
        if (config.current_balance < 0) {
          await base44.entities.AutoTradeConfig.update(config.id, {
            current_balance: config.starting_balance
          });
          repairs.push('Reset negative balance');
        }
        
        if (!config.starting_balance || config.starting_balance !== 2000) {
          await base44.entities.AutoTradeConfig.update(config.id, {
            starting_balance: 2000,
            current_balance: 2000
          });
          repairs.push('Fixed capital settings');
        }
      }
      
      // 2. 檢查並修復持倉
      const allPositions = await base44.entities.PortfolioPosition.filter({});
      for (const pos of allPositions) {
        if (pos.quantity < 0 || !isFinite(pos.quantity) || pos.avg_cost < 0) {
          await base44.entities.PortfolioPosition.delete(pos.id);
          repairs.push(`Removed invalid position: ${pos.symbol}`);
        }
      }
      
      // 3. 檢查並修復帳戶狀態
      const accounts = await base44.entities.AccountState.filter({});
      for (const acc of accounts) {
        if (acc.cash_balance < 0 || !isFinite(acc.cash_balance)) {
          await base44.entities.AccountState.update(acc.id, {
            cash_balance: 100000,
            total_value: 100000
          });
          repairs.push('Fixed account state');
        }
      }
      
      // 4. 清理過時數據
      const oldTrades = await base44.entities.AutoTrade.list('-entry_time', 1000);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      
      let deletedCount = 0;
      for (const trade of oldTrades) {
        if (new Date(trade.entry_time) < cutoffDate) {
          await base44.entities.AutoTrade.delete(trade.id);
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        repairs.push(`Cleaned ${deletedCount} old trades`);
      }
      
      // 5. 刷新報價數據
      const symbols = ["TSLA", "NVDA", "AAPL", "GME", "COIN", "PLTR", "AMD", "BABA", "PYPL"];
      await base44.functions.invoke('fetchLiveQuotes', { symbols });
      repairs.push('Refreshed live quotes');
      
      // 6. 記錄修復日誌
      await base44.entities.ErrorLog.create({
        timestamp: new Date().toISOString(),
        source: 'AI_REPAIR',
        message: `System auto-repair completed: ${repairs.join(', ')}`,
        severity: 'info',
        details: JSON.stringify({ repairs })
      });
      
      return { success: true, repairs };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast.success(
        language === 'en'
          ? `🔧 System repaired! ${data.repairs.length} issues fixed`
          : `🔧 系統已修復！修正了 ${data.repairs.length} 個問題`
      );
    },
    onError: (error) => {
      toast.error(
        language === 'en'
          ? '❌ System repair failed'
          : '❌ 系統修復失敗'
      );
    }
  });

  const getTop3Stocks = () => {
    if (liveQuotes.length === 0) return [];
    
    const stocksWithQuotes = hotStocks
      .map(stock => {
        const quote = liveQuotes.find(q => q.symbol === stock.symbol);
        return quote ? { ...stock, quote } : null;
      })
      .filter(Boolean);
    
    const ranked = stocksWithQuotes
      .map(stock => {
        const changePercent = Math.abs(stock.quote.change_pct || 0);
        const volume = stock.quote.volume || 0;
        const flowScore = stock.flow_score || 50;
        const volatilityScore = Math.min(changePercent * 20, 50);
        const volumeScore = Math.min(volume / 10000000 * 30, 30);
        const aiScore = flowScore * 0.4 + volatilityScore * 0.3 + volumeScore * 0.3;
        
        return {
          ...stock,
          ai_score: aiScore,
          change_percent: stock.quote.change_pct,
          current_price: stock.quote.last_price
        };
      })
      .sort((a, b) => b.ai_score - a.ai_score);
    
    return ranked.slice(0, 3);
  };

  const checkAndEnter = async () => {
    if (!config || !config.is_enabled) return;
    if (openTrades.length >= config.max_open_positions) return;
    
    const top3 = getTop3Stocks();
    if (top3.length === 0) return;

    for (const stock of top3) {
      const todayTrades = await base44.entities.AutoTrade.filter({ symbol: stock.symbol });
      const todayCount = todayTrades.filter(t => {
        const tradeDate = new Date(t.entry_time).toDateString();
        const today = new Date().toDateString();
        return tradeDate === today;
      }).length;
      
      if (todayCount >= 5) continue;
      const alreadyHolding = openTrades.some(t => t.symbol === stock.symbol);
      if (alreadyHolding) continue;

      const quote = stock.quote;
      const changePercent = Math.abs(quote.change_pct || 0);
      const isUptrend = (quote.change_pct || 0) > 0;
      const hasVolume = (quote.volume || 0) > 1000000;
      const aiConfidence = stock.ai_score;
      
      if (changePercent >= 0.5 && hasVolume && aiConfidence >= 60 && isUptrend) {
        const tradeAmount = config.starting_balance * 0.05;
        const shares = Math.floor(tradeAmount / quote.last_price);
        const totalCost = shares * quote.last_price;
        
        if (totalCost > config.current_balance) continue;

        const entryReason = {
          en: `AI detected day-trading opportunity: ${changePercent.toFixed(2)}% momentum, Volume: ${(quote.volume / 1000000).toFixed(1)}M, AI Score: ${aiConfidence.toFixed(0)}`,
          zh: `AI 偵測到當沖機會：動能 ${changePercent.toFixed(2)}%，成交量 ${(quote.volume / 1000000).toFixed(1)}M，AI 評分 ${aiConfidence.toFixed(0)}`
        };

        await createTradeMutation.mutateAsync({
          symbol: stock.symbol,
          company_name: stock.company_name,
          buy_price: quote.last_price,
          shares: shares,
          total_cost: totalCost,
          entry_time: new Date().toISOString(),
          entry_reason_en: entryReason.en,
          entry_reason_zh: entryReason.zh,
          entry_flow_strength: aiConfidence,
          entry_confidence: aiConfidence,
          status: "OPEN",
          pl_percent: 0,
          pl_amount: 0
        });

        await updateConfigMutation.mutateAsync({
          id: config.id,
          data: {
            current_balance: config.current_balance - totalCost,
            total_trades_today: config.total_trades_today + 1
          }
        });

        toast.success(
          language === 'en'
            ? `🤖 AI entered ${shares} shares of ${stock.symbol} @ $${quote.last_price.toFixed(2)}`
            : `🤖 AI 已進場 ${stock.symbol}，${shares} 股 @ $${quote.last_price.toFixed(2)}`
        );
        break;
      }
    }
  };

  const checkAndExit = async () => {
    if (!config) return;
    if (!config.is_enabled && !config.protect_when_off) return;

    for (const trade of openTrades) {
      const quote = liveQuotes.find(q => q.symbol === trade.symbol);
      if (!quote) continue;

      const currentGainPercent = ((quote.last_price - trade.buy_price) / trade.buy_price) * 100;
      const currentGainAmount = (quote.last_price - trade.buy_price) * trade.shares;
      
      let shouldExit = false;
      let exitReason = { en: "", zh: "" };

      if (currentGainPercent >= config.profit_target_percent) {
        shouldExit = true;
        exitReason.en = `Day-trading profit target reached (+${currentGainPercent.toFixed(2)}%). AI locked gains.`;
        exitReason.zh = `當沖獲利目標達成 (+${currentGainPercent.toFixed(2)}%)，AI 鎖定獲利。`;
      } else if (currentGainPercent <= config.stop_loss_percent) {
        shouldExit = true;
        exitReason.en = `Day-trading stop-loss triggered (${currentGainPercent.toFixed(2)}%). AI cut losses.`;
        exitReason.zh = `當沖停損觸發 (${currentGainPercent.toFixed(2)}%)，AI 停損離場。`;
      } else if (currentGainPercent > 0.5 && currentGainPercent < config.profit_target_percent) {
        const timeSinceEntry = (Date.now() - new Date(trade.entry_time).getTime()) / 1000;
        if (timeSinceEntry > 60 && currentGainPercent < 1) {
          shouldExit = true;
          exitReason.en = `Day-trading momentum fading. AI exits to preserve capital.`;
          exitReason.zh = `當沖動能消退，AI 離場保護資金。`;
        }
      } else {
        const now = new Date();
        const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const timeInMinutes = etTime.getHours() * 60 + etTime.getMinutes();
        if (timeInMinutes >= 945) {
          shouldExit = true;
          exitReason.en = `Market closing soon. AI exits all positions (day-trading rule).`;
          exitReason.zh = `接近收盤，AI 平倉所有部位（當沖規則）。`;
        }
      }

      if (shouldExit) {
        const sellValue = quote.last_price * trade.shares;
        
        await updateTradeMutation.mutateAsync({
          id: trade.id,
          data: {
            sell_price: quote.last_price,
            exit_time: new Date().toISOString(),
            pl_percent: currentGainPercent,
            pl_amount: currentGainAmount,
            exit_reason_en: exitReason.en,
            exit_reason_zh: exitReason.zh,
            status: "CLOSED",
            trade_type: currentGainAmount >= 0 ? "WIN" : "LOSS"
          }
        });

        const newBalance = config.current_balance + sellValue;
        const newTotalPL = config.total_pl_today + currentGainAmount;
        const allTrades = await base44.entities.AutoTrade.filter({ status: "CLOSED" });
        const wins = allTrades.filter(t => t.trade_type === "WIN").length;
        const winRate = allTrades.length > 0 ? (wins / allTrades.length) * 100 : 0;
        
        await updateConfigMutation.mutateAsync({
          id: config.id,
          data: {
            current_balance: newBalance,
            total_pl_today: newTotalPL,
            win_rate: winRate
          }
        });

        toast(
          language === 'en'
            ? currentGainAmount >= 0 
              ? `💰 AI exited ${trade.symbol} at +${currentGainPercent.toFixed(2)}%. Profit: $${currentGainAmount.toFixed(2)}`
              : `⚠️ AI stopped loss on ${trade.symbol} at ${currentGainPercent.toFixed(2)}%. Loss: $${Math.abs(currentGainAmount).toFixed(2)}`
            : currentGainAmount >= 0
              ? `💰 AI 已平倉 ${trade.symbol} +${currentGainPercent.toFixed(2)}%，獲利 $${currentGainAmount.toFixed(2)}`
              : `⚠️ AI 已停損 ${trade.symbol} ${currentGainPercent.toFixed(2)}%，虧損 $${Math.abs(currentGainAmount).toFixed(2)}`,
          { duration: 5000 }
        );
      }
    }
  };

  useEffect(() => {
    if (config && config.is_enabled) {
      const interval = setInterval(() => {
        checkAndEnter();
        checkAndExit();
      }, config.scan_frequency_seconds * 1000);
      return () => clearInterval(interval);
    }
  }, [config?.is_enabled, config?.scan_frequency_seconds, liveQuotes, openTrades]);

  useEffect(() => {
    if (config && !config.is_enabled && config.protect_when_off) {
      const interval = setInterval(() => checkAndExit(), 10000);
      return () => clearInterval(interval);
    }
  }, [config?.is_enabled, config?.protect_when_off, liveQuotes, openTrades]);

  useEffect(() => {
    if (hotStocks.length === 0) {
      setIsLoadingHotStocks(true);
      loadHotStocksMutation.mutateAsync().finally(() => setIsLoadingHotStocks(false));
    }
  }, []);

  useEffect(() => {
    if (hotStocks.length > 0) {
      const symbols = hotStocks.map(s => s.symbol);
      fetchQuotesMutation.mutate(symbols);
      const interval = setInterval(() => fetchQuotesMutation.mutate(symbols), 10000);
      return () => clearInterval(interval);
    }
  }, [hotStocks]);

  const handleToggleAI = async (enabled) => {
    if (!config) return;
    if (enabled && !config.has_accepted_disclaimer) {
      setShowDisclaimer(true);
      return;
    }
    await updateConfigMutation.mutateAsync({
      id: config.id,
      data: { is_enabled: enabled }
    });
    toast(
      language === 'en'
        ? enabled ? '🤖 Day-Trading AI enabled!' : '🛑 Day-Trading AI stopped'
        : enabled ? '🤖 當沖 AI 已啟用！' : '🛑 當沖 AI 已停止'
    );
  };

  const acceptDisclaimer = async () => {
    if (!config) return;
    await updateConfigMutation.mutateAsync({
      id: config.id,
      data: { has_accepted_disclaimer: true, is_enabled: true }
    });
    setShowDisclaimer(false);
    toast.success(
      language === 'en'
        ? '🤖 Day-Trading AI enabled! AI will trade Top 3 stocks...'
        : '🤖 當沖 AI 已啟用！AI 將操作前 3 檔股票...'
    );
  };

  const handleSystemRepair = async () => {
    setIsRepairingSystem(true);
    await repairSystemMutation.mutateAsync();
    setIsRepairingSystem(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-16 h-16 border-4 border-[#00ff99] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Header - simplified for tab context */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          {language === 'en' ? 'Day-Trading AI' : '當沖 AI 操盤'}
        </h2>
        <p className="text-gray-400">
          {language === 'en' 
            ? 'AI-powered intraday trading - Virtual learning system'
            : 'AI 驅動的當沖交易 - 虛擬學習系統'}
        </p>
      </div>

      <div className="space-y-6">
        {/* Controls */}
        <div className="flex items-center gap-4 justify-end flex-wrap">
          <Button
            onClick={() => {
              setIsLoadingHotStocks(true);
              loadHotStocksMutation.mutateAsync().finally(() => setIsLoadingHotStocks(false));
            }}
            disabled={isLoadingHotStocks}
            variant="outline"
            className="border-gray-700 text-gray-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingHotStocks ? 'animate-spin' : ''}`} />
            {language === 'en' ? 'Refresh Stocks' : '刷新股票'}
          </Button>
          
          <div className="flex items-center gap-3 px-4 py-2 bg-[#151a21] border border-gray-800 rounded-xl">
            <span className="text-sm font-semibold text-gray-400">
              {language === 'en' ? 'AI Trading' : 'AI 操盤'}
            </span>
            <Switch
              checked={config?.is_enabled || false}
              onCheckedChange={handleToggleAI}
            />
          </div>
        </div>

        {/* System Health Alert */}
        {recentErrors.length > 0 && (
          <Card className="bg-gradient-to-r from-yellow-500/10 to-transparent border-2 border-yellow-500/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
                  <div>
                    <h3 className="font-bold text-white mb-1">
                      {language === 'en' 
                        ? `⚠️ ${recentErrors.length} System Issue(s) Detected`
                        : `⚠️ 偵測到 ${recentErrors.length} 個系統問題`}
                    </h3>
                    <p className="text-sm text-gray-300">
                      {language === 'en'
                        ? 'Click the repair button to let AI fix the issues automatically'
                        : '點擊修復按鈕讓 AI 自動修正問題'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSystemRepair}
                  disabled={isRepairingSystem}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:opacity-90 font-semibold"
                >
                  {isRepairingSystem ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {language === 'en' ? 'Repairing...' : '修復中...'}
                    </>
                  ) : (
                    <>
                      <Wrench className="w-4 h-4 mr-2" />
                      {language === 'en' ? 'AI Auto-Repair' : 'AI 自動修復'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/30 rounded-xl p-4">
          <p className="text-xs md:text-sm text-gray-300">
            {language === 'en'
              ? '🎯 AI Day-Trading: $2000 capital, 5% per signal ($100), Hold 60s, Target +3.5%, Stop -1.8%, Max 3 positions, All closed before market close.'
              : '🎯 AI 當沖交易：$2000 資金，每信號 5% ($100)，持倉 60 秒，目標 +3.5%，停損 -1.8%，最多 3 個倉位，收盤前全部平倉。'}
          </p>
        </div>

        {hotStocks.length > 0 && (
          <Card className="bg-gradient-to-br from-purple-500/10 to-transparent bg-[#151a21] border-2 border-purple-500/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 md:w-6 h-5 md:h-6 text-purple-400 animate-pulse" />
                <span className="text-lg md:text-xl">
                  {language === 'en' ? '🔥 AI Trading Pool (9 Stocks)' : '🔥 AI 股票池（9 檔）'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {hotStocks.map((stock, index) => {
                  const quote = liveQuotes.find(q => q.symbol === stock.symbol);
                  const isTop3 = index < 3;
                  
                  return (
                    <div
                      key={stock.id || stock.symbol}
                      className={`bg-[#0b0f14] rounded-xl p-4 border-2 ${
                        isTop3 ? 'border-[#00ff99] glow-green' : 'border-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl md:text-2xl font-bold text-white">#{index + 1}</span>
                          <div>
                            <div className="text-base md:text-lg font-bold text-white">{stock.symbol}</div>
                            <div className="text-xs text-gray-400">{stock.company_name}</div>
                          </div>
                        </div>
                        {isTop3 && (
                          <Badge className="bg-[#00ff99] text-black font-semibold text-xs">
                            {language === 'en' ? 'AI TRADING' : 'AI 操作中'}
                          </Badge>
                        )}
                      </div>

                      {quote ? (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xl md:text-2xl font-bold text-white">
                              ${quote.last_price?.toFixed(2) || 'N/A'}
                            </div>
                            <div className={`text-base md:text-lg font-semibold ${
                              (quote.change_pct || 0) >= 0 ? 'text-[#00ff99]' : 'text-[#ff4d4d]'
                            }`}>
                              {(quote.change_pct || 0) >= 0 ? '+' : ''}{(quote.change_pct || 0).toFixed(2)}%
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-xs">
                              <div className="text-gray-500">
                                {language === 'en' ? 'Volume' : '成交量'}
                              </div>
                              <div className="font-semibold text-white">
                                {((quote.volume || 0) / 1000000).toFixed(1)}M
                              </div>
                            </div>
                            <div className="text-xs">
                              <div className="text-gray-500">
                                {language === 'en' ? 'AI Score' : 'AI 評分'}
                              </div>
                              <div className="font-semibold text-white">
                                {stock.flow_score?.toFixed(0) || 'N/A'}/100
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center py-4">
                          <Activity className="w-6 h-6 text-gray-600 animate-spin" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="text-xs text-gray-500 bg-[#0b0f14] rounded-lg p-3">
                <p className="mb-1">
                  {language === 'en'
                    ? '🤖 AI analyzes 9 stocks and actively trades Top 3 based on momentum, volume, and AI confidence'
                    : '🤖 AI 分析 9 檔股票，並根據動能、成交量和 AI 信心度，主動操作前 3 檔'}
                </p>
                <p>
                  {language === 'en'
                    ? '⚡ Day-trading: $100 per signal (5%), 60s hold, +3.5% target, -1.8% stop'
                    : '⚡ 當沖策略：每信號 $100 (5%)，持倉 60 秒，目標 +3.5%，停損 -1.8%'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-1">
            <AutoTradeSettings config={config} />
          </div>

          <div className="lg:col-span-2">
            <div className="bg-[#151a21] border border-gray-800 rounded-2xl p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">
                {language === 'en' ? 'AI Day-Trading Journal' : 'AI 當沖交易日誌'}
              </h2>
              <AutoTradeJournal />
            </div>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 md:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-xs md:text-sm text-gray-300">
              <p>
                {language === 'en'
                  ? 'This is a virtual day-trading simulation for educational purposes only. No real money is being traded.'
                  : '此為教學用的虛擬當沖模擬系統，並未進行真實資金交易。'}
              </p>
              <p>
                {language === 'en'
                  ? 'AI uses real market data and learns from each trade to improve performance over time.'
                  : 'AI 使用真實市場數據，並從每筆交易中學習以提升表現。'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showDisclaimer && (
        <Dialog open={true} onOpenChange={setShowDisclaimer}>
          <DialogContent className="bg-[#151a21] border-gray-800 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Bot className="w-8 h-8 text-[#00ff99]" />
                {language === 'en' ? 'Enable Day-Trading AI?' : '啟用當沖 AI？'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {language === 'en' 
                  ? 'Please read and confirm before enabling'
                  : '啟用前請詳閱並確認'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="bg-[#0b0f14] border border-gray-800 rounded-xl p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-[#00ff99] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-300">
                    {language === 'en'
                      ? 'AI will automatically trade Top 3 hot stocks based on real-time data and momentum analysis.'
                      : 'AI 將根據即時數據和動能分析，自動操作前 3 檔熱門股票。'}
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-[#00ff99] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-300">
                    {language === 'en'
                      ? 'Day-trading: $100 per signal (5% of $2000), 60s hold, +3.5% target, -1.8% stop, automatic close before market close.'
                      : '當沖策略：每信號 $100（$2000 的 5%），持倉 60 秒，目標 +3.5%，停損 -1.8%，收盤前自動平倉。'}
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-[#00ff99] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-300">
                    {language === 'en'
                      ? 'AI learns from each trade to improve decision-making and adapt to market conditions.'
                      : 'AI 從每筆交易中學習以改善決策並適應市場狀況。'}
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-300">
                    {language === 'en'
                      ? 'This is virtual trading only. No real money is used.'
                      : '這只是虛擬交易，不會動用真實資金。'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowDisclaimer(false)}
                  variant="outline"
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  {language === 'en' ? 'Cancel' : '取消'}
                </Button>
                <Button
                  onClick={acceptDisclaimer}
                  className="flex-1 bg-gradient-to-r from-[#00ff99] to-[#00cc7a] text-black hover:from-[#00cc7a] hover:to-[#00ff99] font-semibold"
                >
                  {language === 'en' ? 'Enable Day-Trading AI' : '啟用當沖 AI'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
