import { useLanguage } from "../../Layout";
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, Award, Newspaper } from "lucide-react";

export default function DetailedStockInfo({ stock }) {
  const { language } = useLanguage();

  const sections = [
    {
      title: language === 'en' ? 'Price Metrics' : '價格指標',
      icon: DollarSign,
      items: [
        { label: language === 'en' ? 'Current Price' : '當前價格', value: `$${(stock.price || 0).toFixed(2)}` },
        { label: language === 'en' ? 'Open' : '開盤價', value: `$${(stock.open_price || 0).toFixed(2)}` },
        { label: language === 'en' ? 'Previous Close' : '昨收', value: `$${(stock.previous_close || 0).toFixed(2)}` },
        { label: language === 'en' ? 'Day High' : '今日最高', value: `$${(stock.day_high || 0).toFixed(2)}` },
        { label: language === 'en' ? 'Day Low' : '今日最低', value: `$${(stock.day_low || 0).toFixed(2)}` },
      ]
    },
    {
      title: language === 'en' ? 'Range & Volume' : '區間與成交量',
      icon: BarChart3,
      items: [
        { label: language === 'en' ? '52W High' : '52週最高', value: `$${(stock.week_52_high || 0).toFixed(2)}` },
        { label: language === 'en' ? '52W Low' : '52週最低', value: `$${(stock.week_52_low || 0).toFixed(2)}` },
        { label: language === 'en' ? 'Volume' : '成交量', value: stock.volume ? `${((stock.volume || 0) / 1000000).toFixed(2)}M` : 'N/A' },
        { label: language === 'en' ? 'Market Cap' : '市值', value: stock.market_cap ? `$${(stock.market_cap || 0).toFixed(2)}B` : 'N/A' },
      ]
    },
    {
      title: language === 'en' ? 'Fundamentals' : '基本面',
      icon: TrendingUp,
      items: [
        { label: language === 'en' ? 'P/E Ratio' : '本益比', value: (stock.pe_ratio || 0).toFixed(2) },
        { label: language === 'en' ? 'Dividend Yield' : '股息率', value: stock.dividend_yield ? `${(stock.dividend_yield || 0).toFixed(2)}%` : 'N/A' },
        { label: language === 'en' ? 'Earnings Date' : '財報日', value: stock.earnings_date || 'N/A' },
        { label: language === 'en' ? 'Analyst Rating' : '分析師評級', value: stock.analyst_rating || 'N/A' },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="bg-[#151a21] border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon className="w-5 h-5 text-[#00ff99]" />
                <h3 className="font-semibold text-white">{section.title}</h3>
              </div>
              <div className="space-y-3">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">{item.label}</span>
                    <span className="text-sm font-semibold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Analysis */}
      {(stock.ai_analysis_en || stock.ai_analysis_zh) && (
        <div className="bg-gradient-to-br from-[#00ff99]/5 to-transparent bg-[#151a21] border border-[#00ff99]/30 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-[#00ff99]" />
            <h3 className="font-semibold text-white text-lg">
              {language === 'en' ? 'AI Detailed Analysis' : 'AI詳細分析'}
            </h3>
          </div>
          <p className="text-gray-300 leading-relaxed whitespace-pre-line">
            {language === 'en' ? stock.ai_analysis_en : stock.ai_analysis_zh}
          </p>
        </div>
      )}

      {/* Sector Trend */}
      {stock.sector_trend && (
        <div className="bg-[#151a21] border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#ffaa00]" />
            <h3 className="font-semibold text-white text-lg">
              {language === 'en' ? 'Sector Trend' : '板塊趨勢'}
            </h3>
          </div>
          <p className="text-gray-300 leading-relaxed">{stock.sector_trend}</p>
        </div>
      )}

      {/* News Headlines */}
      {stock.news_headlines && stock.news_headlines.length > 0 && (
        <div className="bg-[#151a21] border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="w-5 h-5 text-[#00ff99]" />
            <h3 className="font-semibold text-white text-lg">
              {language === 'en' ? 'Latest News' : '最新消息'}
            </h3>
          </div>
          <div className="space-y-3">
            {stock.news_headlines.map((headline, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-black/20 rounded-lg">
                <div className="w-6 h-6 bg-[#00ff99]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-[#00ff99]">{idx + 1}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{headline}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}