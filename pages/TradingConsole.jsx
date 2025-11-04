import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Gauge, 
  TrendingUp, 
  Bot, 
  Zap,
  Activity
} from "lucide-react";

// Import trading components
import RealTimeTrading from "./RealTimeTrading";
import ManualTrading from "./ManualTrading";
import AutoTradeAI from "./AutoTradeAI";
import TestTrading from "./TestTrading";

export default function TradingConsole() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("live");

  // Get URL params
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');

  // Set tab from URL on mount
  React.useEffect(() => {
    if (tabParam && ['live', 'manual', 'auto', 'test'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Query account state
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: accountState } = useQuery({
    queryKey: ['accountState'],
    queryFn: async () => {
      if (!user) return null;
      const accounts = await base44.entities.AccountState.filter({ user_id: user.email });
      if (accounts.length === 0) {
        return await base44.entities.AccountState.create({
          user_id: user.email,
          cash_balance: 100000,
          equity_value: 0,
          total_value: 100000,
          trading_locked: false,
          last_update: new Date().toISOString()
        });
      }
      return accounts[0];
    },
    enabled: !!user,
    refetchInterval: 10000
  });

  const tabs = [
    {
      value: "live",
      label: language === 'en' ? 'Live Trading' : '即時交易',
      icon: Zap,
      color: "text-[#00ff99]",
      description: language === 'en' ? 'Real-time market trading' : '即時市場交易'
    },
    {
      value: "manual",
      label: language === 'en' ? 'Manual Trading' : '手動交易',
      icon: TrendingUp,
      color: "text-blue-400",
      description: language === 'en' ? 'Manual trade execution' : '手動執行交易'
    },
    {
      value: "auto",
      label: language === 'en' ? 'AI Auto-Trade' : 'AI 自動交易',
      icon: Bot,
      color: "text-purple-400",
      description: language === 'en' ? 'AI-powered trading' : 'AI 驅動交易'
    },
    {
      value: "test",
      label: language === 'en' ? 'Test Trading' : '測試交易',
      icon: Activity,
      color: "text-yellow-400",
      description: language === 'en' ? 'Practice trading' : '練習交易'
    }
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#00ff99] to-[#00cc7a] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00ff99]/20">
            <Gauge className="w-8 h-8 text-black" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">
              {language === 'en' ? '⚡ Trading Console' : '⚡ 交易工作台'}
            </h1>
            <p className="text-gray-400">
              {language === 'en' 
                ? 'Real-time trading, AI automation, and practice modes'
                : '即時交易、AI 自動化與練習模式'}
            </p>
          </div>
        </div>

        {/* Account Summary Card */}
        {accountState && (
          <Card className="bg-gradient-to-r from-[#00ff99]/10 to-transparent bg-[#1a2332] border-2 border-[#00ff99]/50">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Cash Balance' : '現金餘額'}
                  </div>
                  <div className="text-2xl font-bold text-white">
                    ${accountState.cash_balance?.toLocaleString() || '0'}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Equity Value' : '股票市值'}
                  </div>
                  <div className="text-2xl font-bold text-white">
                    ${accountState.equity_value?.toLocaleString() || '0'}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Total Value' : '總資產'}
                  </div>
                  <div className="text-2xl font-bold gradient-text">
                    ${accountState.total_value?.toLocaleString() || '0'}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-400 mb-1">
                    {language === 'en' ? 'Status' : '狀態'}
                  </div>
                  <Badge className={accountState.trading_locked ? 'bg-red-500/20 text-red-400' : 'bg-[#00ff99]/20 text-[#00ff99]'}>
                    {accountState.trading_locked 
                      ? (language === 'en' ? 'Locked' : '已鎖定')
                      : (language === 'en' ? 'Active' : '活躍')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-[#1a2332] border border-[#00C6FF]/30 p-1 grid grid-cols-2 md:grid-cols-4 gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-[#00C6FF] data-[state=active]:text-black transition-all"
                >
                  <Icon className={`w-4 h-4 mr-2 ${tab.color}`} />
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="md:hidden">{tab.label.split(' ')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="live" className="mt-6">
            <RealTimeTrading />
          </TabsContent>

          <TabsContent value="manual" className="mt-6">
            <ManualTrading />
          </TabsContent>

          <TabsContent value="auto" className="mt-6">
            <AutoTradeAI />
          </TabsContent>

          <TabsContent value="test" className="mt-6">
            <TestTrading />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}