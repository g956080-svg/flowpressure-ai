import { useState, useEffect } from "react";
import { useLanguage } from "../Layout";
import { Shield, AlertCircle, TrendingUp, Target } from "lucide-react";

const safetyQuotes = [
  {
    en: "When you see red, run.",
    zh: "看到紅燈就跑。",
    icon: AlertCircle
  },
  {
    en: "Too fast = trap.",
    zh: "漲太快＝陷阱。",
    icon: TrendingUp
  },
  {
    en: "Profit small, survive long.",
    zh: "別貪，先活下來再賺。",
    icon: Target
  },
  {
    en: "Follow the money, not the hype.",
    zh: "跟著資金走，不是跟著新聞。",
    icon: Shield
  },
  {
    en: "Green means go, but watch the confidence.",
    zh: "綠燈代表走，但要看信心度。",
    icon: Shield
  },
  {
    en: "Exit on red — no second chances.",
    zh: "紅燈出場，不給第二次機會。",
    icon: AlertCircle
  },
  {
    en: "Patience in neutral saves your capital.",
    zh: "在觀望期的耐心能保住本金。",
    icon: Shield
  },
  {
    en: "Never chase — let the signal come to you.",
    zh: "別追高，讓訊號來找你。",
    icon: Target
  },
  {
    en: "Cut losses fast, let profits ride.",
    zh: "快速止損，讓利潤奔跑。",
    icon: TrendingUp
  },
  {
    en: "AI is your guide, discipline is your weapon.",
    zh: "AI是你的嚮導，紀律是你的武器。",
    icon: Shield
  }
];

export default function SafetyCoach() {
  const { language } = useLanguage();
  const [selectedQuotes, setSelectedQuotes] = useState([]);

  useEffect(() => {
    // Select 3 random quotes on mount
    const shuffled = [...safetyQuotes].sort(() => Math.random() - 0.5);
    setSelectedQuotes(shuffled.slice(0, 3));
  }, []);

  const rules = [
    {
      title: { en: "Rule 1: Follow the Flow", zh: "規則1：跟隨資金流" },
      description: {
        en: "Only enter when you see 🟢 Green (IN) with confidence above 80%. Exit immediately on 🔴 Red (OUT).",
        zh: "只在看到🟢綠色（流入）且信心度超過80%時進場。看到🔴紅色（流出）立即出場。"
      }
    },
    {
      title: { en: "Rule 2: Never Chase Highs", zh: "規則2：永不追高" },
      description: {
        en: "If a stock already jumped 5%+ today, wait for the next signal. Fast gains often turn into fast losses.",
        zh: "如果股票今天已經漲了5%以上，等待下一個訊號。快速上漲往往會快速下跌。"
      }
    },
    {
      title: { en: "Rule 3: Set Stop Loss", zh: "規則3：設定停損" },
      description: {
        en: "Always set a stop loss at -2% below your entry. Protect your capital first, profits second.",
        zh: "永遠在進場價下方2%設定停損。先保本金，利潤第二。"
      }
    },
    {
      title: { en: "Rule 4: Trust the Confidence", zh: "規則4：相信信心度" },
      description: {
        en: "Higher confidence (90%+) = stronger signal. Low confidence (<70%) = risky zone, stay cautious.",
        zh: "信心度越高（90%+）訊號越強。信心度低（<70%）是風險區，保持謹慎。"
      }
    },
    {
      title: { en: "Rule 5: Neutral = Wait", zh: "規則5：中立=等待" },
      description: {
        en: "When you see 🟠 Orange (NEUTRAL), do nothing. Save your energy for clear signals.",
        zh: "看到🟠橘色（中立）時，什麼都別做。保存實力等待明確訊號。"
      }
    }
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#00ff99] to-[#00cc7a] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(0,255,153,0.4)]">
            <Shield className="w-8 h-8 text-black" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">
              {language === 'en' ? 'Safety Coach' : '安全教練'}
            </h1>
            <p className="text-gray-400 text-lg">
              {language === 'en' 
                ? 'Learn the rules to ride the waves safely'
                : '學習規則，安全衝浪'}
            </p>
          </div>
        </div>

        {/* Daily Safety Quotes */}
        <div className="grid md:grid-cols-3 gap-6">
          {selectedQuotes.map((quote, index) => {
            const Icon = quote.icon;
            return (
              <div
                key={index}
                className="bg-gradient-to-br from-[#00ff99]/10 to-transparent bg-[#151a21] border border-[#00ff99]/30 rounded-2xl p-6 text-center space-y-4"
              >
                <div className="w-16 h-16 bg-[#00ff99] rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,255,153,0.4)]">
                  <Icon className="w-8 h-8 text-black" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white mb-2">
                    {language === 'en' ? quote.en : quote.zh}
                  </p>
                  <div className="text-sm text-gray-400">
                    {language === 'en' ? 'Daily Tip' : '每日提示'} #{index + 1}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trading Rules */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-6">
            {language === 'en' ? '5 Golden Rules for FlowStrike' : 'FlowStrike五大黃金法則'}
          </h2>
          
          {rules.map((rule, index) => (
            <div
              key={index}
              className="bg-[#151a21] border border-gray-800 rounded-2xl p-6 hover:border-[#00ff99]/50 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#00ff99]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-[#00ff99]">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {rule.title[language]}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {rule.description[language]}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Philosophy Card */}
        <div className="bg-gradient-to-r from-[#00ff99]/5 via-[#ffaa00]/5 to-[#ff4d4d]/5 rounded-3xl p-8 border border-gray-800">
          <h2 className="text-3xl font-bold text-white text-center mb-6">
            {language === 'en' ? 'The FlowStrike Philosophy' : 'FlowStrike理念'}
          </h2>
          <p className="text-xl text-gray-300 text-center leading-relaxed italic">
            {language === 'en'
              ? '"FlowStrike shows you when money enters or leaves — so even if you\'re 1 second late, you still win safely."'
              : '「FlowStrike告訴你資金何時進出，即使慢一秒，你仍能安全獲利。」'}
          </p>
          <div className="mt-6 text-center">
            <div className="inline-block px-6 py-3 bg-[#00ff99]/10 border border-[#00ff99]/30 rounded-xl">
              <p className="text-sm text-gray-400">
                {language === 'en' 
                  ? 'Trade with the flow. Ride with the money.'
                  : '跟著資金流走，與大錢共舞。'}
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-[#151a21] border border-yellow-800/30 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-yellow-500 mb-2">
                {language === 'en' ? 'Important Disclaimer' : '重要聲明'}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {language === 'en'
                  ? 'FlowStrike provides AI-powered flow analysis for educational and reference purposes only. This is not investment advice. All trading involves risk. Past performance does not guarantee future results. Always do your own research and consult with a financial advisor before making investment decisions.'
                  : 'FlowStrike提供AI驅動的資金流向分析，僅供教育和參考用途。這不是投資建議。所有交易都有風險。過去的表現不保證未來的結果。在做出投資決定之前，請務必進行自己的研究並諮詢財務顧問。'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}