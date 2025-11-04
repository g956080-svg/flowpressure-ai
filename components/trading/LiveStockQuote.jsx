import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "../../Layout";

export default function LiveStockQuote({ quote, onBuy, onSell, disabled }) {
  const { language } = useLanguage();
  
  const isPositive = (quote.change_pct || 0) >= 0;
  const hasError = quote.error_flag;

  return (
    <Card className={`bg-[#151a21] border-2 transition-all ${
      hasError 
        ? 'border-gray-700' 
        : isPositive 
          ? 'border-[#00ff99]/30 hover:border-[#00ff99]' 
          : 'border-[#ff4d4d]/30 hover:border-[#ff4d4d]'
    }`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-white">{quote.symbol}</h3>
            <p className="text-xs text-gray-500">
              {language === 'en' ? 'Updated: ' : '更新：'}
              {new Date(quote.ts_last_update).toLocaleTimeString()}
            </p>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-semibold ${
            hasError ? 'bg-gray-800 text-gray-400' :
            quote.source_used === 'finnhub' ? 'bg-[#00ff99]/20 text-[#00ff99]' :
            quote.source_used === 'alpha_vantage' ? 'bg-blue-500/20 text-blue-400' :
            'bg-gray-800 text-gray-400'
          }`}>
            {quote.source_used === 'finnhub' ? '🔵 Finnhub' :
             quote.source_used === 'alpha_vantage' ? '🟡 AlphaVantage' :
             '⚪ Fallback'}
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="text-3xl font-bold text-white mb-1">
            ${(quote.last_price || 0).toFixed(2)}
          </div>
          <div className={`text-lg font-semibold flex items-center gap-1 ${
            isPositive ? 'text-[#00ff99]' : 'text-[#ff4d4d]'
          }`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {isPositive ? '+' : ''}{(quote.change_pct || 0).toFixed(2)}%
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-800">
          <div>
            <span className="text-xs text-gray-500">
              {language === 'en' ? 'Volume' : '成交量'}
            </span>
            <div className="text-sm text-white font-semibold">
              {((quote.volume || 0) / 1000000).toFixed(2)}M
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500">
              {language === 'en' ? 'Prev Close' : '昨收'}
            </span>
            <div className="text-sm text-white font-semibold">
              ${(quote.prev_close || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {hasError && (
          <div className="mb-4 p-3 bg-gray-800/50 border border-gray-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-400">{quote.error_message}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={onBuy}
            disabled={disabled || hasError}
            className="bg-[#00ff99] hover:bg-[#00cc7a] text-black font-semibold disabled:bg-gray-700 disabled:text-gray-500"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            {language === 'en' ? 'Buy' : '買進'}
          </Button>
          <Button
            onClick={onSell}
            disabled={disabled || hasError}
            variant="outline"
            className="border-[#ff4d4d] text-[#ff4d4d] hover:bg-[#ff4d4d]/10 disabled:border-gray-700 disabled:text-gray-500"
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            {language === 'en' ? 'Sell' : '賣出'}
          </Button>
        </div>

        {disabled && !hasError && (
          <p className="text-xs text-center text-gray-500 mt-2">
            {language === 'en' ? '⚠️ Trading only available during 09:30-16:00 ET' : '⚠️ 僅在09:30-16:00 ET開放交易'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}