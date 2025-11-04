import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  Brain,
  Calendar,
  RefreshCw,
  Award,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

export default function PerformanceReport() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  // 查詢最新報告
  const { data: latestReport, isLoading } = useQuery({
    queryKey: ['latestPerformanceReport'],
    queryFn: async () => {
      const reports = await base44.entities.DailyPerformanceReport.list('-report_date', 1);
      return reports.length > 0 ? reports[0] : null;
    },
    refetchInterval: 60000
  });

  // 查詢歷史報告（最近 7 天）
  const { data: historicalReports = [] } = useQuery({
    queryKey: ['historicalReports'],
    queryFn: async () => {
      const reports = await base44.entities.DailyPerformanceReport.list('-report_date', 7);
      return reports;
    },
    refetchInterval: 60000
  });

  // 生成報告 mutation
  const generateReportMutation = useMutation({
    mutationFn: async (date) => {
      const response = await base44.functions.invoke('generatePerformanceReport', {
        report_date: date
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.data.success) {
        queryClient.invalidateQueries(['latestPerformanceReport']);
        queryClient.invalidateQueries(['historicalReports']);
        toast.success(
          language === 'en' 
            ? '✅ Performance report generated successfully' 
            : '✅ 績效報告已成功生成'
        );
      }
    },
    onError: (error) => {
      toast.error(
        language === 'en' 
          ? '❌ Failed to generate report' 
          : '❌ 生成報告失敗'
      );
    }
  });

  const handleGenerateToday = () => {
    const today = new Date().toISOString().split('T')[0];
    generateReportMutation.mutate(today);
  };

  const getStateColor = (state) => {
    switch (state) {
      case 'Optimized': return 'bg-[#00ff99]/20 text-[#00ff99] border-[#00ff99]/30';
      case 'Learning': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Adjusting': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Stable': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPerformanceIcon = (returnPct) => {
    if (returnPct >= 20) return <Award className="w-6 h-6 text-[#00ff99]" />;
    if (returnPct >= 10) return <TrendingUp className="w-6 h-6 text-[#00ff99]" />;
    if (returnPct >= 0) return <Activity className="w-6 h-6 text-blue-400" />;
    return <TrendingDown className="w-6 h-6 text-[#ff4d4d]" />;
  };

  // 準備圖表數據
  const chartData = historicalReports.slice().reverse().map(report => ({
    date: report.report_date,
    capital: report.capital_end,
    return: report.total_return_pct,
    winRate: report.win_rate
  }));

  const winRateComparisonData = latestReport ? [
    { 
      label: language === 'en' ? 'Overall Win Rate' : '總勝率', 
      value: latestReport.win_rate 
    },
    { 
      label: language === 'en' ? 'High Confidence Win Rate' : '高信心勝率', 
      value: latestReport.high_confidence_win_rate 
    }
  ] : [];

  // 解析交易明細
  const tradeRecords = latestReport && latestReport.trade_details
    ? JSON.parse(latestReport.trade_details)
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <RefreshCw className="w-12 h-12 text-[#00ff99] animate-spin" />
      </div>
    );
  }

  if (!latestReport) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-[#151a21] border-gray-800">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-400 mb-4">
                {language === 'en' ? 'No Performance Report Available' : '尚無績效報告'}
              </h3>
              <p className="text-gray-500 mb-6">
                {language === 'en' 
                  ? 'Generate your first daily performance report'
                  : '生成第一份每日績效報告'}
              </p>
              <Button
                onClick={handleGenerateToday}
                disabled={generateReportMutation.isLoading}
                className="bg-[#00ff99] text-black hover:bg-[#00cc7a]"
              >
                {generateReportMutation.isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'en' ? 'Generating...' : '生成中...'}
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'Generate Today\'s Report' : '生成今日報告'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                {language === 'en' ? 'Flow-Strike AI Daily Performance' : 'Flow-Strike AI 每日績效回報'}
              </h1>
              <p className="text-gray-400">
                {language === 'en' ? 'Simulated Trading Results' : '模擬交易成果'} ({latestReport.report_date})
              </p>
            </div>
          </div>

          <Button
            onClick={handleGenerateToday}
            disabled={generateReportMutation.isLoading}
            variant="outline"
            className="border-gray-700 text-gray-300"
          >
            {generateReportMutation.isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {language === 'en' ? 'Generating...' : '生成中...'}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Regenerate' : '重新生成'}
              </>
            )}
          </Button>
        </div>

        {/* Performance Message */}
        {latestReport.performance_message_zh && (
          <Card className={`${
            latestReport.total_return_pct >= 20 
              ? 'bg-gradient-to-r from-[#00ff99]/10 to-transparent border-[#00ff99]/50'
              : latestReport.total_return_pct >= 0
              ? 'bg-gradient-to-r from-blue-500/10 to-transparent border-blue-500/50'
              : 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/50'
          } bg-[#151a21] border-2`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                {getPerformanceIcon(latestReport.total_return_pct)}
                <div>
                  <p className="text-lg font-semibold text-white">
                    {language === 'en' ? latestReport.performance_message_en : latestReport.performance_message_zh}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Card */}
        <Card className="bg-gradient-to-br from-[#00ff99]/10 to-transparent bg-[#151a21] border-2 border-[#00ff99]/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-[#00ff99]" />
              {language === 'en' ? '📊 Today\'s Simulation Summary' : '📊 今日模擬摘要'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-[#0b0f14] rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">
                  {language === 'en' ? 'Starting Capital' : '起始資金'}
                </div>
                <div className="text-2xl font-bold text-white">
                  ${latestReport.capital_start.toFixed(0)}
                </div>
              </div>

              <div className="bg-[#0b0f14] rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">
                  {language === 'en' ? 'Ending Capital' : '收盤資金'}
                </div>
                <div className="text-2xl font-bold text-white">
                  ${latestReport.capital_end.toFixed(0)}
                </div>
              </div>

              <div className="bg-[#0b0f14] rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">
                  {language === 'en' ? 'Daily Return' : '當日報酬率'}
                </div>
                <div className={`text-2xl font-bold ${
                  latestReport.total_return_pct >= 0 ? 'text-[#00ff99]' : 'text-[#ff4d4d]'
                }`}>
                  {latestReport.total_return_pct >= 0 ? '+' : ''}{latestReport.total_return_pct.toFixed(1)}%
                </div>
              </div>

              <div className="bg-[#0b0f14] rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">
                  {language === 'en' ? 'Avg Return Per Trade' : '平均單筆報酬'}
                </div>
                <div className={`text-2xl font-bold ${
                  latestReport.avg_return_pct >= 0 ? 'text-[#00ff99]' : 'text-[#ff4d4d]'
                }`}>
                  {latestReport.avg_return_pct >= 0 ? '+' : ''}{latestReport.avg_return_pct.toFixed(2)}%
                </div>
              </div>

              <div className="bg-[#0b0f14] rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">
                  {language === 'en' ? 'Win Rate' : '勝率'}
                </div>
                <div className="text-2xl font-bold text-white">
                  {latestReport.win_rate.toFixed(1)}%
                </div>
              </div>

              <div className="bg-[#0b0f14] rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">
                  {language === 'en' ? 'AI Status' : 'AI狀態'}
                </div>
                <Badge className={`${getStateColor(latestReport.ai_learning_state)} text-sm font-bold`}>
                  {latestReport.ai_learning_state}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Capital Curve */}
          {chartData.length > 1 && (
            <Card className="bg-[#151a21] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#00ff99]" />
                  {language === 'en' ? '💹 Capital Growth Curve' : '💹 獲利曲線圖'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="capital" 
                      stroke="#00ff99" 
                      strokeWidth={3}
                      name={language === 'en' ? 'Capital' : '資金'}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Win Rate Comparison */}
          <Card className="bg-[#151a21] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-[#00ff99]" />
                {language === 'en' ? '📈 Win Rate Comparison' : '📈 勝率比較'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={winRateComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="label" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#00ff99" name={language === 'en' ? 'Win Rate (%)' : '勝率 (%)'} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Trade Records Table */}
        <Card className="bg-[#151a21] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">
              {language === 'en' ? '💰 Simulated Trade Records' : '💰 模擬交易紀錄'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-3 text-gray-400 text-sm">
                      {language === 'en' ? 'Stock' : '股票'}
                    </th>
                    <th className="text-left p-3 text-gray-400 text-sm">
                      {language === 'en' ? 'Signal' : '信號'}
                    </th>
                    <th className="text-left p-3 text-gray-400 text-sm">
                      {language === 'en' ? 'Result' : '結果'}
                    </th>
                    <th className="text-right p-3 text-gray-400 text-sm">
                      {language === 'en' ? 'Return (%)' : '報酬(%)'}
                    </th>
                    <th className="text-right p-3 text-gray-400 text-sm">
                      {language === 'en' ? 'Confidence' : '信心'}
                    </th>
                    <th className="text-right p-3 text-gray-400 text-sm">
                      {language === 'en' ? 'Latency (s)' : '延遲(秒)'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tradeRecords.map((trade, index) => (
                    <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/30">
                      <td className="p-3 text-white font-semibold">{trade.symbol}</td>
                      <td className="p-3">
                        <Badge className={trade.signal === 'IN' ? 'bg-[#00ff99]/20 text-[#00ff99]' : 'bg-[#ff4d4d]/20 text-[#ff4d4d]'}>
                          {trade.signal}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={trade.result === 'WIN' ? 'bg-[#00ff99]/20 text-[#00ff99]' : 'bg-[#ff4d4d]/20 text-[#ff4d4d]'}>
                          {trade.result}
                        </Badge>
                      </td>
                      <td className={`p-3 text-right font-bold ${
                        parseFloat(trade.return_pct) >= 0 ? 'text-[#00ff99]' : 'text-[#ff4d4d]'
                      }`}>
                        {parseFloat(trade.return_pct) >= 0 ? '+' : ''}{trade.return_pct}
                      </td>
                      <td className="p-3 text-right text-gray-300">
                        {trade.confidence}%
                      </td>
                      <td className="p-3 text-right text-gray-400">
                        {trade.latency_sec.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* AI Suggestion */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-transparent bg-[#151a21] border border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-400 animate-pulse" />
              {language === 'en' ? '🧠 AI Model Suggestions' : '🧠 AI 模型建議'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 leading-relaxed">
              {language === 'en' ? latestReport.ai_suggestion_en : latestReport.ai_suggestion_zh}
            </p>
          </CardContent>
        </Card>

        {/* Best & Worst Stocks */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-[#00ff99]/10 to-transparent bg-[#151a21] border border-[#00ff99]/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Award className="w-8 h-8 text-[#00ff99]" />
                <div>
                  <div className="text-sm text-gray-400">
                    {language === 'en' ? '🏆 Best Performer' : '🏆 最佳表現'}
                  </div>
                  <div className="text-2xl font-bold text-white">{latestReport.best_stock}</div>
                </div>
              </div>
              <div className="text-3xl font-bold text-[#00ff99]">
                +{latestReport.best_stock_return.toFixed(2)}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#ff4d4d]/10 to-transparent bg-[#151a21] border border-[#ff4d4d]/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="w-8 h-8 text-[#ff4d4d]" />
                <div>
                  <div className="text-sm text-gray-400">
                    {language === 'en' ? '📉 Worst Performer' : '📉 最差表現'}
                  </div>
                  <div className="text-2xl font-bold text-white">{latestReport.worst_stock}</div>
                </div>
              </div>
              <div className="text-3xl font-bold text-[#ff4d4d]">
                {latestReport.worst_stock_return.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Info */}
        <Card className="bg-[#151a21] border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                {language === 'en' ? '📊 Report generated by Flow-Strike AI Performance Analyst' : '📊 報告由 Flow-Strike AI 績效分析代理生成'}
              </div>
              <div>
                {language === 'en' ? 'Updated at' : '更新時間'}: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}