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
  Minus,
  RefreshCw,
  Download,
  AlertTriangle,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from "recharts";

export default function StockPressureMonitor({ symbols = [], refreshInterval = 10000, showChart = true }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [marketAvgPressure, setMarketAvgPressure] = useState(0);

  // Fetch latest pressure data
  const { data: pressureData = [], isLoading, refetch } = useQuery({
    queryKey: ['stockPressure', symbols],
    queryFn: async () => {
      if (symbols.length === 0) return [];
      
      const allData = await base44.entities.StockPressure.list('-timestamp', 100);
      
      // Get latest record for each symbol
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

  // Get historical data for mini charts
  const { data: historicalData = {} } = useQuery({
    queryKey: ['stockPressureHistory', symbols],
    queryFn: async () => {
      if (symbols.length === 0) return {};
      
      const allData = await base44.entities.StockPressure.list('-timestamp', 500);
      
      const historyBySymbol = {};
      symbols.forEach(symbol => {
        const symbolRecords = allData
          .filter(r => r.symbol === symbol)
          .slice(0, 5)
          .reverse();
        
        historyBySymbol[symbol] = symbolRecords.map((r, idx) => ({
          index: idx,
          pressure: r.final_pressure
        }));
      });
      
      return historyBySymbol;
    },
    enabled: symbols.length > 0 && showChart
  });

  // Calculate pressure mutation
  const calculatePressureMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('stockPressureIndexCalculator', {
        symbols: symbols,
        mode: 'calculate'
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setMarketAvgPressure(data.market_avg_pressure);
        queryClient.invalidateQueries(['stockPressure']);
        queryClient.invalidateQueries(['stockPressureHistory']);
        toast.success(
          language === 'en'
            ? `✅ Updated ${data.stats.successful} stocks`
            : `✅ 已更新 ${data.stats.successful} 檔股票`
        );
      }
    },
    onError: (error) => {
      toast.error(
        language === 'en'
          ? `❌ Update failed: ${error.message}`
          : `❌ 更新失敗：${error.message}`
      );
    }
  });

  // Export pressure report
  const exportReportMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('stockPressureIndexCalculator', {
        symbols: symbols,
        mode: 'export'
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        // Download JSON file
        const blob = new Blob([JSON.stringify(data.export_data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `StockPressureReport_${new Date().toISOString().split('T')[0]}.json`;
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

  // Calculate market average from current data
  useEffect(() => {
    if (pressureData.length > 0) {
      const avg = pressureData.reduce((sum, item) => sum + item.final_pressure, 0) / pressureData.length;
      setMarketAvgPressure(Math.round(avg * 10) / 10);
    }
  }, [pressureData]);

  // Auto-refresh on mount
  useEffect(() => {
    if (symbols.length > 0) {
      calculatePressureMutation.mutate();
    }
  }, [symbols.join(',')]);

  const getPressureColor = (pressure) => {
    if (pressure < 40) return '#00ff88';
    if (pressure <= 70) return '#ffaa00';
    return '#ff4d4d';
  };

  const getPressureZoneLabel = (zone) => {
    const labels = {
      BUY_ZONE: language === 'en' ? 'Buy Zone' : '買入區',
      NEUTRAL_ZONE: language === 'en' ? 'Neutral Zone' : '中性區',
      SELL_ZONE: language === 'en' ? 'Sell Zone' : '賣出區'
    };
    return labels[zone] || zone;
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'BUY': return <TrendingUp className="w-5 h-5 text-[#00ff88]" />;
      case 'SELL': return <TrendingDown className="w-5 h-5 text-[#ff4d4d]" />;
      default: return <Minus className="w-5 h-5 text-[#ffaa00]" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'BUY': return 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/50';
      case 'SELL': return 'bg-[#ff4d4d]/20 text-[#ff4d4d] border-[#ff4d4d]/50';
      default: return 'bg-[#ffaa00]/20 text-[#ffaa00] border-[#ffaa00]/50';
    }
  };

  if (isLoading && pressureData.length === 0) {
    return (
      <Card className="bg-[#1a2332] border-[#00C6FF]/30">
        <CardContent className="p-8 text-center">
          <Activity className="w-8 h-8 text-[#00C6FF] animate-spin mx-auto mb-2" />
          <p className="text-gray-400">
            {language === 'en' ? 'Calculating pressure indexes...' : '計算壓力指數中...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Market Average Pressure Gauge */}
      <Card className="bg-gradient-to-r from-[#00C6FF]/10 to-transparent bg-[#1a2332] border-2 border-[#00C6FF]/50 pressure-glow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-[#00C6FF]" />
              <div>
                <h3 className="text-lg font-bold text-white">
                  {language === 'en' ? 'Market Avg Pressure' : '市場平均壓力'}
                </h3>
                <p className="text-sm text-gray-400">
                  {language === 'en' ? 'Aggregated from all tracked stocks' : '所有追蹤股票的平均值'}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-5xl font-bold" style={{ color: getPressureColor(marketAvgPressure) }}>
                {marketAvgPressure.toFixed(1)}
              </div>
              <div className="text-sm text-gray-400">
                {language === 'en' ? 'Pressure Index' : '壓力指數'}
              </div>
            </div>
          </div>

          <div className="relative h-4 bg-[#0d1b2a] rounded-full overflow-hidden">
            <div
              className="absolute h-full transition-all duration-500"
              style={{
                width: `${marketAvgPressure}%`,
                background: `linear-gradient(90deg, ${getPressureColor(marketAvgPressure)} 0%, ${getPressureColor(marketAvgPressure)}dd 100%)`
              }}
            />
          </div>

          <div className="flex items-center justify-between mt-4">
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
                ? (language === 'en' ? 'Auto-refresh ON' : '自動更新開啟')
                : (language === 'en' ? 'Auto-refresh OFF' : '自動更新關閉')
              }
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={() => calculatePressureMutation.mutate()}
                disabled={calculatePressureMutation.isLoading}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${calculatePressureMutation.isLoading ? 'animate-spin' : ''}`} />
                {language === 'en' ? 'Refresh Now' : '立即更新'}
              </Button>

              <Button
                onClick={() => exportReportMutation.mutate()}
                disabled={exportReportMutation.isLoading}
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

      {/* Stock Pressure Table */}
      <Card className="bg-[#1a2332] border-[#00C6FF]/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#00C6FF]" />
            {language === 'en' ? '📊 Stock Pressure Monitor' : '📊 個股壓力監控'}
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
                  <th className="text-right p-3 text-gray-400 font-semibold">
                    {language === 'en' ? 'Price' : '價格'}
                  </th>
                  <th className="text-left p-3 text-gray-400 font-semibold">
                    {language === 'en' ? 'Pressure Index' : '壓力指數'}
                  </th>
                  <th className="text-center p-3 text-gray-400 font-semibold">
                    {language === 'en' ? 'Action' : '動作'}
                  </th>
                  <th className="text-left p-3 text-gray-400 font-semibold">
                    {language === 'en' ? 'AI Suggestion' : 'AI 建議'}
                  </th>
                  {showChart && (
                    <th className="text-left p-3 text-gray-400 font-semibold">
                      {language === 'en' ? 'Trend' : '趨勢'}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pressureData.map((item) => (
                  <tr key={item.id} className="border-b border-gray-700/50 hover:bg-[#0d1b2a] transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">{item.symbol}</span>
                        {item.data_delayed && (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" title="Data delayed" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-lg font-bold text-white">
                        ${item.price?.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Progress
                              value={item.final_pressure}
                              className="h-3 bg-[#0d1b2a]"
                              style={{
                                '--progress-color': getPressureColor(item.final_pressure)
                              }}
                            />
                          </div>
                          <span
                            className="text-lg font-bold min-w-[3rem] text-right"
                            style={{ color: getPressureColor(item.final_pressure) }}
                          >
                            {item.final_pressure?.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {getPressureZoneLabel(item.pressure_zone)}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-2">
                        {getActionIcon(item.ai_action)}
                        <Badge className={`${getActionColor(item.ai_action)} border font-bold`}>
                          {item.ai_action}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="text-sm text-gray-300">
                        {language === 'en' ? item.ai_suggestion_en : item.ai_suggestion_zh}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </p>
                    </td>
                    {showChart && (
                      <td className="p-3">
                        <div className="w-32 h-12">
                          {historicalData[item.symbol] && historicalData[item.symbol].length > 1 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={historicalData[item.symbol]}>
                                <Line
                                  type="monotone"
                                  dataKey="pressure"
                                  stroke={getPressureColor(item.final_pressure)}
                                  strokeWidth={2}
                                  dot={false}
                                />
                                <RechartsTooltip
                                  contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #00C6FF' }}
                                  labelStyle={{ color: '#fff' }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full text-xs text-gray-600">
                              {language === 'en' ? 'No trend data' : '無趨勢數據'}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pressureData.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p>{language === 'en' ? 'No pressure data available' : '無壓力數據'}</p>
              <Button
                onClick={() => calculatePressureMutation.mutate()}
                className="mt-4 bg-[#00C6FF] hover:bg-[#0078FF] text-black"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Calculate Now' : '立即計算'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}