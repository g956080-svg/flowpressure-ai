
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

/**
 * P&L Strip Component
 * Shows real-time P&L and key stats
 */
export default function PnLStrip({ stats, currentCapital, unrealizedPnL }) {
  const { t } = useI18n();

  const items = [
    {
      label: t('capital'),
      value: `$${currentCapital.toFixed(2)}`,
      icon: BarChart3,
      color: 'text-[#00C6FF]'
    },
    {
      label: t('unrealizedPnL'),
      value: `${unrealizedPnL >= 0 ? '+' : ''}$${unrealizedPnL.toFixed(2)}`,
      icon: unrealizedPnL >= 0 ? TrendingUp : TrendingDown,
      color: unrealizedPnL >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
    },
    {
      label: t('totalPnL'),
      value: `${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)}`,
      icon: stats.totalPnL >= 0 ? TrendingUp : TrendingDown,
      color: stats.totalPnL >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
    },
    {
      label: t('winRate'),
      value: `${stats.winRate.toFixed(1)}%`,
      icon: Target,
      color: stats.winRate >= 60 ? 'text-[#00ff88]' : stats.winRate >= 40 ? 'text-[#ffaa00]' : 'text-[#ff4d4d]'
    }
  ];

  return (
    <Card className="bg-gradient-to-r from-[#00C6FF]/10 to-transparent bg-[#1a2332] border-[#00C6FF]/50">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-[#0d1b2a] flex items-center justify-center ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">{item.label}</div>
                  <div className={`text-lg font-bold ${item.color}`}>
                    {item.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
