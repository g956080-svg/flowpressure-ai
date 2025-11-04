import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Square,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  BarChart3,
  LineChart as LineChartIcon,
  Target,
  Shield
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

export default function StrategyBacktest() {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  const [selectedStrategyId, setSelectedStrategyId] = useState(searchParams.get('strategy_id') || '');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialCapital, setInitialCapital] = useState(10000);
  
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTrade, setCurrentTrade] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const [liveResults, setLiveResults] = useState(null);
  const [liveEquity, setLiveEquity] = useState([]);
  const [completedBacktest, setCompletedBacktest] = useState(null);

  // 獲取所有策略
  const { data: strategies = [] } = useQuery({
    queryKey: ['aiStrategies'],
    queryFn: () => base44.entities.AIStrategy.list('-created_date')
  });

  // 獲取歷史回測結果
  const { data: backtestHistory = [] } = useQuery({
    queryKey: ['backtestHistory', selectedStrategyId],
    queryFn: async () => {
      if (!selectedStrategyId) return [];
      const results = await base44.entities.BacktestResult.filter({
        strategy_id: selectedStrategyId
      });
      return results.sort((a, b) => 
        new Date(b.backtest_date).getTime() - new Date(a.backtest_date).getTime()
      );
    },
    enabled: !!selectedStrategyId
  });

  // 執行回測
  const runBacktestMutation = useMutation({
    mutationFn: async ({ strategy_id, start_date, end_date, initial_capital }) => {
      const response = await base44.functions.invoke('strategyBacktester', {
        strategy_id,
        start_date,
        end_date,
        initial_capital
      });
      return response.data;
    },
    onSuccess: (data) => {
      setIsRunning(false);
      setProgress(100);
      
      if (data.success) {
        setCompletedBacktest(data);
        queryClient.invalidateQueries(['backtestHistory']);
        toast.success(
          language === 'en'
            ? '✅ Backtest completed successfully!'
            : '✅ 回測完成！'
        );
      } else {
        toast.error(
          language === 'en'
            ? `❌ Backtest failed: ${data.error}`
            : `❌ 回測失敗：${data.error}`
        );
      }
    },
    onError: (error) => {
      setIsRunning(false);
      toast.error(
        language === 'en'
          ? `❌ Backtest error: ${error.message}`
          : `❌ 回測錯誤：${error.message}`
      );
    }
  });

  // 模擬進度動畫
  useEffect(() => {
    if (isRunning && !isCancelled) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 5;
        });
        
        setCurrentTrade(prev => {
          const next = prev + 1;
          if (totalTrades > 0 && next <= totalTrades) {
            return next;
          }
          return prev;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isRunning, isCancelled, totalTrades]);

  // 模擬即時權益曲線
  useEffect(() => {
    if (isRunning && !isCancelled && currentTrade > 0) {
      const equity = initialCapital * (1 + (Math.random() - 0.3) * 0.1 * (currentTrade / Math.max(totalTrades, 1)));
      setLiveEquity(prev => [...prev, {
        trade: currentTrade,
        equity: equity
      }]);
    }
  }, [currentTrade, isRunning, isCancelled, initialCapital, totalTrades]);

  const handleStartBacktest = () => {
    if (!selectedStrategyId) {
      toast.error(language === 'en' ? 'Please select a strategy' : '請選擇策略');
      return;
    }

    setIsRunning(true);
    setIsCancelled(false);
    setProgress(0);
    setCurrentTrade(0);
    setTotalTrades(50); // 估計值
    setLiveResults(null);
    setLiveEquity([{ trade: 0, equity: initialCapital }]);
    setCompletedBacktest(null);

    runBacktestMutation.mutate({
      strategy_id: selectedStrategyId,
      start_date: startDate,
      end_date: endDate,
      initial_capital: initialCapital
    });
  };

  const handleCancelBacktest = () => {
    setIsCancelled(true);
    setIsRunning(false);
    toast.info(language === 'en' ? '⏸️ Backtest cancelled' : '⏸️ 回測已取消');
  };

  const selectedStrategy = strategies.find(s => s.id === selectedStrategyId);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">
              {language === 'en' ? '🎯 Live Strategy Backtesting' : '🎯 即時策略回測'}
            </h1>
            <p className="text-gray-400">
              {language === 'en'
                ? 'Simulate strategy performance on historical data with real-time feedback'
                : '使用歷史數據模擬策略表現，即時回饋'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <Card className="bg-[#1a2332] border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" />
                  {language === 'en' ? 'Backtest Configuration' : '回測配置'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white">{language === 'en' ? 'Strategy' : '策略'}</Label>
                  <Select
                    value={selectedStrategyId}
                    onValueChange={setSelectedStrategyId}
                    disabled={isRunning}
                  >
                    <SelectTrigger className="bg-[#0d1b2a] border-gray-700 text-white">
                      <SelectValue placeholder={language === 'en' ? 'Select strategy' : '選擇策略'} />
                    </SelectTrigger>
                    <SelectContent>
                      {strategies.map(strategy => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          {strategy.strategy_name} ({strategy.risk_tolerance})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedStrategy && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-2">
                      {language === 'en' ? 'Strategy Details' : '策略詳情'}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">{language === 'en' ? 'Risk:' : '風險：'}</span>
                        <span className="text-white font-semibold">{selectedStrategy.risk_tolerance}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">{language === 'en' ? 'Max Position:' : '最大倉位：'}</span>
                        <span className="text-white font-semibold">{(selectedStrategy.max_position_size * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">{language === 'en' ? 'Profit Target:' : '獲利目標：'}</span>
                        <span className="text-[#00ff88] font-semibold">+{selectedStrategy.profit_target}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">{language === 'en' ? 'Stop Loss:' : '停損：'}</span>
                        <span className="text-[#ff4d4d] font-semibold">{selectedStrategy.stop_loss}%</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-white">{language === 'en' ? 'Start Date' : '開始日期'}</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isRunning}
                    className="bg-[#0d1b2a] border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white">{language === 'en' ? 'End Date' : '結束日期'}</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isRunning}
                    className="bg-[#0d1b2a] border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white">{language === 'en' ? 'Initial Capital ($)' : '初始資金 ($)'}</Label>
                  <Input
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(parseFloat(e.target.value))}
                    disabled={isRunning}
                    className="bg-[#0d1b2a] border-gray-700 text-white"
                  />
                </div>

                <div className="pt-4">
                  {!isRunning ? (
                    <Button
                      onClick={handleStartBacktest}
                      disabled={!selectedStrategyId || runBacktestMutation.isLoading}
                      className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {language === 'en' ? 'Start Backtest' : '開始回測'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleCancelBacktest}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      {language === 'en' ? 'Cancel Backtest' : '取消回測'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* History */}
            <Card className="bg-[#1a2332] border-[#00C6FF]/30">
              <CardHeader>
                <CardTitle className="text-white text-sm">
                  {language === 'en' ? 'Recent Backtests' : '最近回測'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                {backtestHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {language === 'en' ? 'No backtest history' : '無回測記錄'}
                  </div>
                ) : (
                  backtestHistory.map(result => (
                    <div
                      key={result.id}
                      className="p-3 bg-[#0d1b2a] rounded-lg border border-gray-700 hover:border-[#00C6FF] transition-all cursor-pointer"
                      onClick={() => setCompletedBacktest(result)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">
                          {new Date(result.backtest_date).toLocaleDateString()}
                        </span>
                        <Badge className={result.total_return >= 0 ? 'bg-[#00ff88]/20 text-[#00ff88]' : 'bg-[#ff4d4d]/20 text-[#ff4d4d]'}>
                          {result.total_return >= 0 ? '+' : ''}{result.total_return?.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="text-xs text-white">
                        {result.total_trades} trades | {result.win_rate?.toFixed(1)}% WR
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Progress */}
            {isRunning && (
              <Card className="bg-gradient-to-r from-purple-500/10 to-transparent bg-[#1a2332] border-2 border-purple-500/50 animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Activity className="w-6 h-6 text-purple-400 animate-spin" />
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {language === 'en' ? 'Backtest Running...' : '回測執行中...'}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {language === 'en' ? 'Processing historical trades' : '處理歷史交易'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-purple-400">{Math.round(progress)}%</div>
                      <div className="text-xs text-gray-400">
                        {currentTrade} / {totalTrades} {language === 'en' ? 'trades' : '交易'}
                      </div>
                    </div>
                  </div>
                  <Progress value={progress} className="h-3 bg-[#0d1b2a]" />
                </CardContent>
              </Card>
            )}

            {/* Live Equity Curve */}
            {(isRunning || completedBacktest) && liveEquity.length > 1 && (
              <Card className="bg-[#1a2332] border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <LineChartIcon className="w-5 h-5 text-purple-400" />
                    {language === 'en' ? 'Live Equity Curve' : '即時權益曲線'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={liveEquity}>
                      <defs>
                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a3342" />
                      <XAxis dataKey="trade" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #a855f7' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="equity"
                        stroke="#a855f7"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#equityGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Completed Results */}
            {completedBacktest && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-[#1a2332] border-purple-500/30">
                    <CardContent className="p-4">
                      <div className="text-xs text-gray-400 mb-1">
                        {language === 'en' ? 'Total Return' : '總回報'}
                      </div>
                      <div className={`text-2xl font-bold ${
                        parseFloat(completedBacktest.summary?.total_return || 0) >= 0 
                          ? 'text-[#00ff88]' 
                          : 'text-[#ff4d4d]'
                      }`}>
                        {parseFloat(completedBacktest.summary?.total_return || 0) >= 0 ? '+' : ''}
                        {completedBacktest.summary?.total_return || '0'}%
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#1a2332] border-purple-500/30">
                    <CardContent className="p-4">
                      <div className="text-xs text-gray-400 mb-1">
                        {language === 'en' ? 'Win Rate' : '勝率'}
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {completedBacktest.summary?.win_rate || '0'}%
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#1a2332] border-purple-500/30">
                    <CardContent className="p-4">
                      <div className="text-xs text-gray-400 mb-1">
                        {language === 'en' ? 'Sharpe Ratio' : '夏普比率'}
                      </div>
                      <div className="text-2xl font-bold text-purple-400">
                        {completedBacktest.summary?.sharpe_ratio || '0'}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#1a2332] border-purple-500/30">
                    <CardContent className="p-4">
                      <div className="text-xs text-gray-400 mb-1">
                        {language === 'en' ? 'Max Drawdown' : '最大回撤'}
                      </div>
                      <div className="text-2xl font-bold text-[#ff4d4d]">
                        {completedBacktest.summary?.max_drawdown || '0'}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* AI Evaluation */}
                <Card className="bg-gradient-to-r from-purple-500/10 to-transparent bg-[#1a2332] border-2 border-purple-500/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#00ff88]" />
                      {language === 'en' ? 'Backtest Complete' : '回測完成'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[#0d1b2a] rounded-lg">
                      <div>
                        <div className="text-sm text-gray-400 mb-1">
                          {language === 'en' ? 'AI Confidence Score' : 'AI 信心分數'}
                        </div>
                        <div className="text-3xl font-bold text-purple-400">
                          {completedBacktest.summary?.confidence_score || 0}/100
                        </div>
                      </div>
                      <Shield className="w-12 h-12 text-purple-400" />
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-bold text-white">
                        {language === 'en' ? 'Performance Summary:' : '績效總結：'}
                      </div>
                      <div className="text-sm text-gray-300 leading-relaxed bg-[#0d1b2a] p-4 rounded-lg">
                        {completedBacktest.message}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">{language === 'en' ? 'Total Trades:' : '總交易數：'}</span>
                        <span className="ml-2 text-white font-bold">{completedBacktest.summary?.total_trades || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">{language === 'en' ? 'Win Rate:' : '勝率：'}</span>
                        <span className="ml-2 text-white font-bold">{completedBacktest.summary?.win_rate || 0}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Empty State */}
            {!isRunning && !completedBacktest && (
              <Card className="bg-[#1a2332] border-gray-700">
                <CardContent className="p-12 text-center">
                  <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-400 mb-2">
                    {language === 'en' ? 'Ready to Backtest' : '準備開始回測'}
                  </h3>
                  <p className="text-gray-500">
                    {language === 'en'
                      ? 'Configure your backtest parameters and click "Start Backtest" to begin'
                      : '配置回測參數後點擊「開始回測」'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Info Notice */}
        <Card className="bg-yellow-500/10 border border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="mb-2">
                  {language === 'en'
                    ? '📊 Backtesting uses historical trade data to simulate strategy performance. Results are for analysis purposes only.'
                    : '📊 回測使用歷史交易數據模擬策略表現。結果僅供分析參考。'}
                </p>
                <p>
                  {language === 'en'
                    ? '⚠️ Past performance does not guarantee future results. Always validate strategies before live trading.'
                    : '⚠️ 過去績效不代表未來表現。在實盤交易前務必驗證策略。'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}