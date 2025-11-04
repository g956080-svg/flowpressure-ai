import React, { useState, useEffect } from "react";
import { useLanguage } from "../../Layout";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";

// 市場時段判斷
function getMarketSession() {
  const now = new Date();
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const day = etTime.getDay();
  
  if (day === 0 || day === 6) return 'CLOSED';
  
  const timeInMinutes = hours * 60 + minutes;
  
  if (timeInMinutes >= 240 && timeInMinutes < 570) return 'PRE';
  else if (timeInMinutes >= 570 && timeInMinutes < 960) return 'REG';
  else if (timeInMinutes >= 960 && timeInMinutes < 1200) return 'POST';
  
  return 'CLOSED';
}

// 是否允許交易
function isTradingAllowed() {
  const session = getMarketSession();
  return session === 'REG';
}

export default function MarketSessionIndicator({ showDetails = true }) {
  const { language } = useLanguage();
  const [session, setSession] = useState('CLOSED');
  const [tradingAllowed, setTradingAllowed] = useState(false);
  const [timeUntilOpen, setTimeUntilOpen] = useState('');

  useEffect(() => {
    const updateSession = () => {
      const currentSession = getMarketSession();
      const allowed = isTradingAllowed();
      
      setSession(currentSession);
      setTradingAllowed(allowed);
      
      // 計算距離開盤時間
      if (currentSession === 'CLOSED') {
        const now = new Date();
        const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const day = et.getDay();
        
        if (day === 0) {
          setTimeUntilOpen(language === 'en' ? 'Opens Monday 9:30 AM ET' : '週一 09:30 ET 開盤');
        } else if (day === 6) {
          setTimeUntilOpen(language === 'en' ? 'Opens Monday 9:30 AM ET' : '週一 09:30 ET 開盤');
        } else {
          const tomorrow = new Date(et);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 30, 0, 0);
          
          const hoursUntil = Math.floor((tomorrow - et) / (1000 * 60 * 60));
          const minutesUntil = Math.floor(((tomorrow - et) % (1000 * 60 * 60)) / (1000 * 60));
          
          if (hoursUntil > 0) {
            setTimeUntilOpen(
              language === 'en' 
                ? `Opens in ${hoursUntil}h ${minutesUntil}m`
                : `${hoursUntil} 小時 ${minutesUntil} 分鐘後開盤`
            );
          } else {
            setTimeUntilOpen(
              language === 'en'
                ? `Opens in ${minutesUntil}m`
                : `${minutesUntil} 分鐘後開盤`
            );
          }
        }
      }
    };

    updateSession();
    const interval = setInterval(updateSession, 10000);

    return () => clearInterval(interval);
  }, [language]);

  const getSessionConfig = () => {
    switch (session) {
      case 'PRE':
        return {
          label: language === 'en' ? 'Pre-Market' : '盤前',
          color: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
          icon: <Clock className="w-4 h-4" />,
          description: language === 'en' ? '4:00 AM - 9:30 AM ET' : '04:00 - 09:30 ET',
          tradable: false
        };
      case 'REG':
        return {
          label: language === 'en' ? 'Market Open' : '正常交易',
          color: 'bg-green-500/20 text-green-400 border-green-500/50',
          icon: <CheckCircle className="w-4 h-4" />,
          description: language === 'en' ? '9:30 AM - 4:00 PM ET' : '09:30 - 16:00 ET',
          tradable: true
        };
      case 'POST':
        return {
          label: language === 'en' ? 'After-Hours' : '盤後',
          color: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
          icon: <Clock className="w-4 h-4" />,
          description: language === 'en' ? '4:00 PM - 8:00 PM ET' : '16:00 - 20:00 ET',
          tradable: false
        };
      case 'CLOSED':
      default:
        return {
          label: language === 'en' ? 'Market Closed' : '休市',
          color: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
          icon: <XCircle className="w-4 h-4" />,
          description: timeUntilOpen,
          tradable: false
        };
    }
  };

  const config = getSessionConfig();

  if (!showDetails) {
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  }

  return (
    <div className={`rounded-lg border-2 p-3 ${config.color.replace('/20', '/10')} ${config.color}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {config.icon}
          <div>
            <div className="font-semibold text-sm">
              {config.label}
            </div>
            <div className="text-xs opacity-80">
              {config.description}
            </div>
          </div>
        </div>
        
        {!config.tradable && (
          <div className="flex items-center gap-1 text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>{language === 'en' ? 'Trading Disabled' : '交易暫停'}</span>
          </div>
        )}
        
        {config.tradable && (
          <div className="flex items-center gap-1 text-xs">
            <CheckCircle className="w-3 h-3" />
            <span>{language === 'en' ? 'Trading Active' : '可交易'}</span>
          </div>
        )}
      </div>
    </div>
  );
}