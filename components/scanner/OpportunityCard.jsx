import React from "react";
import { useLanguage } from "../../Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Plus,
  Target
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function OpportunityCard({ opportunity, onAddToWatchlist, onOpenTrade }) {
  const { language } = useLanguage();

  const getVerificationIcon = (flag) => {
    switch (flag) {
      case 'verified':
        return <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />;
      case 'watch':
        return <AlertTriangle className="w-5 h-5 text-[#ffaa00]" />;
      case 'likely_false':
        return <XCircle className="w-5 h-5 text-[#ff4d4d]" />;
      default:
        return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getVerificationLabel = (flag) => {
    const labels = {
      verified: { text: language === 'en' ? 'Verified' : '已驗證', color: 'text-[#00ff88]' },
      watch: { text: language === 'en' ? 'Watch' : '觀察中', color: 'text-[#ffaa00]' },
      likely_false: { text: language === 'en' ? 'Likely False' : '可能虛假', color: 'text-[#ff4d4d]' }
    };
    return labels[flag] || labels.watch;
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-[#00ff88]" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-[#ff4d4d]" />;
      default:
        return <Minus className="w-4 h-4 text-[#ffaa00]" />;
    }
  };

  const getImpactColor = (score) => {
    if (score >= 71) return '#00ff88';
    if (score >= 41) return '#ffaa00';
    return '#666666';
  };

  const getCategoryBadge = (category) => {
    const badges = {
      funding: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: language === 'en' ? 'Funding' : '資金' },
      order: { bg: 'bg-green-500/20', text: 'text-green-400', label: language === 'en' ? 'Order' : '訂單' },
      rd: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: language === 'en' ? 'R&D' : '研發' },
      risk: { bg: 'bg-red-500/20', text: 'text-red-400', label: language === 'en' ? 'Risk' : '風險' }
    };
    return badges[category] || badges.funding;
  };

  const sources = opportunity.sources ? JSON.parse(opportunity.sources) : [];
  const verificationLabel = getVerificationLabel(opportunity.verification_flag);
  const categoryBadge = getCategoryBadge(opportunity.keyword_category);

  return (
    <Card className="bg-[#1a2332] border-[#00C6FF]/30 hover:border-[#00C6FF]/50 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Company & Keyword Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-bold text-white">{opportunity.ticker}</span>
              <Badge className={`${categoryBadge.bg} ${categoryBadge.text}`}>
                {categoryBadge.label}
              </Badge>
              {getSentimentIcon(opportunity.sentiment)}
            </div>
            
            <p className="text-sm text-gray-400 mb-2">{opportunity.company}</p>
            
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-[#00C6FF]/20 text-[#00C6FF]">
                {opportunity.keyword}
              </Badge>
              <span className="text-xs text-gray-500">
                {opportunity.source_count} {language === 'en' ? 'sources' : '來源'}
              </span>
            </div>

            {/* Verification Status */}
            <div className="flex items-center gap-2">
              {getVerificationIcon(opportunity.verification_flag)}
              <span className={`text-sm font-semibold ${verificationLabel.color}`}>
                {verificationLabel.text}
              </span>
            </div>
          </div>

          {/* Right: Impact Score Circle */}
          <div className="flex flex-col items-center">
            <div 
              className="relative w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: `conic-gradient(${getImpactColor(opportunity.impact_score)} ${opportunity.impact_score}%, #1a2332 ${opportunity.impact_score}%)`
              }}
            >
              <div className="absolute inset-2 bg-[#0d1b2a] rounded-full flex flex-col items-center justify-center">
                <span 
                  className="text-2xl font-bold"
                  style={{ color: getImpactColor(opportunity.impact_score) }}
                >
                  {Math.round(opportunity.impact_score)}
                </span>
                <span className="text-xs text-gray-500">
                  {language === 'en' ? 'Impact' : '影響'}
                </span>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-gray-400 text-center">
              {language === 'en' ? 'Pressure' : '壓力'}: {opportunity.total_pressure?.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => onAddToWatchlist(opportunity.ticker)}
            variant="outline"
            size="sm"
            className="flex-1 border-gray-700 text-gray-300"
          >
            <Plus className="w-4 h-4 mr-1" />
            {language === 'en' ? 'Watchlist' : '觀察清單'}
          </Button>
          
          <Link
            to={createPageUrl('ManualTrading')}
            className="flex-1"
          >
            <Button
              size="sm"
              className="w-full bg-[#00C6FF] hover:bg-[#0078FF] text-black"
            >
              <Target className="w-4 h-4 mr-1" />
              {language === 'en' ? 'Trade' : '交易'}
            </Button>
          </Link>
        </div>

        {/* Sources Collapsible */}
        {sources.length > 0 && (
          <details className="mt-3">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-[#00C6FF]">
              {language === 'en' ? 'View sources' : '查看來源'} ({sources.length})
            </summary>
            <div className="mt-2 space-y-1">
              {sources.slice(0, 3).map((source, idx) => (
                <div key={idx} className="text-xs text-gray-500 flex items-start gap-1">
                  <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span className="truncate">{source.title || source.domain}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}