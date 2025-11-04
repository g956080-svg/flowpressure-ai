import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles } from "lucide-react";
import { useLanguage } from "../../Layout";
import { isPreMarketHours, fetchPreMarketData } from "./PreMarketDataFetcher";

export default function AIDataRefresher({ stocks = [] }) {
  const { language } = useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStock, setCurrentStock] = useState('');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Stock.update(id, data),
  });

  const refreshAllStocks = async () => {
    if (stocks.length === 0) return;
    
    setIsRefreshing(true);
    setProgress(0);

    const total = stocks.length;
    let completed = 0;
    const isPMHours = isPreMarketHours();

    for (const stock of stocks) {
      setCurrentStock(stock.symbol);
      
      try {
        let result;
        
        // If pre-market hours, fetch pre-market data
        if (isPMHours) {
          result = await fetchPreMarketData(stock.symbol);
        } else {
          // Regular market data
          const prompt = `
Get the most current real-time market data for ${stock.symbol} (${stock.name}). Include:

1. Current price, change %, volume
2. Market cap, P/E ratio
3. 52-week high/low
4. Today's high/low/open
5. Previous close
6. Dividend yield
7. Next earnings date
8. Analyst rating consensus
9. Top 3 latest news headlines
10. Current sector trend
11. Institutional money flow analysis

Analyze the money flow:
- Strong institutional buying → Flow: IN
- Strong institutional selling → Flow: OUT
- Mixed/sideways → Flow: NEUTRAL

Provide confidence (0-100) and bilingual analysis.
`;

          result = await base44.integrations.Core.InvokeLLM({
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
        }

        if (result) {
          await updateMutation.mutateAsync({
            id: stock.id,
            data: {
              ...result,
              is_watchlist: stock.is_watchlist,
              last_ai_update: new Date().toISOString()
            }
          });
        }
      } catch (error) {
        console.error(`Error updating ${stock.symbol}:`, error);
      }

      completed++;
      setProgress(Math.round((completed / total) * 100));
      
      // Faster updates during pre-market
      const delay = isPMHours ? 1000 : 1500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    queryClient.invalidateQueries({ queryKey: ['stocks'] });
    setIsRefreshing(false);
    setProgress(0);
    setCurrentStock('');
  };

  const isPM = isPreMarketHours();

  if (stocks.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={refreshAllStocks}
        disabled={isRefreshing}
        className="bg-gradient-to-r from-[#00ff99] to-[#00cc7a] text-black hover:from-[#00cc7a] hover:to-[#00ff99] font-semibold shadow-lg shadow-[#00ff99]/20"
      >
        {isRefreshing ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            {language === 'en' ? `Updating ${progress}%` : `更新中 ${progress}%`}
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            {language === 'en' ? 'AI Update All' : 'AI 全部更新'}
          </>
        )}
      </Button>
      
      {stocks.length > 0 && stocks[0]?.last_ai_update && (
        <div className="text-xs text-gray-500">
          {language === 'en' ? 'Last update: ' : '最後更新: '}
          {new Date(stocks[0].last_ai_update).toLocaleTimeString(language === 'en' ? 'en-US' : 'zh-TW')}
        </div>
      )}
      
      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
        isPM 
          ? 'bg-[#ffaa00]/10 border border-[#ffaa00]/30' 
          : 'bg-[#00ff99]/10 border border-[#00ff99]/30'
      }`}>
        <div className={`w-2 h-2 rounded-full animate-pulse ${
          isPM ? 'bg-[#ffaa00]' : 'bg-[#00ff99]'
        }`} />
        <span className={`text-xs font-semibold ${
          isPM ? 'text-[#ffaa00]' : 'text-[#00ff99]'
        }`}>
          {isPM 
            ? (language === 'en' ? 'Pre-Market Live' : '盤前即時')
            : (language === 'en' ? 'AI Live Data' : 'AI 即時數據')}
        </span>
      </div>
      
      {isRefreshing && currentStock && (
        <div className="text-xs text-gray-400">
          {language === 'en' ? 'Processing: ' : '處理中: '}{currentStock}
        </div>
      )}
    </div>
  );
}