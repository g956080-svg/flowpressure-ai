import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Award,
  AlertCircle,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";

export default function WeeklyPerformance() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  // 查詢最近8週的報告
  const { data: weeklyReports = [], isLoading } = useQuery({
    queryKey: ['weeklyReports'],
    queryFn: async () => {
      const reports = await base44.entities.AIWeeklyPerformanceLog.list('-week_start_date', 8);
      return reports;
    },
    refetchInterval: 60000
  });

  // 生成本週報告
  const generateReportMutation = useMutation({
    mutationFn: async (weekOffset = 0) => {
      const response = await base44.functions.invoke('weeklyPerformanceReporter', {
        week_offset: weekOffset
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.data.success) {
        toast.success(
          language === 'en'
            ? `✅ Weekly report generated: ${data.data.summary.win_rate}`
            : `✅ 週報已生成：勝率 ${data.data.summary.win_rate}`
        );
        queryClient.invalidateQueries(['weeklyReports']);
      }
    },
    onError: (error) => {
      toast.error(
        language === 'en' ? `❌ Failed: ${error.message}` : `❌ 生成失敗：${error.message}`
      );
    }
  });

  const latestReport = weeklyReports[0];

  // 準備圖表數據
  const chartData = weeklyReports.slice().reverse().map(report => ({
    week: report.week_start_date,
    winRate: report.weekly_win_rate || 0,
    avgIntensity: report.avg_intensity || 0,
    avgConfidence: report.avg_confidence || 0,
    totalSignals: report.total_signals || 0
  }));

  const getWinRateColor = (rate) => {
    if (!rate) return 'text-gray-500';
    if (rate >= 70) return 'text-[#00ff99]';
    if (rate >= 60) return 'text-[#00cc7a]';
    if (rate >= 55) return 'text-[#ffaa00]';
    return 'text-[#ff4d4d]';
  };

  const getWinRateStatus = (rate) => {
    if (!rate) return { icon: '❓', label: language === 'en' ? 'Unknown' : '未知' };
    if (rate >= 70) return { icon: '🎉', label: language === 'en' ? 'Excellent' : '優秀' };
    if (rate >= 60) return { icon: '✅', label: language === 'en' ? 'Target' : '達標' };
    if (rate >= 55) return { icon: '⚠️', label: language === 'en' ? 'Below Target' : '略低' };
    return { icon: '❌', label: language === 'en' ? 'Weak' : '偏弱' };
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#00ff99] to-[#00cc7a] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00ff99]/20">
              <Calendar className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-1">
                {language === 'en' ? '📅 Weekly Performance' : '📅 每週績效'}
              </h1>
              <p className="text-gray-400">
                {language === 'en' 
                  ? 'AI performance analytics & trend tracking'
                  : 'AI 效能分析與趨勢追蹤'}
              </p>
            </div>
          </div>

          <Button
            onClick={() => generateReportMutation.mutate(0)}
            disabled={generateReportMutation.isLoading}
            className="bg-[#00ff99] text-black hover:bg-[#00cc7a]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${generateReportMutation.isLoading ? 'animate-spin' : ''}`} />
            {language === 'en' ? 'Generate This Week' : '生成本週報告'}
          </Button>
        </div>

        {/* Latest Week Summary */}
        {latestReport && (
          <Card className="bg-gradient-to-br from-[#00ff99]/10 to-transparent bg-[#151a21] border-2 border-[#00ff99]/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {language === 'en' ? 'Latest Week Performance' : '最新一週績效'}
                  </h2>
                  <p className="text-gray-400">
                    📅 {latestReport.week_start_date} ~ {latestReport.week_end_date}
                  </p>
                </div>
                <div className="text-right">
                  {(() => {
                    const status = getWinRateStatus(latestReport.weekly_win_rate);
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{status.icon}</span>
                        <div>
                          <div className={`text-5xl font-bold ${getWinRateColor(latestReport.weekly_win_rate)}`}>
                            {(latestReport.weekly_win_rate || 0).toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-400">{status.label}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#0b0f14] rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-2">
                    📊 {language === 'en' ? 'Total Signals' : '信號總數'}
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {latestReport.total_signals || 0}
                  </div>
                </div>

                <div className="bg-[#0b0f14] rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-2">
                    ✅ {language === 'en' ? 'Wins' : '成功'}
                  </div>
                  <div className="text-3xl font-bold text-[#00ff99]">
                    {latestReport.win_signals || 0}
                  </div>
                </div>

                <div className="bg-[#0b0f14] rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-2">
                    ❌ {language === 'en' ? 'Losses' : '失敗'}
                  </div>
                  <div className="text-3xl font-bold text-[#ff4d4d]">
                    {latestReport.lose_signals || 0}
                  </div>
                </div>

                <div className="bg-[#0b0f14] rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-2">
                    ⏳ {language === 'en' ? 'Pending' : '等待中'}
                  </div>
                  <div className="text-3xl font-bold text-[#ffaa00]">
                    {latestReport.neutral_signals || 0}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-[#0b0f14] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">
                      🔥 {language === 'en' ? 'Avg Intensity' : '平均強度'}
                    </span>
                    <span className="text-xl font-bold text-white">
                      {(latestReport.avg_intensity || 0).toFixed(2)}
                    </span>
                  </div>
                  <Progress 
                    value={((latestReport.avg_intensity || 0) / 5) * 100} 
                    className="h-2 bg-gray-800"
                    indicatorClassName="bg-[#ffaa00]"
                  />
                </div>

                <div className="bg-[#0b0f14] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">
                      💡 {language === 'en' ? 'Avg Confidence' : '平均信心度'}
                    </span>
                    <span className="text-xl font-bold text-white">
                      {(latestReport.avg_confidence || 0).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={latestReport.avg_confidence || 0} 
                    className="h-2 bg-gray-800"
                    indicatorClassName="bg-[#00ff99]"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-[#00ff99]/10 border border-[#00ff99]/30 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Award className="w-6 h-6 text-[#00ff99]" />
                    <span className="text-sm font-semibold text-white">
                      {language === 'en' ? 'Best Symbol' : '最佳股票'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-white">{latestReport.best_symbol || 'N/A'}</span>
                    <span className="text-xl font-bold text-[#00ff99]">
                      {(latestReport.best_symbol_win_rate || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="bg-[#ff4d4d]/10 border border-[#ff4d4d]/30 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="w-6 h-6 text-[#ff4d4d]" />
                    <span className="text-sm font-semibold text-white">
                      {language === 'en' ? 'Worst Symbol' : '最差股票'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-white">{latestReport.worst_symbol || 'N/A'}</span>
                    <span className="text-xl font-bold text-[#ff4d4d]">
                      {(latestReport.worst_symbol_win_rate || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Feedback */}
              <div className="bg-[#0b0f14] rounded-xl p-4">
                <div className="text-sm font-semibold text-white mb-2">
                  🧠 {language === 'en' ? 'AI Learning Feedback' : 'AI 學習回饋'}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {language === 'en' ? (latestReport.learning_note_en || 'No feedback available.') : (latestReport.learning_note || '尚無回饋。')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Win Rate Trend Chart */}
        {chartData.length > 0 && (
          <Card className="bg-[#151a21] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#00ff99]" />
                {language === 'en' ? 'Win Rate Trend (Last 8 Weeks)' : '勝率趨勢（近 8 週）'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="week" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="winRate" 
                    stroke="#00ff99" 
                    strokeWidth={3}
                    name={language === 'en' ? 'Win Rate (%)' : '勝率 (%)'}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Signals Breakdown Chart */}
        {chartData.length > 0 && (
          <Card className="bg-[#151a21] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#00ff99]" />
                {language === 'en' ? 'Weekly Signals Breakdown' : '每週訊號分布'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="week" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="totalSignals" 
                    fill="#00ff99" 
                    name={language === 'en' ? 'Total Signals' : '總訊號數'}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Historical Reports */}
        {weeklyReports.length > 1 && (
          <Card className="bg-[#151a21] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">
                {language === 'en' ? 'Historical Reports' : '歷史報告'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {weeklyReports.slice(1).map((report, index) => (
                <div
                  key={index}
                  className="bg-[#0b0f14] rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold mb-1">
                        📅 {report.week_start_date} ~ {report.week_end_date}
                      </div>
                      <div className="text-sm text-gray-400">
                        {report.total_signals || 0} {language === 'en' ? 'signals' : '個訊號'} 
                        {' · '}
                        WIN {report.win_signals || 0} / LOSE {report.lose_signals || 0}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getWinRateColor(report.weekly_win_rate)}`}>
                        {(report.weekly_win_rate || 0).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {language === 'en' ? 'Win Rate' : '勝率'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-12 h-12 text-[#00ff99] animate-spin" />
          </div>
        )}

        {!isLoading && weeklyReports.length === 0 && (
          <Card className="bg-[#151a21] border-gray-800">
            <CardContent className="p-8 text-center">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">
                {language === 'en' ? 'No weekly reports yet' : '尚無週報數據'}
              </p>
              <Button
                onClick={() => generateReportMutation.mutate(0)}
                className="bg-[#00ff99] text-black hover:bg-[#00cc7a]"
              >
                {language === 'en' ? 'Generate First Report' : '生成第一份報告'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}