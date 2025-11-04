
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

/**
 * Report Table Component
 * Shows detailed trade history
 */
export default function ReportTable({ trades, onExport }) {
  const { t } = useI18n();

  if (trades.length === 0) {
    return (
      <Card className="bg-[#1a2332] border-[#00C6FF]/30">
        <CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">{t('noDataAvailable')}</p>
          <p className="text-sm text-gray-600 mt-2">
            Start the simulation to see trades here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a2332] border-[#00C6FF]/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>{t('tradeHistory')}</span>
          <Button
            onClick={onExport}
            size="sm"
            className="bg-[#00C6FF] hover:bg-[#0078FF] text-black"
          >
            <Download className="w-4 h-4 mr-2" />
            {t('exportCSV')}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-3 text-sm font-semibold text-gray-400">Time</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-400">{t('symbol')}</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-400">{t('entryPrice')}</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-400">{t('exitPrice')}</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-400">{t('quantity')}</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-400">{t('pnl')}</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-400">{t('holdTime')}</th>
                <th className="text-center p-3 text-sm font-semibold text-gray-400">{t('result')}</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(0, 50).map((trade) => (
                <tr key={trade.id} className="border-b border-gray-700/50 hover:bg-[#0d1b2a] transition-colors">
                  <td className="p-3 text-sm text-gray-300">
                    {new Date(trade.exitTime).toLocaleTimeString()}
                  </td>
                  <td className="p-3">
                    <span className="text-sm font-semibold text-white">{trade.symbol}</span>
                  </td>
                  <td className="p-3 text-right text-sm text-gray-300">
                    ${trade.entryPrice.toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-sm text-gray-300">
                    ${trade.exitPrice.toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-sm text-gray-300">
                    {trade.quantity}
                  </td>
                  <td className="p-3 text-right">
                    <div className={`text-sm font-semibold ${trade.pnl >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'}`}>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                    </div>
                    <div className={`text-xs ${trade.pnlPct >= 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'}`}>
                      {trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(2)}%
                    </div>
                  </td>
                  <td className="p-3 text-right text-sm text-gray-400">
                    {trade.holdTime.toFixed(0)}{t('seconds')}
                  </td>
                  <td className="p-3 text-center">
                    <Badge className={trade.isWin ? 'bg-[#00ff88]/20 text-[#00ff88]' : 'bg-[#ff4d4d]/20 text-[#ff4d4d]'}>
                      {trade.isWin ? 'WIN' : 'LOSS'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {trades.length > 50 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Showing 50 of {trades.length} trades. Export CSV for full history.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
