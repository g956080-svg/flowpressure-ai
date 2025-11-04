import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, DollarSign, Loader2, AlertCircle } from "lucide-react";
import { useLanguage } from "../../Layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function SimulateBuyDialog({ stock, isOpen, onClose }) {
  const { language } = useLanguage();
  const [quantity, setQuantity] = useState("1");
  const queryClient = useQueryClient();

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['virtualAccount'],
    queryFn: async () => {
      const accounts = await base44.entities.VirtualAccount.list();
      if (accounts.length > 0) return accounts[0];
      return await base44.entities.VirtualAccount.create({
        total_capital: 10000,
        available_cash: 10000,
        total_invested: 0,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_gain_loss: 0,
        win_rate: 0
      });
    }
  });

  const { data: existingPosition } = useQuery({
    queryKey: ['existingPosition', stock.id],
    queryFn: async () => {
      const trades = await base44.entities.SimulatedTrade.list();
      return trades.find(t => t.stock_id === stock.id && t.status === 'ACTIVE');
    },
    enabled: isOpen
  });

  const createTradeMutation = useMutation({
    mutationFn: async (tradeData) => {
      if (!account) return;
      
      const trade = await base44.entities.SimulatedTrade.create(tradeData);
      
      await base44.entities.VirtualAccount.update(account.id, {
        available_cash: account.available_cash - tradeData.amount,
        total_invested: account.total_invested + tradeData.amount,
        total_trades: account.total_trades + 1
      });
      
      return trade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtualAccount'] });
      queryClient.invalidateQueries({ queryKey: ['simulatedTrades'] });
      queryClient.invalidateQueries({ queryKey: ['activeTrades'] });
      queryClient.invalidateQueries({ queryKey: ['existingPosition'] });
      onClose();
      setQuantity("1");
    },
  });

  const deleteTradeMutation = useMutation({
    mutationFn: async (tradeId) => {
      await base44.entities.SimulatedTrade.delete(tradeId);
      
      if (existingPosition && account) {
        await base44.entities.VirtualAccount.update(account.id, {
          total_invested: account.total_invested - existingPosition.amount
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulatedTrades'] });
      queryClient.invalidateQueries({ queryKey: ['activeTrades'] });
      queryClient.invalidateQueries({ queryKey: ['existingPosition'] });
      queryClient.invalidateQueries({ queryKey: ['virtualAccount'] });
    },
  });

  const handleBuy = async () => {
    if (!account) {
      alert(language === 'en' ? 'Loading account data...' : '載入帳戶資料中...');
      return;
    }

    const shares = parseFloat(quantity);
    
    if (!shares || shares <= 0 || shares > 999) {
      alert(language === 'en' 
        ? 'Please enter a valid quantity (1-999 shares)' 
        : '請輸入有效股數（1-999股）');
      return;
    }

    const amount = stock.price * shares;

    if (amount > account.available_cash) {
      alert(language === 'en' 
        ? 'Insufficient virtual funds.' 
        : '虛擬資金不足，請先平倉或減少股數。');
      return;
    }

    await createTradeMutation.mutateAsync({
      stock_id: stock.id,
      symbol: stock.symbol,
      company_name: stock.name,
      amount: amount,
      shares: shares,
      entry_price: stock.price,
      entry_time: new Date().toISOString(),
      entry_flow: stock.flow,
      exit_flow: null,
      entry_confidence: stock.confidence,
      exit_confidence: null,
      entry_comment_en: stock.ai_comment_en,
      entry_comment_zh: stock.ai_comment_zh,
      status: "ACTIVE"
    });
  };

  const handleClosePosition = async () => {
    if (existingPosition) {
      await deleteTradeMutation.mutateAsync(existingPosition.id);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['existingPosition', stock.id] });
      }, 500);
    }
  };

  const totalCost = parseFloat(quantity) * stock.price || 0;
  const canAfford = account ? totalCost <= account.available_cash : false;

  if (accountLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-[#151a21] border-gray-800 text-white">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-[#00ff99] animate-spin mx-auto mb-4" />
              <p className="text-gray-400">
                {language === 'en' ? 'Loading account...' : '載入帳戶中...'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!account) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#151a21] border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {existingPosition 
              ? (language === 'en' ? 'Position Exists' : '已有持倉')
              : (language === 'en' ? 'Simulate Buy' : '模擬買進')}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {stock.symbol} - {stock.name}
          </DialogDescription>
        </DialogHeader>

        {existingPosition ? (
          <div className="space-y-6">
            <div className="bg-[#ffaa00]/10 border border-[#ffaa00]/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-[#ffaa00] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white mb-2">
                    {language === 'en' 
                      ? `⚠ You already hold ${existingPosition.shares} share${existingPosition.shares > 1 ? 's' : ''} of this stock`
                      : `⚠ 你已持有此股 ${existingPosition.shares} 股模擬倉位`}
                  </h3>
                  <p className="text-sm text-gray-300 mb-3">
                    {language === 'en'
                      ? 'Would you like to close the current position and reset?'
                      : '是否要平倉重置？'}
                  </p>
                  <div className="bg-black/30 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{language === 'en' ? 'Shares Held' : '持有股數'}</span>
                      <span className="font-semibold text-white">{existingPosition.shares}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{language === 'en' ? 'Entry Price' : '進場價'}</span>
                      <span className="font-semibold text-white">${existingPosition.entry_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{language === 'en' ? 'Current Price' : '當前價'}</span>
                      <span className="font-semibold text-white">${stock.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{language === 'en' ? 'Unrealized P/L' : '未實現損益'}</span>
                      <span className={`font-semibold ${stock.price >= existingPosition.entry_price ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
                        {stock.price >= existingPosition.entry_price ? '+' : ''}
                        ${((stock.price - existingPosition.entry_price) * existingPosition.shares).toFixed(2)} 
                        ({((stock.price - existingPosition.entry_price) / existingPosition.entry_price * 100).toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                {language === 'en' ? 'Keep Position' : '保持持倉'}
              </Button>
              <Button
                onClick={handleClosePosition}
                disabled={deleteTradeMutation.isLoading}
                className="flex-1 bg-[#ff4d4d] hover:bg-[#ff3333] text-white font-semibold"
              >
                {deleteTradeMutation.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'en' ? 'Closing...' : '平倉中...'}
                  </>
                ) : (
                  language === 'en' ? 'Close Position' : '平倉重置'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className={`p-4 rounded-xl border ${
              stock.flow === 'IN' ? 'bg-[#00ff99]/10 border-[#00ff99]/30' :
              stock.flow === 'OUT' ? 'bg-[#ff4d4d]/10 border-[#ff4d4d]/30' :
              'bg-[#ffaa00]/10 border-[#ffaa00]/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">
                  {language === 'en' ? 'Current Signal' : '當前訊號'}
                </span>
                <span className="font-semibold">
                  {stock.flow === 'IN' && '🟢 ' + (language === 'en' ? 'Entry' : '進場')}
                  {stock.flow === 'OUT' && '🔴 ' + (language === 'en' ? 'Exit' : '出場')}
                  {stock.flow === 'NEUTRAL' && '🟠 ' + (language === 'en' ? 'Neutral' : '中立')}
                </span>
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {language === 'en' ? 'Flow Strength' : '資金流入強度'}: {stock.confidence}/100
              </div>
              <p className="text-sm text-gray-300">
                {language === 'en' ? stock.ai_comment_en : stock.ai_comment_zh}
              </p>
            </div>

            <div className="bg-[#0b0f14] rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">{language === 'en' ? 'Current Price' : '當前價格'}</span>
                <span className="font-bold text-white">${stock.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{language === 'en' ? 'Available Cash' : '可用資金'}</span>
                <span className="font-bold text-[#00ff99]">${account.available_cash.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-white">
                {language === 'en' ? 'Enter number of shares to buy' : '輸入要購買的股數'}
              </Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="bg-[#0b0f14] border-gray-700 text-white"
                min="1"
                max="999"
              />
              <div className="flex gap-2 mt-2">
                {[1, 5, 10, 50].map(preset => (
                  <Button
                    key={preset}
                    onClick={() => setQuantity(preset.toString())}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>

            {quantity && parseFloat(quantity) > 0 && (
              <div className="bg-[#00ff99]/10 border border-[#00ff99]/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-[#00ff99]" />
                  <span className="font-semibold text-white">
                    {language === 'en' ? 'Trade Summary' : '交易摘要'}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{language === 'en' ? 'Shares' : '股數'}</span>
                    <span className="font-semibold text-white">{quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{language === 'en' ? 'Price per Share' : '每股價格'}</span>
                    <span className="font-semibold text-white">${stock.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-700">
                    <span className="text-gray-400">{language === 'en' ? 'Total Cost' : '總額'}</span>
                    <span className={`font-bold text-lg ${canAfford ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
                      ${totalCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{language === 'en' ? 'Remaining Cash' : '剩餘資金'}</span>
                    <span className={`font-semibold ${canAfford ? 'text-white' : 'text-[#ff4d4d]'}`}>
                      ${canAfford ? (account.available_cash - totalCost).toFixed(2) : account.available_cash.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!canAfford && quantity && parseFloat(quantity) > 0 && (
              <div className="bg-[#ff4d4d]/10 border border-[#ff4d4d]/30 rounded-xl p-3">
                <p className="text-sm text-[#ff4d4d]">
                  ⚠ {language === 'en' 
                    ? 'Insufficient virtual funds. Reduce quantity or close other positions.'
                    : '虛擬資金不足，請減少股數或平倉其他持股。'}
                </p>
              </div>
            )}

            {stock.flow === 'OUT' && (
              <div className="bg-[#ff4d4d]/10 border border-[#ff4d4d]/30 rounded-xl p-3">
                <p className="text-sm text-[#ff4d4d]">
                  ⚠ {language === 'en' 
                    ? 'Warning: Exit signal detected. Not recommended to buy.'
                    : '警告：偵測到出場訊號，不建議買進。'}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                {language === 'en' ? 'Cancel' : '取消'}
              </Button>
              <Button
                onClick={handleBuy}
                disabled={createTradeMutation.isLoading || !canAfford || !quantity || parseFloat(quantity) <= 0}
                className="flex-1 bg-gradient-to-r from-[#00ff99] to-[#00cc7a] text-black hover:from-[#00cc7a] hover:to-[#00ff99] font-semibold"
              >
                {createTradeMutation.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'en' ? 'Processing...' : '處理中...'}
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'Confirm Buy' : '確認買進'}
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              {language === 'en'
                ? '⚠️ This is a learning simulation. No real funds are involved.'
                : '⚠️ 模擬交易僅供學習使用，不涉及任何真實金錢交易。'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}