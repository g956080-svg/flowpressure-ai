
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Calendar,
  TrendingUp,
  Brain,
  Award,
  RefreshCw
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar
} from "recharts";
import { toast } from "sonner";

// Daily Report Component
function DailyReport() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const { data: latestReport, isLoading } = useQuery({
    queryKey: ['latestPerformanceReport'],
    queryFn: async () => {
      const reports = await base44.entities.DailyPerformanceReport.list('-report_date', 1);
      return reports.length > 0 ? reports[0] : null;
    }
  });

  const generateReportMutation = useMutation({
    mutationFn: async (date) => {
      const response = await base44.functions.invoke('generatePerformanceReport', {
        report_date: date
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['latestPerformanceReport']);
      toast.success(language === 'en' ? '✅ Report generated' : '✅ 報告已生成');
    }
  });

  if (isLoading) {
    return <div className="text-center py-8 text-gray-400">{language === 'en' ? 'Loading...' : '載入中...'}</div>;
  }

  if (!latestReport) {
    return (
      <Card className="bg-[#1a2332] border-[#00C6FF]/30">
        <CardContent className="p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-400 mb-4">
            {language === 'en' ? 'No Report Available' : '尚無報告'}
          </h3>
          <Button
            onClick={() => generateReportMutation.mutate(new Date().toISOString().split('T')[0])}
            disabled={generateReportMutation.isLoading}
            className="bg-[#00C6FF] hover:bg-[#0078FF] text-black"
          >
            {generateReportMutation.isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="w-4 h-4 mr-2" />
            )}
            {language === 'en' ? 'Generate Report' : '生成報告'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-[#00ff88]/10 to-transparent bg-[#1a2332] border-2 border-[#00ff88]/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">
              {language === 'en' ? `📊 Daily Report - ${latestReport.report_date}` : `📊 每日報告 - ${latestReport.report_date}`}
            </CardTitle>
            <Button
              onClick={() => generateReportMutation.mutate(new Date().toISOString().split('T')[0])}
              disabled={generateReportMutation.isLoading}
              variant="outline"
              size="sm"
              className="border-gray-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generateReportMutation.isLoading ? 'animate-spin' : ''}`} />
              {language === 'en' ? 'Regenerate' : '重新生成'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-[#0d1b2a] rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">{language === 'en' ? 'Starting Capital' : '起始資金'}</div>
              <div className="text-2xl font-bold text-white">${latestReport.capital_start.toFixed(0)}</div>
            </div>
            <div className="bg-[#0d1b2a] rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">{language === 'en' ? 'Ending Capital' : '收盤資金'}</div>
              <div className="text-2xl font-bold text-white">${latestReport.capital_end.toFixed(0)}</div>
            </div>
            <div className="bg-[#0d1b2a] rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">{language === 'en' ? 'Daily Return' : '當日報酬率'}</div>
              <div className={`text-2xl font-bold ${latestReport.total_return_pct >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'}`}>
                {latestReport.total_return_pct >= 0 ? '+' : ''}{latestReport.total_return_pct.toFixed(1)}%
              </div>
            </div>
            <div className="bg-[#0d1b2a] rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">{language === 'en' ? 'Win Rate' : '勝率'}</div>
              <div className="text-2xl font-bold text-white">{latestReport.win_rate.toFixed(1)}%</div>
            </div>
          </div>

          {latestReport.performance_message_zh && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-white">
                {language === 'en' ? latestReport.performance_message_en : latestReport.performance_message_zh}
              </p>
            </div>
          )}

          {(latestReport.ai_suggestion_en || latestReport.ai_suggestion_zh) && (
            <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="text-sm text-purple-400 mb-2">
                {language === 'en' ? '🧠 AI Suggestion' : '🧠 AI 建議'}
              </div>
              <p className="text-white">
                {language === 'en' ? latestReport.ai_suggestion_en : latestReport.ai_suggestion_zh}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Weekly Report Component
function WeeklyReport() {
  const { language } = useLanguage();
  
  const { data: weeklyReports = [] } = useQuery({
    queryKey: ['weeklyReports'],
    queryFn: () => base44.entities.AIWeeklyPerformanceLog.list('-week_start_date', 4),
    refetchInterval: 60000
  });

  return (
    <div className="space-y-6">
      {weeklyReports.length === 0 ? (
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {language === 'en' ? 'No weekly reports available' : '暫無週報'}
            </p>
          </CardContent>
        </Card>
      ) : (
        weeklyReports.map(report => (
          <Card key={report.id} className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white">
                {language === 'en' 
                  ? `📅 Week: ${report.week_start_date} ~ ${report.week_end_date}`
                  : `📅 週報：${report.week_start_date} ~ ${report.week_end_date}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-[#0d1b2a] rounded-xl p-4">
                  <div className="text-xs text-gray-400 mb-1">{language === 'en' ? 'Total Signals' : '總信號數'}</div>
                  <div className="text-2xl font-bold text-white">{report.total_signals}</div>
                </div>
                <div className="bg-[#0d1b2a] rounded-xl p-4">
                  <div className="text-xs text-gray-400 mb-1">{language === 'en' ? 'Win Rate' : '勝率'}</div>
                  <div className="text-2xl font-bold text-[#00C6FF]">{report.weekly_win_rate.toFixed(1)}%</div>
                </div>
                <div className="bg-[#0d1b2a] rounded-xl p-4">
                  <div className="text-xs text-gray-400 mb-1">{language === 'en' ? 'Avg Confidence' : '平均信心'}</div>
                  <div className="text-2xl font-bold text-white">{report.avg_confidence.toFixed(0)}%</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg">
                  <div className="text-xs text-[#00ff88] mb-1">{language === 'en' ? '🏆 Best Stock' : '🏆 最佳股票'}</div>
                  <div className="text-lg font-bold text-white">{report.best_symbol}</div>
                  <div className="text-sm text-gray-400">{language === 'en' ? 'Win Rate:' : '勝率：'} {report.best_symbol_win_rate.toFixed(1)}%</div>
                </div>
                <div className="p-3 bg-[#ff4d4d]/10 border border-[#ff4d4d]/30 rounded-lg">
                  <div className="text-xs text-[#ff4d4d] mb-1">{language === 'en' ? '📉 Worst Stock' : '📉 最差股票'}</div>
                  <div className="text-lg font-bold text-white">{report.worst_symbol}</div>
                  <div className="text-sm text-gray-400">{language === 'en' ? 'Win Rate:' : '勝率：'} {report.worst_symbol_win_rate.toFixed(1)}%</div>
                </div>
              </div>

              {report.learning_note && (
                <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="text-xs text-purple-400 mb-1">{language === 'en' ? '🧠 AI Learning Note' : '🧠 AI 學習筆記'}</div>
                  <p className="text-sm text-white">
                    {language === 'en' ? report.learning_note_en : report.learning_note}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// Performance Analysis Component
function PerformanceAnalysis() {
  const { language } = useLanguage();
  
  const { data: historicalReports = [] } = useQuery({
    queryKey: ['historicalReports'],
    queryFn: () => base44.entities.DailyPerformanceReport.list('-report_date', 30),
    refetchInterval: 60000
  });

  const chartData = historicalReports.slice().reverse().map(report => ({
    date: report.report_date,
    capital: report.capital_end,
    return: report.total_return_pct,
    winRate: report.win_rate
  }));

  return (
    <div className="space-y-6">
      {chartData.length > 1 && (
        <>
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white">
                {language === 'en' ? '💹 Capital Growth Curve' : '💹 資金成長曲線'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <RechartsTooltip 
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

          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white">
                {language === 'en' ? '📈 Win Rate Trend' : '📈 勝率趨勢'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="winRate" fill="#00C6FF" name={language === 'en' ? 'Win Rate (%)' : '勝率 (%)'} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {chartData.length === 0 && (
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardContent className="p-12 text-center">
            <BarChart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {language === 'en' ? 'Not enough data for analysis' : '數據不足以進行分析'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ReportsHub() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'daily';
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
          <div className="w-16 h-16 bg-gradient-to-br from-[#00C6FF] to-[#0078FF] rounded-2xl flex items-center justify-center pressure-glow">
            <BarChart className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">
              {language === 'en' ? '📊 Reports Hub' : '📊 報表中心'}
            </h1>
            <p className="text-gray-400">
              {language === 'en' 
                ? 'Comprehensive performance analytics - Daily, Weekly, Trends' 
                : '完整績效分析 - 日報、週報、趨勢'}
            </p>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-[#1a2332] border border-[#00C6FF]/30 p-1">
            <TabsTrigger 
              value="daily" 
              className="data-[state=active]:bg-[#00C6FF] data-[state=active]:text-black"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Daily' : '每日'}
            </TabsTrigger>
            <TabsTrigger 
              value="weekly" 
              className="data-[state=active]:bg-[#00C6FF] data-[state=active]:text-black"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Weekly' : '每週'}
            </TabsTrigger>
            <TabsTrigger 
              value="analysis" 
              className="data-[state=active]:bg-[#00C6FF] data-[state=active]:text-black"
            >
              <Award className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Analysis' : '分析'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <DailyReport />
          </TabsContent>

          <TabsContent value="weekly">
            <WeeklyReport />
          </TabsContent>

          <TabsContent value="analysis">
            <PerformanceAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
