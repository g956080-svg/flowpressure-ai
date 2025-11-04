import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Activity,
  Clock,
  AlertCircle,
  Zap,
  Database,
  RefreshCw
} from "lucide-react";

export default function PulseHealth() {
  const { language } = useLanguage();
  const [systemStatus, setSystemStatus] = useState('checking');

  // 查詢錯誤日誌
  const { data: errorLogs = [], isLoading } = useQuery({
    queryKey: ['errorLogs'],
    queryFn: async () => {
      const logs = await base44.entities.ErrorLog.list('-timestamp', 20);
      return logs;
    },
    refetchInterval: 30000
  });

  // 查詢 AI 模型配置
  const { data: modelConfig } = useQuery({
    queryKey: ['modelConfig'],
    queryFn: async () => {
      const configs = await base44.entities.AIModelConfig.filter({});
      return configs.length > 0 ? configs[0] : null;
    }
  });

  // 查詢最近交易
  const { data: recentTrades = [] } = useQuery({
    queryKey: ['recentTrades'],
    queryFn: async () => {
      const trades = await base44.entities.AutoTrade.list('-entry_time', 10);
      return trades;
    }
  });

  // 系統健康檢查
  useEffect(() => {
    const checkHealth = () => {
      const criticalErrors = errorLogs.filter(log => 
        log.severity === 'critical' && 
        new Date(log.timestamp) > new Date(Date.now() - 60 * 60 * 1000) // 最近 1 小時
      );
      
      const avgLatency = modelConfig?.latency_compensation_sec || 0;
      
      if (criticalErrors.length > 0 || avgLatency > 5) {
        setSystemStatus('critical');
      } else if (avgLatency > 3) {
        setSystemStatus('warning');
      } else {
        setSystemStatus('healthy');
      }
    };
    
    checkHealth();
  }, [errorLogs, modelConfig]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-[#00C6FF]';
      case 'warning': return 'text-[#ffaa00]';
      case 'critical': return 'text-[#ff4d4d]';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-8 h-8 text-[#00C6FF]" />;
      case 'warning': return <AlertTriangle className="w-8 h-8 text-[#ffaa00]" />;
      case 'critical': return <AlertCircle className="w-8 h-8 text-[#ff4d4d] animate-pulse" />;
      default: return <Activity className="w-8 h-8 text-gray-400 animate-spin" />;
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'healthy':
        return language === 'en' 
          ? '✅ All systems operating normally. Pulse is strong.' 
          : '✅ 所有系統正常運作。脈動強勁。';
      case 'warning':
        return language === 'en'
          ? '⚠️ Minor issues detected. System performance may be affected.'
          : '⚠️ 偵測到輕微問題。系統效能可能受影響。';
      case 'critical':
        return language === 'en'
          ? '🚨 Critical issues detected. Immediate attention required.'
          : '🚨 偵測到嚴重問題。需要立即處理。';
      default:
        return language === 'en' ? 'Checking system health...' : '檢查系統健康狀態...';
    }
  };

  // 計算系統指標
  const latency = modelConfig?.latency_compensation_sec || 0;
  const latencyScore = Math.max(0, 100 - (latency / 5) * 100);
  
  const criticalErrors = errorLogs.filter(log => log.severity === 'critical').length;
  const warningErrors = errorLogs.filter(log => log.severity === 'warning').length;
  const infoLogs = errorLogs.filter(log => log.severity === 'info').length;
  
  const errorScore = Math.max(0, 100 - (criticalErrors * 20 + warningErrors * 5));
  
  const tradeSuccessRate = recentTrades.length > 0
    ? (recentTrades.filter(t => t.trade_type === 'WIN').length / recentTrades.length) * 100
    : 0;
  
  const overallHealth = Math.round((latencyScore * 0.4 + errorScore * 0.3 + tradeSuccessRate * 0.3));

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#00C6FF] to-[#0078FF] rounded-2xl flex items-center justify-center shadow-lg pulse-glow heartbeat">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">
              {language === 'en' ? '🛡️ Pulse Health' : '🛡️ 系統健康'}
            </h1>
            <p className="text-gray-400">
              {language === 'en' 
                ? 'Real-time system monitoring & diagnostics'
                : '即時系統監控與診斷'}
            </p>
          </div>
        </div>

        {/* Overall Status */}
        <Card className={`bg-gradient-to-r ${
          systemStatus === 'healthy' ? 'from-[#00C6FF]/20 to-transparent border-[#00C6FF]/50' :
          systemStatus === 'warning' ? 'from-[#ffaa00]/20 to-transparent border-[#ffaa00]/50' :
          'from-[#ff4d4d]/20 to-transparent border-[#ff4d4d]/50'
        } bg-[#1a2332] border-2 pulse-glow`}>
          <CardContent className="p-8">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-4">
                {getStatusIcon(systemStatus)}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {language === 'en' ? 'System Status' : '系統狀態'}
                  </h2>
                  <p className="text-gray-300">{getStatusMessage(systemStatus)}</p>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-6xl font-bold gradient-text mb-2">
                  {overallHealth}%
                </div>
                <div className="text-sm text-gray-400">
                  {language === 'en' ? 'Overall Health Score' : '整體健康評分'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Latency Monitor */}
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#00C6FF]" />
                {language === 'en' ? 'Latency Monitor' : '延遲監控'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">
                    {language === 'en' ? 'Current Latency' : '當前延遲'}
                  </span>
                  <span className={`text-2xl font-bold ${
                    latency <= 3 ? 'text-[#00C6FF]' : latency <= 5 ? 'text-[#ffaa00]' : 'text-[#ff4d4d]'
                  }`}>
                    {latency.toFixed(1)}s
                  </span>
                </div>
                <Progress 
                  value={latencyScore} 
                  className="h-3 bg-[#0d1b2a]"
                  indicatorClassName={latency <= 3 ? 'bg-[#00C6FF]' : latency <= 5 ? 'bg-[#ffaa00]' : 'bg-[#ff4d4d]'}
                />
              </div>
              <div className="text-xs text-gray-500">
                {language === 'en' 
                  ? `Target: ≤3.0s | Threshold: 5.0s`
                  : `目標：≤3.0秒 | 閾值：5.0秒`}
              </div>
            </CardContent>
          </Card>

          {/* Error Monitor */}
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#ffaa00]" />
                {language === 'en' ? 'Error Monitor' : '錯誤監控'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    {language === 'en' ? 'Critical' : '嚴重'}
                  </span>
                  <Badge className="bg-[#ff4d4d]/20 text-[#ff4d4d] border-[#ff4d4d]/30">
                    {criticalErrors}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    {language === 'en' ? 'Warning' : '警告'}
                  </span>
                  <Badge className="bg-[#ffaa00]/20 text-[#ffaa00] border-[#ffaa00]/30">
                    {warningErrors}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    {language === 'en' ? 'Info' : '資訊'}
                  </span>
                  <Badge className="bg-[#00C6FF]/20 text-[#00C6FF] border-[#00C6FF]/30">
                    {infoLogs}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trade Performance */}
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#00C6FF]" />
                {language === 'en' ? 'Trade Performance' : '交易表現'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">
                    {language === 'en' ? 'Recent Success Rate' : '近期成功率'}
                  </span>
                  <span className="text-2xl font-bold gradient-text">
                    {tradeSuccessRate.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={tradeSuccessRate} 
                  className="h-3 bg-[#0d1b2a]"
                  indicatorClassName="bg-gradient-to-r from-[#00C6FF] to-[#0078FF]"
                />
              </div>
              <div className="text-xs text-gray-500">
                {language === 'en'
                  ? `Based on last ${recentTrades.length} trades`
                  : `基於最近 ${recentTrades.length} 筆交易`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Errors */}
        {errorLogs.length > 0 && (
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-[#00C6FF]" />
                {language === 'en' ? 'Recent System Events' : '最近系統事件'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {errorLogs.slice(0, 10).map((log, index) => (
                  <div
                    key={index}
                    className={`bg-[#0d1b2a] rounded-lg p-4 border ${
                      log.severity === 'critical' ? 'border-[#ff4d4d]/30' :
                      log.severity === 'warning' ? 'border-[#ffaa00]/30' :
                      'border-[#00C6FF]/20'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {log.severity === 'critical' ? (
                          <AlertCircle className="w-4 h-4 text-[#ff4d4d]" />
                        ) : log.severity === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-[#ffaa00]" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-[#00C6FF]" />
                        )}
                        <span className="text-sm font-semibold text-white">
                          {log.source}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString(language === 'en' ? 'en-US' : 'zh-TW')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">
                      {log.message}
                    </p>
                    {log.details && (
                      <details className="text-xs text-gray-500">
                        <summary className="cursor-pointer hover:text-gray-400">
                          {language === 'en' ? 'View details' : '查看詳情'}
                        </summary>
                        <pre className="mt-2 p-2 bg-black/30 rounded overflow-auto">
                          {log.details}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Recommendations */}
        <Card className="bg-gradient-to-r from-[#00C6FF]/10 to-transparent bg-[#1a2332] border border-[#00C6FF]/30 pulse-glow">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#00C6FF] heartbeat" />
              {language === 'en' ? '💡 System Recommendations' : '💡 系統建議'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latency > 3 && (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#ffaa00] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300">
                  {language === 'en'
                    ? `Latency is ${latency.toFixed(1)}s. Consider optimizing API calls or reducing scan frequency.`
                    : `延遲為 ${latency.toFixed(1)} 秒。考慮優化 API 調用或降低掃描頻率。`}
                </p>
              </div>
            )}
            
            {criticalErrors > 0 && (
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#ff4d4d] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300">
                  {language === 'en'
                    ? `${criticalErrors} critical errors detected. Review error logs and take corrective action.`
                    : `偵測到 ${criticalErrors} 個嚴重錯誤。請檢查錯誤日誌並採取修正措施。`}
                </p>
              </div>
            )}
            
            {tradeSuccessRate < 60 && recentTrades.length > 5 && (
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-[#ffaa00] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300">
                  {language === 'en'
                    ? `Trade success rate is ${tradeSuccessRate.toFixed(1)}%. AI model may need recalibration.`
                    : `交易成功率為 ${tradeSuccessRate.toFixed(1)}%。AI 模型可能需要重新校準。`}
                </p>
              </div>
            )}
            
            {systemStatus === 'healthy' && (
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#00C6FF] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300">
                  {language === 'en'
                    ? 'All systems are operating optimally. Continue monitoring for any changes.'
                    : '所有系統均以最佳狀態運作。請繼續監控任何變化。'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#00C6FF]" />
                <span>
                  {language === 'en' ? 'Auto-refresh every 30 seconds' : '每 30 秒自動刷新'}
                </span>
              </div>
              <div>
                {language === 'en' ? 'Last checked' : '最後檢查'}: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}