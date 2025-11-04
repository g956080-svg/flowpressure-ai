import React, { useState } from "react";
import { Star, TrendingUp, Zap, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import FlowIndicator from "./FlowIndicator";
import SimulateBuyDialog from "../trading/SimulateBuyDialog";
import { useLanguage } from "../../Layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function StockCard({ stock }) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Stock.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Stock.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
    },
  });

  const { data: activeTrades = [] } = useQuery({
    queryKey: ['activeTrades', stock.id],
    queryFn: async () => {
      const trades = await base44.entities.SimulatedTrade.list();
      return trades.filter(t => t.stock_id === stock.id && t.status === 'ACTIVE');
    }
  });

  const hasActiveTrade = activeTrades.length > 0;

  const toggleWatchlist = (e) => {
    e.stopPropagation();
    updateMutation.mutate({
      id: stock.id,
      data: { is_watchlist: !stock.is_watchlist }
    });
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(stock.id);
    setShowDeleteDialog(false);
  };

  const handleSimulateBuy = (e) => {
    e.stopPropagation();
    setShowBuyDialog(true);
  };

  const flowColors = {
    IN: "from-[#00ff99]/10 to-transparent border-[#00ff99]/30",
    OUT: "from-[#ff4d4d]/10 to-transparent border-[#ff4d4d]/30",
    NEUTRAL: "from-[#ffaa00]/10 to-transparent border-[#ffaa00]/30"
  };

  const glowColors = {
    IN: "shadow-[0_0_30px_rgba(0,255,153,0.6)]",
    OUT: "shadow-[0_0_30px_rgba(255,77,77,0.6)]",
    NEUTRAL: "shadow-[0_0_30px_rgba(255,170,0,0.6)]"
  };

  const changeColor = (stock.change_percent || 0) >= 0 ? "text-[#00ff99]" : "text-[#ff4d4d]";

  const getConfidenceColor = () => {
    if (stock.flow === 'IN') return 'bg-[#00ff99]';
    if (stock.flow === 'OUT') return 'bg-[#ff4d4d]';
    return 'bg-[#ffaa00]';
  };

  const getAIGuidance = () => {
    if (stock.flow === 'IN' && (stock.confidence || 0) >= 85) {
      return {
        en: `🟢 Big money flowing in! Strong buy signal.`,
        zh: `🟢 大錢正在進場！強勢買入訊號。`
      };
    } else if (stock.flow === 'OUT' && (stock.confidence || 0) >= 80) {
      return {
        en: `🔴 Capital leaving fast! Exit recommended.`,
        zh: `🔴 資金快速撤離！建議出場。`
      };
    } else if (stock.flow === 'IN' && (stock.confidence || 0) >= 70) {
      return {
        en: `🟢 Money coming in. Watch for entry.`,
        zh: `🟢 資金流入中，留意進場時機。`
      };
    } else if (stock.flow === 'NEUTRAL') {
      return {
        en: `🟠 Sideways. Wait for clearer signal.`,
        zh: `🟠 盤整中，等待更明確訊號。`
      };
    } else {
      return {
        en: `AI Confidence: ${stock.confidence || 0}/100`,
        zh: `AI信心度：${stock.confidence || 0}/100`
      };
    }
  };

  const aiGuidance = getAIGuidance();
  const isAffordable = (stock.price || 0) < 500;
  const isVeryAffordable = (stock.price || 0) < 100;

  return (
    <>
      <div
        onClick={() => navigate(createPageUrl("StockDetail") + `?id=${stock.id}`)}
        className={`relative bg-gradient-to-br ${flowColors[stock.flow]} bg-[#151a21] border rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
          hasActiveTrade ? 'ring-2 ring-[#00ff99] ring-offset-2 ring-offset-[#0b0f14]' : ''
        }`}
      >
        <button
          onClick={handleDelete}
          className="absolute top-2 left-2 p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors z-10 group"
        >
          <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-300" />
        </button>

        {hasActiveTrade && (
          <div className="absolute top-2 right-2 px-3 py-1 bg-[#00ff99] text-black text-xs font-bold rounded-full flex items-center gap-1 animate-pulse z-10">
            <TrendingUp className="w-3 h-3" />
            {language === 'en' 
              ? `${activeTrades[0].shares} share${activeTrades[0].shares > 1 ? 's' : ''}`
              : `${activeTrades[0].shares}股`}
          </div>
        )}

        <button
          onClick={toggleWatchlist}
          className="absolute top-2 right-14 p-2 hover:bg-gray-800 rounded-lg transition-colors z-10"
        >
          <Star 
            className={`w-5 h-5 ${stock.is_watchlist ? 'fill-[#ffaa00] text-[#ffaa00]' : 'text-gray-500'}`}
          />
        </button>

        {isVeryAffordable && (
          <div className="absolute top-14 left-2 z-10">
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
              {language === 'en' ? '💰 Beginner Friendly' : '💰 新手友善'}
            </Badge>
          </div>
        )}

        <div className="flex items-start gap-4 mt-10">
          <FlowIndicator flow={stock.flow} confidence={stock.confidence || 0} size="sm" showExplainer={true} />

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-white">{stock.symbol}</h3>
              <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                {stock.theme}
              </span>
              {!isAffordable && (
                <span className="px-2 py-0.5 bg-red-500/20 rounded text-xs text-red-400">
                  {language === 'en' ? '💎 High Price' : '💎 高價位'}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mb-3">{stock.name}</p>
            
            <div className="flex items-end gap-3 mb-3">
              <div className="text-2xl font-bold text-white">
                ${(stock.price || 0).toFixed(2)}
              </div>
              <div className={`text-sm font-semibold ${changeColor}`}>
                {(stock.change_percent || 0) >= 0 ? '+' : ''}{(stock.change_percent || 0).toFixed(2)}%
              </div>
            </div>

            <div className="mb-3 text-xs text-gray-500">
              {isVeryAffordable ? (
                <span className="text-green-400">
                  {language === 'en' 
                    ? '✓ Very affordable for beginners (< $100)'
                    : '✓ 新手也能輕鬆進場（< $100）'}
                </span>
              ) : isAffordable ? (
                <span className="text-yellow-400">
                  {language === 'en' 
                    ? '✓ Affordable price (< $500)'
                    : '✓ 一般投資者可負擔（< $500）'}
                </span>
              ) : (
                <span className="text-red-400">
                  {language === 'en' 
                    ? '⚠ High price - Consider fractional shares'
                    : '⚠ 高價位股票 - 建議考慮零股'}
                </span>
              )}
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">
                  {language === 'en' ? 'AI Confidence' : 'AI信心度'}
                </span>
                <span className="text-xs font-bold text-white">{stock.confidence || 0}/100</span>
              </div>
              <Progress 
                value={stock.confidence || 0} 
                className="h-2 bg-gray-800"
                indicatorClassName={getConfidenceColor()}
              />
            </div>

            <div className={`flex items-center gap-2 p-2 rounded-lg mb-3 ${
              stock.flow === 'IN' && (stock.confidence || 0) >= 85 
                ? 'bg-[#00ff99]/20 border border-[#00ff99]/30'
                : stock.flow === 'OUT' && (stock.confidence || 0) >= 80
                ? 'bg-[#ff4d4d]/20 border border-[#ff4d4d]/30'
                : 'bg-gray-800/30 border border-gray-700'
            }`}>
              <Zap className={`w-4 h-4 ${
                stock.flow === 'IN' && (stock.confidence || 0) >= 85 ? 'text-[#00ff99]' :
                stock.flow === 'OUT' && (stock.confidence || 0) >= 80 ? 'text-[#ff4d4d]' :
                'text-gray-400'
              }`} />
              <p className="text-xs font-semibold text-white">
                {language === 'en' ? aiGuidance.en : aiGuidance.zh}
              </p>
            </div>

            <div className="bg-black/30 rounded-lg p-3 backdrop-blur-sm mb-4">
              <p className="text-xs text-gray-300 leading-relaxed">
                {language === 'en' ? stock.ai_comment_en : stock.ai_comment_zh}
              </p>
            </div>

            <Button
              onClick={handleSimulateBuy}
              disabled={hasActiveTrade}
              className={`w-full ${
                stock.flow === 'IN' && (stock.confidence || 0) >= 80
                  ? 'bg-gradient-to-r from-[#00ff99] to-[#00cc7a] text-black hover:from-[#00cc7a] hover:to-[#00ff99]'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } font-semibold transition-all`}
            >
              {hasActiveTrade ? (
                language === 'en' ? `✓ Holding ${activeTrades[0].shares} share${activeTrades[0].shares > 1 ? 's' : ''}` : `✓ 持有${activeTrades[0].shares}股`
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {language === 'en' ? 'Simulate Buy' : '模擬買進'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {showBuyDialog && (
        <SimulateBuyDialog
          stock={stock}
          isOpen={showBuyDialog}
          onClose={() => setShowBuyDialog(false)}
        />
      )}

      {showDeleteDialog && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-[#151a21] border-gray-800 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                {language === 'en' ? 'Delete Stock?' : '刪除股票？'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                {language === 'en' 
                  ? `Are you sure you want to remove ${stock.symbol} (${stock.name}) from your watchlist? This action cannot be undone.`
                  : `確定要從清單中移除 ${stock.symbol}（${stock.name}）嗎？此操作無法復原。`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600">
                {language === 'en' ? 'Cancel' : '取消'}
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {language === 'en' ? 'Delete' : '刪除'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}