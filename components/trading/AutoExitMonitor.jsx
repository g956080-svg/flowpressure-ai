import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLanguage } from "../../Layout";

export default function AutoExitMonitor() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const { data: activeTrades = [] } = useQuery({
    queryKey: ['activeTrades'],
    queryFn: async () => {
      const trades = await base44.entities.SimulatedTrade.list();
      return trades.filter(t => t.status === 'ACTIVE');
    },
    refetchInterval: 5000
  });

  const { data: stocks = [] } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => base44.entities.Stock.list()
  });

  const { data: account } = useQuery({
    queryKey: ['virtualAccount'],
    queryFn: async () => {
      const accounts = await base44.entities.VirtualAccount.list();
      return accounts.length > 0 ? accounts[0] : null;
    }
  });

  const updateTradeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SimulatedTrade.update(id, data),
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VirtualAccount.update(id, data),
  });

  useEffect(() => {
    if (!activeTrades.length || !stocks.length || !account) return;

    const checkAndExitTrades = async () => {
      for (const trade of activeTrades) {
        const stock = stocks.find(s => s.id === trade.stock_id);
        
        if (!stock) continue;

        const shouldExit = (
          trade.entry_flow === 'IN' && 
          (stock.flow === 'OUT' || stock.flow === 'NEUTRAL')
        );

        if (shouldExit) {
          const exitTime = new Date();
          const entryTime = new Date(trade.entry_time);
          const durationMinutes = Math.floor((exitTime - entryTime) / 1000 / 60);
          
          const exitValue = stock.price * trade.shares;
          const entryValue = trade.entry_price * trade.shares;
          const profitPerShare = stock.price - trade.entry_price;
          const totalProfit = profitPerShare * trade.shares;
          const profitPercent = (profitPerShare / trade.entry_price) * 100;

          let evaluationEn = "";
          let evaluationZh = "";

          if (profitPercent > 5) {
            evaluationEn = "🎉 Excellent timing! Captured strong momentum.";
            evaluationZh = "🎉 選點精準！成功捕捉強勁動能。";
          } else if (profitPercent > 2) {
            evaluationEn = "✅ Good exit — AI caught the reversal early.";
            evaluationZh = "✅ 離場正確 — AI 提早捕捉反轉。";
          } else if (profitPercent > 0) {
            evaluationEn = "👍 Small profit secured. Stay disciplined!";
            evaluationZh = "👍 小賺出場，保持紀律！";
          } else if (profitPercent > -2) {
            evaluationEn = "⚠ Minor loss. Exit on signal change was correct.";
            evaluationZh = "⚠ 小虧出場，訊號轉變時離場是正確的。";
          } else if (profitPercent > -5) {
            evaluationEn = "❌ Late entry or wrong timing. Watch confidence levels.";
            evaluationZh = "❌ 追高進場或時機不佳，注意信心度。";
          } else {
            evaluationEn = "🚫 Significant loss. Avoid entering on weak signals.";
            evaluationZh = "🚫 虧損較大，避免在弱訊號時進場。";
          }

          await updateTradeMutation.mutateAsync({
            id: trade.id,
            data: {
              exit_price: stock.price,
              exit_time: exitTime.toISOString(),
              exit_flow: stock.flow,
              exit_confidence: stock.confidence,
              gain_loss_amount: totalProfit,
              gain_loss_percent: profitPercent,
              duration_minutes: durationMinutes,
              status: "CLOSED",
              ai_evaluation_en: evaluationEn,
              ai_evaluation_zh: evaluationZh
            }
          });

          const newAvailableCash = account.available_cash + exitValue;
          const newTotalInvested = account.total_invested - entryValue;
          const newTotalGainLoss = account.total_gain_loss + totalProfit;
          const newWinningTrades = totalProfit > 0 ? account.winning_trades + 1 : account.winning_trades;
          const newLosingTrades = totalProfit < 0 ? account.losing_trades + 1 : account.losing_trades;
          const totalClosedTrades = newWinningTrades + newLosingTrades;
          const newWinRate = totalClosedTrades > 0 ? (newWinningTrades / totalClosedTrades) * 100 : 0;

          await updateAccountMutation.mutateAsync({
            id: account.id,
            data: {
              available_cash: newAvailableCash,
              total_invested: newTotalInvested,
              total_gain_loss: newTotalGainLoss,
              winning_trades: newWinningTrades,
              losing_trades: newLosingTrades,
              win_rate: newWinRate
            }
          });

          const message = language === 'en'
            ? `Sold ${trade.shares} share${trade.shares > 1 ? 's' : ''} of ${trade.symbol} at $${stock.price.toFixed(2)}. ${totalProfit >= 0 ? 'Profit' : 'Loss'}: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)} (${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%)`
            : `已賣出 ${trade.shares} 股 ${trade.symbol}，價格 $${stock.price.toFixed(2)}。${totalProfit >= 0 ? '獲利' : '虧損'}：${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)} (${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%)`;

          toast(message, {
            description: language === 'en' ? 'AI Signal: Capital exiting ✅' : 'AI提示：主力撤離，離場正確 ✅',
            duration: 5000,
          });

          queryClient.invalidateQueries({ queryKey: ['activeTrades'] });
          queryClient.invalidateQueries({ queryKey: ['simulatedTrades'] });
          queryClient.invalidateQueries({ queryKey: ['virtualAccount'] });
        }
      }
    };

    checkAndExitTrades();
  }, [activeTrades, stocks, account]);

  return null;
}