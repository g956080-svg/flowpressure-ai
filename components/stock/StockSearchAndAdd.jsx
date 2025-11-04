import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Loader2 } from "lucide-react";
import { useLanguage } from "../../Layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function StockSearchAndAdd() {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Stock.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      setIsOpen(false);
      setSymbol("");
      setSelectedStock(null);
    },
  });

  const fetchStockData = async () => {
    if (!symbol.trim()) return;

    setIsFetching(true);
    try {
      const prompt = `
Search and get real-time market data for the U.S. stock with symbol: ${symbol.toUpperCase()}

Please provide:
1. Company full name
2. Stock symbol (verify it's correct)
3. Current price
4. Change percentage today
5. Trading volume
6. Market capitalization (in millions)
7. P/E ratio
8. 52-week high and low
9. Today's high, low, and open
10. Previous close
11. Dividend yield
12. Next earnings date
13. Analyst rating consensus
14. Industry/sector classification
15. Top 3 recent news headlines
16. Institutional money flow analysis

Analyze the money flow:
- Strong buying = Flow: IN
- Strong selling = Flow: OUT  
- Mixed/sideways = Flow: NEUTRAL

Provide confidence score (0-100) and brief bilingual analysis.
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

      if (result && result.name && result.symbol) {
        setSelectedStock(result);
      } else {
        alert(language === 'en' 
          ? `Unable to find stock data for ${symbol}. Please check the symbol.` 
          : `無法找到 ${symbol} 的股票資料，請檢查代號。`);
      }
    } catch (error) {
      console.error("Error fetching stock data:", error);
      alert(language === 'en' ? 'Error fetching stock data. Please try again.' : '獲取股票數據時發生錯誤，請重試。');
    }
    setIsFetching(false);
  };

  const addStock = async () => {
    if (!selectedStock) return;

    await createMutation.mutateAsync({
      ...selectedStock,
      is_watchlist: false,
      last_ai_update: new Date().toISOString()
    });
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-gradient-to-r from-[#00ff99] to-[#00cc7a] text-black hover:from-[#00cc7a] hover:to-[#00ff99] font-semibold shadow-lg"
      >
        <Plus className="w-4 h-4 mr-2" />
        {language === 'en' ? 'Add Stock' : '新增股票'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[#151a21] border-gray-800 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {language === 'en' ? 'Add U.S. Stock (AI Search)' : '新增美股（AI 搜尋）'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {language === 'en' 
                ? 'Enter a stock symbol and AI will search for real-time data'
                : '輸入股票代號，AI 將搜尋即時數據'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Search Input */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && fetchStockData()}
                  placeholder={language === 'en' ? 'Enter Stock Symbol (e.g., AAPL)' : '輸入股票代號（例如：AAPL）'}
                  className="pl-10 bg-[#0b0f14] border-gray-700 text-white"
                  disabled={isFetching}
                />
              </div>
              <Button
                onClick={fetchStockData}
                disabled={isFetching || !symbol.trim()}
                className="bg-[#00ff99] text-black hover:bg-[#00cc7a]"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'en' ? 'Searching...' : '搜尋中...'}
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'Search' : '搜尋'}
                  </>
                )}
              </Button>
            </div>

            {/* Loading State */}
            {isFetching && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-[#00ff99] animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">
                    {language === 'en' ? 'AI is searching for real-time data...' : 'AI 正在搜尋即時數據...'}
                  </p>
                </div>
              </div>
            )}

            {/* Selected Stock Preview */}
            {selectedStock && !isFetching && (
              <div className="bg-[#0b0f14] border border-gray-800 rounded-xl p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selectedStock.symbol}</h3>
                    <p className="text-gray-400">{selectedStock.name}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">
                        {selectedStock.theme}
                      </span>
                      <span className="px-2 py-1 bg-[#00ff99]/20 rounded text-xs text-[#00ff99] font-semibold">
                        AI Verified
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">
                      ${selectedStock.price.toFixed(2)}
                    </div>
                    <div className={`text-lg font-semibold ${selectedStock.change_percent >= 0 ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
                      {selectedStock.change_percent >= 0 ? '+' : ''}{selectedStock.change_percent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                  <div>
                    <span className="text-xs text-gray-500">
                      {language === 'en' ? 'Market Cap' : '市值'}
                    </span>
                    <div className="font-semibold">${selectedStock.market_cap.toFixed(2)}M</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">
                      {language === 'en' ? 'Volume' : '成交量'}
                    </span>
                    <div className="font-semibold">{(selectedStock.volume / 1000000).toFixed(2)}M</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">
                      {language === 'en' ? 'P/E Ratio' : '本益比'}
                    </span>
                    <div className="font-semibold">{selectedStock.pe_ratio.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">
                      {language === 'en' ? 'Flow' : '流向'}
                    </span>
                    <div className="font-semibold flex items-center gap-1">
                      {selectedStock.flow === 'IN' && '🟢'}
                      {selectedStock.flow === 'OUT' && '🔴'}
                      {selectedStock.flow === 'NEUTRAL' && '🟠'}
                      {selectedStock.flow} ({selectedStock.confidence}/100)
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-800">
                  <p className="text-sm text-gray-300">
                    {language === 'en' ? selectedStock.ai_comment_en : selectedStock.ai_comment_zh}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setSelectedStock(null);
                      setSymbol("");
                    }}
                    variant="outline"
                    className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    {language === 'en' ? 'Search Again' : '重新搜尋'}
                  </Button>
                  <Button
                    onClick={addStock}
                    disabled={createMutation.isLoading}
                    className="flex-1 bg-[#00ff99] text-black hover:bg-[#00cc7a] font-semibold"
                  >
                    {createMutation.isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {language === 'en' ? 'Adding...' : '新增中...'}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        {language === 'en' ? 'Add to Dashboard' : '新增至儀表板'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Help Text */}
            <div className="text-xs text-gray-500 space-y-1">
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#00ff99] rounded-full animate-pulse" />
                {language === 'en' 
                  ? '✅ AI searches real-time data from multiple financial sources'
                  : '✅ AI 從多個金融來源搜尋即時數據'}
              </p>
              <p>
                {language === 'en'
                  ? '🔄 Includes: Live quotes, company profile, news, and flow analysis'
                  : '🔄 包含：即時報價、公司概況、新聞及資金流向分析'}
              </p>
              <p>
                {language === 'en'
                  ? '💡 Popular stocks: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META, NFLX'
                  : '💡 熱門股票：AAPL、MSFT、GOOGL、AMZN、TSLA、NVDA、META、NFLX'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}