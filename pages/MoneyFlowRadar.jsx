import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useLanguage } from "../Layout";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

export default function MoneyFlowRadar() {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const { data: stocks = [], isLoading } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => base44.entities.Stock.list('-confidence'),
    refetchInterval: 5000
  });

  // Sort by confidence (flow strength)
  const sortedStocks = [...stocks].sort((a, b) => {
    const flowPriority = { IN: 3, NEUTRAL: 2, OUT: 1 };
    if (flowPriority[a.flow] !== flowPriority[b.flow]) {
      return flowPriority[b.flow] - flowPriority[a.flow];
    }
    return (b.confidence || 0) - (a.confidence || 0);
  });

  const getFlowIcon = (flow) => {
    switch (flow) {
      case 'IN': return <ArrowUp className="w-5 h-5 text-[#00ff99]" />;
      case 'OUT': return <ArrowDown className="w-5 h-5 text-[#ff4d4d]" />;
      default: return <Minus className="w-5 h-5 text-[#ffaa00]" />;
    }
  };

  const getFlowBg = (flow, confidence) => {
    const opacity = (confidence || 0) / 200;
    switch (flow) {
      case 'IN': return `rgba(0, 255, 153, ${opacity})`;
      case 'OUT': return `rgba(255, 77, 77, ${opacity})`;
      default: return `rgba(255, 170, 0, ${opacity})`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-[#00ff99] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            {language === 'en' ? 'Money Flow Radar' : '資金流向雷達'}
          </h1>
          <p className="text-gray-400 text-lg">
            {language === 'en' 
              ? 'All stocks ranked by capital flow strength'
              : '依資金流向強度排序的所有股票'}
          </p>
        </div>

        {/* Leaderboard */}
        <div className="bg-[#151a21] border border-gray-800 rounded-2xl overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4 p-6 border-b border-gray-800 bg-black/20 font-semibold text-gray-400 text-sm">
            <div className="col-span-1">#</div>
            <div className="col-span-3">{language === 'en' ? 'Name' : '名稱'}</div>
            <div className="col-span-2">{language === 'en' ? 'Price' : '價格'}</div>
            <div className="col-span-2">{language === 'en' ? 'Flow' : '流向'}</div>
            <div className="col-span-1">{language === 'en' ? 'Confidence' : '信心'}</div>
            <div className="col-span-3">{language === 'en' ? 'AI Comment' : 'AI評論'}</div>
          </div>

          {/* Stock Rows */}
          <div className="divide-y divide-gray-800">
            {sortedStocks.map((stock, index) => (
              <div
                key={stock.id}
                onClick={() => navigate(createPageUrl("StockDetail") + `?id=${stock.id}`)}
                className="grid grid-cols-12 gap-4 p-6 cursor-pointer hover:bg-gray-800/30 transition-colors"
                style={{ 
                  background: `linear-gradient(to right, ${getFlowBg(stock.flow, stock.confidence)}, transparent)` 
                }}
              >
                {/* Rank */}
                <div className="col-span-1 flex items-center">
                  <span className="text-2xl font-bold text-gray-500">#{index + 1}</span>
                </div>

                {/* Name */}
                <div className="col-span-3 flex items-center">
                  <div>
                    <div className="font-bold text-white text-lg">{stock.symbol}</div>
                    <div className="text-sm text-gray-400">{stock.name}</div>
                  </div>
                </div>

                {/* Price */}
                <div className="col-span-2 flex items-center">
                  <div>
                    <div className="font-bold text-white">${(stock.price || 0).toFixed(2)}</div>
                    <div className={`text-sm ${(stock.change_percent || 0) >= 0 ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
                      {(stock.change_percent || 0) >= 0 ? '+' : ''}{(stock.change_percent || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Flow */}
                <div className="col-span-2 flex items-center gap-2">
                  {getFlowIcon(stock.flow)}
                  <span className="font-semibold text-white">
                    {stock.flow}
                  </span>
                </div>

                {/* Confidence */}
                <div className="col-span-1 flex items-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{stock.confidence || 0}%</div>
                  </div>
                </div>

                {/* AI Comment */}
                <div className="col-span-3 flex items-center">
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {language === 'en' ? stock.ai_comment_en : stock.ai_comment_zh}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}