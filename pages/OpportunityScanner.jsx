import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  RefreshCw,
  Download,
  Filter,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import OpportunityCard from "../components/scanner/OpportunityCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OpportunityScanner() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [filterFlag, setFilterFlag] = useState('all');
  const [filterSentiment, setFilterSentiment] = useState('all');

  // Fetch opportunities
  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: async () => {
      const data = await base44.entities.OpportunityScanner.list('-impact_score', 100);
      return data.filter(opp => {
        const now = new Date();
        const expiresAt = new Date(opp.expires_at);
        return expiresAt > now;
      });
    },
    refetchInterval: 300000 // 5 minutes
  });

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('opportunityScanner', {
        mode: 'scan'
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['opportunities']);
      toast.success(
        language === 'en'
          ? `✅ Found ${data.stats.total_scanned} opportunities`
          : `✅ 發現 ${data.stats.total_scanned} 個機會`
      );

      if (data.alerts && data.alerts.length > 0) {
        data.alerts.forEach(alert => {
          toast.success(
            `🚀 ${alert.ticker} — ${alert.keyword} (Impact: ${alert.impact})`
          );
        });
      }
    },
    onError: (error) => {
      toast.error(
        language === 'en'
          ? `❌ Scan failed: ${error.message}`
          : `❌ 掃描失敗：${error.message}`
      );
    }
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('opportunityScanner', {
        mode: 'export'
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.export_data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OpportunityScanner_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        toast.success(language === 'en' ? '✅ Report exported' : '✅ 報告已導出');
      }
    }
  });

  const handleAddToWatchlist = (ticker) => {
    toast.success(
      language === 'en'
        ? `✅ ${ticker} added to watchlist`
        : `✅ ${ticker} 已添加到觀察清單`
    );
  };

  // Filter opportunities
  const filteredOpportunities = opportunities.filter(opp => {
    const flagMatch = filterFlag === 'all' || opp.verification_flag === filterFlag;
    const sentimentMatch = filterSentiment === 'all' || opp.sentiment === filterSentiment;
    return flagMatch && sentimentMatch;
  });

  const stats = {
    total: filteredOpportunities.length,
    high_impact: filteredOpportunities.filter(o => o.impact_score >= 70).length,
    verified: filteredOpportunities.filter(o => o.verification_flag === 'verified').length
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#00C6FF] to-[#0078FF] rounded-2xl flex items-center justify-center pressure-glow">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {language === 'en' ? '🎯 Opportunity Scanner' : '🎯 機會掃描器'}
              </h1>
              <p className="text-gray-400">
                {language === 'en'
                  ? 'AI-powered market-wide semantic trigger detection'
                  : 'AI 驅動的全市場語義觸發偵測'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isLoading}
              className="bg-[#00C6FF] hover:bg-[#0078FF] text-black"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${scanMutation.isLoading ? 'animate-spin' : ''}`} />
              {language === 'en' ? 'Scan Market' : '掃描市場'}
            </Button>

            <Button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isLoading}
              variant="outline"
              className="border-gray-700 text-gray-300"
            >
              <Download className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Export' : '導出'}
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <Card className="bg-gradient-to-r from-[#00C6FF]/10 to-transparent bg-[#1a2332] border-2 border-[#00C6FF]/50">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{stats.total}</div>
                <div className="text-sm text-gray-400">
                  {language === 'en' ? 'Total Opportunities' : '總機會數'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#00ff88]">{stats.high_impact}</div>
                <div className="text-sm text-gray-400">
                  {language === 'en' ? 'High Impact (≥70)' : '高影響 (≥70)'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#00C6FF]">{stats.verified}</div>
                <div className="text-sm text-gray-400">
                  {language === 'en' ? 'Verified' : '已驗證'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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

              <Select value={filterFlag} onValueChange={setFilterFlag}>
                <SelectTrigger className="w-40 bg-[#0d1b2a] border-gray-700 text-white">
                  <SelectValue placeholder={language === 'en' ? 'Verification' : '驗證狀態'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'en' ? 'All Flags' : '所有狀態'}</SelectItem>
                  <SelectItem value="verified">{language === 'en' ? 'Verified' : '已驗證'}</SelectItem>
                  <SelectItem value="watch">{language === 'en' ? 'Watch' : '觀察中'}</SelectItem>
                  <SelectItem value="likely_false">{language === 'en' ? 'Likely False' : '可能虛假'}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterSentiment} onValueChange={setFilterSentiment}>
                <SelectTrigger className="w-40 bg-[#0d1b2a] border-gray-700 text-white">
                  <SelectValue placeholder={language === 'en' ? 'Sentiment' : '情緒'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'en' ? 'All Sentiment' : '所有情緒'}</SelectItem>
                  <SelectItem value="positive">{language === 'en' ? 'Positive' : '正面'}</SelectItem>
                  <SelectItem value="neutral">{language === 'en' ? 'Neutral' : '中性'}</SelectItem>
                  <SelectItem value="negative">{language === 'en' ? 'Negative' : '負面'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Opportunities Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {filteredOpportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onAddToWatchlist={handleAddToWatchlist}
            />
          ))}
        </div>

        {filteredOpportunities.length === 0 && !isLoading && (
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardContent className="p-12 text-center">
              <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">
                {language === 'en'
                  ? 'No opportunities found. Click "Scan Market" to search.'
                  : '未找到機會。點擊「掃描市場」開始搜尋。'}
              </p>
              <Button
                onClick={() => scanMutation.mutate()}
                className="bg-[#00C6FF] hover:bg-[#0078FF] text-black"
              >
                <Zap className="w-4 h-4 mr-2" />
                {language === 'en' ? 'Start Scanning' : '開始掃描'}
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <Card className="bg-[#1a2332] border-[#00C6FF]/30">
            <CardContent className="p-8 text-center">
              <RefreshCw className="w-8 h-8 text-[#00C6FF] animate-spin mx-auto mb-2" />
              <p className="text-gray-400">
                {language === 'en' ? 'Loading opportunities...' : '載入機會中...'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-transparent bg-[#1a2332] border-2 border-purple-500/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="mb-2 font-semibold text-white">
                  {language === 'en' ? '📊 How It Works:' : '📊 運作方式：'}
                </p>
                <ul className="space-y-1">
                  <li>• {language === 'en' ? 'Scans news, SEC filings, and social media across the whole market' : '掃描全市場的新聞、SEC 申報和社交媒體'}</li>
                  <li>• {language === 'en' ? 'AI verifies source credibility and cross-references multiple sources' : 'AI 驗證來源可信度並交叉比對多個來源'}</li>
                  <li>• {language === 'en' ? 'Impact score (0-100) combines 6 factors: source, corroboration, velocity, precision, sentiment, sensitivity' : '影響分數（0-100）結合 6 個因素：來源、交叉驗證、速度、精確度、情緒、敏感度'}</li>
                  <li>• {language === 'en' ? 'Opportunities expire after 48 hours' : '機會在 48 小時後過期'}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}