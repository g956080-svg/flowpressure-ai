import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "../Layout";
import { Play, CheckCircle, XCircle, Clock } from "lucide-react";

export default function TestTrading() {
  const { language } = useLanguage();
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testSymbols, setTestSymbols] = useState('AAPL,TSLA,NVDA');

  const addResult = (test, status, message, data = null) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      data,
      timestamp: new Date().toISOString()
    }]);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: Fetch Live Quotes
    try {
      addResult('fetchLiveQuotes', 'running', 'Testing quote fetching...');
      const symbols = testSymbols.split(',').map(s => s.trim());
      const quoteResponse = await base44.functions.invoke('fetchLiveQuotes', { symbols });
      
      if (quoteResponse.data && quoteResponse.data.results) {
        const successCount = quoteResponse.data.results.filter(r => r.success).length;
        addResult(
          'fetchLiveQuotes',
          'success',
          `✅ Successfully fetched ${successCount}/${symbols.length} quotes`,
          quoteResponse.data
        );
      } else {
        addResult('fetchLiveQuotes', 'error', '❌ Invalid response format', quoteResponse);
      }
    } catch (error) {
      addResult('fetchLiveQuotes', 'error', `❌ Error: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Check Account State
    try {
      addResult('accountState', 'running', 'Checking account state...');
      const accounts = await base44.entities.AccountState.list();
      
      if (accounts.length > 0) {
        addResult(
          'accountState',
          'success',
          `✅ Account found. Balance: $${accounts[0].cash_balance.toFixed(2)}`,
          accounts[0]
        );
      } else {
        addResult('accountState', 'warning', '⚠️ No account found. Will be created on first trade.');
      }
    } catch (error) {
      addResult('accountState', 'error', `❌ Error: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Simulate Buy (Small Amount)
    try {
      addResult('simulateBuy', 'running', 'Testing buy order...');
      const buyResponse = await base44.functions.invoke('simulateTrade', {
        action: 'BUY',
        symbol: 'AAPL',
        quantity: 1
      });
      
      if (buyResponse.data) {
        addResult(
          'simulateBuy',
          buyResponse.data.success ? 'success' : 'warning',
          buyResponse.data.message,
          buyResponse.data
        );
      }
    } catch (error) {
      addResult('simulateBuy', 'error', `❌ Error: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 4: Check Positions
    try {
      addResult('portfolioPositions', 'running', 'Checking portfolio positions...');
      const positions = await base44.entities.PortfolioPosition.list();
      
      addResult(
        'portfolioPositions',
        'success',
        `✅ Found ${positions.length} position(s)`,
        positions
      );
    } catch (error) {
      addResult('portfolioPositions', 'error', `❌ Error: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 5: Update Account Value
    try {
      addResult('updateAccountValue', 'running', 'Updating account value...');
      const updateResponse = await base44.functions.invoke('updateAccountValue', {});
      
      if (updateResponse.data && updateResponse.data.success) {
        addResult(
          'updateAccountValue',
          'success',
          `✅ Updated. Total: $${updateResponse.data.total_value.toFixed(2)}`,
          updateResponse.data
        );
      }
    } catch (error) {
      addResult('updateAccountValue', 'error', `❌ Error: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 6: Check Trade History
    try {
      addResult('tradeHistory', 'running', 'Checking trade history...');
      const history = await base44.entities.TradeHistory.list('-timestamp');
      
      addResult(
        'tradeHistory',
        'success',
        `✅ Found ${history.length} trade record(s)`,
        history.slice(0, 5)
      );
    } catch (error) {
      addResult('tradeHistory', 'error', `❌ Error: ${error.message}`);
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-[#00ff99]" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-[#ff4d4d]" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-[#ffaa00]" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'border-[#00ff99]/30 bg-[#00ff99]/5';
      case 'error':
        return 'border-[#ff4d4d]/30 bg-[#ff4d4d]/5';
      case 'warning':
        return 'border-[#ffaa00]/30 bg-[#ffaa00]/5';
      case 'running':
        return 'border-blue-400/30 bg-blue-400/5';
      default:
        return 'border-gray-800';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            🧪 {language === 'en' ? 'Trading System Test' : '交易系統測試'}
          </h1>
          <p className="text-gray-400">
            {language === 'en' 
              ? 'Test all backend functions and data flow'
              : '測試所有後端功能與數據流'}
          </p>
        </div>

        {/* Test Configuration */}
        <Card className="bg-[#151a21] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">
              {language === 'en' ? 'Test Configuration' : '測試配置'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                {language === 'en' ? 'Test Symbols (comma-separated)' : '測試股票代號（逗號分隔）'}
              </label>
              <Input
                value={testSymbols}
                onChange={(e) => setTestSymbols(e.target.value)}
                className="bg-[#0b0f14] border-gray-700 text-white"
                placeholder="AAPL,TSLA,NVDA"
              />
            </div>

            <Button
              onClick={runAllTests}
              disabled={isRunning}
              className="w-full bg-[#00ff99] text-black hover:bg-[#00cc7a] font-semibold"
            >
              <Play className="w-4 h-4 mr-2" />
              {isRunning 
                ? (language === 'en' ? 'Running Tests...' : '測試進行中...')
                : (language === 'en' ? 'Run All Tests' : '執行全部測試')}
            </Button>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card className="bg-[#151a21] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">
                {language === 'en' ? 'Test Results' : '測試結果'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-xl p-4 ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getStatusIcon(result.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-white">{result.test}</h3>
                        <span className="text-xs text-gray-500">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{result.message}</p>
                      
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                            {language === 'en' ? 'View details' : '查看詳情'}
                          </summary>
                          <pre className="mt-2 p-3 bg-black/50 rounded text-xs text-gray-400 overflow-auto max-h-60">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Test Summary */}
        {testResults.length > 0 && !isRunning && (
          <Card className="bg-[#151a21] border-gray-800">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-[#00ff99] mb-1">
                    {testResults.filter(r => r.status === 'success').length}
                  </div>
                  <div className="text-sm text-gray-400">
                    {language === 'en' ? 'Passed' : '通過'}
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#ffaa00] mb-1">
                    {testResults.filter(r => r.status === 'warning').length}
                  </div>
                  <div className="text-sm text-gray-400">
                    {language === 'en' ? 'Warnings' : '警告'}
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#ff4d4d] mb-1">
                    {testResults.filter(r => r.status === 'error').length}
                  </div>
                  <div className="text-sm text-gray-400">
                    {language === 'en' ? 'Failed' : '失敗'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}