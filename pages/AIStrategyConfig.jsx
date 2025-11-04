import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Save,
  Play,
  Pause,
  Plus,
  Trash2,
  TrendingUp,
  Shield,
  Target,
  Zap,
  Brain,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AIStrategyConfig() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    strategy_name: '',
    description: '',
    risk_tolerance: 'MODERATE',
    max_position_size: 5,
    max_daily_loss: -5,
    max_drawdown: -10,
    volatility_threshold: 2.5,
    trend_strength_min: 60,
    volume_multiplier: 1.5,
    entry_confidence_min: 70,
    profit_target: 3.5,
    stop_loss: -1.8,
    trailing_stop: false,
    trailing_stop_distance: 1.5,
    market_condition_filter: 'ALL',
    time_filter_enabled: false,
    time_filter_start: '09:30',
    time_filter_end: '16:00',
    dynamic_adjustment: true,
    adaptation_speed: 'MEDIUM',
    max_consecutive_losses: 3,
    cool_down_period: 300
  });

  // 獲取所有策略
  const { data: strategies = [], isLoading } = useQuery({
    queryKey: ['aiStrategies'],
    queryFn: () => base44.entities.AIStrategy.list('-created_date'),
    refetchInterval: 30000
  });

  // 創建策略
  const createStrategyMutation = useMutation({
    mutationFn: (data) => base44.entities.AIStrategy.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['aiStrategies']);
      setIsCreating(false);
      resetForm();
      toast.success(language === 'en' ? '✅ Strategy created' : '✅ 策略已創建');
    }
  });

  // 更新策略
  const updateStrategyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AIStrategy.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['aiStrategies']);
      toast.success(language === 'en' ? '✅ Strategy updated' : '✅ 策略已更新');
    }
  });

  // 刪除策略
  const deleteStrategyMutation = useMutation({
    mutationFn: (id) => base44.entities.AIStrategy.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['aiStrategies']);
      setSelectedStrategy(null);
      resetForm();
      toast.success(language === 'en' ? '✅ Strategy deleted' : '✅ 策略已刪除');
    }
  });

  const resetForm = () => {
    setFormData({
      strategy_name: '',
      description: '',
      risk_tolerance: 'MODERATE',
      max_position_size: 5,
      max_daily_loss: -5,
      max_drawdown: -10,
      volatility_threshold: 2.5,
      trend_strength_min: 60,
      volume_multiplier: 1.5,
      entry_confidence_min: 70,
      profit_target: 3.5,
      stop_loss: -1.8,
      trailing_stop: false,
      trailing_stop_distance: 1.5,
      market_condition_filter: 'ALL',
      time_filter_enabled: false,
      time_filter_start: '09:30',
      time_filter_end: '16:00',
      dynamic_adjustment: true,
      adaptation_speed: 'MEDIUM',
      max_consecutive_losses: 3,
      cool_down_period: 300
    });
  };

  const handleSelectStrategy = (strategy) => {
    setSelectedStrategy(strategy);
    setIsCreating(false);
    setFormData({
      strategy_name: strategy.strategy_name || '',
      description: strategy.description || '',
      risk_tolerance: strategy.risk_tolerance || 'MODERATE',
      max_position_size: strategy.max_position_size * 100 || 5,
      max_daily_loss: strategy.max_daily_loss || -5,
      max_drawdown: strategy.max_drawdown || -10,
      volatility_threshold: strategy.volatility_threshold || 2.5,
      trend_strength_min: strategy.trend_strength_min || 60,
      volume_multiplier: strategy.volume_multiplier || 1.5,
      entry_confidence_min: strategy.entry_confidence_min || 70,
      profit_target: strategy.profit_target || 3.5,
      stop_loss: strategy.stop_loss || -1.8,
      trailing_stop: strategy.trailing_stop || false,
      trailing_stop_distance: strategy.trailing_stop_distance || 1.5,
      market_condition_filter: strategy.market_condition_filter || 'ALL',
      time_filter_enabled: strategy.time_filter_enabled || false,
      time_filter_start: strategy.time_filter_start || '09:30',
      time_filter_end: strategy.time_filter_end || '16:00',
      dynamic_adjustment: strategy.dynamic_adjustment !== false,
      adaptation_speed: strategy.adaptation_speed || 'MEDIUM',
      max_consecutive_losses: strategy.max_consecutive_losses || 3,
      cool_down_period: strategy.cool_down_period || 300
    });
  };

  const handleSave = () => {
    const saveData = {
      ...formData,
      max_position_size: formData.max_position_size / 100
    };

    if (selectedStrategy) {
      updateStrategyMutation.mutate({ id: selectedStrategy.id, data: saveData });
    } else {
      createStrategyMutation.mutate(saveData);
    }
  };

  const handleBacktest = () => {
    if (selectedStrategy) {
      navigate(createPageUrl('StrategyBacktest') + `?strategy_id=${selectedStrategy.id}`);
    } else {
      toast.error(language === 'en' ? 'Please save strategy first' : '請先儲存策略');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#00C6FF] to-[#0078FF] rounded-2xl flex items-center justify-center">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-1">
                {language === 'en' ? '⚙️ AI Strategy Configuration' : '⚙️ AI 策略配置'}
              </h1>
              <p className="text-gray-400">
                {language === 'en'
                  ? 'Configure and fine-tune AI trading strategies'
                  : '配置並微調 AI 交易策略'}
              </p>
            </div>
          </div>

          <Button
            onClick={() => {
              setIsCreating(true);
              setSelectedStrategy(null);
              resetForm();
            }}
            className="bg-[#00ff88] hover:bg-[#00cc7a] text-black font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            {language === 'en' ? 'New Strategy' : '新策略'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strategy List */}
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardHeader>
              <CardTitle className="text-white">
                {language === 'en' ? 'My Strategies' : '我的策略'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {strategies.map(strategy => (
                <div
                  key={strategy.id}
                  onClick={() => handleSelectStrategy(strategy)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedStrategy?.id === strategy.id
                      ? 'bg-[#00C6FF] text-black'
                      : 'bg-[#0d1b2a] text-white hover:bg-[#1a2332]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold">{strategy.strategy_name}</div>
                    {strategy.is_active && (
                      <div className="flex items-center gap-1 text-[#00ff88]">
                        <Activity className="w-4 h-4 animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="text-xs opacity-70 mb-2">
                    {strategy.risk_tolerance}
                  </div>
                  {strategy.win_rate > 0 && (
                    <div className="text-xs">
                      Win Rate: {strategy.win_rate.toFixed(1)}% | Trades: {strategy.total_trades}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Configuration Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-[#1a2332] border-[#00C6FF]/30">
              <CardHeader>
                <CardTitle className="text-white">
                  {isCreating || selectedStrategy
                    ? (language === 'en' ? 'Strategy Configuration' : '策略配置')
                    : (language === 'en' ? 'Select a strategy to edit' : '選擇一個策略進行編輯')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {(isCreating || selectedStrategy) && (
                  <>
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-white">{language === 'en' ? 'Strategy Name' : '策略名稱'}</Label>
                        <Input
                          value={formData.strategy_name}
                          onChange={(e) => setFormData({...formData, strategy_name: e.target.value})}
                          className="bg-[#0d1b2a] border-gray-700 text-white"
                        />
                      </div>

                      <div>
                        <Label className="text-white">{language === 'en' ? 'Description' : '描述'}</Label>
                        <Input
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          className="bg-[#0d1b2a] border-gray-700 text-white"
                        />
                      </div>

                      <div>
                        <Label className="text-white flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          {language === 'en' ? 'Risk Tolerance' : '風險容忍度'}
                        </Label>
                        <Select
                          value={formData.risk_tolerance}
                          onValueChange={(value) => setFormData({...formData, risk_tolerance: value})}
                        >
                          <SelectTrigger className="bg-[#0d1b2a] border-gray-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CONSERVATIVE">
                              {language === 'en' ? 'Conservative' : '保守型'}
                            </SelectItem>
                            <SelectItem value="MODERATE">
                              {language === 'en' ? 'Moderate' : '穩健型'}
                            </SelectItem>
                            <SelectItem value="AGGRESSIVE">
                              {language === 'en' ? 'Aggressive' : '激進型'}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Position & Risk Management */}
                    <Card className="bg-[#0d1b2a] border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">
                          {language === 'en' ? 'Position & Risk Management' : '倉位與風險管理'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-white">
                            {language === 'en' ? 'Max Position Size' : '最大倉位'}: {formData.max_position_size}%
                          </Label>
                          <Slider
                            value={[formData.max_position_size]}
                            onValueChange={([value]) => setFormData({...formData, max_position_size: value})}
                            min={1}
                            max={20}
                            step={0.5}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label className="text-white">
                            {language === 'en' ? 'Max Daily Loss' : '每日最大虧損'}: {formData.max_daily_loss}%
                          </Label>
                          <Slider
                            value={[Math.abs(formData.max_daily_loss)]}
                            onValueChange={([value]) => setFormData({...formData, max_daily_loss: -value})}
                            min={1}
                            max={20}
                            step={0.5}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label className="text-white">
                            {language === 'en' ? 'Max Drawdown' : '最大回撤'}: {formData.max_drawdown}%
                          </Label>
                          <Slider
                            value={[Math.abs(formData.max_drawdown)]}
                            onValueChange={([value]) => setFormData({...formData, max_drawdown: -value})}
                            min={5}
                            max={30}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Entry Conditions */}
                    <Card className="bg-[#0d1b2a] border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">
                          {language === 'en' ? 'Entry Conditions' : '進場條件'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-white">
                            {language === 'en' ? 'Volatility Threshold' : '波動率閾值'}: {formData.volatility_threshold}%
                          </Label>
                          <Slider
                            value={[formData.volatility_threshold]}
                            onValueChange={([value]) => setFormData({...formData, volatility_threshold: value})}
                            min={0.5}
                            max={10}
                            step={0.1}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label className="text-white">
                            {language === 'en' ? 'Min Trend Strength' : '最小趨勢強度'}: {formData.trend_strength_min}
                          </Label>
                          <Slider
                            value={[formData.trend_strength_min]}
                            onValueChange={([value]) => setFormData({...formData, trend_strength_min: value})}
                            min={0}
                            max={100}
                            step={5}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label className="text-white">
                            {language === 'en' ? 'Min Entry Confidence' : '最小進場信心'}: {formData.entry_confidence_min}%
                          </Label>
                          <Slider
                            value={[formData.entry_confidence_min]}
                            onValueChange={([value]) => setFormData({...formData, entry_confidence_min: value})}
                            min={50}
                            max={95}
                            step={5}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label className="text-white">
                            {language === 'en' ? 'Volume Multiplier' : '成交量倍數'}: {formData.volume_multiplier}x
                          </Label>
                          <Slider
                            value={[formData.volume_multiplier]}
                            onValueChange={([value]) => setFormData({...formData, volume_multiplier: value})}
                            min={1}
                            max={5}
                            step={0.1}
                            className="mt-2"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Exit Rules */}
                    <Card className="bg-[#0d1b2a] border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">
                          {language === 'en' ? 'Exit Rules' : '出場規則'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-white">
                            {language === 'en' ? 'Profit Target' : '獲利目標'}: {formData.profit_target}%
                          </Label>
                          <Slider
                            value={[formData.profit_target]}
                            onValueChange={([value]) => setFormData({...formData, profit_target: value})}
                            min={0.5}
                            max={10}
                            step={0.1}
                            className="mt-2"
                          />
                        </div>

                        <div>
                          <Label className="text-white">
                            {language === 'en' ? 'Stop Loss' : '停損'}: {formData.stop_loss}%
                          </Label>
                          <Slider
                            value={[Math.abs(formData.stop_loss)]}
                            onValueChange={([value]) => setFormData({...formData, stop_loss: -value})}
                            min={0.5}
                            max={5}
                            step={0.1}
                            className="mt-2"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label className="text-white">
                            {language === 'en' ? 'Trailing Stop' : '移動止損'}
                          </Label>
                          <Switch
                            checked={formData.trailing_stop}
                            onCheckedChange={(checked) => setFormData({...formData, trailing_stop: checked})}
                          />
                        </div>

                        {formData.trailing_stop && (
                          <div>
                            <Label className="text-white">
                              {language === 'en' ? 'Trailing Distance' : '移動距離'}: {formData.trailing_stop_distance}%
                            </Label>
                            <Slider
                              value={[formData.trailing_stop_distance]}
                              onValueChange={([value]) => setFormData({...formData, trailing_stop_distance: value})}
                              min={0.5}
                              max={5}
                              step={0.1}
                              className="mt-2"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Advanced Settings */}
                    <Card className="bg-[#0d1b2a] border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                          <Brain className="w-5 h-5" />
                          {language === 'en' ? 'Advanced AI Settings' : 'AI 進階設定'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-white">
                            {language === 'en' ? 'Dynamic Adjustment' : '動態調整'}
                          </Label>
                          <Switch
                            checked={formData.dynamic_adjustment}
                            onCheckedChange={(checked) => setFormData({...formData, dynamic_adjustment: checked})}
                          />
                        </div>

                        {formData.dynamic_adjustment && (
                          <div>
                            <Label className="text-white">
                              {language === 'en' ? 'Adaptation Speed' : '適應速度'}
                            </Label>
                            <Select
                              value={formData.adaptation_speed}
                              onValueChange={(value) => setFormData({...formData, adaptation_speed: value})}
                            >
                              <SelectTrigger className="bg-[#0d1b2a] border-gray-700 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SLOW">{language === 'en' ? 'Slow' : '慢速'}</SelectItem>
                                <SelectItem value="MEDIUM">{language === 'en' ? 'Medium' : '中速'}</SelectItem>
                                <SelectItem value="FAST">{language === 'en' ? 'Fast' : '快速'}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div>
                          <Label className="text-white">
                            {language === 'en' ? 'Market Condition Filter' : '市場條件過濾'}
                          </Label>
                          <Select
                            value={formData.market_condition_filter}
                            onValueChange={(value) => setFormData({...formData, market_condition_filter: value})}
                          >
                            <SelectTrigger className="bg-[#0d1b2a] border-gray-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">{language === 'en' ? 'All Conditions' : '所有條件'}</SelectItem>
                              <SelectItem value="BULL">{language === 'en' ? 'Bull Market Only' : '僅牛市'}</SelectItem>
                              <SelectItem value="BEAR">{language === 'en' ? 'Bear Market Only' : '僅熊市'}</SelectItem>
                              <SelectItem value="SIDEWAYS">{language === 'en' ? 'Sideways Only' : '僅盤整'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-white">
                            {language === 'en' ? 'Max Consecutive Losses' : '最大連續虧損'}
                          </Label>
                          <Input
                            type="number"
                            value={formData.max_consecutive_losses}
                            onChange={(e) => setFormData({...formData, max_consecutive_losses: parseInt(e.target.value)})}
                            className="bg-[#0d1b2a] border-gray-700 text-white"
                          />
                        </div>

                        <div>
                          <Label className="text-white">
                            {language === 'en' ? 'Cool Down Period (seconds)' : '冷卻期（秒）'}
                          </Label>
                          <Input
                            type="number"
                            value={formData.cool_down_period}
                            onChange={(e) => setFormData({...formData, cool_down_period: parseInt(e.target.value)})}
                            className="bg-[#0d1b2a] border-gray-700 text-white"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        onClick={handleSave}
                        disabled={!formData.strategy_name}
                        className="flex-1 bg-[#00C6FF] hover:bg-[#0078FF] text-black font-semibold"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {language === 'en' ? 'Save Strategy' : '儲存策略'}
                      </Button>

                      <Button
                        onClick={handleBacktest}
                        disabled={!selectedStrategy}
                        className="flex-1 bg-[#00ff88] hover:bg-[#00cc7a] text-black font-semibold"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {language === 'en' ? 'Backtest' : '回測'}
                      </Button>

                      {selectedStrategy && (
                        <Button
                          onClick={() => deleteStrategyMutation.mutate(selectedStrategy.id)}
                          variant="outline"
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}