import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Star, RefreshCw, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import FlowIndicator from "../components/stock/FlowIndicator";
import DetailedStockInfo from "../components/stock/DetailedStockInfo";
import { useLanguage } from "../Layout";
import { Button } from "@/components/ui/button";

export default function StockDetail() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const stockId = urlParams.get('id');
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: stock, isLoading } = useQuery({
    queryKey: ['stock', stockId],
    queryFn: async () => {
      const stocks = await base44.entities.Stock.list();
      return stocks.find(s => s.id === stockId);
    },
    enabled: !!stockId,
    refetchInterval: 30000
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Stock.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock', stockId] });
    },
  });

  const toggleWatchlist = async () => {
    if (!stock) return;
    await updateMutation.mutateAsync({
      id: stock.id,
      data: { is_watchlist: !stock.is_watchlist }
    });
  };

  const updateStockWithAI = async () => {
    if (!stock) return;
    
    setIsUpdating(true);
    try {
      const prompt = `
Get the most current real-time market data for ${stock.symbol} (${stock.name}). Include:

1. Current price, change %, volume
2. Market cap, P/E ratio
3. 52-week high/low
4. Today's high/low/open
5. Previous close
6. Dividend yield
7. Next earnings date
8. Analyst rating consensus (Buy/Hold/Sell)
9. Top 3 latest news headlines about this stock
10. Current sector trend for ${stock.theme}
11. Institutional money flow analysis (are big institutions buying or selling?)

Analyze the money flow:
- If strong institutional buying detected → Flow: IN, Signal: Entry
- If strong institutional selling detected → Flow: OUT, Signal: Exit
- If mixed or sideways → Flow: NEUTRAL, Signal: Observation

Provide:
- Confidence level (0-100) based on flow strength and data certainty
- Brief comment in both English and Traditional Chinese
- Detailed analysis paragraph in both languages explaining the stock's current situation, technical position, and fundamental outlook

Be specific and use real data from financial sources.
`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            price: { type: "number" },
            change_percent: { type: "number" },
            volume: { type: "number" },
            market_cap: { type: "number" },
            pe_ratio: { type: "number" },
            week_52_high: { type: "number" },
            week_52_low: { type: "number" },
            day_high: { type: "number" },
            day_low: { type: "number" },
            open_price: { type: "number" },
            previous_close: { type: "number" },
            dividend_yield: { type: "number" },
            earnings_date: { type: "string" },
            analyst_rating: { type: "string" },
            flow: { type: "string", enum: ["IN", "OUT", "NEUTRAL"] },
            confidence: { type: "number" },
            ai_signal: { type: "string", enum: ["Entry", "Exit", "Observation"] },
            ai_comment_en: { type: "string" },
            ai_comment_zh: { type: "string" },
            ai_analysis_en: { type: "string" },
            ai_analysis_zh: { type: "string" },
            news_headlines: { type: "array", items: { type: "string" } },
            sector_trend: { type: "string" }
          }
        }
      });

      await updateMutation.mutateAsync({
        id: stock.id,
        data: {
          ...result,
          last_ai_update: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error updating stock data:", error);
    }
    setIsUpdating(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-[#00ff99] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">
            {language === 'en' ? 'Stock not found' : '找不到股票'}
          </p>
          <Button onClick={() => navigate(createPageUrl("Dashboard"))}>
            {language === 'en' ? 'Back to Dashboard' : '返回主頁'}
          </Button>
        </div>
      </div>
    );
  }

  const flowTexts = {
    IN: {
      en: `🟢 Entry Opportunity — Confidence ${stock.confidence || 0}%`,
      zh: `🟢 進場時機 — 信心${stock.confidence || 0}%`
    },
    OUT: {
      en: `🔴 Exit Warning — Confidence ${stock.confidence || 0}%`,
      zh: `🔴 出場警告 — 信心${stock.confidence || 0}%`
    },
    NEUTRAL: {
      en: `🟠 Observation Phase — Confidence ${stock.confidence || 0}%`,
      zh: `🟠 觀察階段 — 信心${stock.confidence || 0}%`
    }
  };

  const changeColor = (stock.change_percent || 0) >= 0 ? "text-[#00ff99]" : "text-[#ff4d4d]";

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{language === 'en' ? 'Back' : '返回'}</span>
          </button>
          <div className="flex items-center gap-3">
            {stock.last_ai_update && (
              <div className="text-xs text-gray-500">
                {language === 'en' ? 'Updated: ' : '更新時間: '}
                {new Date(stock.last_ai_update).toLocaleString(language === 'en' ? 'en-US' : 'zh-TW')}
              </div>
            )}
            <Button
              onClick={updateStockWithAI}
              disabled={isUpdating}
              className="bg-gradient-to-r from-[#00ff99] to-[#00cc7a] text-black hover:from-[#00cc7a] hover:to-[#00ff99]"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {language === 'en' ? 'Updating...' : '更新中...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {language === 'en' ? 'AI Update' : 'AI更新'}
                </>
              )}
            </Button>
            <button
              onClick={toggleWatchlist}
              className="p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
            >
              <Star className={`w-6 h-6 ${stock.is_watchlist ? 'fill-[#ffaa00] text-[#ffaa00]' : 'text-gray-500'}`} />
            </button>
            <span className="px-4 py-2 bg-gray-800 rounded-xl text-sm text-gray-400">
              {stock.theme}
            </span>
          </div>
        </div>

        {/* Main Info Card */}
        <div className="bg-[#151a21] border border-gray-800 rounded-3xl p-8 space-y-6">
          {/* Stock Header */}
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-bold text-white">{stock.symbol}</h1>
            <p className="text-xl text-gray-400">{stock.name}</p>
          </div>

          {/* Price Display */}
          <div className="text-center space-y-2">
            <div className="text-6xl font-bold text-white">
              ${(stock.price || 0).toFixed(2)}
            </div>
            <div className={`text-2xl font-semibold ${changeColor}`}>
              {(stock.change_percent || 0) >= 0 ? '+' : ''}{(stock.change_percent || 0).toFixed(2)}%
            </div>
          </div>

          {/* Flow Indicator */}
          <div className="flex justify-center py-8">
            <FlowIndicator flow={stock.flow} confidence={stock.confidence || 0} size="lg" />
          </div>

          {/* Signal Text */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              {flowTexts[stock.flow][language]}
            </h2>
          </div>

          {/* AI Comment */}
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {language === 'en' ? 'AI Quick Take' : 'AI快速分析'}
            </h3>
            <p className="text-lg text-gray-200 leading-relaxed">
              {language === 'en' ? stock.ai_comment_en : stock.ai_comment_zh}
            </p>
          </div>
        </div>

        {/* Detailed Info */}
        <DetailedStockInfo stock={stock} />

        {/* Entry/Exit Points */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-[#00ff99]/10 to-transparent bg-[#151a21] border border-[#00ff99]/30 rounded-2xl p-8 text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-[#00ff99] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,255,153,0.6)]">
              <div className="text-4xl font-bold text-black">🟢</div>
            </div>
            <h3 className="text-2xl font-bold text-white">
              {language === 'en' ? 'Entry Zone' : '進場區間'}
            </h3>
            <p className="text-gray-400">
              {language === 'en' 
                ? 'Target entry near support levels'
                : '目標進場價位於支撐位附近'}
            </p>
            <div className="text-3xl font-bold text-[#00ff99]">
              ${((stock.price || 0) * 0.98).toFixed(2)} - ${((stock.price || 0) * 0.99).toFixed(2)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#ff4d4d]/10 to-transparent bg-[#151a21] border border-[#ff4d4d]/30 rounded-2xl p-8 text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-[#ff4d4d] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,77,77,0.6)]">
              <div className="text-4xl font-bold text-white">🔴</div>
            </div>
            <h3 className="text-2xl font-bold text-white">
              {language === 'en' ? 'Exit Zone' : '出場區間'}
            </h3>
            <p className="text-gray-400">
              {language === 'en' 
                ? 'Target exit near resistance or stop loss'
                : '目標出場價於阻力位或停損位'}
            </p>
            <div className="text-3xl font-bold text-[#ff4d4d]">
              ${((stock.price || 0) * 1.01).toFixed(2)} - ${((stock.price || 0) * 1.02).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}