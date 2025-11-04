import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "../../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function PortfolioSummary() {
  const { language } = useLanguage();

  // 獲取虛擬帳戶資料
  const { data: virtualAccount } = useQuery({
    queryKey: ['virtualAccount'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        const accounts = await base44.entities.VirtualAccount.filter({ created_by: user.email });
        
        if (accounts.length === 0) {
          // 創建預設帳戶
          const newAccount = await base44.entities.VirtualAccount.create({
            total_capital: 100000,
            available_cash: 100000,
            total_invested: 0,
            total_trades: 0,
            winning_trades: 0,
            losing_trades: 0,
            total_gain_loss: 0,
            win_rate: 0
          });
          return newAccount;
        }
        
        return accounts[0];
      } catch (error) {
        console.error('Failed to fetch virtual account:', error);
        return {
          total_capital: 100000,
          available_cash: 100000,
          total_invested: 0,
          total_gain_loss: 0,
          win_rate: 0
        };
      }
    },
    refetchInterval: 5000, // 每 5 秒更新
    staleTime: 2000
  });

  // 獲取活躍交易
  const { data: activeTrades = [] } = useQuery({
    queryKey: ['activeSimulatedTrades'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        const trades = await base44.entities.SimulatedTrade.filter({
          created_by: user.email,
          status: 'ACTIVE'
        });
        return trades || [];
      } catch (error) {
        console.error('Failed to fetch active trades:', error);
        return [];
      }
    },
    refetchInterval: 5000
  });

  if (!virtualAccount) {
    return (
      <Card className="bg-[#1a2332] border-[#00C6FF]/30">
        <CardContent className="p-6 flex items-center justify-center">
          <Activity className="w-6 h-6 text-[#00C6FF] animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const totalCapital = virtualAccount.total_capital || 100000;
  const availableCash = virtualAccount.available_cash || 0;
  const totalInvested = virtualAccount.total_invested || 0;
  const totalGainLoss = virtualAccount.total_gain_loss || 0;
  const winRate = virtualAccount.win_rate || 0;
  
  const portfolioValue = availableCash + totalInvested;
  const returnPercent = totalCapital > 0 ? ((portfolioValue - totalCapital) / totalCapital) * 100 : 0;
  const cashPercent = portfolioValue > 0 ? (availableCash / portfolioValue) * 100 : 100;
  const investedPercent = portfolioValue > 0 ? (totalInvested / portfolioValue) * 100 : 0;

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0d1b2a] border-2 border-[#00C6FF]/50 shadow-xl">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-[#00C6FF]" />
          {language === 'en' ? '💰 Portfolio Summary' : '💰 投資組合摘要'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Value */}
        <div className="bg-[#0d1b2a] rounded-xl p-4 border border-[#00C6FF]/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              {language === 'en' ? 'Total Portfolio Value' : '總投資組合價值'}
            </span>
            <Badge className={returnPercent >= 0 ? 'bg-[#00ff88]/20 text-[#00ff88]' : 'bg-[#ff4d4d]/20 text-[#ff4d4d]'}>
              {returnPercent >= 0 ? '+' : ''}{returnPercent.toFixed(2)}%
            </Badge>
          </div>
          <div className="text-4xl font-bold gradient-text">
            ${portfolioValue.toLocaleString()}
          </div>
          <div className={`text-sm mt-1 ${totalGainLoss >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'}`}>
            {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toLocaleString()} {language === 'en' ? 'Total P/L' : '總損益'}
          </div>
        </div>

        {/* Cash vs Invested */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0d1b2a] rounded-lg p-3 border border-[#00ff88]/20">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-[#00ff88]" />
              <span className="text-xs text-gray-400">
                {language === 'en' ? 'Available Cash' : '可用現金'}
              </span>
            </div>
            <div className="text-2xl font-bold text-white">
              ${availableCash.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {cashPercent.toFixed(1)}% {language === 'en' ? 'of portfolio' : '佔比'}
            </div>
          </div>

          <div className="bg-[#0d1b2a] rounded-lg p-3 border border-[#00C6FF]/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#00C6FF]" />
              <span className="text-xs text-gray-400">
                {language === 'en' ? 'Invested' : '已投資'}
              </span>
            </div>
            <div className="text-2xl font-bold text-white">
              ${totalInvested.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {investedPercent.toFixed(1)}% {language === 'en' ? 'of portfolio' : '佔比'}
            </div>
          </div>
        </div>

        {/* Asset Allocation */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">
              {language === 'en' ? 'Asset Allocation' : '資產配置'}
            </span>
            <span className="text-xs text-gray-500">
              {language === 'en' ? `${activeTrades.length} Active Positions` : `${activeTrades.length} 個活躍部位`}
            </span>
          </div>
          <div className="relative h-3 bg-[#0d1b2a] rounded-full overflow-hidden">
            <div 
              className="absolute h-full bg-[#00ff88] transition-all duration-500"
              style={{ width: `${cashPercent}%` }}
            />
            <div 
              className="absolute h-full bg-[#00C6FF] transition-all duration-500"
              style={{ width: `${investedPercent}%`, left: `${cashPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-[#00ff88]">
              {language === 'en' ? 'Cash' : '現金'} {cashPercent.toFixed(0)}%
            </span>
            <span className="text-[#00C6FF]">
              {language === 'en' ? 'Stocks' : '股票'} {investedPercent.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Trading Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#0d1b2a] rounded-lg p-2 border border-gray-700 text-center">
            <div className="text-xs text-gray-500">
              {language === 'en' ? 'Total Trades' : '總交易'}
            </div>
            <div className="text-lg font-bold text-white">
              {virtualAccount.total_trades || 0}
            </div>
          </div>

          <div className="bg-[#0d1b2a] rounded-lg p-2 border border-gray-700 text-center">
            <div className="text-xs text-gray-500">
              {language === 'en' ? 'Win Rate' : '勝率'}
            </div>
            <div className="text-lg font-bold text-[#00C6FF]">
              {winRate.toFixed(0)}%
            </div>
          </div>

          <div className="bg-[#0d1b2a] rounded-lg p-2 border border-gray-700 text-center">
            <div className="text-xs text-gray-500">
              {language === 'en' ? 'Active' : '活躍'}
            </div>
            <div className="text-lg font-bold text-[#00ff88]">
              {activeTrades.length}
            </div>
          </div>
        </div>

        {/* Initial Capital Info */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-700">
          {language === 'en' ? 'Initial Capital' : '初始資金'}: ${totalCapital.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}