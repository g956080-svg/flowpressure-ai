import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  Settings,
  CheckCircle,
  X,
  AlertCircle,
  TrendingUp,
  Filter,
  RefreshCw,
  Save
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AlertCenter() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');

  // Get user and config
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: alertConfig, isLoading: configLoading } = useQuery({
    queryKey: ['alertConfig'],
    queryFn: async () => {
      const configs = await base44.entities.AlertConfig.filter({ user_id: user.email });
      
      if (configs.length === 0) {
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
    enabled: !!user
  });

  // Get alert history
  const { data: alertHistory = [] } = useQuery({
    queryKey: ['alertHistory', filterType, filterRead],
    queryFn: async () => {
      const alerts = await base44.entities.AlertHistory.filter({ user_id: user.email });
      return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: (data) => base44.entities.AlertConfig.update(alertConfig.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['alertConfig']);
      toast.success(language === 'en' ? '✅ Settings saved' : '✅ 設定已儲存');
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.AlertHistory.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['alertHistory']);
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = alertHistory.filter(a => !a.is_read);
      for (const alert of unread) {
        await base44.entities.AlertHistory.update(alert.id, { is_read: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['alertHistory']);
      toast.success(language === 'en' ? '✅ All marked as read' : '✅ 全部標記為已讀');
    }
  });

  // Delete alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: (id) => base44.entities.AlertHistory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['alertHistory']);
      toast.success(language === 'en' ? '✅ Alert deleted' : '✅ 警報已刪除');
    }
  });

  const handleSaveConfig = (updates) => {
    updateConfigMutation.mutate(updates);
  };

  const filteredAlerts = alertHistory.filter(alert => {
    const typeMatch = filterType === 'all' || alert.alert_type === filterType;
    const readMatch = filterRead === 'all' || 
      (filterRead === 'unread' && !alert.is_read) ||
      (filterRead === 'read' && alert.is_read);
    return typeMatch && readMatch;
  });

  const unreadCount = alertHistory.filter(a => !a.is_read).length;

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

  const getTypeLabel = (type) => {
    const labels = {
      spi_spike: language === 'en' ? 'SPI Spike' : 'SPI 激增',
      keyword_detection: language === 'en' ? 'Keyword' : '關鍵字',
      opportunity_scanner: language === 'en' ? 'Opportunity' : '機會',
      pressure_critical: language === 'en' ? 'Pressure' : '壓力'
    };
    return labels[type] || type;
  };

  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#00C6FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#00C6FF] to-[#0078FF] rounded-2xl flex items-center justify-center pressure-glow">
              <Bell className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {language === 'en' ? '🔔 Alert Center' : '🔔 警報中心'}
              </h1>
              <p className="text-gray-400">
                {language === 'en' 
                  ? 'Configure alerts and review notification history' 
                  : '配置警報與檢視通知歷史'}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <Button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isLoading}
              variant="outline"
              className="border-gray-700 text-gray-300"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {language === 'en' ? `Mark All as Read (${unreadCount})` : `全部標記為已讀 (${unreadCount})`}
            </Button>
          )}
        </div>

        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="bg-[#1a2332] border border-[#00C6FF]/30">
            <TabsTrigger value="history" className="data-[state=active]:bg-[#00C6FF] data-[state=active]:text-black">
              {language === 'en' ? 'Alert History' : '警報歷史'}
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-[#00C6FF] data-[state=active]:text-black">
              <Settings className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Alert Settings' : '警報設定'}
            </TabsTrigger>
          </TabsList>

          {/* Alert History Tab */}
          <TabsContent value="history" className="space-y-4">
            {/* Filters */}
            <Card className="bg-[#1a2332] border-[#00C6FF]/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">
                      {language === 'en' ? 'Filters:' : '篩選：'}
                    </span>
                  </div>

                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-40 bg-[#0d1b2a] border-gray-700 text-white">
                      <SelectValue placeholder={language === 'en' ? 'Alert Type' : '警報類型'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'en' ? 'All Types' : '所有類型'}</SelectItem>
                      <SelectItem value="spi_spike">{language === 'en' ? 'SPI Spike' : 'SPI 激增'}</SelectItem>
                      <SelectItem value="keyword_detection">{language === 'en' ? 'Keyword' : '關鍵字'}</SelectItem>
                      <SelectItem value="opportunity_scanner">{language === 'en' ? 'Opportunity' : '機會'}</SelectItem>
                      <SelectItem value="pressure_critical">{language === 'en' ? 'Pressure' : '壓力'}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterRead} onValueChange={setFilterRead}>
                    <SelectTrigger className="w-32 bg-[#0d1b2a] border-gray-700 text-white">
                      <SelectValue placeholder={language === 'en' ? 'Status' : '狀態'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'en' ? 'All' : '全部'}</SelectItem>
                      <SelectItem value="unread">{language === 'en' ? 'Unread' : '未讀'}</SelectItem>
                      <SelectItem value="read">{language === 'en' ? 'Read' : '已讀'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Alert List */}
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <Card 
                  key={alert.id} 
                  className={`${getSeverityColor(alert.severity)} border-2 ${
                    !alert.is_read ? 'border-l-4 border-l-[#00C6FF]' : ''
                  } hover:border-[#00C6FF]/50 transition-all cursor-pointer`}
                  onClick={() => !alert.is_read && markAsReadMutation.mutate(alert.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-[#00C6FF]/20 text-[#00C6FF]">
                            {alert.symbol}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(alert.alert_type)}
                          </Badge>
                          {!alert.is_read && (
                            <Badge className="bg-blue-500 text-white text-xs">
                              {language === 'en' ? 'NEW' : '新'}
                            </Badge>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-white">
                          {alert.title}
                        </h3>

                        <p className="text-sm text-gray-300">
                          {alert.message}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{new Date(alert.timestamp).toLocaleString()}</span>
                          {alert.keyword && (
                            <span className="text-[#00C6FF]">🔑 {alert.keyword}</span>
                          )}
                          {alert.spi_value !== undefined && (
                            <span>SPI: {alert.spi_value.toFixed(0)}</span>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAlertMutation.mutate(alert.id);
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredAlerts.length === 0 && (
                <Card className="bg-[#1a2332] border-[#00C6FF]/30">
                  <CardContent className="p-12 text-center">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p className="text-gray-400">
                      {language === 'en' ? 'No alerts found' : '無警報記錄'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {alertConfig && (
              <>
                {/* Master Switch */}
                <Card className="bg-[#1a2332] border-[#00C6FF]/30">
                  <CardHeader>
                    <CardTitle className="text-white">
                      {language === 'en' ? '🔔 Alert System' : '🔔 警報系統'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white text-base">
                          {language === 'en' ? 'Enable Alerts' : '啟用警報'}
                        </Label>
                        <p className="text-sm text-gray-400">
                          {language === 'en' 
                            ? 'Turn on/off all alert notifications' 
                            : '開啟/關閉所有警報通知'}
                        </p>
                      </div>
                      <Switch
                        checked={alertConfig.is_enabled}
                        onCheckedChange={(checked) => handleSaveConfig({ is_enabled: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white text-base">
                          {language === 'en' ? 'Alert Sound' : '警報聲音'}
                        </Label>
                        <p className="text-sm text-gray-400">
                          {language === 'en' 
                            ? 'Play sound when alerts trigger' 
                            : '觸發警報時播放聲音'}
                        </p>
                      </div>
                      <Switch
                        checked={alertConfig.alert_sound_enabled}
                        onCheckedChange={(checked) => handleSaveConfig({ alert_sound_enabled: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Alert Types */}
                <Card className="bg-[#1a2332] border-[#00C6FF]/30">
                  <CardHeader>
                    <CardTitle className="text-white">
                      {language === 'en' ? '📢 Alert Types' : '📢 警報類型'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">
                          {language === 'en' ? 'SPI Spike Alerts' : 'SPI 激增警報'}
                        </Label>
                        <p className="text-sm text-gray-400">
                          {language === 'en' 
                            ? 'Alert when SPI changes dramatically' 
                            : '當 SPI 劇烈變化時警報'}
                        </p>
                      </div>
                      <Switch
                        checked={alertConfig.alert_types?.spi_spike}
                        onCheckedChange={(checked) => handleSaveConfig({ 
                          alert_types: { ...alertConfig.alert_types, spi_spike: checked }
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">
                          {language === 'en' ? 'Keyword Detection Alerts' : '關鍵字偵測警報'}
                        </Label>
                        <p className="text-sm text-gray-400">
                          {language === 'en' 
                            ? 'Alert when watched keywords are detected' 
                            : '偵測到監控關鍵字時警報'}
                        </p>
                      </div>
                      <Switch
                        checked={alertConfig.alert_types?.keyword_detection}
                        onCheckedChange={(checked) => handleSaveConfig({ 
                          alert_types: { ...alertConfig.alert_types, keyword_detection: checked }
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">
                          {language === 'en' ? 'Opportunity Scanner Alerts' : '機會掃描器警報'}
                        </Label>
                        <p className="text-sm text-gray-400">
                          {language === 'en' 
                            ? 'Alert for high-impact opportunities' 
                            : '高影響機會警報'}
                        </p>
                      </div>
                      <Switch
                        checked={alertConfig.alert_types?.opportunity_scanner}
                        onCheckedChange={(checked) => handleSaveConfig({ 
                          alert_types: { ...alertConfig.alert_types, opportunity_scanner: checked }
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">
                          {language === 'en' ? 'Pressure Critical Alerts' : '壓力臨界警報'}
                        </Label>
                        <p className="text-sm text-gray-400">
                          {language === 'en' 
                            ? 'Alert when pressure reaches critical levels' 
                            : '壓力達到臨界值時警報'}
                        </p>
                      </div>
                      <Switch
                        checked={alertConfig.alert_types?.pressure_critical}
                        onCheckedChange={(checked) => handleSaveConfig({ 
                          alert_types: { ...alertConfig.alert_types, pressure_critical: checked }
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Thresholds */}
                <Card className="bg-[#1a2332] border-[#00C6FF]/30">
                  <CardHeader>
                    <CardTitle className="text-white">
                      {language === 'en' ? '⚙️ Alert Thresholds' : '⚙️ 警報閾值'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-white mb-2 block">
                        {language === 'en' ? 'SPI Change Threshold' : 'SPI 變化閾值'}
                      </Label>
                      <p className="text-sm text-gray-400 mb-2">
                        {language === 'en' 
                          ? 'Trigger alert when SPI changes by this amount' 
                          : '當 SPI 變化達到此數值時觸發警報'}
                      </p>
                      <Input
                        type="number"
                        value={alertConfig.spi_change_threshold}
                        onChange={(e) => handleSaveConfig({ spi_change_threshold: Number(e.target.value) })}
                        className="bg-[#0d1b2a] border-gray-700 text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {language === 'en' ? 'Current:' : '當前：'} ±{alertConfig.spi_change_threshold}
                      </p>
                    </div>

                    <div>
                      <Label className="text-white mb-2 block">
                        {language === 'en' ? 'Minimum Impact Score' : '最低影響分數'}
                      </Label>
                      <p className="text-sm text-gray-400 mb-2">
                        {language === 'en' 
                          ? 'Only alert for opportunities with impact above this score' 
                          : '僅對影響分數高於此值的機會警報'}
                      </p>
                      <Input
                        type="number"
                        value={alertConfig.min_impact_score}
                        onChange={(e) => handleSaveConfig({ min_impact_score: Number(e.target.value) })}
                        className="bg-[#0d1b2a] border-gray-700 text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {language === 'en' ? 'Current:' : '當前：'} {alertConfig.min_impact_score}/100
                      </p>
                    </div>

                    <div>
                      <Label className="text-white mb-2 block">
                        {language === 'en' ? 'Alert Frequency (minutes)' : '警報頻率（分鐘）'}
                      </Label>
                      <p className="text-sm text-gray-400 mb-2">
                        {language === 'en' 
                          ? 'Minimum time between alerts for the same stock' 
                          : '同一股票警報之間的最小時間間隔'}
                      </p>
                      <Input
                        type="number"
                        value={alertConfig.alert_frequency_minutes}
                        onChange={(e) => handleSaveConfig({ alert_frequency_minutes: Number(e.target.value) })}
                        className="bg-[#0d1b2a] border-gray-700 text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {language === 'en' ? 'Current:' : '當前：'} {alertConfig.alert_frequency_minutes} {language === 'en' ? 'minutes' : '分鐘'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">
                          {language === 'en' ? 'Verified Events Only' : '僅驗證事件'}
                        </Label>
                        <p className="text-sm text-gray-400">
                          {language === 'en' 
                            ? 'Only alert for verified opportunities' 
                            : '僅對已驗證的機會警報'}
                        </p>
                      </div>
                      <Switch
                        checked={alertConfig.alert_on_verified_only}
                        onCheckedChange={(checked) => handleSaveConfig({ alert_on_verified_only: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Info */}
                <Card className="bg-gradient-to-r from-blue-500/10 to-transparent bg-[#1a2332] border-2 border-blue-500/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-300">
                        <p className="mb-2 font-semibold text-white">
                          {language === 'en' ? '💡 How Alerts Work:' : '💡 警報運作方式：'}
                        </p>
                        <ul className="space-y-1">
                          <li>• {language === 'en' ? 'Alerts check every 15-60 seconds depending on type' : '根據類型每 15-60 秒檢查一次'}</li>
                          <li>• {language === 'en' ? 'Pop-up dialog appears for critical alerts' : '關鍵警報會顯示彈出對話框'}</li>
                          <li>• {language === 'en' ? 'Toast notifications for all alerts' : '所有警報都會顯示快顯通知'}</li>
                          <li>• {language === 'en' ? 'Alert frequency prevents spam for same stock' : '警報頻率防止同一股票的垃圾訊息'}</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}