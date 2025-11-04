import { useLanguage } from "../../Layout";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export default function FlowIndicator({ flow, confidence, size = "md", showExplainer = false }) {
  const { language } = useLanguage();
  
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-32 h-32"
  };

  const colors = {
    IN: {
      bg: "bg-[#00ff99]",
      glow: "shadow-[0_0_30px_rgba(0,255,153,0.6)]",
      text: "text-[#00ff99]",
      label: language === 'en' ? 'Entry' : '進場',
      explainerEn: "🟢 Green means big money is entering. Wall Street institutions are buying — this is your entry opportunity.",
      explainerZh: "🟢 綠燈代表大錢正在進場。華爾街主力資金正在買入 — 這是你的進場機會。"
    },
    OUT: {
      bg: "bg-[#ff4d4d]",
      glow: "shadow-[0_0_30px_rgba(255,77,77,0.6)]",
      text: "text-[#ff4d4d]",
      label: language === 'en' ? 'Exit' : '出場',
      explainerEn: "🔴 Red means capital is leaving. Big money is exiting — consider selling your position.",
      explainerZh: "🔴 紅燈代表資金正在撤離。大錢正在出場 — 考慮賣出持股。"
    },
    NEUTRAL: {
      bg: "bg-[#ffaa00]",
      glow: "shadow-[0_0_30px_rgba(255,170,0,0.6)]",
      text: "text-[#ffaa00]",
      label: language === 'en' ? 'Neutral' : '觀望',
      explainerEn: "🟠 Yellow means sideways movement. Money flow is unclear — wait and watch for a clear signal.",
      explainerZh: "🟠 黃燈代表盤整中。資金流向不明 — 等待更明確的訊號再行動。"
    }
  };

  const flowStyle = colors[flow] || colors.NEUTRAL;
  const opacity = confidence / 100;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${sizeClasses[size]} relative`}>
        {/* Outer pulse ring */}
        <div 
          className={`absolute inset-0 ${flowStyle.bg} rounded-full pulse-animation`}
          style={{ opacity: opacity * 0.3 }}
        />
        
        {/* Main circle */}
        <div 
          className={`absolute inset-2 ${flowStyle.bg} rounded-full ${flowStyle.glow}`}
          style={{ opacity: opacity }}
        />
        
        {/* Inner highlight */}
        <div className="absolute inset-4 bg-white rounded-full opacity-30" />
      </div>
      
      {size !== "sm" && (
        <div className="text-center">
          <div className="flex items-center gap-1">
            <div className={`text-sm font-bold ${flowStyle.text}`}>
              {flowStyle.label}
            </div>
            {showExplainer && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-4 h-4 text-gray-400 hover:text-[#00ff99] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#151a21] border-gray-700 text-white max-w-xs p-4">
                    <p className="text-sm leading-relaxed">
                      {language === 'en' ? flowStyle.explainerEn : flowStyle.explainerZh}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="text-xs text-gray-400">
            {confidence}% {language === 'en' ? 'confidence' : '信心'}
          </div>
        </div>
      )}
    </div>
  );
}