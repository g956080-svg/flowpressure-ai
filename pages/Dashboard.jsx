import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart,
  Zap,
  Radio,
  AlertTriangle
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import LivePriceTicker from "../components/trading/LivePriceTicker";

export default function Dashboard() {
  const { language } = useLanguage();
  const [pressure, setPressure] = useState(58);
  const queryClient = useQueryClient();

  // 主要監控的股票
  const MAIN_SYMBOLS = ["TSLA", "NVDA", "AAPL", "GME", "COIN"];

  // 模擬壓力值變化
  useEffect(() => {
    const interval = setInterval(() => {
      setPressure(prev => Math.max(0, Math.min(100, prev + (Math.random() - 0.5) * 10)));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const { data: stocks = [], isLoading: stocksLoading } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => base44.entities.Stock.list(),
    refetchInterval: 10000,
    retry: 2,
    staleTime: 5000
  });

  const { data: liveQuotes = [] } = useQuery({
    queryKey: ['liveQuotes'],
    queryFn: async () => {
      try {
        const quotes = await base44.entities.LiveQuote.list('-ts_last_update', 10);
        return quotes || [];
      } catch (error) {
        console.error('Failed to fetch live quotes:', error);
        return [];
      }
    },
    refetchInterval: 10000,
    retry: 1
  });

  const { data: latestReport } = useQuery({
    queryKey: ['latestReport'],
    queryFn: async () => {
      try {
        const reports = await base44.entities.DailyPerformanceReport.list('-report_date', 1);
        return reports.length > 0 ? reports[0] : null;
      } catch (error) {
        console.error('Failed to fetch report:', error);
        return null;
      }
    }
  });

  // 計算市場壓力等級
  const getPressureLevel = (pressureValue) => {
    if (pressureValue <= 30) return { level: 'Hypo', color: '#00ff88', label: language === 'en' ? 'Low Pressure' : '低壓' };
    if (pressureValue <= 50) return { level: 'Normal', color: '#00C6FF', label: language === 'en' ? 'Balanced' : '平衡' };
    if (pressureValue <= 70) return { level: 'PreHigh', color: '#ffaa00', label: language === 'en' ? 'Rising' : '升壓中' };
    if (pressureValue <= 90) return { level: 'High', color: '#ff4d4d', label: language === 'en' ? 'High Pressure' : '高壓' };
    return { level: 'Critical', color: '#aa00ff', label: language === 'en' ? 'Critical' : '爆壓' };
  };

  const pressureInfo = getPressureLevel(pressure);

  const inFlowStocks = stocks.filter(s => s.flow === "IN");
  const outFlowStocks = stocks.filter(s => s.flow === "OUT");
  const neutralStocks = stocks.filter(s => s.flow === "NEUTRAL");

  const avgConfidence = stocks.length > 0
    ? stocks.reduce((sum, s) => sum + (s.confidence || 0), 0) / stocks.length
    : 0;

  const getFlowIcon = (flow) => {
    switch (flow) {
      case 'IN': return <TrendingUp className="w-5 h-5 text-[#00ff88]" />;
      case 'OUT': return <TrendingDown className="w-5 h-5 text-[#ff4d4d]" />;
      default: return <Minus className="w-5 h-5 text-[#ffaa00]" />;
    }
  };

  const getFlowColor = (flow) => {
    switch (flow) {
      case 'IN': return 'from-[#00ff88]/20 to-transparent border-[#00ff88]/50';
      case 'OUT': return 'from-[#ff4d4d]/20 to-transparent border-[#ff4d4d]/50';
      default: return 'from-[#ffaa00]/20 to-transparent border-[#ffaa00]/50';
    }
  };

  // 獲取最活躍的股票（按成交量）
  const topActiveStocks = stocks
    .filter(s => s.volume && s.volume > 0)
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, 5);

  if (stocksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-[#00C6FF] animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{language === 'en' ? 'Loading...' : '載入中...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Section - Pressure Monitor */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#00C6FF]/10 to-[#0078FF]/10 bg-[#1a2332] border-2 border-[#00C6FF]/50 rounded-2xl p-8 pressure-glow">
          <div className="flow-wave" />
          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div>
                <h1 className="text-5xl font-bold gradient-text mb-2">
                  {language === 'en' ? '🩸 Pressure Monitor' : '🩸 市場血壓儀'}
                </h1>
                <p className="text-xl text-gray-300">
                  {language === 'en' 
                    ? 'Real-time market pressure detection powered by AI'
                    : 'AI 驅動的即時市場壓力偵測'}
                </p>
              </div>
              
              <div className="text-center">
                <div 
                  className="w-40 h-40 rounded-full flex items-center justify-center shadow-2xl pressure-glow breathe border-4"
                  style={{ 
                    background: `linear-gradient(135deg, ${pressureInfo.color}40 0%, ${pressureInfo.color}80 100%)`,
                    borderColor: pressureInfo.color
                  }}
                >
                  <div>
                    <div className="text-5xl font-bold text-white">{Math.round(pressure)}</div>
                    <div className="text-sm text-white/90 mt-1">{pressureInfo.label}</div>
                    <div className="text-xs text-white/70 mt-1">{pressureInfo.level}</div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-400">
                  {language === 'en' ? 'Market Pressure Level' : '市場壓力值'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Price Ticker Section */}
        <Card className="bg-gradient-to-r from-[#00ff88]/10 to-transparent bg-[#1a2332] border-2 border-[#00ff88]/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Radio className="w-6 h-6 text-[#00ff88] animate-pulse" />
              {language === 'en' ? '📡 Live Market Feed' : '📡 即時市場動態'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LivePriceTicker symbols={MAIN_SYMBOLS} refreshInterval={5000} />
          </CardContent>
        </Card>

        {/* Pressure Level Indicator */}
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardContent className="p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-300">
                  {language === 'en' ? 'Pressure Status' : '壓力狀態'}
                </span>
                <Badge 
                  className="px-3 py-1 text-sm font-bold"
                  style={{ 
                    backgroundColor: `${pressureInfo.color}20`, 
                    color: pressureInfo.color,
                    borderColor: `${pressureInfo.color}50`,
                    borderWidth: '1px'
                  }}
                >
                  {pressureInfo.label} ({Math.round(pressure)})
                </Badge>
              </div>
              <div className="relative h-6 bg-[#0d1b2a] rounded-full overflow-hidden">
                <div 
                  className="absolute h-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${pressure}%`,
                    background: `linear-gradient(90deg, ${pressureInfo.color} 0%, ${pressureInfo.color}dd 100%)`
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-semibold text-white/50">
                  <span>0</span>
                  <span>30</span>
                  <span>50</span>
                  <span>70</span>
                  <span>90</span>
                  <span>100</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-2 mt-4">
              <div className="text-center p-2 rounded bg-[#00ff88]/10 border border-[#00ff88]/30">
                <div className="text-xs text-gray-400">Hypo</div>
                <div className="text-sm font-bold" style={{ color: '#00ff88' }}>0-30</div>
              </div>
              <div className="text-center p-2 rounded bg-[#00C6FF]/10 border border-[#00C6FF]/30">
                <div className="text-xs text-gray-400">Normal</div>
                <div className="text-sm font-bold" style={{ color: '#00C6FF' }}>31-50</div>
              </div>
              <div className="text-center p-2 rounded bg-[#ffaa00]/10 border border-[#ffaa00]/30">
                <div className="text-xs text-gray-400">PreHigh</div>
                <div className="text-sm font-bold" style={{ color: '#ffaa00' }}>51-70</div>
              </div>
              <div className="text-center p-2 rounded bg-[#ff4d4d]/10 border border-[#ff4d4d]/30">
                <div className="text-xs text-gray-400">High</div>
                <div className="text-sm font-bold" style={{ color: '#ff4d4d' }}>71-90</div>
              </div>
              <div className="text-center p-2 rounded bg-[#aa00ff]/10 border border-[#aa00ff]/30">
                <div className="text-xs text-gray-400">Critical</div>
                <div className="text-sm font-bold" style={{ color: '#aa00ff' }}>91-100</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Behavior Based on Pressure */}
        <Card className="bg-gradient-to-r from-[#00C6FF]/10 to-transparent bg-[#1a2332] border-2 border-[#00C6FF]/50 pressure-glow">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#00C6FF] breathe" />
              {language === 'en' ? '🤖 AI Behavior' : '🤖 AI 行為模式'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pressure <= 30 && (
                <div className="bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg p-4">
                  <p className="text-sm text-gray-300">
                    {language === 'en'
                      ? '🟢 Low Pressure: AI is monitoring entry opportunities. Low-position buying considered.'
                      : '🟢 低壓狀態：AI 正在觀察進場機會。考慮低位買入。'}
                  </p>
                </div>
              )}
              
              {pressure > 30 && pressure <= 50 && (
                <div className="bg-[#00C6FF]/10 border border-[#00C6FF]/30 rounded-lg p-4">
                  <p className="text-sm text-gray-300">
                    {language === 'en'
                      ? '⚪️ Balanced: AI is maintaining current positions. Market is stable.'
                      : '⚪️ 平衡狀態：AI 正在維持現有部位。市場穩定。'}
                  </p>
                </div>
              )}
              
              {pressure > 50 && pressure <= 70 && (
                <div className="bg-[#ffaa00]/10 border border-[#ffaa00]/30 rounded-lg p-4 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#ffaa00] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-300">
                    {language === 'en'
                      ? '🟠 Rising Pressure: AI is alerting risk. Observing potential exit signals.'
                      : '🟠 升壓中：AI 提醒風險。正在觀察潛在離場信號。'}
                  </p>
                </div>
              )}
              
              {pressure > 70 && pressure <= 90 && (
                <div className="bg-[#ff4d4d]/10 border border-[#ff4d4d]/30 rounded-lg p-4 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#ff4d4d] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-300">
                    {language === 'en'
                      ? '🔴 High Pressure: AI is simulating sell orders. Market pressure is high.'
                      : '🔴 高壓狀態：AI 正在模擬賣出。市場壓力過高。'}
                  </p>
                </div>
              )}
              
              {pressure > 90 && (
                <div className="bg-[#aa00ff]/10 border border-[#aa00ff]/30 rounded-lg p-4 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#aa00ff] flex-shrink-0 mt-0.5 animate-pulse" />
                  <p className="text-sm text-gray-300">
                    {language === 'en'
                      ? '🟣 CRITICAL: Forced profit-taking + Model repair initiated. Extreme pressure detected.'
                      : '🟣 爆壓警報：強制停利 + 模型修復啟動。偵測到極端壓力。'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Flow Distribution Summary */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-[#1a2332] border-[#00ff88]/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-[#00ff88] rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-black" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">
                    {language === 'en' ? 'Money IN' : '資金流入'}
                  </div>
                  <div className="text-3xl font-bold text-white">{inFlowStocks.length}</div>
                </div>
              </div>
              <Progress 
                value={(inFlowStocks.length / Math.max(stocks.length, 1)) * 100} 
                className="h-2 bg-[#0d1b2a]"
                indicatorClassName="bg-[#00ff88]"
              />
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-[#ff4d4d]/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-[#ff4d4d] rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">
                    {language === 'en' ? 'Money OUT' : '資金流出'}
                  </div>
                  <div className="text-3xl font-bold text-white">{outFlowStocks.length}</div>
                </div>
              </div>
              <Progress 
                value={(outFlowStocks.length / Math.max(stocks.length, 1)) * 100} 
                className="h-2 bg-[#0d1b2a]"
                indicatorClassName="bg-[#ff4d4d]"
              />
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-[#ffaa00]/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-[#ffaa00] rounded-xl flex items-center justify-center">
                  <Minus className="w-6 h-6 text-black" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">
                    {language === 'en' ? 'Neutral' : '中性'}
                  </div>
                  <div className="text-3xl font-bold text-white">{neutralStocks.length}</div>
                </div>
              </div>
              <Progress 
                value={(neutralStocks.length / Math.max(stocks.length, 1)) * 100} 
                className="h-2 bg-[#0d1b2a]"
                indicatorClassName="bg-[#ffaa00]"
              />
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-[#00C6FF]/30 pressure-glow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#00C6FF] to-[#0078FF] rounded-xl flex items-center justify-center breathe">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">
                    {language === 'en' ? 'AI Confidence' : 'AI 信心度'}
                  </div>
                  <div className="text-3xl font-bold gradient-text">{avgConfidence.toFixed(0)}%</div>
                </div>
              </div>
              <Progress 
                value={avgConfidence} 
                className="h-2 bg-[#0d1b2a]"
                indicatorClassName="bg-gradient-to-r from-[#00C6FF] to-[#0078FF]"
              />
            </CardContent>
          </Card>
        </div>

        {/* Today's Performance Summary */}
        {latestReport && (
          <Card className="bg-gradient-to-r from-[#00C6FF]/10 to-transparent bg-[#1a2332] border-2 border-[#00C6FF]/50 pressure-glow">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart className="w-6 h-6 text-[#00C6FF]" />
                {language === 'en' ? "📊 Today's Health Report" : '📊 今日健康報告'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-[#0d1b2a] rounded-xl p-4 border border-[#00C6FF]/20">
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Total Trades' : '總交易數'}
                  </div>
                  <div className="text-2xl font-bold text-white">{latestReport.total_trades || 0}</div>
                </div>

                <div className="bg-[#0d1b2a] rounded-xl p-4 border border-[#00C6FF]/20">
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Win Rate' : '勝率'}
                  </div>
                  <div className="text-2xl font-bold gradient-text">
                    {(latestReport.win_rate || 0).toFixed(1)}%
                  </div>
                </div>

                <div className="bg-[#0d1b2a] rounded-xl p-4 border border-[#00C6FF]/20">
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Net Return' : '淨報酬'}
                  </div>
                  <div className={`text-2xl font-bold ${
                    (latestReport.total_return_pct || 0) >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                  }`}>
                    {(latestReport.total_return_pct || 0) >= 0 ? '+' : ''}{(latestReport.total_return_pct || 0).toFixed(1)}%
                  </div>
                </div>

                <div className="bg-[#0d1b2a] rounded-xl p-4 border border-[#00C6FF]/20">
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'AI Status' : 'AI 狀態'}
                  </div>
                  <Badge className="bg-gradient-to-r from-[#00C6FF] to-[#0078FF] text-white">
                    {latestReport.ai_learning_state || 'Stable'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Active Stocks */}
        {topActiveStocks.length > 0 && (
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-6 h-6 text-[#00C6FF]" />
                {language === 'en' ? '⚡ Most Active Stocks' : '⚡ 最活躍股票'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topActiveStocks.map((stock, index) => (
                  <div
                    key={stock.id}
                    className={`bg-gradient-to-r ${getFlowColor(stock.flow)} bg-[#0d1b2a] border-2 rounded-xl p-4`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-[#00C6FF]">#{index + 1}</span>
                        <div>
                          <div className="text-lg font-bold text-white">{stock.symbol}</div>
                          <div className="text-sm text-gray-400">{stock.name}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">
                            ${(stock.price || 0).toFixed(2)}
                          </div>
                          <div className={`text-sm ${
                            (stock.change_percent || 0) >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                          }`}>
                            {(stock.change_percent || 0) >= 0 ? '+' : ''}{(stock.change_percent || 0).toFixed(2)}%
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1">
                          {getFlowIcon(stock.flow)}
                          <Badge className={
                            stock.flow === 'IN' ? 'bg-[#00ff88]/20 text-[#00ff88]' :
                            stock.flow === 'OUT' ? 'bg-[#ff4d4d]/20 text-[#ff4d4d]' :
                            'bg-[#ffaa00]/20 text-[#ffaa00]'
                          }>
                            {stock.confidence || 0}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Button
            onClick={() => window.location.href = '/TradingConsole?tab=auto'}
            className="h-24 bg-gradient-to-r from-[#00C6FF] to-[#0078FF] text-white hover:opacity-90 text-lg font-semibold"
          >
            <Zap className="w-6 h-6 mr-2" />
            {language === 'en' ? 'Flow Engine' : 'AI 修復引擎'}
          </Button>

          <Button
            onClick={() => window.location.href = '/ReportsHub?tab=analysis'}
            className="h-24 bg-[#1a2332] border-2 border-[#00C6FF]/50 text-white hover:bg-[#2a3342] text-lg font-semibold"
          >
            <BarChart className="w-6 h-6 mr-2" />
            {language === 'en' ? 'Flow Report' : '健康報告'}
          </Button>

          <Button
            onClick={() => window.location.href = '/RadarHub?tab=sentiment'}
            className="h-24 bg-[#1a2332] border-2 border-[#00C6FF]/50 text-white hover:bg-[#2a3342] text-lg font-semibold"
          >
            <Radio className="w-6 h-6 mr-2" />
            {language === 'en' ? 'Sentiment Thermo' : '情緒體溫計'}
          </Button>
        </div>

        {/* System Info */}
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00C6FF] breathe" />
                <span>
                  {language === 'en' ? 'FlowPressure v5.0 | Auto-refresh every 5s' : 'FlowPressure v5.0 | 每 5 秒自動更新'}
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