import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useLanguage } from "../../Layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const POPULAR_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'
];

export default function BulkStockLoader() {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStock, setCurrentStock] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Stock.create(data),
  });

  const loadPopularStocks = async () => {
    setIsLoading(true);
    setProgress(0);

    const total = POPULAR_STOCKS.length;
    let completed = 0;
    let successful = 0;

    for (const symbol of POPULAR_STOCKS) {
      setCurrentStock(symbol);
      
      try {
        const prompt = `
Get real-time market data for ${symbol} stock. Include:

1. Current price, change %, volume
2. Market cap, P/E ratio
3. 52-week high/low
4. Today's high/low/open
5. Previous close
6. Dividend yield
7. Earnings date
8. Analyst rating
9. Top 3 news headlines
10. Industry classification
11. Money flow analysis

Analyze:
- Strong buying = Flow: IN
- Strong selling = Flow: OUT
- Mixed = Flow: NEUTRAL

Provide confidence (0-100) and bilingual analysis.
`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: prompt,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              symbol: { type: "string" },
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
              theme: { type: "string", enum: ["AI", "EV", "Energy", "Finance", "Tech", "Healthcare", "Consumer", "Semiconductor", "Cloud", "Biotech"] },
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

        if (result && result.name) {
          await createMutation.mutateAsync({
            ...result,
            is_watchlist: false,
            last_ai_update: new Date().toISOString()
          });
          successful++;
        }
      } catch (error) {
        console.error(`Error loading ${symbol}:`, error);
      }

      completed++;
      setProgress(Math.round((completed / total) * 100));
      
      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    queryClient.invalidateQueries({ queryKey: ['stocks'] });
    setIsLoading(false);
    setProgress(0);
    setCurrentStock('');
    
    alert(
      language === 'en' 
        ? `Successfully loaded ${successful} out of ${total} stocks`
        : `成功載入 ${successful} / ${total} 檔股票`
    );
    
    setIsOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
      >
        <Download className="w-4 h-4 mr-2" />
        {language === 'en' ? 'Load Popular Stocks' : '載入熱門股票'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[#151a21] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {language === 'en' ? 'Load Popular U.S. Stocks' : '載入熱門美股'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {language === 'en'
                ? `AI will search for real-time data for ${POPULAR_STOCKS.length} popular stocks. Process takes about 2-3 minutes.`
                : `AI 將搜尋 ${POPULAR_STOCKS.length} 檔熱門股票的即時數據，約需 2-3 分鐘。`}
            </DialogDescription>
          </DialogHeader>

          {!isLoading ? (
            <div className="space-y-6">
              <div className="bg-[#0b0f14] border border-gray-800 rounded-xl p-4">
                <h4 className="font-semibold mb-3 text-white">
                  {language === 'en' ? 'Stocks to be loaded:' : '將載入的股票：'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_STOCKS.map(symbol => (
                    <span key={symbol} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                      {symbol}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-400">
                <p>
                  {language === 'en'
                    ? '✓ AI searches real-time price data'
                    : '✓ AI 搜尋即時價格數據'}
                </p>
                <p>
                  {language === 'en'
                    ? '✓ Money flow analysis with confidence scores'
                    : '✓ 資金流向分析與信心度評分'}
                </p>
                <p>
                  {language === 'en'
                    ? '✓ Latest news and market trends'
                    : '✓ 最新新聞與市場趨勢'}
                </p>
              </div>

              <Button
                onClick={loadPopularStocks}
                className="w-full bg-gradient-to-r from-[#00ff99] to-[#00cc7a] text-black hover:from-[#00cc7a] hover:to-[#00ff99] font-semibold"
              >
                <Download className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Start Loading' : '開始載入'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6 py-6">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-[#00ff99] mx-auto mb-4" />
                <p className="text-lg font-semibold text-white mb-2">
                  {language === 'en' ? 'Loading stocks...' : '載入股票中...'}
                </p>
                <p className="text-gray-400">
                  {language === 'en' ? 'Current:' : '目前：'} <span className="font-semibold text-[#00ff99]">{currentStock}</span>
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{language === 'en' ? 'Progress' : '進度'}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <p className="text-xs text-center text-gray-500">
                {language === 'en'
                  ? 'Please wait... AI is searching for real-time data.'
                  : '請稍候... AI 正在搜尋即時數據。'}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}