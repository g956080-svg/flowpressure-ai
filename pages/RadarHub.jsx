
import React, { useState, useEffect } from "react";
import { useLanguage } from "../Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Radio,
  TrendingUp,
  Brain,
  Gauge,
  Target
} from "lucide-react";
import StockPressureMonitor from "../components/stock/StockPressureMonitor";
import SemanticPressureMonitor from "../components/sentiment/SemanticPressureMonitor";
import OpportunityCard from "../components/scanner/OpportunityCard";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TRACKED_SYMBOLS = ["TSLA", "NVDA", "AMD", "AAPL", "PYPL", "PLTR", "COIN", "SOFI", "GME", "BABA"];

// Money Flow Component
function MoneyFlowRadar() {
  const { language } = useLanguage();
  
  const { data: stocks = [] } = useQuery({
    queryKey: ['stocksFlow'],
    queryFn: () => base44.entities.Stock.list('-last_ai_update', 20),
    refetchInterval: 10000
  });

  const inFlowStocks = stocks.filter(s => s.flow === "IN");
  const outFlowStocks = stocks.filter(s => s.flow === "OUT");
  const neutralStocks = stocks.filter(s => s.flow === "NEUTRAL");

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-[#00ff88]/10 to-transparent bg-[#1a2332] border-2 border-[#00ff88]/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00ff88]" />
              {language === 'en' ? 'Money IN' : '資金流入'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#00ff88] mb-2">{inFlowStocks.length}</div>
            <div className="text-sm text-gray-400">
              {language === 'en' ? 'Stocks with inflow detected' : '偵測到流入的股票'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#ff4d4d]/10 to-transparent bg-[#1a2332] border-2 border-[#ff4d4d]/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#ff4d4d] rotate-180" />
              {language === 'en' ? 'Money OUT' : '資金流出'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#ff4d4d] mb-2">{outFlowStocks.length}</div>
            <div className="text-sm text-gray-400">
              {language === 'en' ? 'Stocks with outflow detected' : '偵測到流出的股票'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#ffaa00]/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-[#ffaa00]" />
              {language === 'en' ? 'Neutral' : '中性'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#ffaa00] mb-2">{neutralStocks.length}</div>
            <div className="text-sm text-gray-400">
              {language === 'en' ? 'Stocks in neutral zone' : '處於中性區的股票'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stocks.map(stock => (
          <Card key={stock.id} className={`bg-[#1a2332] border-2 ${
            stock.flow === 'IN' ? 'border-[#00ff88]/50' :
            stock.flow === 'OUT' ? 'border-[#ff4d4d]/50' :
            'border-[#ffaa00]/50'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xl font-bold text-white">{stock.symbol}</div>
                  <div className="text-xs text-gray-400">{stock.name}</div>
                </div>
                <Badge className={
                  stock.flow === 'IN' ? 'bg-[#00ff88]/20 text-[#00ff88]' :
                  stock.flow === 'OUT' ? 'bg-[#ff4d4d]/20 text-[#ff4d4d]' :
                  'bg-[#ffaa00]/20 text-[#ffaa00]'
                }>
                  {stock.flow}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">{language === 'en' ? 'Price:' : '價格：'}</span>
                  <span className="text-white font-bold">${stock.price?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">{language === 'en' ? 'Confidence:' : '信心度：'}</span>
                  <span className="text-[#00C6FF] font-bold">{stock.confidence}%</span>
                </div>
                <div className="text-xs text-gray-300 mt-2">
                  {language === 'en' ? stock.ai_comment_en : stock.ai_comment_zh}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Big Money Component (simplified)
function BigMoneyRadar() {
  const { language } = useLanguage();
  
  const { data: signals = [] } = useQuery({
    queryKey: ['bigMoneySignals'],
    queryFn: () => base44.entities.BigMoneySignal.list('-timestamp_detected', 20),
    refetchInterval: 30000
  });

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-purple-500/10 to-transparent bg-[#1a2332] border-2 border-purple-500/50">
        <CardHeader>
          <CardTitle className="text-white">
            {language === 'en' ? '🐋 Big Money Detection' : '🐋 主力偵測'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {signals.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {language === 'en' ? 'No big money signals detected' : '暫無主力訊號'}
              </p>
            ) : (
              signals.map(signal => (
                <Card key={signal.id} className="bg-[#0d1b2a] border-purple-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-lg font-bold text-white">{signal.symbol}</div>
                      <Badge className={
                        signal.signal_type === 'IN' ? 'bg-[#00ff88]/20 text-[#00ff88]' : 'bg-[#ff4d4d]/20 text-[#ff4d4d]'
                      }>
                        {signal.signal_type}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">{language === 'en' ? 'Intensity:' : '強度：'}</span>
                        <span className="text-white ml-2">{signal.intensity_score}/5</span>
                      </div>
                      <div>
                        <span className="text-gray-400">{language === 'en' ? 'Probability:' : '機率：'}</span>
                        <span className="text-[#00C6FF] ml-2">{signal.cont_prob}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 mt-2">
                      {language === 'en' ? signal.rec_action_en : signal.rec_action}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RadarHub() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'flow';
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: async () => {
      const data = await base44.entities.OpportunityScanner.list('-timestamp', 50);
      const now = new Date();
      return data.filter(opp => {
        const expiresAt = new Date(opp.expires_at);
        return expiresAt > now;
      });
    },
    refetchInterval: 60000
  });

  useEffect(() => {
    const url = new URL(window.location);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url);
  }, [activeTab]);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center pressure-glow">
            <Radio className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">
              {language === 'en' ? '📡 Signal Radar Hub' : '📡 信號雷達中心'}
            </h1>
            <p className="text-gray-400">
              {language === 'en' 
                ? 'Multi-dimensional market intelligence - Flow, Pressure, Sentiment, Opportunities' 
                : '多維度市場情報 - 資金流、壓力、情緒、機會'}
            </p>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-[#1a2332] border border-[#00C6FF]/30 p-1">
            <TabsTrigger 
              value="flow" 
              className="data-[state=active]:bg-[#00C6FF] data-[state=active]:text-black"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Flow' : '資金流'}
            </TabsTrigger>
            <TabsTrigger 
              value="bigmoney" 
              className="data-[state=active]:bg-[#00C6FF] data-[state=active]:text-black"
            >
              <Radio className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Big Money' : '主力'}
            </TabsTrigger>
            <TabsTrigger 
              value="sentiment" 
              className="data-[state=active]:bg-[#00C6FF] data-[state=active]:text-black"
            >
              <Brain className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Sentiment' : '情緒'}
            </TabsTrigger>
            <TabsTrigger 
              value="pressure" 
              className="data-[state=active]:bg-[#00C6FF] data-[state=active]:text-black"
            >
              <Gauge className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Pressure' : '壓力'}
            </TabsTrigger>
            <TabsTrigger 
              value="opportunities" 
              className="data-[state=active]:bg-[#00C6FF] data-[state=active]:text-black"
            >
              <Target className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Opportunities' : '機會'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flow">
            <MoneyFlowRadar />
          </TabsContent>

          <TabsContent value="bigmoney">
            <BigMoneyRadar />
          </TabsContent>

          <TabsContent value="sentiment">
            <SemanticPressureMonitor 
              symbols={TRACKED_SYMBOLS}
              refreshInterval={30000}
            />
          </TabsContent>

          <TabsContent value="pressure">
            <StockPressureMonitor 
              symbols={TRACKED_SYMBOLS}
              refreshInterval={15000}
            />
          </TabsContent>

          <TabsContent value="opportunities">
            <div className="space-y-4">
              <Card className="bg-[#1a2332] border-[#00C6FF]/30">
                <CardHeader>
                  <CardTitle className="text-white">
                    {language === 'en' ? '💎 Active Opportunities' : '💎 活躍機會'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {opportunities.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      {language === 'en' ? 'No active opportunities found' : '暫無活躍機會'}
                    </p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {opportunities.map(opp => (
                        <OpportunityCard key={opp.id} opportunity={opp} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
