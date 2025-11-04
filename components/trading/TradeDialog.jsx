import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function TradeDialog({ quote, action, position, onClose }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(position ? position.quantity : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const executeTradeMutation = useMutation({
    mutationFn: async (tradeData) => {
      const response = await base44.functions.invoke('simulateTrade', tradeData);
      return response;
    },
    onSuccess: (data) => {
      if (data.data.success) {
        toast.success(
          language === 'en'
            ? `✅ ${action === 'BUY' ? 'Bought' : 'Sold'} ${quantity} shares`
            : `✅ ${action === 'BUY' ? '買進' : '賣出'} ${quantity} 股`
        );
        queryClient.invalidateQueries(['account']);
        queryClient.invalidateQueries(['positions']);
        queryClient.invalidateQueries(['tradeHistory']);
        onClose();
      } else {
        toast.error(data.data.message || 'Trade failed');
      }
    },
    onError: (error) => {
      toast.error(
        language === 'en' ? `❌ Failed: ${error.message}` : `❌ 失敗：${error.message}`
      );
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (quantity <= 0) {
      toast.error(language === 'en' ? 'Quantity must be greater than 0' : '數量必須大於 0');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await executeTradeMutation.mutateAsync({
        action,
        symbol: quote.symbol,
        quantity: parseInt(quantity),
        price: quote.last_price
      });
    } catch (error) {
      console.error('Trade error:', error);
    }
    
    setIsSubmitting(false);
  };

  const totalCost = (quote.last_price || 0) * quantity;
  const isBuy = action === 'BUY';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-[#151a21] border-gray-800 max-w-md w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            {isBuy ? (
              <>
                <TrendingUp className="w-5 h-5 text-[#00ff99]" />
                {language === 'en' ? 'Buy Stock' : '買進股票'}
              </>
            ) : (
              <>
                <TrendingDown className="w-5 h-5 text-[#ff4d4d]" />
                {language === 'en' ? 'Sell Stock' : '賣出股票'}
              </>
            )}
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Stock Info */}
            <div className="bg-[#0b0f14] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">{language === 'en' ? 'Symbol' : '代號'}</span>
                <span className="text-xl font-bold text-white">{quote.symbol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{language === 'en' ? 'Current Price' : '當前價格'}</span>
                <span className="text-xl font-bold text-white">${(quote.last_price || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                {language === 'en' ? 'Quantity (Shares)' : '數量（股）'}
              </label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="bg-[#0b0f14] border-gray-700 text-white text-lg"
                disabled={isSubmitting}
              />
            </div>

            {/* Position Info (for SELL) */}
            {!isBuy && position && (
              <div className="bg-[#0b0f14] rounded-xl p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{language === 'en' ? 'Available to Sell' : '可賣出數量'}</span>
                  <span className="text-white font-semibold">{position.quantity} {language === 'en' ? 'shares' : '股'}</span>
                </div>
              </div>
            )}

            {/* Total Cost */}
            <div className={`rounded-xl p-4 border-2 ${
              isBuy ? 'bg-[#00ff99]/10 border-[#00ff99]/30' : 'bg-[#ff4d4d]/10 border-[#ff4d4d]/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className={`w-5 h-5 ${isBuy ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`} />
                  <span className="text-white font-semibold">
                    {language === 'en' ? 'Total' : '總計'}
                  </span>
                </div>
                <span className={`text-2xl font-bold ${isBuy ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
                  ${totalCost.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 border-gray-700 text-gray-300"
                disabled={isSubmitting}
              >
                {language === 'en' ? 'Cancel' : '取消'}
              </Button>
              <Button
                type="submit"
                className={`flex-1 ${
                  isBuy
                    ? 'bg-[#00ff99] hover:bg-[#00cc7a] text-black'
                    : 'bg-[#ff4d4d] hover:bg-[#cc3a3a] text-white'
                } font-semibold`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  language === 'en' ? 'Processing...' : '處理中...'
                ) : (
                  <>
                    {isBuy ? (
                      <>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        {language === 'en' ? `Buy ${quantity} Share${quantity > 1 ? 's' : ''}` : `買進 ${quantity} 股`}
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 mr-2" />
                        {language === 'en' ? `Sell ${quantity} Share${quantity > 1 ? 's' : ''}` : `賣出 ${quantity} 股`}
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}