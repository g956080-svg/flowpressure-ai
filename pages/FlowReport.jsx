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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  FileText,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  Award,
  AlertCircle,
  User,
  Bot,
  Brain,
  Target
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const COLORS = {
  manual: '#ffaa00',
  auto: '#00C6FF',
  win: '#00ff88',
  loss: '#ff4d4d'
};

export default function FlowReport() {
  const { language } = useLanguage();
  const [reportType, setReportType] = useState('DAILY');
  const queryClient = useQueryClient();

  // 獲取最新報告
  const { data: latestReport, isLoading } = useQuery({
    queryKey: ['latestFlowReport', reportType],
    queryFn: async () => {
      const reports = await base44.entities.ManualTradingReport.filter({
        report_type: reportType
      });
      const sorted = reports.sort((a, b) => 
        new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
      );
      return sorted.length > 0 ? sorted[0] : null;
    },
    refetchInterval: 60000
  });

  // 獲取歷史報告
  const { data: historicalReports = [] } = useQuery({
    queryKey: ['historicalFlowReports', reportType],
    queryFn: async () => {
      const reports = await base44.entities.ManualTradingReport.filter({
        report_type: reportType
      });
      return reports.sort((a, b) => 
        new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
      ).slice(0, 7);
    },
    refetchInterval: 60000
  });

  // 生成報告
  const generateReportMutation = useMutation({
    mutationFn: async ({ date, type }) => {
      const response = await base44.functions.invoke('generateManualTradingReport', {
        report_date: date,
        report_type: type
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.data.success) {
        queryClient.invalidateQueries(['latestFlowReport']);
        queryClient.invalidateQueries(['historicalFlowReports']);
        toast.success(
          language === 'en'
            ? '✅ Report generated successfully'
            : '✅ 報告生成成功'
        );
      }
    },
    onError: (error) => {
      toast.error(
        language === 'en'
          ? '❌ Failed to generate report'
          : '❌ 報告生成失敗'
      );
    }
  });

  // 導出 CSV
  const exportCSV = () => {
    if (!latestReport) return;

    const tradeDetails = JSON.parse(latestReport.trade_details || '{"manual":[],"auto":[]}');
    
    let csv = 'Type,Symbol,Entry Time,Exit Time,Shares,Buy Price,Sell Price,P/L %,P/L Amount,Result\n';
    
    tradeDetails.manual.forEach(trade => {
      csv += `Manual,${trade.symbol},${trade.entry_time},${trade.exit_time},${trade.shares},${trade.buy_price},${trade.sell_price},${trade.pl_percent},${trade.pl_amount},${trade.result}\n`;
    });
    
    tradeDetails.auto.forEach(trade => {
      csv += `Auto,${trade.symbol},${trade.entry_time},${trade.exit_time},${trade.shares},${trade.buy_price},${trade.sell_price},${trade.pl_percent},${trade.pl_amount},${trade.result}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FlowReport_${latestReport.report_type}_${latestReport.report_date}.csv`;
    a.click();
    
    toast.success(language === 'en' ? '📄 CSV exported' : '📄 CSV 已匯出');
  };

  // 導出 JSON
  const exportJSON = () => {
    if (!latestReport) return;

    const blob = new Blob([JSON.stringify(latestReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FlowReport_${latestReport.report_type}_${latestReport.report_date}.json`;
    a.click();
    
    toast.success(language === 'en' ? '📄 JSON exported' : '📄 JSON 已匯出');
  };

  // 準備圖表數據
  const comparisonData = latestReport ? [
    {
      name: language === 'en' ? 'Manual' : '手動',
      'Win Rate': latestReport.manual_win_rate,
      'Avg Return': latestReport.manual_avg_return,
      'Total Trades': latestReport.manual_total_trades
    },
    {
      name: language === 'en' ? 'AI Auto' : 'AI 自動',
      'Win Rate': latestReport.auto_win_rate,
      'Avg Return': latestReport.auto_avg_return,
      'Total Trades': latestReport.auto_total_trades
    }
  ] : [];

  const plComparisonData = latestReport ? [
    {
      name: language === 'en' ? 'Manual' : '手動',
      value: latestReport.manual_total_pl
    },
    {
      name: language === 'en' ? 'AI Auto' : 'AI 自動',
      value: latestReport.auto_total_pl
    }
  ] : [];

  const trendData = historicalReports.slice().reverse().map(report => ({
    date: report.report_date,
    manualWinRate: report.manual_win_rate,
    autoWinRate: report.auto_win_rate,
    manualPL: report.manual_total_pl,
    autoPL: report.auto_total_pl
  }));

  const handleGenerateReport = () => {
    const today = new Date().toISOString().split('T')[0];
    generateReportMutation.mutate({ date: today, type: reportType });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <RefreshCw className="w-12 h-12 text-[#00C6FF] animate-spin" />
      </div>
    );
  }

  if (!latestReport) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-400 mb-4">
                {language === 'en' ? 'No Flow Report Available' : '尚無 Flow 報告'}
              </h3>
              <p className="text-gray-500 mb-6">
                {language === 'en'
                  ? 'Generate your first performance comparison report'
                  : '生成第一份績效比較報告'}
              </p>
              <Button
                onClick={handleGenerateReport}
                disabled={generateReportMutation.isLoading}
                className="bg-[#00C6FF] hover:bg-[#0078FF] text-black font-semibold"
              >
                {generateReportMutation.isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'en' ? 'Generating...' : '生成中...'}
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'Generate Report' : '生成報告'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const tradeDetails = JSON.parse(latestReport.trade_details || '{"manual":[],"auto":[]}');

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#00C6FF] to-[#0078FF] rounded-2xl flex items-center justify-center shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-1">
                {language === 'en' ? '📊 Flow Report' : '📊 Flow 報告'}
              </h1>
              <p className="text-gray-400">
                {language === 'en'
                  ? 'Performance Analysis: Manual vs AI Trading'
                  : '績效分析：手動 vs AI 交易'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Tabs value={reportType} onValueChange={setReportType}>
              <TabsList className="bg-[#1a2332] border border-gray-700">
                <TabsTrigger value="DAILY" className="data-[state=active]:bg-[#00C6FF] data-[state=active]:text-black">
                  {language === 'en' ? 'Daily' : '每日'}
                </TabsTrigger>
                <TabsTrigger value="WEEKLY" className="data-[state=active]:bg-[#00C6FF] data-[state=active]:text-black">
                  {language === 'en' ? 'Weekly' : '每週'}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              onClick={handleGenerateReport}
              disabled={generateReportMutation.isLoading}
              variant="outline"
              className="border-gray-700 text-gray-300"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generateReportMutation.isLoading ? 'animate-spin' : ''}`} />
              {language === 'en' ? 'Refresh' : '刷新'}
            </Button>

            <Button
              onClick={exportCSV}
              className="bg-[#00ff88] hover:bg-[#00cc7a] text-black font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>

            <Button
              onClick={exportJSON}
              className="bg-[#00C6FF] hover:bg-[#0078FF] text-black font-semibold"
            >
              <Download className="w-4 h-4 mr-2" />
              JSON
            </Button>
          </div>
        </div>

        {/* Report Header */}
        <Card className="bg-gradient-to-r from-[#00C6FF]/10 to-transparent bg-[#1a2332] border-2 border-[#00C6FF]/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">
                  {language === 'en' ? 'Report Period' : '報告期間'}
                </div>
                <div className="text-2xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-[#00C6FF]" />
                  {latestReport.report_date}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">
                  {language === 'en' ? 'Correlation' : '相關性'}
                </div>
                <div className="text-2xl font-bold gradient-text">
                  {(latestReport.correlation * 100).toFixed(1)}%
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">
                  {language === 'en' ? 'Report Type' : '報告類型'}
                </div>
                <Badge className="text-lg bg-[#00C6FF] text-black">
                  {latestReport.report_type}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Manual Trading Summary */}
          <Card className="bg-gradient-to-br from-[#ffaa00]/10 to-transparent bg-[#1a2332] border-2 border-[#ffaa00]/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-6 h-6 text-[#ffaa00]" />
                {language === 'en' ? 'Manual Trading' : '手動交易'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Total Trades' : '總交易數'}
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {latestReport.manual_total_trades}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Win Rate' : '勝率'}
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {latestReport.manual_win_rate.toFixed(1)}%
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Avg Return' : '平均回報'}
                  </div>
                  <div className={`text-2xl font-bold ${
                    latestReport.manual_avg_return >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                  }`}>
                    {latestReport.manual_avg_return >= 0 ? '+' : ''}{latestReport.manual_avg_return.toFixed(2)}%
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Total P/L' : '總損益'}
                  </div>
                  <div className={`text-2xl font-bold ${
                    latestReport.manual_total_pl >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                  }`}>
                    {latestReport.manual_total_pl >= 0 ? '+' : ''}${latestReport.manual_total_pl.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#00ff88]" />
                    <span className="text-sm text-gray-400">
                      {language === 'en' ? 'Best Stock' : '最佳股票'}
                    </span>
                  </div>
                  <div className="text-white font-bold">{latestReport.manual_best_stock}</div>
                </div>
                <div className="text-right text-[#00ff88] font-semibold">
                  +{latestReport.manual_best_return.toFixed(2)}%
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Auto Trading Summary */}
          <Card className="bg-gradient-to-br from-[#00C6FF]/10 to-transparent bg-[#1a2332] border-2 border-[#00C6FF]/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bot className="w-6 h-6 text-[#00C6FF]" />
                {language === 'en' ? 'AI Auto Trading' : 'AI 自動交易'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Total Trades' : '總交易數'}
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {latestReport.auto_total_trades}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Win Rate' : '勝率'}
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {latestReport.auto_win_rate.toFixed(1)}%
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Avg Return' : '平均回報'}
                  </div>
                  <div className={`text-2xl font-bold ${
                    latestReport.auto_avg_return >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                  }`}>
                    {latestReport.auto_avg_return >= 0 ? '+' : ''}{latestReport.auto_avg_return.toFixed(2)}%
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Total P/L' : '總損益'}
                  </div>
                  <div className={`text-2xl font-bold ${
                    latestReport.auto_total_pl >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                  }`}>
                    {latestReport.auto_total_pl >= 0 ? '+' : ''}${latestReport.auto_total_pl.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#00ff88]" />
                    <span className="text-sm text-gray-400">
                      {language === 'en' ? 'Best Stock' : '最佳股票'}
                    </span>
                  </div>
                  <div className="text-white font-bold">{latestReport.auto_best_stock}</div>
                </div>
                <div className="text-right text-[#00ff88] font-semibold">
                  +{latestReport.auto_best_return.toFixed(2)}%
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Performance Comparison */}
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white">
                {language === 'en' ? 'Performance Comparison' : '績效比較'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3342" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #00C6FF' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="Win Rate" fill={COLORS.win} name={language === 'en' ? 'Win Rate (%)' : '勝率 (%)'} />
                  <Bar dataKey="Avg Return" fill={COLORS.auto} name={language === 'en' ? 'Avg Return (%)' : '平均回報 (%)'} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* P/L Comparison */}
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white">
                {language === 'en' ? 'Profit/Loss Comparison' : '損益比較'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={plComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3342" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #00C6FF' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" fill={COLORS.win} name={language === 'en' ? 'Total P/L ($)' : '總損益 ($)'} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Trend Charts */}
        {trendData.length > 1 && (
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white">
                {language === 'en' ? 'Performance Trends' : '績效趨勢'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3342" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #00C6FF' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="manualWinRate" 
                    stroke={COLORS.manual} 
                    strokeWidth={3}
                    name={language === 'en' ? 'Manual Win Rate' : '手動勝率'}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="autoWinRate" 
                    stroke={COLORS.auto} 
                    strokeWidth={3}
                    name={language === 'en' ? 'AI Win Rate' : 'AI 勝率'}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* AI Commentary */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-transparent bg-[#1a2332] border-2 border-purple-500/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-400 animate-pulse" />
              {language === 'en' ? 'AI Performance Analysis' : 'AI 績效分析'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300 leading-relaxed">
              {language === 'en' ? latestReport.ai_commentary_en : latestReport.ai_commentary_zh}
            </p>

            <div className="pt-4 border-t border-purple-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-[#00ff88]" />
                <h4 className="font-bold text-white">
                  {language === 'en' ? 'Recommendations' : '建議'}
                </h4>
              </div>
              <ul className="space-y-2">
                {(language === 'en' ? latestReport.recommendations_en : latestReport.recommendations_zh).map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-300">
                    <span className="text-[#00ff88] font-bold">{index + 1}.</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Trade Details Tables */}
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="bg-[#1a2332] border border-gray-700">
            <TabsTrigger value="manual" className="data-[state=active]:bg-[#ffaa00] data-[state=active]:text-black">
              {language === 'en' ? 'Manual Trades' : '手動交易'}
            </TabsTrigger>
            <TabsTrigger value="auto" className="data-[state=active]:bg-[#00C6FF] data-[state=active]:text-black">
              {language === 'en' ? 'AI Auto Trades' : 'AI 自動交易'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <Card className="bg-[#1a2332] border-[#ffaa00]/30">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-400">{language === 'en' ? 'Symbol' : '股票'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'Entry' : '進場'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'Exit' : '出場'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'Shares' : '股數'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'Buy' : '買入'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'Sell' : '賣出'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'P/L %' : '損益%'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'P/L $' : '損益$'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'Result' : '結果'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tradeDetails.manual.map((trade, index) => (
                        <TableRow key={index} className="border-gray-700">
                          <TableCell className="font-bold text-white">{trade.symbol}</TableCell>
                          <TableCell className="text-gray-300">{new Date(trade.entry_time).toLocaleString()}</TableCell>
                          <TableCell className="text-gray-300">{new Date(trade.exit_time).toLocaleString()}</TableCell>
                          <TableCell className="text-white">{trade.shares}</TableCell>
                          <TableCell className="text-white">${trade.buy_price.toFixed(2)}</TableCell>
                          <TableCell className="text-white">${trade.sell_price.toFixed(2)}</TableCell>
                          <TableCell className={`font-bold ${trade.pl_percent >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'}`}>
                            {trade.pl_percent >= 0 ? '+' : ''}{trade.pl_percent.toFixed(2)}%
                          </TableCell>
                          <TableCell className={`font-bold ${trade.pl_amount >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'}`}>
                            {trade.pl_amount >= 0 ? '+' : ''}${trade.pl_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge className={trade.result === 'WIN' ? 'bg-[#00ff88]/20 text-[#00ff88]' : 'bg-[#ff4d4d]/20 text-[#ff4d4d]'}>
                              {trade.result}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auto">
            <Card className="bg-[#1a2332] border-[#00C6FF]/30">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-400">{language === 'en' ? 'Symbol' : '股票'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'Entry' : '進場'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'Exit' : '出場'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'Shares' : '股數'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'Buy' : '買入'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'Sell' : '賣出'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'P/L %' : '損益%'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'P/L $' : '損益$'}</TableHead>
                        <TableHead className="text-gray-400">{language === 'en' ? 'Result' : '結果'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tradeDetails.auto.map((trade, index) => (
                        <TableRow key={index} className="border-gray-700">
                          <TableCell className="font-bold text-white">{trade.symbol}</TableCell>
                          <TableCell className="text-gray-300">{new Date(trade.entry_time).toLocaleString()}</TableCell>
                          <TableCell className="text-gray-300">{new Date(trade.exit_time).toLocaleString()}</TableCell>
                          <TableCell className="text-white">{trade.shares}</TableCell>
                          <TableCell className="text-white">${trade.buy_price.toFixed(2)}</TableCell>
                          <TableCell className="text-white">${trade.sell_price.toFixed(2)}</TableCell>
                          <TableCell className={`font-bold ${trade.pl_percent >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'}`}>
                            {trade.pl_percent >= 0 ? '+' : ''}{trade.pl_percent.toFixed(2)}%
                          </TableCell>
                          <TableCell className={`font-bold ${trade.pl_amount >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'}`}>
                            {trade.pl_amount >= 0 ? '+' : ''}${trade.pl_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge className={trade.result === 'WIN' ? 'bg-[#00ff88]/20 text-[#00ff88]' : 'bg-[#ff4d4d]/20 text-[#ff4d4d]'}>
                              {trade.result}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                {language === 'en'
                  ? '📊 Report generated by Flow-Strike AI Performance Analyst'
                  : '📊 報告由 Flow-Strike AI 績效分析代理生成'}
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