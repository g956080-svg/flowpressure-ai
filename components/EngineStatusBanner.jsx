
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

/**
 * Engine Status Banner Component
 * Shows engine status, mode, and last update
 */
export default function EngineStatusBanner({ isEngineReady, apiMode, error, lastUpdate }) {
  const { t } = useI18n();

  const getStatusIcon = () => {
    if (error) return <AlertTriangle className="w-4 h-4" />;
    if (!isEngineReady) return <Activity className="w-4 h-4 animate-spin" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusColor = () => {
    if (error) return 'bg-red-500/20 text-red-400 border-red-500/50';
    if (!isEngineReady) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    return 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/50';
  };

  const getStatusText = () => {
    if (error) return error;
    if (!isEngineReady) return t('loading');
    return t('engineReady');
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 p-4 bg-[#1a2332] border border-[#00C6FF]/30 rounded-lg">
      <div className="flex items-center gap-3">
        <Badge className={`${getStatusColor()} px-3 py-1 flex items-center gap-2`}>
          {getStatusIcon()}
          <span className="font-semibold">{getStatusText()}</span>
        </Badge>

        <Badge className={
          apiMode === 'mock' 
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' 
            : 'bg-purple-500/20 text-purple-400 border-purple-500/50'
        }>
          {apiMode === 'mock' ? t('mockMode') : t('liveMode')}
        </Badge>
      </div>

      {lastUpdate && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          <span>{t('lastUpdate')}: {lastUpdate.toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}
