import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";

export default function AILearningDashboard() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  // 查詢最新學習記錄
  const { data: latestLearning, isLoading: learningLoading } = useQuery({
    queryKey: ['aiLearningLatest'],
    queryFn: async () => {
      const logs = await base44.entities.AILearningLog.list('-timestamp', 1);
      return logs.length > 0 ? logs[0] : null;
    },
    refetchInterval: 30000
  });

  // 查詢回測記錄
  const { data: backtests = [], isLoading: backtestsLoading } = useQuery({
    queryKey: ['aiBacktests'],
    queryFn: async () => {
      const logs = await base44.entities.AIBacktestLog.list('-entry_timestamp', 100);
      return logs;
    },
    refetchInterval: 15000
  });

  // 查詢最近5筆 BigMoney 訊號
  const { data: recentSignals = [] } = useQuery({
    queryKey: ['recentSignals'],
    queryFn: async () => {
      const signals = await base44.entities.BigMoneySignal.list('-timestamp_detected', 5);
      return signals;
    },
    refetchInterval: 10000
  });

  // 檢查 PENDING 回測
  const checkPendingMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('aiBacktester', {
        check_all_pending: true
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.data.success) {
        toast.success(
          language === 'en'
            ? `✅ Processed ${data.data.processed} backtests`
            : `✅ 已處理 ${data.data.processed} 筆回測`
        );
        queryClient.invalidateQueries(['aiBacktests']);
      }
    }
  });

  // 執行學習
  const runLearningMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('aiLearning', {
        limit: 100
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.data.success) {
        toast.success(
          language === 'en'
            ? `✅ AI Learning completed: ${data.data.stats.win_rate_overall.toFixed(1)}% win rate`
            : `✅ AI 學習完成：勝率 ${data.data.stats.win_rate_overall.toFixed(1)}%`
        );
        queryClient.invalidateQueries(['aiLearningLatest']);
      }
    },
    onError: (error) => {
      toast.error(
        language === 'en' ? `❌ Learning failed: ${error.message}` : `❌ 學習失敗：${error.message}`
      );
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case '穩定': return 'text-[#00ff99]';
      case '學習中': return 'text-[#ffaa00]';
      case '重新校正中': return 'text-[#ff4d4d]';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case '穩定': return <CheckCircle className="w-6 h-6 text-[#00ff99]" />;
      case '學習中': return <Activity className="w-6 h-6 text-[#ffaa00] animate-pulse" />;
      case '重新校正中': return <AlertCircle className="w-6 h-6 text-[#ff4d4d]" />;
      default: return <Brain className="w-6 h-6 text-gray-400" />;
    }
  };

  const completedBacktests = backtests.filter(b => b.result_outcome !== 'PENDING');
  const pendingBacktests = backtests.filter(b => b.result_outcome === 'PENDING');
  const recentBacktests = completedBacktests.slice(0, 5);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#00ff99] to-[#00cc7a] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00ff99]/20">
              <Brain className="w-8 h-8 text-black animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-1">
                {language === 'en' ? '🧠 AI Learning Dashboard' : '🧠 AI 學習儀表板'}
              </h1>
              <p className="text-gray-400">
                {language === 'en' 
                  ? 'Self-learning system monitoring & performance analytics'
                  : '自我學習系統監控與效能分析'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => checkPendingMutation.mutate()}
              disabled={checkPendingMutation.isLoading || pendingBacktests.length === 0}
              variant="outline"
              className="border-gray-700 text-gray-300"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${checkPendingMutation.isLoading ? 'animate-spin' : ''}`} />
              {language === 'en' ? `Check Pending (${pendingBacktests.length})` : `檢查待處理 (${pendingBacktests.length})`}
            </Button>

            <Button
              onClick={() => runLearningMutation.mutate()}
              disabled={runLearningMutation.isLoading || completedBacktests.length < 10}
              className="bg-[#00ff99] text-black hover:bg-[#00cc7a]"
            >
              <Brain className="w-4 h-4 mr-2" />
              {runLearningMutation.isLoading
                ? (language === 'en' ? 'Learning...' : '學習中...')
                : (language === 'en' ? 'Run AI Learning' : '執行 AI 學習')}
            </Button>
          </div>
        </div>

        {/* AI Status Summary */}
        {latestLearning && (
          <Card className="bg-gradient-to-br from-[#00ff99]/10 to-transparent bg-[#151a21] border-2 border-[#00ff99]/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {getStatusIcon(latestLearning.ai_status)}
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {language === 'en' ? 'AI Status' : 'AI 狀態'}
                    </h2>
                    <p className={`text-lg font-semibold ${getStatusColor(latestLearning.ai_status)}`}>
                      {latestLearning.ai_status}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">
                    {language === 'en' ? 'Algorithm Version' : '演算法版本'}
                  </div>
                  <div className="text-lg font-bold text-white">
                    {latestLearning.algorithm_version || 'BigMoney-AI-v1.0'}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-[#0b0f14] rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-2">
                    {language === 'en' ? '📈 Overall Win Rate' : '📈 總體勝率'}
                  </div>
                  <div className="text-4xl font-bold text-white mb-2">
                    {(latestLearning.win_rate_overall || 0).toFixed(1)}%
                  </div>
                  <Progress 
                    value={latestLearning.win_rate_overall || 0} 
                    className="h-2 bg-gray-800"
                    indicatorClassName="bg-[#00ff99]"
                  />
                </div>

                <div className="bg-[#0b0f14] rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-2">
                    {language === 'en' ? '🔥 High Intensity (≥4) Win Rate' : '🔥 高強度(≥4) 勝率'}
                  </div>
                  <div className="text-4xl font-bold text-white mb-2">
                    {(latestLearning.win_rate_intensity_4 || 0).toFixed(1)}%
                  </div>
                  <Progress 
                    value={latestLearning.win_rate_intensity_4 || 0} 
                    className="h-2 bg-gray-800"
                    indicatorClassName="bg-[#ffaa00]"
                  />
                </div>

                <div className="bg-[#0b0f14] rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-2">
                    {language === 'en' ? '🎯 High Confidence (≥70%) Win Rate' : '🎯 高信心(≥70%) 勝率'}
                  </div>
                  <div className="text-4xl font-bold text-white mb-2">
                    {(latestLearning.win_rate_high_conf || 0).toFixed(1)}%
                  </div>
                  <Progress 
                    value={latestLearning.win_rate_high_conf || 0} 
                    className="h-2 bg-gray-800"
                    indicatorClassName="bg-[#00ff99]"
                  />
                </div>
              </div>

              {/* Performance Notes */}
              <div className="mt-4 p-4 bg-[#0b0f14] rounded-xl">
                <div className="text-sm font-semibold text-white mb-2">
                  {language === 'en' ? '💡 AI Feedback' : '💡 AI 回饋'}
                </div>
                <p className="text-sm text-gray-300">
                  {latestLearning.performance_notes || (language === 'en' ? 'No feedback available yet.' : '尚無回饋。')}
                </p>
              </div>

              {/* Sample Size */}
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {language === 'en' ? 'Analyzed Signals' : '分析訊號數'}
                </span>
                <span className="font-semibold text-white">
                  {latestLearning.total_signals_analyzed || 0} {language === 'en' ? 'signals' : '筆'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="bg-[#151a21] border border-gray-800">
            <TabsTrigger value="recent" className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black">
              📊 {language === 'en' ? 'Recent Signals' : '最近訊號'}
            </TabsTrigger>
            <TabsTrigger value="backtests" className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black">
              📝 {language === 'en' ? 'Backtest Results' : '回測結果'}
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black">
              📈 {language === 'en' ? 'Detailed Stats' : '詳細統計'}
            </TabsTrigger>
          </TabsList>

          {/* Recent Signals Tab */}
          <TabsContent value="recent" className="space-y-4 mt-6">
            {recentSignals.length === 0 ? (
              <Card className="bg-[#151a21] border-gray-800">
                <CardContent className="p-8 text-center">
                  <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">
                    {language === 'en' ? 'No recent signals' : '尚無最近訊號'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              recentSignals.map((signal, index) => (
                <Card key={index} className="bg-[#151a21] border-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          signal.signal_type === 'IN' ? 'bg-[#00ff99]/20' : 'bg-[#ff4d4d]/20'
                        }`}>
                          {signal.signal_type === 'IN' ? (
                            <TrendingUp className="w-5 h-5 text-[#00ff99]" />
                          ) : (
                            <TrendingUp className="w-5 h-5 text-[#ff4d4d] rotate-180" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white">{signal.symbol}</div>
                          <div className="text-sm text-gray-400">
                            {signal.signal_type} | {language === 'en' ? 'Intensity' : '強度'}: {signal.intensity_score || signal.panic_score || 0}/5
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">
                          {language === 'en' ? 'Recommendation' : '建議'}
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {language === 'en' ? signal.rec_action_en : signal.rec_action}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Backtests Tab */}
          <TabsContent value="backtests" className="space-y-4 mt-6">
            {recentBacktests.length === 0 ? (
              <Card className="bg-[#151a21] border-gray-800">
                <CardContent className="p-8 text-center">
                  <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">
                    {language === 'en' ? 'No backtest results yet' : '尚無回測結果'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              recentBacktests.map((backtest, index) => (
                <Card key={index} className={`bg-[#151a21] border ${
                  backtest.result_outcome === 'WIN' ? 'border-[#00ff99]/30' : 'border-[#ff4d4d]/30'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          backtest.result_outcome === 'WIN' ? 'bg-[#00ff99]/20' : 'bg-[#ff4d4d]/20'
                        }`}>
                          {backtest.result_outcome === 'WIN' ? (
                            <CheckCircle className="w-5 h-5 text-[#00ff99]" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-[#ff4d4d]" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white">{backtest.symbol}</div>
                          <div className="text-sm text-gray-400">
                            {backtest.signal_type} | {backtest.duration_minutes || 0} {language === 'en' ? 'min' : '分鐘'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          backtest.result_outcome === 'WIN' ? 'text-[#00ff99]' : 'text-[#ff4d4d]'
                        }`}>
                          {(backtest.result_pct || 0) >= 0 ? '+' : ''}{(backtest.result_pct || 0).toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-400">
                          {backtest.result_outcome}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {backtest.feedback_notes || ''}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4 mt-6">
            {latestLearning && (
              <div className="grid md:grid-cols-2 gap-4">
                {/* Intensity Breakdown */}
                <Card className="bg-[#151a21] border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">
                      {language === 'en' ? 'Win Rate by Intensity' : '強度別勝率'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[1, 2, 3, 4, 5].map(intensity => (
                      <div key={intensity}>
                        <div className="flex items-center justify-between mb-1 text-sm">
                          <span className="text-gray-400">
                            {language === 'en' ? `Intensity ${intensity}` : `強度 ${intensity}`}
                          </span>
                          <span className="font-semibold text-white">
                            {(latestLearning[`win_rate_intensity_${intensity}`] || 0).toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          value={latestLearning[`win_rate_intensity_${intensity}`] || 0} 
                          className="h-2 bg-gray-800"
                          indicatorClassName={intensity >= 4 ? 'bg-[#00ff99]' : 'bg-gray-600'}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Confidence Breakdown */}
                <Card className="bg-[#151a21] border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">
                      {language === 'en' ? 'Win Rate by Confidence' : '信心度別勝率'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <span className="text-gray-400">
                          {language === 'en' ? 'High Conf (≥70%)' : '高信心 (≥70%)'}
                        </span>
                        <span className="font-semibold text-white">
                          {(latestLearning.win_rate_high_conf || 0).toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={latestLearning.win_rate_high_conf || 0} 
                        className="h-2 bg-gray-800"
                        indicatorClassName="bg-[#00ff99]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <span className="text-gray-400">
                          {language === 'en' ? 'Medium Conf (50-70%)' : '中信心 (50-70%)'}
                        </span>
                        <span className="font-semibold text-white">
                          {(latestLearning.win_rate_medium_conf || 0).toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={latestLearning.win_rate_medium_conf || 0} 
                        className="h-2 bg-gray-800"
                        indicatorClassName="bg-[#ffaa00]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <span className="text-gray-400">
                          {language === 'en' ? 'Low Conf (<50%)' : '低信心 (<50%)'}
                        </span>
                        <span className="font-semibold text-white">
                          {(latestLearning.win_rate_low_conf || 0).toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={latestLearning.win_rate_low_conf || 0} 
                        className="h-2 bg-gray-800"
                        indicatorClassName="bg-gray-600"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}