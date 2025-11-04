
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Radar,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  Target,
  Zap,
  Play,
  Pause,
  RefreshCw,
  Globe,
  Newspaper,
  Users,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

export default function BigMoneyRadar() {
  const { language } = useLanguage();
  const [testSymbol, setTestSymbol] = useState('AAPL');
  const [activeFilter, setActiveFilter] = useState('all');
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);
  const [includeIntelligence, setIncludeIntelligence] = useState(true);
  const [scanSymbols, setScanSymbols] = useState('AAPL,TSLA,NVDA,MSFT,GOOGL,AMD,META,AMZN');
  const [isScanningNow, setIsScanningNow] = useState(false); // Used for Quick Scan now
  const [isDeepScanning, setIsDeepScanning] = useState(false); // New state for deep scan
  const queryClient = useQueryClient();

  // 查詢所有訊號
  const { data: signals = [], isLoading } = useQuery({
    queryKey: ['bigMoneySignals'],
    queryFn: async () => {
      const signals = await base44.entities.BigMoneySignal.list('-timestamp_detected', 100);
      return signals;
    },
    refetchInterval: 10000
  });

  // 深度更新 mutation（含多媒體資訊）
  const deepUpdateMutation = useMutation({
    mutationFn: async (symbols) => {
      const response = await base44.functions.invoke('detectBigMoney', {
        auto_scan: true,
        symbols: symbols,
        include_intelligence: true
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.data.success) {
        const detected = data.data.signals_detected || 0;
        toast.success(
          language === 'en'
            ? `🎯 Deep scan complete! Analyzed ${data.data.scanned} stocks with multi-source intelligence, detected ${detected} signals`
            : `🎯 深度掃描完成！已分析 ${data.data.scanned} 檔股票（含多媒體資訊），偵測到 ${detected} 個訊號`
        );
        queryClient.invalidateQueries(['bigMoneySignals']);
      }
    },
    onError: (error) => {
      toast.error(
        language === 'en' ? `❌ Deep scan failed: ${error.message}` : `❌ 深度掃描失敗：${error.message}`
      );
    }
  });

  // 快速更新 mutation（僅技術分析）
  const quickUpdateMutation = useMutation({
    mutationFn: async (symbols) => {
      const response = await base44.functions.invoke('detectBigMoney', {
        auto_scan: true,
        symbols: symbols,
        include_intelligence: false
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.data.success) {
        const detected = data.data.signals_detected || 0;
        toast.success(
          language === 'en'
            ? `⚡ Quick scan complete! Scanned ${data.data.scanned} stocks, detected ${detected} signals`
            : `⚡ 快速掃描完成！已掃描 ${data.data.scanned} 檔股票，偵測到 ${detected} 個訊號`
        );
        queryClient.invalidateQueries(['bigMoneySignals']);
      }
    },
    onError: (error) => {
      toast.error(
        language === 'en' ? `❌ Quick scan failed: ${error.message}` : `❌ 快速掃描失敗：${error.message}`
      );
    }
  });

  // 單一股票掃描 mutation
  const singleScanMutation = useMutation({
    mutationFn: async ({ symbol, withIntelligence }) => {
      const response = await base44.functions.invoke('detectBigMoney', {
        symbol: symbol,
        include_intelligence: withIntelligence
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.data.success) {
        if (data.data.signal_type === 'NONE') {
          toast.info(
            language === 'en'
              ? `⚪ ${data.data.message || 'No signal detected'}`
              : `⚪ ${data.data.message || '目前無明確主力動作'}`
          );
        } else {
          toast.success(
            language === 'en'
              ? `✅ Signal detected: ${data.data.signal.signal_type}`
              : `✅ 偵測到訊號：${data.data.signal.signal_type}`
          );
        }
        queryClient.invalidateQueries(['bigMoneySignals']);
      }
    },
    onError: (error) => {
      toast.error(
        language === 'en' ? `❌ Detection failed: ${error.message}` : `❌ 偵測失敗：${error.message}`
      );
    }
  });

  // 自動掃描循環
  useEffect(() => {
    if (autoScanEnabled) {
      const symbols = scanSymbols.split(',').map(s => s.trim()).filter(Boolean);
      if (symbols.length === 0) return;

      const performScan = () => {
        if (includeIntelligence) {
          deepUpdateMutation.mutate(symbols);
        } else {
          quickUpdateMutation.mutate(symbols);
        }
      };

      // 立即執行一次
      performScan();

      // 每 5 分鐘自動掃描
      const interval = setInterval(() => {
        performScan();
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [autoScanEnabled, scanSymbols, includeIntelligence, deepUpdateMutation, quickUpdateMutation]);

  const handleDeepUpdate = async () => {
    const symbols = scanSymbols.split(',').map(s => s.trim()).filter(Boolean);
    if (symbols.length === 0) {
      toast.error(language === 'en' ? 'Please enter at least one symbol' : '請輸入至少一個股票代號');
      return;
    }

    setIsDeepScanning(true);
    await deepUpdateMutation.mutateAsync(symbols);
    setIsDeepScanning(false);
  };

  const handleQuickUpdate = async () => {
    const symbols = scanSymbols.split(',').map(s => s.trim()).filter(Boolean);
    if (symbols.length === 0) {
      toast.error(language === 'en' ? 'Please enter at least one symbol' : '請輸入至少一個股票代號');
      return;
    }

    setIsScanningNow(true);
    await quickUpdateMutation.mutateAsync(symbols);
    setIsScanningNow(false);
  };

  const handleSingleScan = async (withIntelligence) => {
    if (!testSymbol) {
      toast.error(language === 'en' ? 'Please enter a symbol' : '請輸入股票代號');
      return;
    }

    await singleScanMutation.mutateAsync({
      symbol: testSymbol.trim().toUpperCase(),
      withIntelligence
    });
  };

  const filteredSignals = signals.filter(signal => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'in') return signal.signal_type === 'IN';
    if (activeFilter === 'out') return signal.signal_type === 'OUT';
    if (activeFilter === 'none') return signal.signal_type === 'NONE';
    return true;
  });

  // 按時間分組
  const today = new Date().toDateString();
  const todaySignals = filteredSignals.filter(s =>
    new Date(s.timestamp_detected).toDateString() === today
  );
  const olderSignals = filteredSignals.filter(s =>
    new Date(s.timestamp_detected).toDateString() !== today
  );

  const getSignalIcon = (type) => {
    switch (type) {
      case 'IN': return <TrendingUp className="w-6 h-6 text-[#00ff99]" />;
      case 'OUT': return <TrendingDown className="w-6 h-6 text-[#ff4d4d]" />;
      default: return <Activity className="w-6 h-6 text-gray-500" />;
    }
  };

  const getSignalColor = (type) => {
    switch (type) {
      case 'IN': return 'from-[#00ff99]/20 to-transparent border-[#00ff99]/50';
      case 'OUT': return 'from-[#ff4d4d]/20 to-transparent border-[#ff4d4d]/50';
      default: return 'from-gray-700/20 to-transparent border-gray-700';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#00ff99] to-[#00cc7a] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00ff99]/20">
              <Radar className="w-8 h-8 text-black animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-1">
                {language === 'en' ? '🎯 Big Money Radar' : '🎯 主力資金雷達'}
              </h1>
              <p className="text-gray-400">
                {language === 'en'
                  ? 'AI-powered real-time institutional money flow detection'
                  : 'AI 驅動的即時主力資金流向偵測'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#151a21] border border-gray-800 rounded-xl">
              <span className="text-sm text-gray-400">
                {language === 'en' ? 'Auto Scan' : '自動掃描'}
              </span>
              <Switch
                checked={autoScanEnabled}
                onCheckedChange={setAutoScanEnabled}
              />
            </div>
            {autoScanEnabled && (
              <div className="flex items-center gap-2 px-3 py-1 bg-[#00ff94]/10 border border-[#00ff99]/30 rounded-lg">
                <div className="w-2 h-2 bg-[#00ff99] rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-[#00ff99]">
                  {language === 'en' ? 'Scanning every 5min' : '每5分鐘掃描'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Multi-Source Intelligence Banner */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-transparent bg-[#151a21] border-2 border-purple-500/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Sparkles className="w-8 h-8 text-purple-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  {language === 'en' ? '🌐 Multi-Source Intelligence Analysis' : '🌐 多源資訊智能分析'}
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    {language === 'en' ? 'AI POWERED' : 'AI 驅動'}
                  </Badge>
                </h3>
                <p className="text-gray-300 mb-3">
                  {language === 'en'
                    ? 'Our AI analyzes data from multiple sources to detect institutional money flow:'
                    : '我們的 AI 從多個來源分析數據以偵測主力資金流向：'}
                </p>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 bg-[#0b0f14] rounded-lg p-3">
                    <Newspaper className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {language === 'en' ? 'Latest News' : '最新新聞'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {language === 'en' ? 'CNBC, Bloomberg, Reuters' : 'CNBC, Bloomberg, Reuters'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-[#0b0f14] rounded-lg p-3">
                    <Users className="w-5 h-5 text-green-400" />
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {language === 'en' ? 'Social Sentiment' : '社群情緒'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {language === 'en' ? 'Twitter, Reddit, Forums' : 'Twitter, Reddit, 論壇'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-[#0b0f14] rounded-lg p-3">
                    <Globe className="w-5 h-5 text-purple-400" />
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {language === 'en' ? 'Institutional Activity' : '機構動態'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {language === 'en' ? 'Insider trading, Analysts' : '內部交易、分析師'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Switch
                    checked={includeIntelligence}
                    onCheckedChange={setIncludeIntelligence}
                  />
                  <span className="text-sm text-gray-400">
                    {language === 'en'
                      ? 'Enable multi-source analysis (takes longer but more accurate)'
                      : '啟用多源分析（耗時較長但更準確）'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto Scan Panel with Update Buttons */}
        <Card className="bg-gradient-to-br from-[#00ff99]/10 to-transparent bg-[#151a21] border-2 border-[#00ff99]/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#00ff99]" />
              {language === 'en' ? '🤖 AI Auto Scanner' : '🤖 AI 自動掃描器'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                value={scanSymbols}
                onChange={(e) => setScanSymbols(e.target.value)}
                placeholder="AAPL,TSLA,NVDA,MSFT,GOOGL,AMD,META,AMZN"
                className="flex-1 bg-[#0b0f14] border-gray-700 text-white"
                disabled={autoScanEnabled}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <Button
                onClick={handleDeepUpdate}
                disabled={isDeepScanning || autoScanEnabled}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold"
              >
                {isDeepScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'en' ? 'Deep Scanning...' : '深度掃描中...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {language === 'en' ? '🌐 Deep Update (News + Social)' : '🌐 深度更新（新聞+社群）'}
                  </>
                )}
              </Button>

              <Button
                onClick={handleQuickUpdate}
                disabled={isScanningNow || autoScanEnabled}
                className="bg-[#00ff99] hover:bg-[#00cc7a] text-black font-semibold"
              >
                {isScanningNow ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'en' ? 'Scanning...' : '掃描中...'}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    {language === 'en' ? '⚡ Quick Update (Technical Only)' : '⚡ 快速更新（僅技術面）'}
                  </>
                )}
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-[#0b0f14] rounded-xl p-4 border border-gray-800">
                <div className="text-sm text-gray-400 mb-2">
                  {language === 'en' ? '📊 Total Signals Today' : '📊 今日總訊號'}
                </div>
                <div className="text-3xl font-bold text-white">
                  {todaySignals.length}
                </div>
              </div>
              <div className="bg-[#0b0f14] rounded-xl p-4 border border-[#00ff99]/30">
                <div className="text-sm text-gray-400 mb-2">
                  {language === 'en' ? '🟢 IN Signals' : '🟢 進場訊號'}
                </div>
                <div className="text-3xl font-bold text-[#00ff99]">
                  {todaySignals.filter(s => s.signal_type === 'IN').length}
                </div>
              </div>
              <div className="bg-[#0b0f14] rounded-xl p-4 border border-[#ff4d4d]/30">
                <div className="text-sm text-gray-400 mb-2">
                  {language === 'en' ? '🔴 OUT Signals' : '🔴 出場訊號'}
                </div>
                <div className="text-3xl font-bold text-[#ff4d4d]">
                  {todaySignals.filter(s => s.signal_type === 'OUT').length}
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 bg-[#0b0f14] rounded-lg p-3">
              <p className="mb-1">
                {language === 'en'
                  ? '🔍 This scanner analyzes real-time market data + multi-source intelligence'
                  : '🔍 此掃描器分析即時市場數據 + 多源智能資訊'}
              </p>
              <p>
                {language === 'en'
                  ? '⚡ Quick: Technical analysis only (30s) | 🌐 Deep: Technical + News + Social (2-3 min)'
                  : '⚡ 快速：僅技術分析（30秒）| 🌐 深度：技術+新聞+社群（2-3分鐘）'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Single Stock Test Panel */}
        <Card className="bg-[#151a21] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-[#00ff99]" />
              {language === 'en' ? 'Single Stock Scanner' : '單一股票掃描'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                value={testSymbol}
                onChange={(e) => setTestSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="bg-[#0b0f14] border-gray-700 text-white max-w-xs"
              />
              <Button
                onClick={() => handleSingleScan(false)}
                disabled={singleScanMutation.isLoading}
                variant="outline"
                className="border-gray-700 text-gray-300"
              >
                {singleScanMutation.isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'en' ? 'Scanning...' : '掃描中...'}
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'Quick Scan' : '快速掃描'}
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleSingleScan(true)}
                disabled={singleScanMutation.isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {singleScanMutation.isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'en' ? 'Scanning...' : '掃描中...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'Deep Scan' : '深度掃描'}
                  </>
                )}
              </Button>
            </div>

            <div className="text-xs text-gray-500">
              {language === 'en'
                ? 'Enter a stock symbol to analyze its current money flow pattern'
                : '輸入股票代號以分析其當前資金流向模式'}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Tabs value={activeFilter} onValueChange={setActiveFilter}>
          <TabsList className="bg-[#151a21] border border-gray-800">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black">
              {language === 'en' ? 'All Signals' : '全部訊號'} ({filteredSignals.length})
            </TabsTrigger>
            <TabsTrigger value="in" className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black">
              🟢 {language === 'en' ? 'IN Signals' : '進場訊號'} ({signals.filter(s => s.signal_type === 'IN').length})
            </TabsTrigger>
            <TabsTrigger value="out" className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black">
              🔴 {language === 'en' ? 'OUT Signals' : '出場訊號'} ({signals.filter(s => s.signal_type === 'OUT').length})
            </TabsTrigger>
            <TabsTrigger value="none" className="data-[state=active]:bg-[#00ff99] data-[state=active]:text-black">
              ⚪ {language === 'en' ? 'No Signal' : '無訊號'} ({signals.filter(s => s.signal_type === 'NONE').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Today's Signals */}
        {todaySignals.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-6 h-6 text-[#00ff99]" />
              {language === 'en' ? "Today's Signals" : '今日訊號'}
            </h2>
            <div className="space-y-4">
              {todaySignals.map((signal, index) => (
                <Card key={index} className={`bg-gradient-to-r ${getSignalColor(signal.signal_type)} bg-[#151a21] border-2`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        {getSignalIcon(signal.signal_type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-2xl font-bold text-white">{signal.symbol}</h3>
                              {signal.algorithm_version?.includes('Full') && (
                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  {language === 'en' ? 'Deep Analysis' : '深度分析'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {new Date(signal.timestamp_detected).toLocaleString(language === 'en' ? 'en-US' : 'zh-TW')}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-400">
                              {language === 'en' ? 'Signal Type' : '訊號類型'}
                            </div>
                            <div className={`text-2xl font-bold ${
                              signal.signal_type === 'IN' ? 'text-[#00ff99]' :
                              signal.signal_type === 'OUT' ? 'text-[#ff4d4d]' :
                              'text-gray-500'
                            }`}>
                              {signal.signal_type}
                            </div>
                          </div>
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-[#0b0f14] rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1">
                              {language === 'en' ? 'Intensity/Panic' : '強度/恐慌'}
                            </div>
                            <div className="text-2xl font-bold text-white">
                              {signal.intensity_score || signal.panic_score || 'N/A'}/5
                            </div>
                          </div>

                          <div className="bg-[#0b0f14] rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1">
                              {language === 'en' ? 'Continuation Prob' : '延續機率'}
                            </div>
                            <div className="text-2xl font-bold text-white">
                              {signal.cont_prob}%
                            </div>
                          </div>

                          <div className="bg-[#0b0f14] rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1">
                              {language === 'en' ? 'Price' : '價格'}
                            </div>
                            <div className="text-2xl font-bold text-white">
                              ${signal.current_price?.toFixed(2) || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* Recommendation */}
                        <div className={`rounded-lg p-4 ${
                          signal.signal_type === 'IN' ? 'bg-[#00ff99]/10 border border-[#00ff99]/30' :
                          signal.signal_type === 'OUT' ? 'bg-[#ff4d4d]/10 border border-[#ff4d4d]/30' :
                          'bg-gray-800/30 border border-gray-700'
                        }`}>
                          <div className="text-sm font-semibold text-white mb-1">
                            {language === 'en' ? '💡 Action Recommendation' : '💡 行動建議'}
                          </div>
                          <p className="text-sm text-gray-300">
                            {language === 'en' ? signal.rec_action_en : signal.rec_action}
                          </p>
                        </div>

                        {/* Debug Notes */}
                        <details className="text-xs">
                          <summary className="text-gray-500 cursor-pointer hover:text-gray-300">
                            {language === 'en' ? 'Technical Details' : '技術細節'}
                          </summary>
                          <pre className="mt-2 p-3 bg-black/50 rounded text-gray-400 overflow-auto">
                            {signal.debug_notes}
                          </pre>
                        </details>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Older Signals */}
        {olderSignals.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-400 mb-4">
              {language === 'en' ? 'Previous Signals' : '先前訊號'}
            </h2>
            <div className="space-y-3">
              {olderSignals.slice(0, 10).map((signal, index) => (
                <Card key={index} className="bg-[#151a21] border-gray-800 opacity-70 hover:opacity-100 transition-opacity">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getSignalIcon(signal.signal_type)}
                        <div>
                          <div className="font-bold text-white">{signal.symbol}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(signal.timestamp_detected).toLocaleString(language === 'en' ? 'en-US' : 'zh-TW')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          signal.signal_type === 'IN' ? 'text-[#00ff99]' : 'text-[#ff4d4d]'
                        }`}>
                          {signal.signal_type}
                        </div>
                        <div className="text-xs text-gray-500">
                          {signal.cont_prob}% {language === 'en' ? 'conf' : '信心'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Activity className="w-12 h-12 text-[#00ff99] animate-spin" />
          </div>
        ) : filteredSignals.length === 0 ? (
          <Card className="bg-[#151a21] border-gray-800">
            <CardContent className="p-8 text-center">
              <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">
                {language === 'en' ? 'No signals detected yet' : '尚未偵測到訊號'}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {language === 'en'
                  ? 'Click "Deep Update" or "Quick Update" to start scanning'
                  : '點擊「深度更新」或「快速更新」開始掃描'}
              </p>
              <Button
                onClick={handleDeepUpdate}
                className="bg-gradient-to-r from-purple-600 to-purple-700 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Start Deep Scan' : '開始深度掃描'}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
