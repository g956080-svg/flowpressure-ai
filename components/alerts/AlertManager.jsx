import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../Layout";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Bell,
  X,
  CheckCircle,
  Target,
  Zap,
  Volume2,
  VolumeX
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const SOUND_ENABLED_KEY = 'flowpressure_alert_sound_enabled';

export default function AlertManager() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [currentAlert, setCurrentAlert] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lastAlertTime, setLastAlertTime] = useState({});
  const audioRef = useRef(null);

  // 從 localStorage 讀取音效設置，默認為開啟
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(SOUND_ENABLED_KEY);
      return saved === null ? true : saved === 'true';
    } catch (error) {
      console.error('Failed to load sound setting:', error);
      return true;
    }
  });

  // 更新音效設置到 localStorage
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    try {
      localStorage.setItem(SOUND_ENABLED_KEY, newValue.toString());
      toast.success(
        language === 'en'
          ? newValue ? '🔊 Alert sound enabled' : '🔇 Alert sound disabled'
          : newValue ? '🔊 警報聲音已啟用' : '🔇 警報聲音已關閉'
      );
    } catch (error) {
      console.error('Failed to save sound setting:', error);
    }
  };

  // Get user alert config
  const { data: alertConfig } = useQuery({
    queryKey: ['alertConfig'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const configs = await base44.entities.AlertConfig.filter({ user_id: user.email });
      
      if (configs.length === 0) {
        // Create default config
        return await base44.entities.AlertConfig.create({
          user_id: user.email,
          is_enabled: true,
          spi_change_threshold: 15,
          min_impact_score: 70,
          alert_on_verified_only: false,
          watched_keywords: ["funding", "acquisition", "bankruptcy", "layoff"],
          alert_sound_enabled: true,
          alert_frequency_minutes: 5,
          monitored_symbols: [],
          alert_types: {
            spi_spike: true,
            keyword_detection: true,
            opportunity_scanner: true,
            pressure_critical: true
          }
        });
      }
      
      return configs[0];
    },
    refetchInterval: 30000
  });

  // Monitor semantic pressure for SPI spikes
  const { data: semanticData = [] } = useQuery({
    queryKey: ['semanticPressureAlerts'],
    queryFn: async () => {
      const data = await base44.entities.SemanticPressure.list('-timestamp', 50);
      return data;
    },
    enabled: alertConfig?.is_enabled && alertConfig?.alert_types?.spi_spike,
    refetchInterval: 30000
  });

  // Monitor opportunities
  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunitiesAlerts'],
    queryFn: async () => {
      const data = await base44.entities.OpportunityScanner.list('-timestamp', 50);
      const now = new Date();
      return data.filter(opp => {
        const expiresAt = new Date(opp.expires_at);
        return expiresAt > now;
      });
    },
    enabled: alertConfig?.is_enabled && alertConfig?.alert_types?.opportunity_scanner,
    refetchInterval: 60000
  });

  // Monitor stock pressure for critical levels
  const { data: pressureData = [] } = useQuery({
    queryKey: ['pressureAlerts'],
    queryFn: async () => {
      const data = await base44.entities.StockPressure.list('-timestamp', 50);
      return data;
    },
    enabled: alertConfig?.is_enabled && alertConfig?.alert_types?.pressure_critical,
    refetchInterval: 15000
  });

  // Create alert history
  const createAlertMutation = useMutation({
    mutationFn: async (alertData) => {
      const user = await base44.auth.me();
      return await base44.entities.AlertHistory.create({
        user_id: user.email,
        ...alertData,
        timestamp: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['alertHistory']);
    }
  });

  // Check if alert should be throttled
  const shouldThrottle = (symbol) => {
    if (!alertConfig?.alert_frequency_minutes) return false;
    
    const lastTime = lastAlertTime[symbol];
    if (!lastTime) return false;
    
    const minutesSince = (Date.now() - lastTime) / 1000 / 60;
    return minutesSince < alertConfig.alert_frequency_minutes;
  };

  // Show alert
  const showAlert = (alert) => {
    // Check throttling
    if (shouldThrottle(alert.symbol)) {
      console.log(`⏸️ Alert throttled for ${alert.symbol}`);
      return;
    }

    // Update last alert time
    setLastAlertTime(prev => ({
      ...prev,
      [alert.symbol]: Date.now()
    }));

    // Show dialog
    setCurrentAlert(alert);
    setIsDialogOpen(true);

    // Play sound if enabled (使用本地設置)
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(err => console.error('Audio play failed:', err));
    }

    // Show toast notification
    const message = language === 'en' ? alert.title : (alert.title_zh || alert.title);
    
    if (alert.severity === 'critical') {
      toast.error(message, {
        duration: 8000,
        icon: '🚨'
      });
    } else if (alert.severity === 'warning') {
      toast.warning(message, {
        duration: 6000,
        icon: '⚠️'
      });
    } else {
      toast.info(message, {
        duration: 5000,
        icon: '💡'
      });
    }

    // Save to history
    createAlertMutation.mutate(alert);
  };

  // Check SPI spikes
  useEffect(() => {
    if (!alertConfig?.is_enabled || !alertConfig?.alert_types?.spi_spike) return;
    if (!semanticData || semanticData.length === 0) return;

    semanticData.forEach(item => {
      // Check if symbol is monitored
      if (alertConfig.monitored_symbols.length > 0 && 
          !alertConfig.monitored_symbols.includes(item.symbol)) {
        return;
      }

      // Check SPI change threshold
      if (Math.abs(item.spi_change || 0) >= alertConfig.spi_change_threshold && item.alert_triggered) {
        const isPositive = (item.spi_change || 0) > 0;
        
        showAlert({
          alert_type: 'spi_spike',
          symbol: item.symbol,
          title: `🚀 ${item.symbol}: SPI ${isPositive ? 'Spike' : 'Drop'} Detected`,
          title_zh: `🚀 ${item.symbol}：偵測到 SPI ${isPositive ? '激增' : '暴跌'}`,
          message: `SPI changed by ${(item.spi_change || 0) > 0 ? '+' : ''}${(item.spi_change || 0).toFixed(1)} (now ${(item.spi || 0).toFixed(0)}). ${item.top_keyword ? `Keyword: ${item.top_keyword}` : ''}`,
          message_zh: `SPI 變化 ${(item.spi_change || 0) > 0 ? '+' : ''}${(item.spi_change || 0).toFixed(1)}（現為 ${(item.spi || 0).toFixed(0)}）。${item.top_keyword ? `關鍵字：${item.top_keyword}` : ''}`,
          severity: Math.abs(item.spi_change || 0) >= 20 ? 'critical' : 'warning',
          spi_value: item.spi || 0,
          spi_change: item.spi_change || 0,
          keyword: item.top_keyword,
          sentiment: item.sentiment || 'neutral',
          action_suggestion: item.ai_suggestion_en || '',
          action_suggestion_zh: item.ai_suggestion_zh || ''
        });
      }
    });
  }, [semanticData, alertConfig, language]);

  // Check keyword detections
  useEffect(() => {
    if (!alertConfig?.is_enabled || !alertConfig?.alert_types?.keyword_detection) return;
    if (!semanticData || semanticData.length === 0) return;
    if (!alertConfig?.watched_keywords || alertConfig.watched_keywords.length === 0) return;

    semanticData.forEach(item => {
      // Check if symbol is monitored
      if (alertConfig.monitored_symbols.length > 0 && 
          !alertConfig.monitored_symbols.includes(item.symbol)) {
        return;
      }

      // Check if watched keyword is detected
      const allKeywords = [...(item.positive_keywords || []), ...(item.negative_keywords || [])];
      const matchedKeyword = allKeywords.find(kw => 
        alertConfig.watched_keywords.some(watched => 
          kw.toLowerCase().includes(watched.toLowerCase())
        )
      );

      if (matchedKeyword) {
        const isPositive = (item.positive_keywords || []).includes(matchedKeyword);
        
        showAlert({
          alert_type: 'keyword_detection',
          symbol: item.symbol,
          title: `🎯 ${item.symbol}: Keyword "${matchedKeyword}" Detected`,
          title_zh: `🎯 ${item.symbol}：偵測到關鍵字「${matchedKeyword}」`,
          message: `${isPositive ? 'Positive' : 'Negative'} keyword detected. SPI: ${(item.spi || 0).toFixed(0)}. ${item.ai_suggestion_en || ''}`,
          message_zh: `偵測到${isPositive ? '正面' : '負面'}關鍵字。SPI：${(item.spi || 0).toFixed(0)}。${item.ai_suggestion_zh || ''}`,
          severity: 'info',
          spi_value: item.spi || 0,
          keyword: matchedKeyword,
          sentiment: item.sentiment || 'neutral',
          action_suggestion: item.ai_suggestion_en || '',
          action_suggestion_zh: item.ai_suggestion_zh || ''
        });
      }
    });
  }, [semanticData, alertConfig, language]);

  // Check opportunities
  useEffect(() => {
    if (!alertConfig?.is_enabled || !alertConfig?.alert_types?.opportunity_scanner) return;
    if (!opportunities || opportunities.length === 0) return;

    opportunities.forEach(opp => {
      // Check if symbol is monitored
      if (alertConfig.monitored_symbols.length > 0 && 
          !alertConfig.monitored_symbols.includes(opp.ticker)) {
        return;
      }

      // Check impact score threshold
      if ((opp.impact_score || 0) >= alertConfig.min_impact_score) {
        // Check verification flag if required
        if (alertConfig.alert_on_verified_only && opp.verification_flag !== 'verified') {
          return;
        }

        const getSentimentZh = (sentiment) => {
          if (sentiment === 'positive') return '正面';
          if (sentiment === 'negative') return '負面';
          return '中性';
        };

        showAlert({
          alert_type: 'opportunity_scanner',
          symbol: opp.ticker,
          title: `💎 ${opp.ticker}: High Impact Opportunity`,
          title_zh: `💎 ${opp.ticker}：高影響機會`,
          message: `${opp.verification_flag === 'verified' ? '✅' : '⚠️'} ${opp.keyword} detected. Impact: ${(opp.impact_score || 0).toFixed(0)}. Sentiment: ${opp.sentiment || 'neutral'}.`,
          message_zh: `${opp.verification_flag === 'verified' ? '✅' : '⚠️'} 偵測到 ${opp.keyword}。影響：${(opp.impact_score || 0).toFixed(0)}。情緒：${getSentimentZh(opp.sentiment)}.`,
          severity: opp.verification_flag === 'verified' ? 'critical' : 'warning',
          impact_score: opp.impact_score || 0,
          keyword: opp.keyword,
          sentiment: opp.sentiment || 'neutral',
          action_suggestion: `Review opportunity on ${opp.ticker}. ${opp.source_count || 0} sources confirm this event.`,
          action_suggestion_zh: `檢視 ${opp.ticker} 的機會。${opp.source_count || 0} 個來源確認此事件。`
        });
      }
    });
  }, [opportunities, alertConfig, language]);

  // Check critical pressure levels
  useEffect(() => {
    if (!alertConfig?.is_enabled || !alertConfig?.alert_types?.pressure_critical) return;
    if (!pressureData || pressureData.length === 0) return;

    pressureData.forEach(item => {
      // Check if symbol is monitored
      if (alertConfig.monitored_symbols.length > 0 && 
          !alertConfig.monitored_symbols.includes(item.symbol)) {
        return;
      }

      // Check critical pressure levels
      if ((item.final_pressure || 0) >= 85) {
        showAlert({
          alert_type: 'pressure_critical',
          symbol: item.symbol,
          title: `🔴 ${item.symbol}: Critical Pressure Level`,
          title_zh: `🔴 ${item.symbol}：壓力達到臨界值`,
          message: `Pressure at ${(item.final_pressure || 0).toFixed(0)}. ${item.ai_suggestion_en || ''}`,
          message_zh: `壓力達 ${(item.final_pressure || 0).toFixed(0)}。${item.ai_suggestion_zh || ''}`,
          severity: 'critical',
          spi_value: item.final_pressure || 0,
          sentiment: (item.final_pressure || 0) > 50 ? 'negative' : 'positive',
          action_suggestion: item.ai_suggestion_en || '',
          action_suggestion_zh: item.ai_suggestion_zh || ''
        });
      } else if ((item.final_pressure || 0) <= 30) {
        showAlert({
          alert_type: 'pressure_critical',
          symbol: item.symbol,
          title: `🟢 ${item.symbol}: Low Pressure Opportunity`,
          title_zh: `🟢 ${item.symbol}：低壓買入機會`,
          message: `Pressure at ${(item.final_pressure || 0).toFixed(0)}. ${item.ai_suggestion_en || ''}`,
          message_zh: `壓力為 ${(item.final_pressure || 0).toFixed(0)}。${item.ai_suggestion_zh || ''}`,
          severity: 'info',
          spi_value: item.final_pressure || 0,
          sentiment: 'positive',
          action_suggestion: item.ai_suggestion_en || '',
          action_suggestion_zh: item.ai_suggestion_zh || ''
        });
      }
    });
  }, [pressureData, alertConfig, language]);

  const handleDismiss = () => {
    setIsDialogOpen(false);
    setCurrentAlert(null);
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-8 h-8 text-yellow-500" />;
      default:
        return <Bell className="w-8 h-8 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500/50 bg-red-500/10';
      case 'warning':
        return 'border-yellow-500/50 bg-yellow-500/10';
      default:
        return 'border-blue-500/50 bg-blue-500/10';
    }
  };

  const getSentimentLabel = (sentiment) => {
    if (language === 'en') {
      return sentiment ? sentiment.charAt(0).toUpperCase() + sentiment.slice(1) : 'Neutral';
    } else {
      if (sentiment === 'positive') return '正面';
      if (sentiment === 'negative') return '負面';
      return '中性';
    }
  };

  if (!alertConfig?.is_enabled) return null;

  return (
    <>
      {/* Hidden audio element for alert sound */}
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,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"
      />

      {/* Floating Sound Control Button */}
      <button
        onClick={toggleSound}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-[#00C6FF] to-[#0078FF] hover:from-[#0078FF] hover:to-[#00C6FF] rounded-full flex items-center justify-center shadow-lg transition-all duration-300 pressure-glow"
        title={language === 'en' 
          ? (soundEnabled ? 'Click to disable alert sound' : 'Click to enable alert sound')
          : (soundEnabled ? '點擊關閉警報聲音' : '點擊開啟警報聲音')}
      >
        {soundEnabled ? (
          <Volume2 className="w-6 h-6 text-white animate-pulse" />
        ) : (
          <VolumeX className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Alert Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`bg-[#1a2332] border-2 ${currentAlert ? getSeverityColor(currentAlert.severity) : ''}`}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              {currentAlert && getSeverityIcon(currentAlert.severity)}
              <span>{language === 'en' ? currentAlert?.title : (currentAlert?.title_zh || currentAlert?.title)}</span>
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              {currentAlert && (
                <div className="mt-4 space-y-4">
                  {/* Symbol Badge */}
                  <div className="flex items-center gap-2">
                    <Badge className="text-lg px-3 py-1 bg-[#00C6FF]/20 text-[#00C6FF]">
                      {currentAlert.symbol}
                    </Badge>
                    {currentAlert.sentiment && (
                      <Badge className={`${
                        currentAlert.sentiment === 'positive' ? 'bg-[#00ff88]/20 text-[#00ff88]' :
                        currentAlert.sentiment === 'negative' ? 'bg-[#ff4d4d]/20 text-[#ff4d4d]' :
                        'bg-[#ffaa00]/20 text-[#ffaa00]'
                      }`}>
                        {currentAlert.sentiment === 'positive' && <TrendingUp className="w-4 h-4 mr-1" />}
                        {currentAlert.sentiment === 'negative' && <TrendingDown className="w-4 h-4 mr-1" />}
                        {getSentimentLabel(currentAlert.sentiment)}
                      </Badge>
                    )}
                  </div>

                  {/* Message */}
                  <p className="text-base text-white">
                    {language === 'en' ? currentAlert.message : (currentAlert.message_zh || currentAlert.message)}
                  </p>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-[#0d1b2a] rounded-lg">
                    {currentAlert.spi_value !== undefined && (
                      <div>
                        <div className="text-xs text-gray-500">{language === 'en' ? 'SPI/Pressure' : 'SPI/壓力'}</div>
                        <div className="text-lg font-bold text-white">{currentAlert.spi_value.toFixed(0)}</div>
                      </div>
                    )}
                    {currentAlert.spi_change !== undefined && (
                      <div>
                        <div className="text-xs text-gray-500">{language === 'en' ? 'Change' : '變化'}</div>
                        <div className={`text-lg font-bold ${
                          currentAlert.spi_change > 0 ? 'text-[#00ff88]' : 'text-[#ff4d4d]'
                        }`}>
                          {currentAlert.spi_change > 0 ? '+' : ''}{currentAlert.spi_change.toFixed(1)}
                        </div>
                      </div>
                    )}
                    {currentAlert.impact_score !== undefined && (
                      <div>
                        <div className="text-xs text-gray-500">{language === 'en' ? 'Impact' : '影響'}</div>
                        <div className="text-lg font-bold text-white">{currentAlert.impact_score.toFixed(0)}</div>
                      </div>
                    )}
                    {currentAlert.keyword && (
                      <div>
                        <div className="text-xs text-gray-500">{language === 'en' ? 'Keyword' : '關鍵字'}</div>
                        <div className="text-sm font-bold text-[#00C6FF]">{currentAlert.keyword}</div>
                      </div>
                    )}
                  </div>

                  {/* Action Suggestion */}
                  {(currentAlert.action_suggestion || currentAlert.action_suggestion_zh) && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="text-xs text-blue-400 mb-1">
                        {language === 'en' ? '💡 AI Suggestion' : '💡 AI 建議'}
                      </div>
                      <p className="text-sm text-white">
                        {language === 'en' 
                          ? (currentAlert.action_suggestion || currentAlert.action_suggestion_zh)
                          : (currentAlert.action_suggestion_zh || currentAlert.action_suggestion)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="border-gray-700 text-gray-300"
            >
              <X className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Dismiss' : '忽略'}
            </Button>
            
            <Link to={createPageUrl('ManualTrading')}>
              <Button
                onClick={handleDismiss}
                className="bg-[#00C6FF] hover:bg-[#0078FF] text-black"
              >
                <Target className="w-4 h-4 mr-2" />
                {language === 'en' ? 'View Trading' : '查看交易'}
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}