
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Square,
  RotateCcw,
  Download,
  Scan,
  Bot,
  User,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  Zap,
  BarChart3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAutonomousTrader } from '@/hooks/useAutonomousTrader';
import { useI18n } from '@/hooks/useI18n';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AITrader() {
  const { t, language } = useI18n();

  const {
    isActive,
    mode,
    capital,
    availableCash,
    currentCapital,
    positions,
    trades,
    selectedStocks,
    scanResults,
    marketMode,
    stats,
    setMode,
    setSelectedStocks,
    scanMarket,
    start,
    stop,
    reset,
    exportToCSV,
    getSessionHistory
  } = useAutonomousTrader();

  const [showSessionHistory, setShowSessionHistory] = React.useState(false);
  const sessionHistory = React.useMemo(() => getSessionHistory(), [getSessionHistory]);

  // Build equity curve
  const equityCurve = React.useMemo(() => {
    if (trades.length === 0) {
      return [{ index: 0, equity: capital }];
    }

    let runningCapital = capital;
    const curve = [{ index: 0, equity: capital }];

    trades
      .slice()
      .reverse()
      .forEach((trade, index) => {
        runningCapital += trade.pnl;
        curve.push({
          index: index + 1,
          equity: runningCapital
        });
      });

    return curve;
  }, [trades, capital]);

  const progressToTarget = Math.min((stats.currentProfit / stats.dailyTarget) * 100, 100);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              {language === 'en' ? '🤖 AI Autonomous Trader' : '🤖 AI 自主交易'}
            </h1>
            <p className="text-gray-400">
              {language === 'en'
                ? 'v3.0 - Autonomous stock selection and simulation trading'
                : 'v3.0 - 自主選股與模擬交易系統'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={scanMarket}
              disabled={isActive}
              variant="outline"
              className="border-blue-500 text-blue-400"
            >
              <Scan className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Scan Market' : '掃描市場'}
            </Button>

            <Button
              onClick={isActive ? stop : start}
              className={isActive
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'}
            >
              {isActive ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  {language === 'en' ? 'Stop' : '停止'}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  {language === 'en' ? 'Start AI' : '啟動 AI'}
                </>
              )}
            </Button>

            <Button
              onClick={reset}
              variant="outline"
              className="border-gray-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Reset' : '重置'}
            </Button>
          </div>
        </div>

        {/* Mode Selector */}
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <Label className="text-white font-semibold">
                  {language === 'en' ? 'Trading Mode:' : '交易模式：'}
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setMode('user')}
                    variant={mode === 'user' ? 'default' : 'outline'}
                    className={mode === 'user' ? 'bg-[#00C6FF] text-black' : 'border-gray-700'}
                    disabled={isActive}
                  >
                    <User className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'User Mode' : '用戶模式'}
                  </Button>
                  <Button
                    onClick={() => setMode('auto')}
                    variant={mode === 'auto' ? 'default' : 'outline'}
                    className={mode === 'auto' ? 'bg-[#00ff88] text-black' : 'border-gray-700'}
                    disabled={isActive}
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'Full Auto' : '全自動'}
                  </Button>
                </div>
              </div>

              {isActive && (
                <Badge className="bg-green-500 text-white animate-pulse">
                  <Activity className="w-4 h-4 mr-1" />
                  {language === 'en' ? 'AI TRADING ACTIVE' : 'AI 交易運行中'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Target Progress */}
        <Card className="bg-gradient-to-r from-[#00C6FF]/10 to-transparent bg-[#1a2332] border-2 border-[#00C6FF]/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-[#00C6FF]" />
              {language === 'en' ? 'Daily Profit Target' : '每日獲利目標'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">
                  {language === 'en' ? 'Target:' : '目標：'} ${stats.dailyTarget}
                </span>
                <span className={`text-2xl font-bold ${
                  stats.currentProfit >= stats.dailyTarget ? 'text-[#00ff88]' : 'text-white'
                }`}>
                  ${stats.currentProfit.toFixed(2)}
                </span>
              </div>

              <Progress
                value={progressToTarget}
                className="h-4 bg-[#0d1b2a]"
                indicatorClassName={progressToTarget >= 100 ? 'bg-[#00ff88]' : 'bg-[#00C6FF]'}
              />

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {progressToTarget.toFixed(1)}% {language === 'en' ? 'complete' : '完成'}
                </span>
                {progressToTarget >= 100 && (
                  <Badge className="bg-[#00ff88] text-black">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {language === 'en' ? 'TARGET REACHED' : '目標達成'}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session History */}
        {sessionHistory.length > 0 && (
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>{language === 'en' ? 'Recent Sessions' : '最近會話'}</span>
                <Button
                  onClick={() => setShowSessionHistory(!showSessionHistory)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400"
                >
                  {showSessionHistory ? '▼' : '▶'}
                </Button>
              </CardTitle>
            </CardHeader>
            {showSessionHistory && (
              <CardContent>
                <div className="space-y-2">
                  {sessionHistory.map((session, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-[#0d1b2a] rounded-lg"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {session.date} • {session.mode === 'auto' ? 'Full Auto' : 'User Mode'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {session.trades} trades • Win Rate: {session.winRate.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          session.totalPnL >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                        }`}>
                          {session.totalPnL >= 0 ? '+' : ''}${session.totalPnL.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ${session.startingCapital} → ${session.endingCapital.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Market Mode */}
        {marketMode && (
          <Card className={`border-2 ${
            marketMode.marketMode === 'BULL' ? 'bg-[#00ff88]/10 border-[#00ff88]/50' :
            marketMode.marketMode === 'BEAR' ? 'bg-[#ff4d4d]/10 border-[#ff4d4d]/50' :
            'bg-[#ffaa00]/10 border-[#ffaa00]/50'
          }`}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-6 h-6" />
                {language === 'en' ? 'Market Mode Analysis' : '市場模式分析'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">
                    {language === 'en' ? 'Mode' : '模式'}
                  </div>
                  <Badge className={`text-lg ${
                    marketMode.marketMode === 'BULL' ? 'bg-[#00ff88] text-black' :
                    marketMode.marketMode === 'BEAR' ? 'bg-[#ff4d4d] text-white' :
                    'bg-[#ffaa00] text-black'
                  }`}>
                    {marketMode.marketMode}
                  </Badge>
                </div>

                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">
                    {language === 'en' ? 'Confidence' : '信心度'}
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {marketMode.confidence}%
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">
                    {language === 'en' ? 'Volatility' : '波動性'}
                  </div>
                  <Badge className={
                    marketMode.volatilityLevel === 'HIGH' ? 'bg-red-500' :
                    marketMode.volatilityLevel === 'MODERATE' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }>
                    {marketMode.volatilityLevel}
                  </Badge>
                </div>

                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">
                    {language === 'en' ? 'Sector Leader' : '領漲板塊'}
                  </div>
                  <div className="text-lg font-semibold text-white">
                    {marketMode.sectorLeader}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-[#0d1b2a] rounded-lg">
                <div className="text-sm text-gray-300">
                  <div className="font-semibold mb-2">
                    {language === 'en' ? 'AI Recommendations:' : 'AI 建議：'}
                  </div>
                  <ul className="space-y-1">
                    {(language === 'en' ? marketMode.recommendations.en : marketMode.recommendations.zh).map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#00C6FF]">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Scan Results */}
        {scanResults && (
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scan className="w-6 h-6 text-[#00C6FF]" />
                  {language === 'en' ? 'AI Scan Results' : 'AI 掃描結果'}
                </div>
                <Badge className="bg-[#00C6FF] text-black">
                  {scanResults.found} {language === 'en' ? 'opportunities found' : '個機會'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-[#0d1b2a] rounded-lg">
                <div className="text-sm text-gray-300">
                  <div className="font-semibold mb-2">
                    {language === 'en' ? '💬 AI Commentary:' : '💬 AI 評論：'}
                  </div>
                  <p>{language === 'en' ? scanResults.commentary.en : scanResults.commentary.zh}</p>
                </div>
              </div>

              {/* Heatmap Visualization */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  {language === 'en' ? '🔥 Opportunity Heatmap' : '🔥 機會熱力圖'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {scanResults.top10.map((opp, index) => {
                    const intensity = (opp.score / 10) * 100; // Normalize to 0-100
                    const bgColor = opp.recommendation === 'LONG'
                      ? `rgba(0, 255, 136, ${intensity / 100})`
                      : opp.recommendation === 'SHORT'
                      ? `rgba(255, 77, 77, ${intensity / 100})`
                      : `rgba(255, 170, 0, ${intensity / 100})`;

                    return (
                      <div
                        key={opp.symbol}
                        className="relative p-4 rounded-lg border-2 transition-all cursor-pointer"
                        style={{
                          backgroundColor: bgColor,
                          borderColor: selectedStocks.includes(opp.symbol) ? '#00C6FF' : 'transparent'
                        }}
                        onClick={() => {
                          if (mode === 'user' && !isActive) {
                            setSelectedStocks(prev =>
                              prev.includes(opp.symbol)
                                ? prev.filter(s => s !== opp.symbol)
                                : [...prev, opp.symbol]
                            );
                          }
                        }}
                      >
                        <div className="text-xs font-bold text-white mb-1">#{index + 1}</div>
                        <div className="text-lg font-bold text-white mb-1">{opp.symbol}</div>
                        <div className="text-sm text-white/90">${opp.price.toFixed(2)}</div>
                        <div className={`text-xs font-bold ${
                          opp.changePct >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                        }`}>
                          {opp.changePct >= 0 ? '+' : ''}{opp.changePct.toFixed(2)}%
                        </div>
                        <div className="mt-2 text-center">
                          <Badge className="text-xs bg-white/20 text-white">
                            {opp.confidence.toFixed(0)}%
                          </Badge>
                        </div>
                        {selectedStocks.includes(opp.symbol) && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="w-5 h-5 text-[#00C6FF]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed List */}
              <div className="space-y-3">
                {scanResults.top10.map((opp, index) => (
                  <div
                    key={opp.symbol}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedStocks.includes(opp.symbol)
                        ? 'bg-[#00C6FF]/20 border-[#00C6FF]'
                        : 'bg-[#0d1b2a] border-gray-700 hover:border-[#00C6FF]/50'
                    }`}
                    onClick={() => {
                      if (mode === 'user' && !isActive) {
                        setSelectedStocks(prev =>
                          prev.includes(opp.symbol)
                            ? prev.filter(s => s !== opp.symbol)
                            : [...prev, opp.symbol]
                        );
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-[#00C6FF]">#{index + 1}</span>
                        <div>
                          <div className="text-lg font-bold text-white">{opp.symbol}</div>
                          <div className="text-sm text-gray-400">
                            ${opp.price.toFixed(2)} • {opp.changePct >= 0 ? '+' : ''}{opp.changePct.toFixed(2)}%
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-400">Score</div>
                          <div className="text-xl font-bold text-white">
                            {opp.score.toFixed(1)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-gray-400">Confidence</div>
                          <div className="text-xl font-bold text-[#00ff88]">
                            {opp.confidence.toFixed(0)}%
                          </div>
                        </div>

                        <Badge className={
                          opp.recommendation === 'LONG' ? 'bg-[#00ff88] text-black' :
                          opp.recommendation === 'SHORT' ? 'bg-[#ff4d4d] text-white' :
                          'bg-gray-600 text-white'
                        }>
                          {opp.recommendation}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {opp.reasons.map((reason, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-[#00C6FF]" />
                <span className="text-3xl font-bold text-white">
                  ${currentCapital.toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {language === 'en' ? 'Current Capital' : '當前資金'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-8 h-8 text-[#00ff88]" />
                <span className="text-3xl font-bold text-white">
                  {stats.totalTrades}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {language === 'en' ? 'Total Trades' : '總交易數'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-8 h-8 text-[#ffaa00]" />
                <span className="text-3xl font-bold text-white">
                  {stats.winRate.toFixed(1)}%
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {language === 'en' ? 'Win Rate' : '勝率'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-[#00ff88]" />
                <span className={`text-3xl font-bold ${
                  stats.totalPnL >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                }`}>
                  {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {language === 'en' ? 'Total P&L' : '總損益'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Equity Curve */}
        <Card className="bg-[#1a2332] border-[#00C6FF]/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#00C6FF]" />
              {language === 'en' ? 'Equity Curve' : '權益曲線'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {equityCurve.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={equityCurve}>
                  <XAxis
                    dataKey="index"
                    stroke="#666"
                    tick={{ fill: '#999', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#666"
                    tick={{ fill: '#999', fontSize: 12 }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a2332',
                      border: '1px solid #00C6FF',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#00C6FF' }}
                    formatter={(value) => [`$${value.toFixed(2)}`, 'Equity']}
                  />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    stroke="#00C6FF"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#00ff88' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-500">
                <p>{language === 'en' ? 'No trades yet' : '尚無交易記錄'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Positions */}
        {positions.length > 0 && (
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white">
                {language === 'en' ? 'Open Positions' : '持倉'} ({positions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {positions.map(position => (
                  <div key={position.id} className="bg-[#0d1b2a] p-4 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold text-white">{position.symbol}</div>
                        <div className="text-sm text-gray-400">
                          {position.shares} @ ${position.entryPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">
                          {Math.floor((new Date() - position.entryTime) / 1000)}s
                        </div>
                        <div className="text-xs text-gray-500">
                          {language === 'en' ? 'holding' : '持倉中'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trade History */}
        {trades.length > 0 && (
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>{language === 'en' ? 'Trade History' : '交易歷史'}</span>
                <Button
                  onClick={exportToCSV}
                  size="sm"
                  className="bg-[#00C6FF] hover:bg-[#0078FF] text-black"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {language === 'en' ? 'Export CSV' : '匯出 CSV'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trades.slice(0, 20).map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between p-3 bg-[#0d1b2a] rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={trade.isWin ? 'bg-[#00ff88] text-black' : 'bg-[#ff4d4d] text-white'}>
                        {trade.isWin ? 'WIN' : 'LOSS'}
                      </Badge>
                      <div>
                        <div className="font-semibold text-white">{trade.symbol}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(trade.exitTime).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        trade.pnl >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                      }`}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                      </div>
                      <div className={`text-sm ${
                        trade.pnlPct >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                      }`}>
                        {trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {trades.length > 20 && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Showing 20 of {trades.length} trades
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
