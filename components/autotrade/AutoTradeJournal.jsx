import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../../Layout";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Clock, DollarSign } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AutoTradeJournal() {
  const { language } = useLanguage();
  const [filter, setFilter] = useState("all");

  const { data: trades = [] } = useQuery({
    queryKey: ['autoTrades'],
    queryFn: () => base44.entities.AutoTrade.list('-entry_time'),
    refetchInterval: 5000
  });

  const { data: config } = useQuery({
    queryKey: ['autoTradeConfig'],
    queryFn: async () => {
      const configs = await base44.entities.AutoTradeConfig.list();
      return configs.length > 0 ? configs[0] : null;
    }
  });

  const filteredTrades = trades.filter(trade => {
    if (filter === "all") return true;
    if (filter === "open") return trade.status === "OPEN";
    if (filter === "closed") return trade.status === "CLOSED";
    if (filter === "winners") return trade.status === "CLOSED" && trade.pl_amount > 0;
    if (filter === "losers") return trade.status === "CLOSED" && trade.pl_amount < 0;
    return true;
  });

  const openTrades = trades.filter(t => t.status === "OPEN");
  const closedTrades = trades.filter(t => t.status === "CLOSED");
  const winners = closedTrades.filter(t => t.pl_amount > 0);
  const winRate = closedTrades.length > 0 ? (winners.length / closedTrades.length) * 100 : 0;
  const maxDrawdown = closedTrades.length > 0 
    ? Math.min(...closedTrades.map(t => t.pl_percent))
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#151a21] border border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">
            {language === 'en' ? 'AI Trades Today' : 'AI 今日交易次數'}
          </div>
          <div className="text-2xl font-bold text-white">{trades.length}</div>
        </div>

        <div className="bg-[#151a21] border border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">
            {language === 'en' ? 'Total P/L Today' : '今日模擬損益'}
          </div>
          <div className={`text-2xl font-bold ${config?.total_pl_today >= 0 ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
            {config?.total_pl_today >= 0 ? '+' : ''}${config?.total_pl_today?.toFixed(2) || '0.00'}
          </div>
        </div>

        <div className="bg-[#151a21] border border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">
            {language === 'en' ? 'Win Rate' : '勝率'}
          </div>
          <div className="text-2xl font-bold text-white">{winRate.toFixed(0)}%</div>
        </div>

        <div className="bg-[#151a21] border border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">
            {language === 'en' ? 'Virtual Cash' : '剩餘模擬資金'}
          </div>
          <div className="text-2xl font-bold text-white">${config?.current_balance?.toFixed(2) || '0.00'}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="bg-[#151a21] border border-gray-800">
          <TabsTrigger value="all" className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black">
            {language === 'en' ? 'All' : '全部'} ({trades.length})
          </TabsTrigger>
          <TabsTrigger value="open" className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black">
            {language === 'en' ? 'Open' : '持有中'} ({openTrades.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black">
            {language === 'en' ? 'Closed' : '已平倉'} ({closedTrades.length})
          </TabsTrigger>
          <TabsTrigger value="winners" className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black">
            {language === 'en' ? 'Winners' : '獲利單'} ({winners.length})
          </TabsTrigger>
          <TabsTrigger value="losers" className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black">
            {language === 'en' ? 'Cut Loss' : '止損單'} ({closedTrades.length - winners.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Trades List */}
      <div className="space-y-4">
        {filteredTrades.length > 0 ? (
          filteredTrades.map((trade) => {
            const isOpen = trade.status === "OPEN";
            const isProfit = trade.pl_amount >= 0;

            return (
              <div
                key={trade.id}
                className={`bg-[#151a21] border rounded-xl p-6 ${
                  isOpen 
                    ? 'border-[#00ff99] shadow-lg shadow-[#00ff99]/10' 
                    : isProfit 
                      ? 'border-gray-800' 
                      : 'border-gray-800'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isOpen 
                        ? 'bg-[#00ff99]/20 animate-pulse' 
                        : isProfit 
                          ? 'bg-[#00ff99]/10' 
                          : 'bg-[#ff4d4d]/10'
                    }`}>
                      {isOpen ? (
                        <Clock className="w-6 h-6 text-[#00ff99]" />
                      ) : isProfit ? (
                        <TrendingUp className="w-6 h-6 text-[#00ff99]" />
                      ) : (
                        <TrendingDown className="w-6 h-6 text-[#ff4d4d]" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{trade.symbol}</h3>
                      <p className="text-sm text-gray-400">{trade.company_name}</p>
                    </div>
                  </div>

                  <div className={`px-4 py-2 rounded-lg ${
                    isProfit ? 'bg-[#00ff99]/20' : 'bg-[#ff4d4d]/20'
                  }`}>
                    <div className={`text-2xl font-bold ${isProfit ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
                      {isProfit ? '+' : ''}{trade.pl_percent?.toFixed(2) || '0.00'}%
                    </div>
                    <div className={`text-sm ${isProfit ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
                      {isProfit ? '+' : ''}${trade.pl_amount?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="text-xs text-gray-500">
                      {language === 'en' ? 'Shares' : '股數'}
                    </span>
                    <div className="font-bold text-white">{trade.shares}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">
                      {language === 'en' ? 'Buy Price' : '買入價'}
                    </span>
                    <div className="font-semibold text-white">${trade.buy_price.toFixed(2)}</div>
                  </div>
                  {!isOpen && (
                    <div>
                      <span className="text-xs text-gray-500">
                        {language === 'en' ? 'Sell Price' : '賣出價'}
                      </span>
                      <div className="font-semibold text-white">${trade.sell_price.toFixed(2)}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-gray-500">
                      {language === 'en' ? 'Total Cost' : '總成本'}
                    </span>
                    <div className="font-semibold text-white">${trade.total_cost.toFixed(2)}</div>
                  </div>
                </div>

                <div className="bg-black/30 rounded-lg p-3 mb-3">
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Entry Reason:' : '進場原因：'}
                  </div>
                  <p className="text-sm text-gray-300">
                    {language === 'en' ? trade.entry_reason_en : trade.entry_reason_zh}
                  </p>
                </div>

                {!isOpen && trade.exit_reason_en && (
                  <div className={`rounded-lg p-3 mb-3 ${
                    isProfit ? 'bg-[#00ff99]/10' : 'bg-[#ff4d4d]/10'
                  }`}>
                    <div className="text-xs text-gray-400 mb-1">
                      {language === 'en' ? 'Exit Reason:' : '出場原因：'}
                    </div>
                    <p className="text-sm font-semibold">
                      {language === 'en' ? trade.exit_reason_en : trade.exit_reason_zh}
                    </p>
                  </div>
                )}

                <div className="flex justify-between text-xs text-gray-500 pt-3 border-t border-gray-800">
                  <span>
                    {language === 'en' ? 'Entry:' : '進場：'} {format(new Date(trade.entry_time), 'MM/dd HH:mm')}
                  </span>
                  {trade.exit_time && (
                    <span>
                      {language === 'en' ? 'Exit:' : '出場：'} {format(new Date(trade.exit_time), 'MM/dd HH:mm')}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-400 mb-2">
              {language === 'en' ? 'No Trades Yet' : '尚無交易記錄'}
            </h3>
            <p className="text-gray-500">
              {language === 'en'
                ? 'Enable Auto Trade AI to start automated trading!'
                : '啟用自動操盤 AI 開始自動交易！'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}