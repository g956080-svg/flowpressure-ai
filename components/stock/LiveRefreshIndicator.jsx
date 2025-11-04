import { Activity } from "lucide-react";
import { useLanguage } from "../../Layout";

export default function LiveRefreshIndicator({ isRefreshing }) {
  const { language } = useLanguage();
  
  const text = language === 'en' ? 'Live Updating' : '即時更新中';

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#151a21] border border-gray-800 rounded-xl">
      <Activity className={`w-4 h-4 text-[#00ff99] ${isRefreshing ? 'animate-pulse' : ''}`} />
      <span className="text-sm text-gray-300">{text}</span>
      <div className="flex gap-1">
        <div className={`w-1.5 h-1.5 bg-[#00ff99] rounded-full ${isRefreshing ? 'animate-bounce' : ''}`} style={{ animationDelay: '0ms' }} />
        <div className={`w-1.5 h-1.5 bg-[#00ff99] rounded-full ${isRefreshing ? 'animate-bounce' : ''}`} style={{ animationDelay: '150ms' }} />
        <div className={`w-1.5 h-1.5 bg-[#00ff99] rounded-full ${isRefreshing ? 'animate-bounce' : ''}`} style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}