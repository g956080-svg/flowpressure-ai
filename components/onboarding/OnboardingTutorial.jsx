import { useState } from "react";
import { useLanguage } from "../../Layout";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export default function OnboardingTutorial({ isOpen, onClose }) {
  const { language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: "🟢🔴",
      titleEn: "Step 1: Understanding the Signals",
      titleZh: "步驟 1：理解資金訊號",
      descriptionEn: "🟢 Green = Big money entering (institutions buying). 🔴 Red = Capital leaving (institutions selling).",
      descriptionZh: "🟢 綠燈 = 主力資金進場（機構買入）。🔴 紅燈 = 資金撤出（機構賣出）。",
      imageEn: "When it's green, consider entry. When it's red, consider exit. Follow the money!",
      imageZh: "綠燈買、紅燈賣，跟著資金走就對了！"
    },
    {
      icon: "💰",
      titleEn: "Step 2: Practice with 1 Share",
      titleZh: "步驟 2：從 1 股開始練習",
      descriptionEn: "Try simulated trading with just 1 share to learn how prices move. No risk — learn by doing!",
      descriptionZh: "可模擬買賣 1 股學習操作，了解價格如何波動。零風險實戰學習！",
      imageEn: "Start small, build confidence, master the rhythm of the market.",
      imageZh: "從小量開始，建立信心，掌握市場節奏。"
    },
    {
      icon: "🤖",
      titleEn: "Step 3: AI Auto Trade Feature",
      titleZh: "步驟 3：AI 自動操盤功能",
      descriptionEn: "Let AI automatically test entry/exit logic for you. Watch how professional traders think!",
      descriptionZh: "AI 自動操盤功能可幫你測試進出邏輯，觀察專業交易員的思維方式！",
      imageEn: "AI trades 24/7, follows strict rules, no emotions. Learn from the best.",
      imageZh: "AI 全天候運作，嚴守紀律，無情緒干擾。向最佳策略學習。"
    },
    {
      icon: "🌐",
      titleEn: "Step 4: Language Toggle",
      titleZh: "步驟 4：語言切換",
      descriptionEn: "Switch between English and Traditional Chinese anytime using the 🌐 button at top-right.",
      descriptionZh: "隨時可用右上角 🌐 按鈕在英文與繁體中文之間切換。",
      imageEn: "全球投資人，中文使用者，都能輕鬆上手。",
      imageZh: "Global investors and Chinese users can use it easily."
    }
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem('flowstrike_onboarding_completed', 'true');
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('flowstrike_onboarding_completed', 'true');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-[#151a21] to-[#0b0f14] border-[#00ff99]/30 text-white max-w-2xl">
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <div className="py-8 px-4">
          {/* Progress Indicator */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-8 bg-[#00ff99]' 
                    : index < currentStep 
                      ? 'w-2 bg-[#00ff99]/50' 
                      : 'w-2 bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-[#00ff99]/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#00ff99]/30">
              <span className="text-5xl">{currentStepData.icon}</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-center text-white mb-4">
            {language === 'en' ? currentStepData.titleEn : currentStepData.titleZh}
          </h2>

          {/* Description */}
          <p className="text-lg text-center text-gray-300 mb-6 leading-relaxed max-w-xl mx-auto">
            {language === 'en' ? currentStepData.descriptionEn : currentStepData.descriptionZh}
          </p>

          {/* Additional Info */}
          <div className="bg-[#00ff99]/5 border border-[#00ff99]/20 rounded-xl p-4 mb-8">
            <p className="text-sm text-center text-gray-400">
              💡 {language === 'en' ? currentStepData.imageEn : currentStepData.imageZh}
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4">
            <Button
              onClick={handlePrev}
              disabled={currentStep === 0}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Back' : '返回'}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                {currentStep + 1} / {steps.length}
              </p>
            </div>

            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-[#00ff99] to-[#00cc7a] text-black hover:from-[#00cc7a] hover:to-[#00ff99]"
            >
              {currentStep === steps.length - 1 
                ? (language === 'en' ? 'Got it! / 我知道了' : '開始使用')
                : (language === 'en' ? 'Next' : '下一步')}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Skip Link */}
          {currentStep < steps.length - 1 && (
            <div className="text-center mt-4">
              <button
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                {language === 'en' ? 'Skip tutorial' : '跳過教學'}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}