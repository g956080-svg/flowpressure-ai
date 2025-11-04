
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

/**
 * Flow Visualizer Component
 * Shows inflow/outflow gauges with color-coded pressure
 */
export default function FlowVisualizer({ flowData = [] }) {
  const { t } = useI18n();

  // Calculate aggregate flow
  const totalInflow = flowData.reduce((sum, item) => sum + item.inflow, 0);
  const totalOutflow = flowData.reduce((sum, item) => sum + item.outflow, 0);
  const avgPressure = flowData.length > 0 
    ? flowData.reduce((sum, item) => sum + item.pressure, 0) / flowData.length 
    : 50;

  const inflowPct = Math.min(100, (totalInflow / flowData.length) * 2);
  const outflowPct = Math.min(100, (totalOutflow / flowData.length) * 2);

  const getPressureColor = (pressure) => {
    if (pressure >= 70) return '#ff4d4d';
    if (pressure >= 55) return '#ffaa00';
    if (pressure >= 45) return '#00C6FF';
    if (pressure >= 35) return '#ffaa00';
    return '#00ff88';
  };

  return (
    <Card className="bg-[#1a2332] border-[#00C6FF]/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>{t('flowVisualizer')}</span>
          <Badge 
            className="text-white"
            style={{ 
              backgroundColor: `${getPressureColor(avgPressure)}40`,
              borderColor: getPressureColor(avgPressure)
            }}
          >
            {t('pressure')}: {avgPressure.toFixed(1)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Inflow Gauge */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#00ff88]" />
                <span className="text-sm font-semibold text-gray-300">{t('inflow')}</span>
              </div>
              <span className="text-2xl font-bold text-[#00ff88]">
                {totalInflow.toFixed(1)}
              </span>
            </div>
            
            <div className="relative h-32 bg-[#0d1b2a] rounded-lg overflow-hidden border border-[#00ff88]/30">
              <div 
                className="absolute bottom-0 w-full transition-all duration-500"
                style={{
                  height: `${inflowPct}%`,
                  background: `linear-gradient(to top, #00ff88 0%, #00ff8840 100%)`
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-white z-10">
                  {inflowPct.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-500 text-center">
              {flowData.filter(f => f.inflow > 0).length} stocks with inflow
            </div>
          </div>

          {/* Outflow Gauge */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-[#ff4d4d]" />
                <span className="text-sm font-semibold text-gray-300">{t('outflow')}</span>
              </div>
              <span className="text-2xl font-bold text-[#ff4d4d]">
                {totalOutflow.toFixed(1)}
              </span>
            </div>
            
            <div className="relative h-32 bg-[#0d1b2a] rounded-lg overflow-hidden border border-[#ff4d4d]/30">
              <div 
                className="absolute bottom-0 w-full transition-all duration-500"
                style={{
                  height: `${outflowPct}%`,
                  background: `linear-gradient(to top, #ff4d4d 0%, #ff4d4d40 100%)`
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-white z-10">
                  {outflowPct.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-500 text-center">
              {flowData.filter(f => f.outflow > 0).length} stocks with outflow
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
