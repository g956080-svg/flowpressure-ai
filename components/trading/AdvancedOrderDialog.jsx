import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../Layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart,
  DollarSign,
  Shield,
  Target,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Zap,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

export default function AdvancedOrderDialog({ 
  isOpen, 
  onClose, 
  symbol, 
  currentPrice, 
  pressure, 
  sentiment 
}) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const [orderType, setOrderType] = useState('MARKET');
  const [side, setSide] = useState('BUY');
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  
  // Stop Loss & Take Profit
  const [stopLossType, setStopLossType] = useState('percent'); // 'percent' or 'price'
  const [stopLossPercent, setStopLossPercent] = useState(-2);
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [takeProfitType, setTakeProfitType] = useState('percent');
  const [takeProfitPercent, setTakeProfitPercent] = useState(5);
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  
  // Advanced Features
  const [trailingStop, setTrailingStop] = useState(false);
  const [trailingDistance, setTrailingDistance] = useState(1.5);
  const [pressureTrigger, setPressureTrigger] = useState('');
  const [pressureCondition, setPressureCondition] = useState('NONE');
  const [sentimentTrigger, setSentimentTrigger] = useState('ANY');

  // AI Analysis
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [costEstimate, setCostEstimate] = useState(null);

  // OCO Settings
  const [ocoEnabled, setOcoEnabled] = useState(false);
  const [ocoStopPrice, setOcoStopPrice] = useState('');
  const [ocoLimitPrice, setOcoLimitPrice] = useState('');

  // Update prices based on current price
  useEffect(() => {
    if (currentPrice) {
      if (stopLossType === 'percent' && stopLossPercent) {
        const calculatedPrice = currentPrice * (1 + stopLossPercent / 100);
        setStopLossPrice(calculatedPrice.toFixed(2));
      }
      if (takeProfitType === 'percent' && takeProfitPercent) {
        const calculatedPrice = currentPrice * (1 + takeProfitPercent / 100);
        setTakeProfitPrice(calculatedPrice.toFixed(2));
      }
    }
  }, [currentPrice, stopLossPercent, takeProfitPercent, stopLossType, takeProfitType]);

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const response = await base44.functions.invoke('advancedOrderEngine', {
        mode: 'create',
        order_data: orderData
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['advancedOrders']);
      queryClient.invalidateQueries(['manualTrades']);
      
      setAiAnalysis(data.ai_analysis);
      setCostEstimate(data.cost_estimate);

      toast.success(
        language === 'en'
          ? `✅ Order created! AI Confidence: ${data.ai_analysis.confidence}%`
          : `✅ 訂單已創建！AI 信心度：${data.ai_analysis.confidence}%`
      );

      // Auto close after 2 seconds if AI confidence is high
      if (data.ai_analysis.confidence >= 70) {
        setTimeout(() => onClose(), 2000);
      }
    },
    onError: (error) => {
      toast.error(
        language === 'en'
          ? `❌ Order failed: ${error.message}`
          : `❌ 訂單失敗：${error.message}`
      );
    }
  });

  const handleSubmit = () => {
    const orderData = {
      symbol,
      order_type: orderType,
      side,
      quantity: Number(quantity),
      entry_price: orderType === 'LIMIT' ? Number(limitPrice) : currentPrice,
      limit_price: orderType === 'LIMIT' ? Number(limitPrice) : null,
      stop_loss_percent: stopLossType === 'percent' ? Number(stopLossPercent) : null,
      stop_loss_price: stopLossType === 'price' ? Number(stopLossPrice) : null,
      take_profit_percent: takeProfitType === 'percent' ? Number(takeProfitPercent) : null,
      take_profit_price: takeProfitType === 'price' ? Number(takeProfitPrice) : null,
      trailing_stop: trailingStop,
      trailing_stop_distance: trailingStop ? Number(trailingDistance) : null,
      pressure_trigger: pressureCondition !== 'NONE' ? Number(pressureTrigger) : null,
      pressure_condition: pressureCondition,
      sentiment_trigger: sentimentTrigger
    };

    // Handle OCO
    if (orderType === 'OCO' && ocoEnabled) {
      orderData.oco_pair_data = {
        order_type: 'STOP_LOSS',
        side: side === 'BUY' ? 'SELL' : 'BUY',
        stop_loss_price: Number(ocoStopPrice)
      };
    }

    createOrderMutation.mutate(orderData);
  };

  const estimatedCost = currentPrice && quantity 
    ? (currentPrice * quantity * (1 + 0.008 + 0.0005)).toFixed(2)
    : '0.00';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-[#00C6FF]/30 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-3">
            <Zap className="w-6 h-6 text-[#00C6FF]" />
            {language === 'en' ? 'Advanced Order' : '進階訂單'}
            <Badge className="bg-[#00C6FF]/20 text-[#00C6FF]">{symbol}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Market Info */}
          <div className="p-3 bg-[#0d1b2a] rounded-lg grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-gray-500">{language === 'en' ? 'Price' : '價格'}</div>
              <div className="text-lg font-bold text-white">${currentPrice?.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{language === 'en' ? 'Pressure' : '壓力'}</div>
              <div className="text-lg font-bold text-[#00C6FF]">{pressure?.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{language === 'en' ? 'Sentiment' : '情緒'}</div>
              <div className="text-sm font-bold text-white capitalize">{sentiment}</div>
            </div>
          </div>

          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 bg-[#0d1b2a]">
              <TabsTrigger value="basic">
                {language === 'en' ? 'Basic' : '基本'}
              </TabsTrigger>
              <TabsTrigger value="risk">
                {language === 'en' ? 'Risk Management' : '風險管理'}
              </TabsTrigger>
              <TabsTrigger value="advanced">
                {language === 'en' ? 'Advanced' : '進階'}
              </TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white mb-2 block">
                    {language === 'en' ? 'Order Type' : '訂單類型'}
                  </Label>
                  <Select value={orderType} onValueChange={setOrderType}>
                    <SelectTrigger className="bg-[#0d1b2a] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MARKET">{language === 'en' ? 'Market' : '市價'}</SelectItem>
                      <SelectItem value="LIMIT">{language === 'en' ? 'Limit' : '限價'}</SelectItem>
                      <SelectItem value="BRACKET">{language === 'en' ? 'Bracket' : '括弧'}</SelectItem>
                      <SelectItem value="OCO">{language === 'en' ? 'OCO' : 'OCO'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white mb-2 block">
                    {language === 'en' ? 'Side' : '方向'}
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => setSide('BUY')}
                      className={side === 'BUY' 
                        ? 'bg-[#00ff88] text-black' 
                        : 'bg-[#0d1b2a] text-gray-400'}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      BUY
                    </Button>
                    <Button
                      onClick={() => setSide('SELL')}
                      className={side === 'SELL' 
                        ? 'bg-[#ff4d4d] text-white' 
                        : 'bg-[#0d1b2a] text-gray-400'}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      SELL
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-white mb-2 block">
                  {language === 'en' ? 'Quantity' : '數量'}
                </Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="bg-[#0d1b2a] border-gray-700 text-white"
                />
              </div>

              {orderType === 'LIMIT' && (
                <div>
                  <Label className="text-white mb-2 block">
                    {language === 'en' ? 'Limit Price' : '限價'}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder={currentPrice?.toFixed(2)}
                    className="bg-[#0d1b2a] border-gray-700 text-white"
                  />
                </div>
              )}

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">
                    {language === 'en' ? 'Estimated Cost' : '預估成本'}
                  </span>
                  <span className="text-lg font-bold text-white">
                    ${estimatedCost}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'en' 
                    ? 'Includes 0.8% fee + 0.05% slippage + 3s delay'
                    : '包含 0.8% 手續費 + 0.05% 滑價 + 3秒 延遲'}
                </p>
              </div>
            </TabsContent>

            {/* Risk Management Tab */}
            <TabsContent value="risk" className="space-y-4">
              {/* Stop Loss */}
              <div className="p-4 bg-[#ff4d4d]/10 border border-[#ff4d4d]/30 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#ff4d4d]" />
                  <Label className="text-white text-base">
                    {language === 'en' ? 'Stop Loss' : '停損'}
                  </Label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setStopLossType('percent')}
                    variant={stopLossType === 'percent' ? 'default' : 'outline'}
                    size="sm"
                    className={stopLossType === 'percent' ? 'bg-[#ff4d4d]' : ''}
                  >
                    {language === 'en' ? 'Percentage' : '百分比'}
                  </Button>
                  <Button
                    onClick={() => setStopLossType('price')}
                    variant={stopLossType === 'price' ? 'default' : 'outline'}
                    size="sm"
                    className={stopLossType === 'price' ? 'bg-[#ff4d4d]' : ''}
                  >
                    {language === 'en' ? 'Price' : '價格'}
                  </Button>
                </div>

                {stopLossType === 'percent' ? (
                  <div>
                    <Label className="text-white text-sm mb-2 block">
                      {language === 'en' ? 'Stop Loss %' : '停損 %'}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={stopLossPercent}
                      onChange={(e) => setStopLossPercent(Number(e.target.value))}
                      className="bg-[#0d1b2a] border-gray-700 text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {language === 'en' ? 'Price:' : '價格：'} ${stopLossPrice}
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label className="text-white text-sm mb-2 block">
                      {language === 'en' ? 'Stop Loss Price' : '停損價格'}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={stopLossPrice}
                      onChange={(e) => setStopLossPrice(e.target.value)}
                      className="bg-[#0d1b2a] border-gray-700 text-white"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white text-sm">
                      {language === 'en' ? 'Trailing Stop' : '移動止損'}
                    </Label>
                    <p className="text-xs text-gray-500">
                      {language === 'en' ? 'Follow price movement' : '跟隨價格移動'}
                    </p>
                  </div>
                  <Switch
                    checked={trailingStop}
                    onCheckedChange={setTrailingStop}
                  />
                </div>

                {trailingStop && (
                  <div>
                    <Label className="text-white text-sm mb-2 block">
                      {language === 'en' ? 'Trailing Distance %' : '移動距離 %'}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={trailingDistance}
                      onChange={(e) => setTrailingDistance(Number(e.target.value))}
                      className="bg-[#0d1b2a] border-gray-700 text-white"
                    />
                  </div>
                )}
              </div>

              {/* Take Profit */}
              <div className="p-4 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#00ff88]" />
                  <Label className="text-white text-base">
                    {language === 'en' ? 'Take Profit' : '停利'}
                  </Label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setTakeProfitType('percent')}
                    variant={takeProfitType === 'percent' ? 'default' : 'outline'}
                    size="sm"
                    className={takeProfitType === 'percent' ? 'bg-[#00ff88] text-black' : ''}
                  >
                    {language === 'en' ? 'Percentage' : '百分比'}
                  </Button>
                  <Button
                    onClick={() => setTakeProfitType('price')}
                    variant={takeProfitType === 'price' ? 'default' : 'outline'}
                    size="sm"
                    className={takeProfitType === 'price' ? 'bg-[#00ff88] text-black' : ''}
                  >
                    {language === 'en' ? 'Price' : '價格'}
                  </Button>
                </div>

                {takeProfitType === 'percent' ? (
                  <div>
                    <Label className="text-white text-sm mb-2 block">
                      {language === 'en' ? 'Take Profit %' : '停利 %'}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={takeProfitPercent}
                      onChange={(e) => setTakeProfitPercent(Number(e.target.value))}
                      className="bg-[#0d1b2a] border-gray-700 text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {language === 'en' ? 'Price:' : '價格：'} ${takeProfitPrice}
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label className="text-white text-sm mb-2 block">
                      {language === 'en' ? 'Take Profit Price' : '停利價格'}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={takeProfitPrice}
                      onChange={(e) => setTakeProfitPrice(e.target.value)}
                      className="bg-[#0d1b2a] border-gray-700 text-white"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              {/* Pressure Trigger */}
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-3">
                <Label className="text-white text-base">
                  {language === 'en' ? 'Pressure-Based Trigger' : '壓力觸發條件'}
                </Label>

                <div>
                  <Label className="text-white text-sm mb-2 block">
                    {language === 'en' ? 'Condition' : '條件'}
                  </Label>
                  <Select value={pressureCondition} onValueChange={setPressureCondition}>
                    <SelectTrigger className="bg-[#0d1b2a] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">{language === 'en' ? 'None' : '無'}</SelectItem>
                      <SelectItem value="ABOVE">{language === 'en' ? 'Above' : '高於'}</SelectItem>
                      <SelectItem value="BELOW">{language === 'en' ? 'Below' : '低於'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {pressureCondition !== 'NONE' && (
                  <div>
                    <Label className="text-white text-sm mb-2 block">
                      {language === 'en' ? 'Pressure Value' : '壓力值'}
                    </Label>
                    <Input
                      type="number"
                      value={pressureTrigger}
                      onChange={(e) => setPressureTrigger(e.target.value)}
                      placeholder={pressure?.toFixed(0)}
                      className="bg-[#0d1b2a] border-gray-700 text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {language === 'en' 
                        ? `Current pressure: ${pressure?.toFixed(0)}`
                        : `當前壓力：${pressure?.toFixed(0)}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Sentiment Trigger */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-3">
                <Label className="text-white text-base">
                  {language === 'en' ? 'Sentiment Filter' : '情緒過濾'}
                </Label>

                <Select value={sentimentTrigger} onValueChange={setSentimentTrigger}>
                  <SelectTrigger className="bg-[#0d1b2a] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">{language === 'en' ? 'Any' : '任意'}</SelectItem>
                    <SelectItem value="POSITIVE">{language === 'en' ? 'Positive Only' : '僅正面'}</SelectItem>
                    <SelectItem value="NEGATIVE">{language === 'en' ? 'Negative Only' : '僅負面'}</SelectItem>
                    <SelectItem value="NEUTRAL">{language === 'en' ? 'Neutral Only' : '僅中性'}</SelectItem>
                  </SelectContent>
                </Select>

                <p className="text-xs text-gray-400">
                  {language === 'en' 
                    ? `Current sentiment: ${sentiment}`
                    : `當前情緒：${sentiment === 'positive' ? '正面' : sentiment === 'negative' ? '負面' : '中性'}`}
                </p>
              </div>

              {/* OCO Settings */}
              {orderType === 'OCO' && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-white text-base">
                      {language === 'en' ? 'OCO Pair' : 'OCO 配對'}
                    </Label>
                    <Switch
                      checked={ocoEnabled}
                      onCheckedChange={setOcoEnabled}
                    />
                  </div>

                  {ocoEnabled && (
                    <>
                      <p className="text-xs text-gray-400">
                        {language === 'en'
                          ? 'One order fills, the other cancels automatically'
                          : '一個訂單成交，另一個自動取消'}
                      </p>
                      
                      <div>
                        <Label className="text-white text-sm mb-2 block">
                          {language === 'en' ? 'Stop Price' : '停損價格'}
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={ocoStopPrice}
                          onChange={(e) => setOcoStopPrice(e.target.value)}
                          className="bg-[#0d1b2a] border-gray-700 text-white"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* AI Analysis Result */}
          {aiAnalysis && (
            <div className={`p-4 rounded-lg ${
              aiAnalysis.confidence >= 70 
                ? 'bg-[#00ff88]/10 border border-[#00ff88]/30' 
                : aiAnalysis.confidence >= 50
                ? 'bg-yellow-500/10 border border-yellow-500/30'
                : 'bg-[#ff4d4d]/10 border border-[#ff4d4d]/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white">
                  {language === 'en' ? 'AI Analysis' : 'AI 分析'}
                </Label>
                <Badge className={
                  aiAnalysis.confidence >= 70 ? 'bg-[#00ff88] text-black' :
                  aiAnalysis.confidence >= 50 ? 'bg-yellow-500 text-black' :
                  'bg-[#ff4d4d] text-white'
                }>
                  {aiAnalysis.confidence}% {language === 'en' ? 'Confidence' : '信心度'}
                </Badge>
              </div>
              <p className="text-sm text-white">
                {language === 'en' ? aiAnalysis.reasoning_en : aiAnalysis.reasoning_zh}
              </p>
            </div>
          )}

          {/* Cost Estimate */}
          {costEstimate && (
            <div className="p-3 bg-[#0d1b2a] rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{language === 'en' ? 'Base Cost:' : '基本成本：'}</span>
                <span className="text-white">${costEstimate.baseCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{language === 'en' ? 'Fee (0.8%):' : '手續費 (0.8%)：'}</span>
                <span className="text-white">${costEstimate.fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{language === 'en' ? 'Slippage (0.05%):' : '滑價 (0.05%)：'}</span>
                <span className="text-white">${costEstimate.slippage.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-gray-700 pt-2">
                <span className="text-gray-400">{language === 'en' ? 'Total:' : '總計：'}</span>
                <span className="text-[#00C6FF]">${costEstimate.total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-gray-700 text-gray-300"
          >
            {language === 'en' ? 'Cancel' : '取消'}
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={createOrderMutation.isLoading || !quantity || quantity <= 0}
            className="bg-[#00C6FF] hover:bg-[#0078FF] text-black"
          >
            {createOrderMutation.isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {language === 'en' ? 'Creating...' : '創建中...'}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Place Order' : '下單'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}