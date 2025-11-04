import React from "react";
import { useLanguage } from "../Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Lightbulb, AlertTriangle, Activity } from "lucide-react";
import SemanticPressureMonitor from "../components/sentiment/SemanticPressureMonitor";

export default function SentimentRadar() {
  const { language } = useLanguage();

  const TRACKED_SYMBOLS = ["TSLA", "NVDA", "AAPL", "GME", "COIN", "PLTR", "AMD", "BABA"];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center pressure-glow">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">
              {language === 'en' ? '🧠 AI Sentiment Radar' : '🧠 AI 情緒雷達'}
            </h1>
            <p className="text-xl text-gray-400">
              {language === 'en'
                ? 'Real-time market sentiment analysis with semantic pressure tracking'
                : '即時市場情緒分析與語義壓力追蹤'}
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-transparent bg-[#1a2332] border-2 border-purple-500/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="mb-2">
                  {language === 'en'
                    ? '📡 AI-powered sentiment analysis using news, social media, and financial disclosures • Updates every 30 seconds • 3-second delay compensation'
                    : '📡 使用新聞、社交媒體和財務揭露的 AI 情緒分析 • 每 30 秒更新 • 3 秒延遲補償'}
                </p>
                <p className="font-semibold">
                  {language === 'en'
                    ? '💡 SPI Formula: base_pressure + (sentiment_score × 25) | Range: 0–100'
                    : '💡 SPI 公式：基礎壓力 + (情緒分數 × 25) | 範圍：0–100'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Keyword Guide */}
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              {language === 'en' ? '🎯 Keyword Detection Guide' : '🎯 關鍵字偵測指南'}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#00ff88]/10 border-2 border-[#00ff88]/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-[#00ff88]" />
                  <span className="font-bold text-[#00ff88]">
                    {language === 'en' ? 'Positive Keywords' : '正面關鍵字'}
                  </span>
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  <p>• funding, capital increase, investment round</p>
                  <p>• acquisition, merger, partnership</p>
                  <p>• order expected, patent granted, R&D success</p>
                  <p>• clinical success, profit, growth, expansion</p>
                </div>
              </div>

              <div className="p-4 bg-[#ff4d4d]/10 border-2 border-[#ff4d4d]/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff4d4d]" />
                  <span className="font-bold text-[#ff4d4d]">
                    {language === 'en' ? 'Negative Keywords' : '負面關鍵字'}
                  </span>
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  <p>• loss widened, delisting, bankruptcy</p>
                  <p>• cash shortage, layoff, failed test</p>
                  <p>• order canceled, lawsuit, recall, decline</p>
                  <p>• investigation, fraud, scandal, suspended</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SPI Zones Guide */}
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              {language === 'en' ? '📊 SPI Zones Guide' : '📊 SPI 區間指南'}
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#00ff88]/10 border-2 border-[#00ff88]/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-[#00ff88]" />
                  <span className="font-bold text-[#00ff88]">
                    {language === 'en' ? 'Bullish Zone' : '看漲區'}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mb-2">SPI &gt; 60</div>
                <p className="text-sm text-gray-300">
                  {language === 'en'
                    ? 'Strong positive sentiment indicates potential fund inflow'
                    : '強烈正面情緒表示潛在資金流入'}
                </p>
              </div>

              <div className="p-4 bg-[#ffaa00]/10 border-2 border-[#ffaa00]/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-[#ffaa00]" />
                  <span className="font-bold text-[#ffaa00]">
                    {language === 'en' ? 'Neutral Zone' : '中性區'}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mb-2">40 ≤ SPI ≤ 60</div>
                <p className="text-sm text-gray-300">
                  {language === 'en'
                    ? 'Mixed sentiment suggests careful observation'
                    : '混合情緒建議謹慎觀察'}
                </p>
              </div>

              <div className="p-4 bg-[#ff4d4d]/10 border-2 border-[#ff4d4d]/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff4d4d]" />
                  <span className="font-bold text-[#ff4d4d]">
                    {language === 'en' ? 'Bearish Zone' : '看跌區'}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mb-2">SPI &lt; 40</div>
                <p className="text-sm text-gray-300">
                  {language === 'en'
                    ? 'Negative sentiment indicates potential fund outflow'
                    : '負面情緒表示潛在資金流出'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Semantic Pressure Monitor Component */}
        <SemanticPressureMonitor 
          symbols={TRACKED_SYMBOLS}
          refreshInterval={30000}
        />

        {/* Integration Info */}
        <Card className="bg-gradient-to-r from-[#00C6FF]/10 to-transparent bg-[#1a2332] border-2 border-[#00C6FF]/50">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#00C6FF]" />
              {language === 'en' ? '🔗 Pressure Model Integration' : '🔗 壓力模型整合'}
            </h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-start gap-2">
                <span className="text-[#00C6FF] font-bold">•</span>
                <p>
                  {language === 'en'
                    ? 'Total Pressure = (Price Pressure × 0.7) + (Semantic Pressure × 0.3)'
                    : '總壓力 = (價格壓力 × 0.7) + (語義壓力 × 0.3)'}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#00C6FF] font-bold">•</span>
                <p>
                  {language === 'en'
                    ? 'Stocks with SPI change > ±15 within 10 minutes are highlighted'
                    : '10 分鐘內 SPI 變化 > ±15 的股票會被高亮顯示'}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#00C6FF] font-bold">•</span>
                <p>
                  {language === 'en'
                    ? 'AI learning loop adjusts keyword weights based on correlation with price movements'
                    : 'AI 學習循環根據與價格變動的相關性調整關鍵字權重'}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#00C6FF] font-bold">•</span>
                <p>
                  {language === 'en'
                    ? 'Stocks with significant keyword detections are auto-added to "Hot Sentiment Movers" watchlist'
                    : '偵測到重要關鍵字的股票會自動添加到「熱門情緒推動者」觀察清單'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Learning Info */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-transparent bg-[#1a2332] border-2 border-purple-500/50">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-purple-400" />
              {language === 'en' ? '🤖 AI Learning Loop' : '🤖 AI 學習循環'}
            </h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="p-3 bg-[#0d1b2a] rounded-lg border border-purple-500/30">
                <p className="font-semibold text-white mb-2">
                  {language === 'en' ? 'Correlation Analysis:' : '相關性分析：'}
                </p>
                <p>
                  {language === 'en'
                    ? 'If SPI change correlates with next-day price > +2% → increase keyword weight by +0.1'
                    : '如果 SPI 變化與次日價格 > +2% 相關 → 關鍵字權重增加 +0.1'}
                </p>
              </div>
              <div className="p-3 bg-[#0d1b2a] rounded-lg border border-purple-500/30">
                <p className="font-semibold text-white mb-2">
                  {language === 'en' ? 'Weight Adjustment:' : '權重調整：'}
                </p>
                <p>
                  {language === 'en'
                    ? 'If no correlation detected → decrease keyword weight by −0.1'
                    : '如果未偵測到相關性 → 關鍵字權重減少 -0.1'}
                </p>
              </div>
              <div className="p-3 bg-[#0d1b2a] rounded-lg border border-purple-500/30">
                <p className="font-semibold text-white mb-2">
                  {language === 'en' ? 'Continuous Improvement:' : '持續改進：'}
                </p>
                <p>
                  {language === 'en'
                    ? 'AI learns from historical patterns to improve prediction accuracy over time'
                    : 'AI 從歷史模式中學習，隨時間提高預測準確性'}
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
                    ? '⚠️ Semantic Pressure Index is based on AI analysis of publicly available information and should be used as a reference tool, not financial advice.'
                    : '⚠️ 語義壓力指數基於公開可用資訊的 AI 分析，應作為參考工具，而非投資建議。'}
                </p>
                <p>
                  {language === 'en'
                    ? '📊 Data sources: News APIs, Reddit, Twitter/X • Updates every 30 seconds • 3-second delay compensation applied'
                    : '📊 數據來源：新聞 API、Reddit、Twitter/X • 每 30 秒更新 • 已套用 3 秒延遲補償'}
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
                <Brain className="w-4 h-4 text-purple-400 breathe" />
                <span>
                  {language === 'en'
                    ? 'FlowPressure v5.0 | AI Semantic Pressure Module | Auto-refresh every 30s'
                    : 'FlowPressure v5.0 | AI 語義壓力模組 | 每 30 秒自動更新'}
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