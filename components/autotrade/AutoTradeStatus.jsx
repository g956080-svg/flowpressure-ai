import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../../Layout";
import { Bot, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AutoTradeStatus() {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const { data: config } = useQuery({
    queryKey: ['autoTradeConfig'],
    queryFn: async () => {
      const configs = await base44.entities.AutoTradeConfig.list();
      return configs.length > 0 ? configs[0] : null;
    },
    refetchInterval: 5000
  });

  const { data: openTrades = [] } = useQuery({
    queryKey: ['openAutoTrades'],
    queryFn: async () => {
      const trades = await base44.entities.AutoTrade.list();
      return trades.filter(t => t.status === "OPEN");
    },
    refetchInterval: 5000
  });

  if (!config) return null;

  const isRunning = config.is_enabled;
  const returnPercent = config.starting_balance > 0 
    ? (config.total_pl_today / config.starting_balance) * 100 
    : 0;

  return (
    <div 
      onClick={() => navigate(createPageUrl("AutoTradeAI"))}
      className="bg-gradient-to-br from-[#00ff99]/10 to-transparent bg-[#151a21] border border-[#00ff99]/30 rounded-2xl p-6 cursor-pointer hover:scale-[1.02] transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-4">
        <Bot className="w-8 h-8 text-[#00ff99] animate-pulse" />
        <div>
          <h3 className="text-xl font-bold text-white">
            {language === 'en' ? 'Auto Trade AI Status' : '自動操盤狀態'}
          </h3>
          <p className="text-xs text-gray-400">
            {language === 'en' ? 'Premium Preview (Free Beta)' : '付費版預覽（目前免費測試）'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-black/30 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">
            {language === 'en' ? 'Mode' : '模式'}
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#00ff99] animate-pulse' : 'bg-gray-500'}`} />
            <span className="font-semibold text-white">
              {isRunning 
                ? (language === 'en' ? 'Running' : '運作中')
                : (language === 'en' ? 'Stopped' : '已停止')}
            </span>
          </div>
        </div>

        <div className="bg-black/30 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">
            {language === 'en' ? 'Active Positions' : '持有部位'}
          </div>
          <div className="font-semibold text-white">
            {openTrades.length} {language === 'en' ? 'Open' : '檔持有中'}
          </div>
        </div>

        <div className="bg-black/30 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">
            {language === 'en' ? 'AI Return Today' : '今日 AI 報酬'}
          </div>
          <div className={`font-bold ${returnPercent >= 0 ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
            {returnPercent >= 0 ? '+' : ''}{returnPercent.toFixed(2)}%
          </div>
        </div>

        <div className="bg-black/30 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">
            {language === 'en' ? 'Total P/L ($)' : '今日損益'}
          </div>
          <div className={`font-bold ${config.total_pl_today >= 0 ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
            {config.total_pl_today >= 0 ? '+' : ''}${config.total_pl_today.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
        <p className="text-xs text-gray-300 text-center">
          {language === 'en'
            ? 'This is a simulation. No real money is used.'
            : '此為模擬測試，不涉及真實資金。'}
        </p>
      </div>
    </div>
  );
}