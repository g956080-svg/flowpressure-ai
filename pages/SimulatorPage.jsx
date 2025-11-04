import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, RotateCcw, Settings } from 'lucide-react';
import { useRealtimeEngine } from '@/hooks/useRealtimeEngine';
import { useSimulation } from '@/hooks/useSimulation';
import { useI18n } from '@/hooks/useI18n';
import CONFIG from '@/config';
import EngineStatusBanner from '@/components/EngineStatusBanner';
import FlowVisualizer from '@/components/FlowVisualizer';
import PnLStrip from '@/components/PnLStrip';
import EquityChart from '@/components/EquityChart';
import ReportTable from '@/components/ReportTable';

export default function SimulatorPage() {
  const { t } = useI18n();
  const [apiMode, setApiMode] = useState('mock');

  // Real-time engine
  const { 
    quotes, 
    flowData, 
    isEngineReady, 
    error, 
    lastUpdate,
    refresh 
  } = useRealtimeEngine(CONFIG.default_symbols, apiMode);

  // Simulation engine
  const {
    isActive,
    capital,
    availableCash,
    currentCapital,
    positions,
    trades,
    stats,
    unrealizedPnL,
    toggleSimulation,
    reset,
    exportToCSV
  } = useSimulation(flowData, quotes);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              {t('simulation')}
            </h1>
            <p className="text-gray-400">
              AI-powered trading simulation with real-time flow analysis
            </p>
          </div>

          <Button
            onClick={() => setApiMode(prev => prev === 'mock' ? 'finnhub' : 'mock')}
            variant="outline"
            className="border-[#00C6FF] text-[#00C6FF]"
          >
            Switch to {apiMode === 'mock' ? 'Live' : 'Mock'} Mode
          </Button>
        </div>

        {/* Engine Status */}
        <EngineStatusBanner
          isEngineReady={isEngineReady}
          apiMode={apiMode}
          error={error}
          lastUpdate={lastUpdate}
        />

        {/* Control Panel */}
        <Card className="bg-gradient-to-r from-[#00C6FF]/10 to-transparent bg-[#1a2332] border-2 border-[#00C6FF]/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#00C6FF]" />
                <span>{t('simulationEngine')}</span>
              </div>
              <Badge className={isActive ? 'bg-[#00ff88] text-black' : 'bg-gray-600 text-white'}>
                {isActive ? 'RUNNING' : 'STOPPED'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Initial Capital</div>
                  <div className="text-xl font-bold text-white">${capital}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Trade Size</div>
                  <div className="text-xl font-bold text-white">
                    {(CONFIG.trade_defaults.trade_per_signal * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Stop Loss</div>
                  <div className="text-xl font-bold text-[#ff4d4d]">
                    {CONFIG.trade_defaults.stop_loss_pct}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Take Profit</div>
                  <div className="text-xl font-bold text-[#00ff88]">
                    +{CONFIG.trade_defaults.take_profit_pct}%
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={toggleSimulation}
                  disabled={!isEngineReady}
                  className={isActive 
                    ? 'bg-[#ff4d4d] hover:bg-[#cc3333] text-white' 
                    : 'bg-[#00ff88] hover:bg-[#00cc7a] text-black'}
                >
                  {isActive ? (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      {t('stop')}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      {t('start')}
                    </>
                  )}
                </Button>

                <Button
                  onClick={reset}
                  variant="outline"
                  className="border-gray-700 text-gray-300"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t('reset')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* P&L Strip */}
        <PnLStrip
          stats={stats}
          currentCapital={currentCapital}
          unrealizedPnL={unrealizedPnL}
        />

        {/* Flow Visualizer */}
        {flowData.length > 0 && <FlowVisualizer flowData={flowData} />}

        {/* Statistics Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardContent className="p-6">
              <div className="text-sm text-gray-400 mb-1">{t('totalTrades')}</div>
              <div className="text-3xl font-bold text-white">{stats.totalTrades}</div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.winningTrades}W / {stats.losingTrades}L
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardContent className="p-6">
              <div className="text-sm text-gray-400 mb-1">{t('avgReturn')}</div>
              <div className={`text-3xl font-bold ${stats.avgReturn >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'}`}>
                {stats.avgReturn >= 0 ? '+' : ''}{stats.avgReturn.toFixed(2)}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardContent className="p-6">
              <div className="text-sm text-gray-400 mb-1">{t('maxDrawdown')}</div>
              <div className="text-3xl font-bold text-[#ff4d4d]">
                -{stats.maxDrawdown.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Equity Chart */}
        <EquityChart trades={trades} initialCapital={capital} />

        {/* Open Positions */}
        {positions.length > 0 && (
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white">{t('positions')} ({positions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {positions.map(position => {
                  const quote = quotes.find(q => q.symbol === position.symbol);
                  const currentValue = quote ? quote.price * position.quantity : 0;
                  const pnl = currentValue - position.cost;
                  const pnlPct = (pnl / position.cost) * 100;

                  return (
                    <div key={position.id} className="bg-[#0d1b2a] p-4 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold text-white">{position.symbol}</div>
                          <div className="text-sm text-gray-400">
                            {position.quantity} @ ${position.entryPrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${pnl >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'}`}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </div>
                          <div className={`text-sm ${pnlPct >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'}`}>
                            {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trade History */}
        <ReportTable trades={trades} onExport={exportToCSV} />
      </div>
    </div>
  );
}