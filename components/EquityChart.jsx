
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useI18n } from '@/hooks/useI18n';
import { TrendingUp } from 'lucide-react';

/**
 * Equity Chart Component
 * Shows equity curve over time
 */
export default function EquityChart({ trades, initialCapital }) {
  const { t } = useI18n();

  // Build equity curve from trades
  const equityCurve = React.useMemo(() => {
    if (trades.length === 0) {
      return [{ index: 0, equity: initialCapital }];
    }

    let runningCapital = initialCapital;
    const curve = [{ index: 0, equity: initialCapital, time: 'Start' }];

    trades
      .slice()
      .reverse()
      .forEach((trade, index) => {
        runningCapital += trade.pnl;
        curve.push({
          index: index + 1,
          equity: runningCapital,
          time: new Date(trade.exitTime).toLocaleTimeString(),
          pnl: trade.pnl
        });
      });

    return curve;
  }, [trades, initialCapital]);

  const currentEquity = equityCurve[equityCurve.length - 1].equity;
  const totalReturn = ((currentEquity - initialCapital) / initialCapital) * 100;

  return (
    <Card className="bg-[#1a2332] border-[#00C6FF]/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00C6FF]" />
            <span>Equity Curve</span>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Total Return</div>
            <div className={`text-xl font-bold ${totalReturn >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </div>
          </div>
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
                formatter={(value, name) => {
                  if (name === 'equity') return [`$${value.toFixed(2)}`, 'Equity'];
                  return [value, name];
                }}
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
            <p>{t('noDataAvailable')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
