import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "../../Layout";
import { Settings, DollarSign, TrendingUp, Shield, Clock } from "lucide-react";

export default function AutoTradeSettings({ config }) {
  const { language } = useLanguage();
  const [settings, setSettings] = useState(config || {
    starting_balance: 2000,
    max_trade_per_stock: 100,
    max_open_positions: 3,
    profit_target_percent: 3.5,
    stop_loss_percent: -1.8,
    scan_frequency_seconds: 15,
    protect_when_off: true
  });

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AutoTradeConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoTradeConfig'] });
    },
  });

  const handleSave = async () => {
    if (config?.id) {
      await updateMutation.mutateAsync({
        id: config.id,
        data: settings
      });
    }
  };

  return (
    <div className="bg-[#151a21] border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-[#00ff99]" />
        <h2 className="text-2xl font-bold text-white">
          {language === 'en' ? 'AI Trade Settings' : 'AI 交易參數'}
        </h2>
      </div>

      <div className="space-y-6">
        {/* Capital */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
            <DollarSign className="w-4 h-4 text-[#00ff99]" />
            {language === 'en' ? 'Total Capital' : '總資金'}
          </label>
          <Input
            type="number"
            value={settings.starting_balance}
            onChange={(e) => setSettings({...settings, starting_balance: parseFloat(e.target.value)})}
            className="bg-[#0b0f14] border-gray-700 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            {language === 'en' 
              ? 'Total virtual capital: $2000 (default)' 
              : '虛擬總資金：$2000（預設）'}
          </p>
        </div>

        {/* Trade Per Signal */}
        <div>
          <label className="text-sm font-semibold text-white mb-2 block">
            {language === 'en' ? 'Trade Per Signal (%)' : '每信號投入比例 (%)'}
          </label>
          <div className="bg-[#0b0f14] border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">5% of capital</span>
              <span className="text-2xl font-bold text-[#00ff99]">
                ${(settings.starting_balance * 0.05).toFixed(0)}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {language === 'en' 
                ? 'Each signal uses 5% of total capital ($100 per trade with $2000 capital)' 
                : '每個信號使用總資金的 5%（$2000 資金則每筆 $100）'}
            </p>
          </div>
        </div>

        {/* Hold Time */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
            <Clock className="w-4 h-4 text-[#00ff99]" />
            {language === 'en' ? 'Hold Time (seconds)' : '持倉時間（秒）'}
          </label>
          <div className="bg-[#0b0f14] border border-gray-700 rounded-lg p-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">60s</div>
              <p className="text-xs text-gray-500">
                {language === 'en' 
                  ? 'Average hold time per trade (day-trading strategy)' 
                  : '每筆交易平均持倉時間（當沖策略）'}
              </p>
            </div>
          </div>
        </div>

        {/* Max Open Positions */}
        <div>
          <label className="text-sm font-semibold text-white mb-2 block">
            {language === 'en' ? 'Max Open Positions' : '同時持有上限'}
          </label>
          <Input
            type="number"
            value={settings.max_open_positions}
            onChange={(e) => setSettings({...settings, max_open_positions: parseInt(e.target.value)})}
            className="bg-[#0b0f14] border-gray-700 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            {language === 'en' 
              ? 'Maximum 3 positions at once' 
              : '最多同時持有 3 個倉位'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Profit Target */}
          <div>
            <label className="text-sm font-semibold text-white mb-2 block">
              {language === 'en' ? 'Profit Target %' : '停利目標%'}
            </label>
            <Input
              type="number"
              value={settings.profit_target_percent}
              onChange={(e) => setSettings({...settings, profit_target_percent: parseFloat(e.target.value)})}
              className="bg-[#0b0f14] border-gray-700 text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              {language === 'en' 
                ? 'Take profit at +3.5%' 
                : '達到 +3.5% 時停利'}
            </p>
          </div>

          {/* Stop Loss */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
              <Shield className="w-4 h-4 text-[#ff4d4d]" />
              {language === 'en' ? 'Stop Loss %' : '停損下限%'}
            </label>
            <Input
              type="number"
              value={settings.stop_loss_percent}
              onChange={(e) => setSettings({...settings, stop_loss_percent: parseFloat(e.target.value)})}
              className="bg-[#0b0f14] border-gray-700 text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              {language === 'en' 
                ? 'Cut loss at -1.8%' 
                : '達到 -1.8% 時停損'}
            </p>
          </div>
        </div>

        {/* Fee & Slippage Info */}
        <div className="bg-[#0b0f14] border border-gray-700 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {language === 'en' ? 'Fee Rate' : '手續費率'}
            </span>
            <span className="text-white font-semibold">0.8%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {language === 'en' ? 'Slippage' : '滑價'}
            </span>
            <span className="text-white font-semibold">0.05%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {language === 'en' ? 'Data Delay' : '數據延遲'}
            </span>
            <span className="text-white font-semibold">3 seconds</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {language === 'en' ? 'Mode' : '模式'}
            </span>
            <span className="text-[#00ff99] font-semibold">Full AI Mode</span>
          </div>
        </div>

        {/* Scan Frequency */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
            <Clock className="w-4 h-4 text-[#00ff99]" />
            {language === 'en' ? 'Scan Frequency (seconds)' : '掃描頻率（秒）'}
          </label>
          <Input
            type="number"
            value={settings.scan_frequency_seconds}
            onChange={(e) => setSettings({...settings, scan_frequency_seconds: parseInt(e.target.value)})}
            className="bg-[#0b0f14] border-gray-700 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            {language === 'en' 
              ? 'How often AI checks and executes trades' 
              : 'AI 每隔多久檢查並執行交易'}
          </p>
        </div>

        {/* Protect When Off */}
        <div className="flex items-center justify-between bg-[#0b0f14] rounded-lg p-4">
          <div>
            <div className="font-semibold text-white mb-1">
              {language === 'en' ? 'Protect when AI is OFF?' : '關閉後仍保護倉位？'}
            </div>
            <p className="text-xs text-gray-500">
              {language === 'en' 
                ? 'Continue monitoring stop-loss/profit targets' 
                : '繼續監控停損與停利'}
            </p>
          </div>
          <Switch
            checked={settings.protect_when_off}
            onCheckedChange={(checked) => setSettings({...settings, protect_when_off: checked})}
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={updateMutation.isLoading}
          className="w-full bg-gradient-to-r from-[#00ff99] to-[#00cc7a] text-black hover:from-[#00cc7a] hover:to-[#00ff99] font-semibold"
        >
          {language === 'en' ? 'Save Settings' : '儲存設定'}
        </Button>
      </div>
    </div>
  );
}