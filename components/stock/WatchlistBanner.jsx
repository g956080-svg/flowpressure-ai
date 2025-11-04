import { AlertTriangle, X, TrendingDown } from "lucide-react";
import { useLanguage } from "../../Layout";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function WatchlistBanner({ exitStocks, onDismiss }) {
  const { language } = useLanguage();
  const navigate = useNavigate();

  if (!exitStocks || exitStocks.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-r from-[#ff4d4d] to-[#ff6b6b] rounded-xl p-4 mb-6 shadow-lg shadow-[#ff4d4d]/20 animate-pulse"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <AlertTriangle className="w-6 h-6 text-white flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1">
              <h3 className="font-bold text-white text-lg mb-2">
                {language === 'en' ? '⚠ AI Alert: Capital Exiting' : '⚠ AI警報：資金撤出'}
              </h3>
              <p className="text-white/90 text-sm mb-3">
                {language === 'en'
                  ? `${exitStocks.length} stock${exitStocks.length > 1 ? 's' : ''} in your watchlist changed to Exit signal:`
                  : `你的追蹤清單中有 ${exitStocks.length} 支股票轉為出場訊號：`}
              </p>
              <div className="space-y-2">
                {exitStocks.map(stock => (
                  <div 
                    key={stock.id}
                    onClick={() => navigate(createPageUrl("StockDetail") + `?id=${stock.id}`)}
                    className="bg-black/20 rounded-lg p-3 cursor-pointer hover:bg-black/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TrendingDown className="w-5 h-5 text-white" />
                        <div>
                          <span className="font-bold text-white text-lg">{stock.symbol}</span>
                          <span className="text-white/80 text-sm ml-2">{stock.name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">${stock.price.toFixed(2)}</div>
                        <div className="text-xs text-white/80">
                          {language === 'en' ? 'Confidence' : '信心'}: {stock.confidence}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}