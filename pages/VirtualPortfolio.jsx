import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "../Layout";
import { DollarSign, TrendingUp, TrendingDown, Award, Clock, Target, Trophy, Percent } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import AutoExitMonitor from "../components/trading/AutoExitMonitor";

export default function VirtualPortfolio() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("all");

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['virtualAccount'],
    queryFn: async () => {
      const accounts = await base44.entities.VirtualAccount.list();
      if (accounts.length > 0) return accounts[0];
      return await base44.entities.VirtualAccount.create({
        total_capital: 10000,
        available_cash: 10000,
        total_invested: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_gain_loss: 0,
        win_rate: 0
      });
    }
  });

  const { data: trades = [], isLoading: tradesLoading } = useQuery({
    queryKey: ['simulatedTrades'],
    queryFn: () => base44.entities.SimulatedTrade.list('-entry_time'),
    refetchInterval: 5000
  });

  const { data: currentStocks = [] } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => base44.entities.Stock.list()
  });

  const filteredTrades = trades.filter(trade => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return trade.status === "ACTIVE";
    if (activeTab === "closed") return trade.status === "CLOSED";
    return true;
  });

  const activeTrades = trades.filter(t => t.status === "ACTIVE");
  const closedTrades = trades.filter(t => t.status === "CLOSED");
  const winningTrades = closedTrades.filter(t => t.gain_loss_amount > 0);
  const losingTrades = closedTrades.filter(t => t.gain_loss_amount < 0);

  const bestTrade = closedTrades.length > 0 
    ? closedTrades.reduce((max, trade) => trade.gain_loss_percent > max.gain_loss_percent ? trade : max, closedTrades[0])
    : null;

  const cumulativeReturn = closedTrades.reduce((sum, trade) => sum + (trade.gain_loss_amount || 0), 0);

  const getUnrealizedPL = (trade) => {
    const stock = currentStocks.find(s => s.symbol === trade.symbol);
    if (!stock || !stock.price) return { amount: 0, percent: 0 };
    const amount = (stock.price - trade.entry_price) * trade.shares;
    const percent = (amount / (trade.entry_price * trade.shares)) * 100;
    return { amount, percent: isNaN(percent) ? 0 : percent };
  };

  const totalUnrealizedPL = activeTrades.reduce((sum, trade) => {
    const pl = getUnrealizedPL(trade);
    return sum + pl.amount;
  }, 0);
  
  const totalReturn = cumulativeReturn + totalUnrealizedPL;
  const totalReturnPercent = account ? (totalReturn / account.total_capital) * 100 : 0;

  if (accountLoading || tradesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-[#00ff99] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <AutoExitMonitor />
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            {language === 'en' ? 'My Virtual Portfolio' : '我的模擬交易'}
          </h1>
          <p className="text-gray-400 text-lg">
            {language === 'en' 
              ? 'Practice trading with AI signals using virtual funds'
              : '使用虛擬資金跟隨AI訊號練習交易'}
          </p>
        </div>

        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Return - Prominent */}
          <div className={`md:col-span-2 bg-gradient-to-br ${totalReturn >= 0 ? 'from-[#00ff99]/20 via-[#00ff99]/10' : 'from-[#ff4d4d]/20 via-[#ff4d4d]/10'} to-transparent bg-[#151a21] border-2 ${totalReturn >= 0 ? 'border-[#00ff99]/50' : 'border-[#ff4d4d]/50'} rounded-2xl p-8`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl ${totalReturn >= 0 ? 'bg-[#00ff99]/20' : 'bg-[#ff4d4d]/20'} flex items-center justify-center`}>
                <DollarSign className={`w-7 h-7 ${totalReturn >= 0 ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`} />
              </div>
              <div>
                <span className="text-sm text-gray-400">
                  {language === 'en' ? 'Total Simulated Return' : '累積模擬報酬'}
                </span>
                <div className="flex items-baseline gap-3">
                  <span className={`text-4xl font-bold ${totalReturn >= 0 ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
                    {totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}
                  </span>
                  <span className={`text-2xl font-semibold ${totalReturn >= 0 ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
                    {totalReturn >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-gray-400">
                  {language === 'en' ? 'Progress' : '績效進度'}
                </span>
                <span className={totalReturn >= 0 ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}>
                  {totalReturnPercent > 0 ? `+${totalReturnPercent.toFixed(1)}%` : `${totalReturnPercent.toFixed(1)}%`}
                </span>
              </div>
              <Progress 
                value={Math.min(Math.abs(totalReturnPercent), 100)} 
                className="h-3 bg-gray-800"
                indicatorClassName={totalReturn >= 0 ? 'bg-[#00ff99]' : 'bg-[#ff4d4d]'}
              />
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-[#151a21] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-[#ffaa00]" />
              <span className="text-sm text-gray-400">
                {language === 'en' ? 'Win Rate' : '勝率'}
              </span>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {closedTrades.length > 0 
                ? ((winningTrades.length / closedTrades.length) * 100).toFixed(1)
                : 0}%
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-[#00ff99]/20 rounded text-xs font-semibold text-[#00ff99]">
                {winningTrades.length}W
              </span>
              <span className="px-2 py-1 bg-[#ff4d4d]/20 rounded text-xs font-semibold text-[#ff4d4d]">
                {losingTrades.length}L
              </span>
            </div>
          </div>

          {/* Best Trade */}
          <div className="bg-gradient-to-br from-[#ffaa00]/10 to-transparent bg-[#151a21] border border-[#ffaa00]/30 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-[#ffaa00]" />
              <span className="text-sm text-gray-400">
                {language === 'en' ? 'Best Trade' : '最佳交易'}
              </span>
            </div>
            {bestTrade ? (
              <>
                <div className="text-2xl font-bold text-[#00ff99] mb-2">
                  +{bestTrade.gain_loss_percent.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-400">
                  {bestTrade.symbol}
                </div>
              </>
            ) : (
              <div className="text-2xl font-bold text-gray-600">
                -
              </div>
            )}
          </div>
        </div>

        {/* Performance Insight */}
        {closedTrades.length >= 5 && (
          <div className={`p-6 rounded-2xl border ${
            account.win_rate >= 60 
              ? 'bg-gradient-to-r from-[#00ff99]/10 to-transparent border-[#00ff99]/30'
              : 'bg-gradient-to-r from-[#ffaa00]/10 to-transparent border-[#ffaa00]/30'
          }`}>
            <div className="flex items-center gap-3">
              <Trophy className={`w-6 h-6 ${account.win_rate >= 60 ? 'text-[#00ff99]' : 'text-[#ffaa00]'}`} />
              <div>
                <h3 className="font-bold text-white mb-1">
                  {language === 'en' ? 'AI Performance Insight' : 'AI績效洞察'}
                </h3>
                <p className="text-sm text-gray-300">
                  {language === 'en' 
                    ? account.win_rate >= 60
                      ? `🎉 Excellent! ${account.win_rate.toFixed(1)}% win rate shows you're following AI signals well. Keep it up!`
                      : `📚 ${account.win_rate.toFixed(1)}% win rate. Focus on high-confidence signals (85+) and practice patience.`
                    : account.win_rate >= 60
                      ? `🎉 太棒了！${account.win_rate.toFixed(1)}% 勝率顯示你能很好地跟隨AI訊號。繼續保持！`
                      : `📚 ${account.win_rate.toFixed(1)}% 勝率。專注於高信心度訊號（85+）並練習耐心等待。`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#151a21] border border-gray-800">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black">
              {language === 'en' ? 'All Trades' : '全部交易'} ({trades.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black">
              {language === 'en' ? 'Holding' : '持有中'} ({activeTrades.length})
            </TabsTrigger>
            <TabsTrigger value="closed" className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black">
              {language === 'en' ? 'Closed' : '已平倉'} ({closedTrades.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Trades List */}
        {filteredTrades.length > 0 ? (
          <div className="space-y-4">
            {filteredTrades.map((trade) => {
              const isActive = trade.status === "ACTIVE";
              const unrealizedPL = isActive ? getUnrealizedPL(trade) : null;
              const displayPL = isActive 
                ? { amount: unrealizedPL.amount, percent: unrealizedPL.percent }
                : { amount: trade.gain_loss_amount, percent: trade.gain_loss_percent };
              const isProfit = displayPL.amount >= 0;
              
              return (
                <div
                  key={trade.id}
                  className={`bg-[#151a21] border rounded-2xl p-6 transition-all ${
                    isActive 
                      ? 'border-[#00ff99] shadow-lg shadow-[#00ff99]/10' 
                      : isProfit 
                        ? 'border-gray-800 hover:border-[#00ff99]/30' 
                        : 'border-gray-800 hover:border-[#ff4d4d]/30'
                  }`}
                  style={{
                    background: isActive
                      ? isProfit 
                        ? 'linear-gradient(to bottom right, rgba(0, 255, 153, 0.05), transparent)'
                        : 'linear-gradient(to bottom right, rgba(255, 77, 77, 0.05), transparent)'
                      : undefined
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isActive 
                          ? isProfit ? 'bg-[#00ff99]/20 animate-pulse' : 'bg-[#ff4d4d]/20 animate-pulse'
                          : isProfit ? 'bg-[#00ff99]/10' : 'bg-[#ff4d4d]/10'
                      }`}>
                        {isActive ? (
                          <Target className={`w-6 h-6 ${isProfit ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`} />
                        ) : isProfit ? (
                          <TrendingUp className="w-6 h-6 text-[#00ff99]" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-[#ff4d4d]" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{trade.symbol}</h3>
                        <p className="text-sm text-gray-400">{trade.company_name}</p>
                      </div>
                    </div>
                    
                    <div className={`px-4 py-2 rounded-lg ${
                      isProfit ? 'bg-[#00ff99]/20' : 'bg-[#ff4d4d]/20'
                    }`}>
                      {isActive && (
                        <div className="text-xs text-gray-400 mb-1">
                          {language === 'en' ? 'Unrealized P/L' : '未實現損益'}
                        </div>
                      )}
                      <div className={`text-2xl font-bold ${isProfit ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
                        {isProfit ? '+' : ''}{displayPL.percent.toFixed(2)}%
                      </div>
                      <div className={`text-sm ${isProfit ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
                        {isProfit ? '+' : ''}${displayPL.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Trade Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-xs text-gray-500">
                        {language === 'en' ? 'Shares' : '股數'}
                      </span>
                      <div className="font-bold text-white text-lg">{trade.shares}</div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">
                        {language === 'en' ? 'Entry Price' : '進場價'}
                      </span>
                      <div className="font-semibold text-white">${trade.entry_price.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">
                        {language === 'en' ? isActive ? 'Current Price' : 'Exit Price' : isActive ? '當前價' : '出場價'}
                      </span>
                      <div className="font-semibold text-white">
                        {isActive 
                          ? `$${(trade.entry_price + (unrealizedPL.amount / trade.shares)).toFixed(2)}`
                          : `$${trade.exit_price.toFixed(2)}`}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">
                        {language === 'en' ? 'Per Share P/L' : '每股損益'}
                      </span>
                      <div className={`font-semibold ${isProfit ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
                        {isProfit ? '+' : ''}${((displayPL.amount) / trade.shares).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Flow & Time */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 pt-4 border-t border-gray-800">
                    <div>
                      <span className="text-xs text-gray-500">
                        {language === 'en' ? 'Entry Signal' : '進場訊號'}
                      </span>
                      <div className="flex items-center gap-1 font-semibold">
                        {trade.entry_flow === 'IN' && '🟢'}
                        {trade.entry_flow === 'OUT' && '🔴'}
                        {trade.entry_flow === 'NEUTRAL' && '🟠'}
                        <span className="text-white">{trade.entry_confidence}/100</span>
                      </div>
                    </div>
                    {!isActive && (
                      <div>
                        <span className="text-xs text-gray-500">
                          {language === 'en' ? 'Exit Signal' : '出場訊號'}
                        </span>
                        <div className="flex items-center gap-1 font-semibold">
                          {trade.exit_flow === 'IN' && '🟢'}
                          {trade.exit_flow === 'OUT' && '🔴'}
                          {trade.exit_flow === 'NEUTRAL' && '🟠'}
                          <span className="text-white">{trade.exit_flow}</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-gray-500">
                        {language === 'en' ? 'Duration' : '持有時間'}
                      </span>
                      <div className="font-semibold text-white flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {trade.duration_minutes 
                          ? `${Math.floor(trade.duration_minutes / 60)}h ${Math.floor(trade.duration_minutes % 60)}m`
                          : language === 'en' ? 'Holding' : '持有中'}
                      </div>
                    </div>
                  </div>

                  {/* AI Comment */}
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">
                      {language === 'en' ? 'Entry Signal:' : '進場訊號：'}
                    </p>
                    <p className="text-sm text-gray-300">
                      {language === 'en' ? trade.entry_comment_en : trade.entry_comment_zh}
                    </p>
                  </div>

                  {/* AI Evaluation */}
                  {!isActive && trade.ai_evaluation_en && (
                    <div className={`mt-3 p-3 rounded-lg ${
                      isProfit ? 'bg-[#00ff99]/10' : 'bg-[#ff4d4d]/10'
                    }`}>
                      <p className="text-xs text-gray-400 mb-1">
                        {language === 'en' ? 'AI Evaluation:' : 'AI評價：'}
                      </p>
                      <p className="text-sm font-semibold">
                        {language === 'en' ? trade.ai_evaluation_en : trade.ai_evaluation_zh}
                      </p>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between text-xs text-gray-500">
                    <span>
                      {language === 'en' ? 'Entry:' : '進場：'} {format(new Date(trade.entry_time), 'MM/dd HH:mm')}
                    </span>
                    {trade.exit_time && (
                      <span>
                        {language === 'en' ? 'Exit:' : '出場：'} {format(new Date(trade.exit_time), 'MM/dd HH:mm')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-400 mb-2">
              {language === 'en' ? 'No Trades Yet' : '尚無交易記錄'}
            </h3>
            <p className="text-gray-500">
              {language === 'en'
                ? 'Start simulating trades from the Dashboard!'
                : '從儀表板開始模擬交易！'}
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-[#151a21] border border-yellow-800/30 rounded-2xl p-6">
          <p className="text-center text-sm text-gray-400">
            {language === 'en'
              ? '⚠️ This is a learning simulation. No real money is involved.'
              : '⚠️ 模擬交易僅供學習使用，不涉及真實金錢交易。'}
          </p>
        </div>
      </div>
    </div>
  );
}