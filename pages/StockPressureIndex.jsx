import React from "react";
import { useLanguage } from "../Layout";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Activity } from "lucide-react";
import StockPressureMonitor from "../components/stock/StockPressureMonitor";

export default function StockPressureIndex() {
  const { language } = useLanguage();

  // Main tracked symbols
  const TRACKED_SYMBOLS = ["TSLA", "NVDA", "AAPL", "GME", "COIN", "PLTR", "AMD", "BABA"];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#00C6FF] to-[#0078FF] rounded-2xl flex items-center justify-center pressure-glow">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">
              {language === 'en' ? '📊 Stock Pressure Index' : '📊 個股壓力指數'}
            </h1>
            <p className="text-xl text-gray-400">
              {language === 'en'
                ? 'Individual pressure tracking for each stock with AI-powered insights'
                : '每檔股票的個別壓力追蹤與 AI 智能分析'}
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-[#00C6FF]/10 to-transparent bg-[#1a2332] border-2 border-[#00C6FF]/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-[#00C6FF] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="mb-2">
                  {language === 'en'
                    ? '📡 Real-time pressure calculation using Finnhub API • Refresh every 10 seconds • 3-second delay compensation'
                    : '📡 使用 Finnhub API 即時計算壓力 • 每 10 秒更新 • 3 秒延遲補償'}
                </p>
                <p className="font-semibold">
                  {language === 'en'
                    ? '💡 Pressure Index Formula: ((current_price - day_low) / (day_high - day_low)) × 100 + volatility_adjustment'
                    : '💡 壓力指數公式：((當前價格 - 最低價) / (最高價 - 最低價)) × 100 + 波動率調整'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pressure Zones Guide */}
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              {language === 'en' ? '🎯 Pressure Zones Guide' : '🎯 壓力區間指南'}
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#00ff88]/10 border-2 border-[#00ff88]/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-[#00ff88]" />
                  <span className="font-bold text-[#00ff88]">
                    {language === 'en' ? 'Buy Zone' : '買入區'}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mb-2">0 - 40</div>
                <p className="text-sm text-gray-300">
                  {language === 'en'
                    ? 'Low pressure indicates potential buying opportunity'
                    : '低壓力表示潛在買入機會'}
                </p>
              </div>

              <div className="p-4 bg-[#ffaa00]/10 border-2 border-[#ffaa00]/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-[#ffaa00]" />
                  <span className="font-bold text-[#ffaa00]">
                    {language === 'en' ? 'Neutral Zone' : '中性區'}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mb-2">41 - 70</div>
                <p className="text-sm text-gray-300">
                  {language === 'en'
                    ? 'Medium pressure suggests holding current positions'
                    : '中等壓力建議持有現有部位'}
                </p>
              </div>

              <div className="p-4 bg-[#ff4d4d]/10 border-2 border-[#ff4d4d]/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff4d4d]" />
                  <span className="font-bold text-[#ff4d4d]">
                    {language === 'en' ? 'Sell Zone' : '賣出區'}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mb-2">71 - 100</div>
                <p className="text-sm text-gray-300">
                  {language === 'en'
                    ? 'High pressure indicates potential selling opportunity'
                    : '高壓力表示潛在賣出機會'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Pressure Monitor Component */}
        <StockPressureMonitor 
          symbols={TRACKED_SYMBOLS}
          refreshInterval={10000}
          showChart={true}
        />

        {/* AI Trading Integration Info */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-transparent bg-[#1a2332] border-2 border-purple-500/50">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              {language === 'en' ? '🤖 AI Trading Integration' : '🤖 AI 交易整合'}
            </h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">•</span>
                <p>
                  {language === 'en'
                    ? 'Pressure < 45 → AI considers BUY signal'
                    : '壓力 < 45 → AI 考慮買入信號'}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">•</span>
                <p>
                  {language === 'en'
                    ? '45 ≤ Pressure ≤ 70 → AI maintains HOLD position'
                    : '45 ≤ 壓力 ≤ 70 → AI 維持持有部位'}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">•</span>
                <p>
                  {language === 'en'
                    ? 'Pressure > 70 → AI triggers SELL signal'
                    : '壓力 > 70 → AI 觸發賣出信號'}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">•</span>
                <p>
                  {language === 'en'
                    ? 'Market Average Pressure aggregates all stocks for overall market sentiment'
                    : '市場平均壓力彙總所有股票，提供整體市場情緒'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Card className="bg-yellow-500/10 border border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="mb-2">
                  {language === 'en'
                    ? '⚠️ Pressure Index is calculated using real-time market data and should be used as a reference tool, not financial advice.'
                    : '⚠️ 壓力指數使用即時市場數據計算，應作為參考工具，而非投資建議。'}
                </p>
                <p>
                  {language === 'en'
                    ? '📊 Data source: Finnhub.io • Updates every 10 seconds • 3-second delay compensation applied'
                    : '📊 數據來源：Finnhub.io • 每 10 秒更新 • 已套用 3 秒延遲補償'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00C6FF] breathe" />
                <span>
                  {language === 'en'
                    ? 'FlowPressure v5.0 | Stock Pressure Index Module | Auto-refresh every 10s'
                    : 'FlowPressure v5.0 | 個股壓力指數模組 | 每 10 秒自動更新'}
                </span>
              </div>
              <div>
                {language === 'en' ? 'Last updated' : '最後更新'}: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}