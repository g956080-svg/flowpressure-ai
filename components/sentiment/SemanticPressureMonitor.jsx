import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  RefreshCw,
  Download,
  AlertCircle,
  MessageSquare,
  Newspaper,
  Target,
  Brain
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function SemanticPressureMonitor({ symbols = [], refreshInterval = 30000 }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [alertDialog, setAlertDialog] = useState({ open: false, alert: null });

  // Fetch semantic pressure data
  const { data: semanticData = [], isLoading } = useQuery({
    queryKey: ['semanticPressure', symbols],
    queryFn: async () => {
      if (symbols.length === 0) return [];
      
      const allData = await base44.entities.SemanticPressure.list('-timestamp', 100);
      
      const latestBySymbol = {};
      allData.forEach(record => {
        if (symbols.includes(record.symbol)) {
          if (!latestBySymbol[record.symbol] || 
              new Date(record.timestamp) > new Date(latestBySymbol[record.symbol].timestamp)) {
            latestBySymbol[record.symbol] = record;
          }
        }
      });
      
      return Object.values(latestBySymbol);
    },
    refetchInterval: isAutoRefresh ? refreshInterval : false,
    enabled: symbols.length > 0
  });

  // Analyze semantic pressure
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('semanticPressureAI', {
        symbols: symbols,
        mode: 'analyze'
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['semanticPressure']);
      
      if (data.alerts && data.alerts.length > 0) {
        data.alerts.forEach(alert => {
          setAlertDialog({ open: true, alert });
        });
      }
      
      toast.success(
        language === 'en'
          ? `✅ Analyzed ${data.stats.successful} stocks`
          : `✅ 已分析 ${data.stats.successful} 檔股票`
      );
    },
    onError: (error) => {
      toast.error(
        language === 'en'
          ? `❌ Analysis failed: ${error.message}`
          : `❌ 分析失敗：${error.message}`
      );
    }
  });

  // Export report
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('semanticPressureAI', {
        symbols: symbols,
        mode: 'export'
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.export_data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SemanticPressureReport_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        toast.success(
          language === 'en'
            ? '✅ Report exported successfully'
            : '✅ 報告導出成功'
        );
      }
    }
  });

  // Auto-analyze on mount
  useEffect(() => {
    if (symbols.length > 0) {
      analyzeMutation.mutate();
    }
  }, [symbols.join(',')]);

  const getSPIColor = (spi) => {
    if (spi > 60) return '#00ff88';
    if (spi >= 40) return '#ffaa00';
    return '#ff4d4d';
  };

  const getSentimentBadge = (sentiment) => {
    const badges = {
      positive: { color: 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/50', icon: TrendingUp, label: language === 'en' ? 'Bullish' : '看漲' },
      negative: { color: 'bg-[#ff4d4d]/20 text-[#ff4d4d] border-[#ff4d4d]/50', icon: TrendingDown, label: language === 'en' ? 'Bearish' : '看跌' },
      neutral: { color: 'bg-[#ffaa00]/20 text-[#ffaa00] border-[#ffaa00]/50', icon: Activity, label: language === 'en' ? 'Neutral' : '中性' }
    };
    
    return badges[sentiment] || badges.neutral;
  };

  if (isLoading && semanticData.length === 0) {
    return (
      <Card className="bg-[#1a2332] border-[#00C6FF]/30">
        <CardContent className="p-8 text-center">
          <Brain className="w-8 h-8 text-[#00C6FF] animate-spin mx-auto mb-2" />
          <p className="text-gray-400">
            {language === 'en' ? 'Analyzing sentiment...' : '分析情緒中...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert Dialog */}
      <Dialog open={alertDialog.open} onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}>
        <DialogContent className="bg-[#1a2332] border-2 border-[#00C6FF]/50">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-[#00C6FF]" />
              {language === 'en' ? '🚀 Keyword Alert' : '🚀 關鍵字警報'}
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              {alertDialog.alert && (
                <div className="mt-4 space-y-2">
                  <p className="text-lg font-semibold text-white">
                    {language === 'en' 
                      ? `Keyword Detected: "${alertDialog.alert.keyword}"`
                      : `偵測到關鍵字：「${alertDialog.alert.keyword}」`}
                  </p>
                  <p>
                    {language === 'en'
                      ? `Potential ${alertDialog.alert.sentiment === 'positive' ? 'fund inflow' : 'fund outflow'} on $${alertDialog.alert.symbol}`
                      : `$${alertDialog.alert.symbol} 可能出現${alertDialog.alert.sentiment === 'positive' ? '資金流入' : '資金流出'}`}
                  </p>
                  <p className="text-sm">
                    SPI {language === 'en' ? 'Change' : '變化'}: 
                    <span className={`font-bold ml-1 ${alertDialog.alert.spiChange > 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'}`}>
                      {alertDialog.alert.spiChange > 0 ? '+' : ''}{alertDialog.alert.spiChange.toFixed(1)}
                    </span>
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Control Panel */}
      <Card className="bg-gradient-to-r from-[#00C6FF]/10 to-transparent bg-[#1a2332] border-2 border-[#00C6FF]/50 pressure-glow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setIsAutoRefresh(!isAutoRefresh);
                  toast.info(
                    language === 'en'
                      ? (isAutoRefresh ? 'Auto-refresh paused' : 'Auto-refresh enabled')
                      : (isAutoRefresh ? '自動更新已暫停' : '自動更新已啟用')
                  );
                }}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300"
              >
                <Activity className={`w-4 h-4 mr-2 ${isAutoRefresh ? 'animate-pulse text-[#00ff88]' : ''}`} />
                {isAutoRefresh 
                  ? (language === 'en' ? 'Auto ON' : '自動開')
                  : (language === 'en' ? 'Auto OFF' : '自動關')
                }
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isLoading}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${analyzeMutation.isLoading ? 'animate-spin' : ''}`} />
                {language === 'en' ? 'Analyze' : '分析'}
              </Button>

              <Button
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isLoading}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300"
              >
                <Download className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Export' : '導出'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Semantic Pressure Table */}
      <Card className="bg-[#1a2332] border-[#00C6FF]/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-[#00C6FF]" />
            {language === 'en' ? '🧠 AI Semantic Pressure Monitor' : '🧠 AI 語義壓力監控'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-3 text-gray-400 font-semibold">
                    {language === 'en' ? 'Symbol' : '代號'}
                  </th>
                  <th className="text-left p-3 text-gray-400 font-semibold">
                    {language === 'en' ? 'SPI' : '語義壓力'}
                  </th>
                  <th className="text-center p-3 text-gray-400 font-semibold">
                    {language === 'en' ? 'Sentiment' : '情緒'}
                  </th>
                  <th className="text-left p-3 text-gray-400 font-semibold">
                    {language === 'en' ? 'Top Keyword' : '關鍵字'}
                  </th>
                  <th className="text-left p-3 text-gray-400 font-semibold">
                    {language === 'en' ? 'AI Suggestion' : 'AI 建議'}
                  </th>
                  <th className="text-center p-3 text-gray-400 font-semibold">
                    {language === 'en' ? 'Data Sources' : '數據來源'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {semanticData.map((item) => {
                  const badgeInfo = getSentimentBadge(item.sentiment);
                  const Icon = badgeInfo.icon;
                  
                  return (
                    <tr key={item.id} className="border-b border-gray-700/50 hover:bg-[#0d1b2a] transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-white">{item.symbol}</span>
                          {item.alert_triggered && (
                            <AlertCircle className="w-4 h-4 text-[#00C6FF] animate-pulse" />
                          )}
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Progress
                              value={item.spi}
                              className="h-3 bg-[#0d1b2a] w-24"
                            />
                            <span
                              className="text-lg font-bold"
                              style={{ color: getSPIColor(item.spi) }}
                            >
                              {item.spi.toFixed(0)}
                            </span>
                          </div>
                          {item.spi_change !== 0 && (
                            <div className={`text-xs font-semibold ${
                              item.spi_change > 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                            }`}>
                              {item.spi_change > 0 ? '▲' : '▼'} {Math.abs(item.spi_change).toFixed(1)}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-3 text-center">
                        <Badge className={`${badgeInfo.color} border flex items-center gap-1 justify-center mx-auto`}>
                          <Icon className="w-4 h-4" />
                          {badgeInfo.label}
                        </Badge>
                      </td>
                      
                      <td className="p-3">
                        {item.top_keyword ? (
                          <div className="space-y-1">
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                              {item.top_keyword}
                            </Badge>
                            {item.positive_keywords && item.positive_keywords.length > 1 && (
                              <div className="text-xs text-gray-500">
                                +{item.positive_keywords.length - 1} {language === 'en' ? 'more' : '個'}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      
                      <td className="p-3">
                        <p className="text-sm text-gray-300">
                          {language === 'en' ? item.ai_suggestion_en : item.ai_suggestion_zh}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                      </td>
                      
                      <td className="p-3 text-center">
                        <div className="flex gap-2 justify-center">
                          {item.news_count > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-400" title={`${item.news_count} news items`}>
                              <Newspaper className="w-3 h-3" />
                              <span>{item.news_count}</span>
                            </div>
                          )}
                          {item.social_mentions > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-400" title={`${item.social_mentions} social mentions`}>
                              <MessageSquare className="w-3 h-3" />
                              <span>{item.social_mentions}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {semanticData.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p>{language === 'en' ? 'No semantic data available' : '無語義數據'}</p>
              <Button
                onClick={() => analyzeMutation.mutate()}
                className="mt-4 bg-[#00C6FF] hover:bg-[#0078FF] text-black"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Analyze Now' : '立即分析'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}