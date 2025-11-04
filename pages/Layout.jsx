

import React, { createContext, useContext, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "./utils";
import { Button } from "@/components/ui/button";
import { Activity, BarChart, Radio, Shield, Globe, Menu, X, Target, Gauge, Settings } from "lucide-react";
import AlertManager from "@/components/alerts/AlertManager";

// 建立語言 Context
const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageContext.Provider');
  }
  return context;
};

const translations = {
  en: {
    appName: "FlowPressure AI",
    tagline: "Measure market pressure, let AI guide your flow.",
    dashboard: "Dashboard",
    tradingConsole: "Trading Console",
    radarHub: "Radar Hub",
    reportsHub: "Reports Hub",
    alertCenter: "Alert Center",
    strategyConfig: "Strategy Config",
    health: "Health Guard",
    loginRequired: "Please login to Base44",
    sessionExpired: "Your session may have expired",
    goToLogin: "Go to Login",
    checkingSession: "Checking session...",
    switchLanguage: "Switch Language",
  },
  "zh-TW": {
    appName: "FlowPressure AI",
    tagline: "量出市場的壓力，讓智慧順勢而行",
    dashboard: "儀表板",
    tradingConsole: "交易工作台",
    radarHub: "雷達中心",
    reportsHub: "報表中心",
    alertCenter: "警報中心",
    strategyConfig: "策略配置",
    health: "系統監護",
    loginRequired: "請先登入 Base44",
    sessionExpired: "你的工作階段可能已過期",
    goToLogin: "前往登入",
    checkingSession: "檢查階段中...",
    switchLanguage: "切換語言",
  }
};

export default function Layout({ children }) {
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [language, setLanguage] = useState("zh-TW");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const t = translations[language];

  // 登入狀態檢查
  useEffect(() => {
    (async () => {
      try {
        await base44.auth.me();
        setIsAuthed(true);
      } catch (e) {
        console.error('Auth check failed:', e);
        setIsAuthed(false);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  // 尚未完成檢查
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <Activity className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-white text-lg">{t.checkingSession}</p>
        </div>
      </div>
    );
  }

  // 尚未登入畫面
  if (!isAuthed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl flex items-center justify-center mb-6">
          <Activity className="w-12 h-12 text-white" />
        </div>
        <div className="text-center max-w-md">
          <h2 className="text-3xl font-bold text-white mb-3">{t.loginRequired}</h2>
          <p className="text-gray-400 mb-6">{t.sessionExpired}</p>
          <Button 
            onClick={() => base44.auth.redirectToLogin()}
            className="bg-blue-600 text-white hover:bg-blue-700 text-lg px-8 py-6"
          >
            {t.goToLogin}
          </Button>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: t.dashboard, path: createPageUrl("Dashboard"), icon: Activity },
    { name: t.tradingConsole, path: createPageUrl("TradingConsole"), icon: Gauge },
    { name: t.radarHub, path: createPageUrl("RadarHub"), icon: Radio },
    { name: t.reportsHub, path: createPageUrl("ReportsHub"), icon: BarChart },
    { name: t.alertCenter, path: createPageUrl("AlertCenter"), icon: Target },
    { name: t.strategyConfig, path: createPageUrl("AIStrategyConfig"), icon: Settings },
    { name: t.health, path: createPageUrl("PulseHealth"), icon: Shield }
  ];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <style>{`
        body {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          font-family: ${language === 'zh-TW' ? "'Noto Sans TC', " : "'Inter', "}system-ui, -apple-system, sans-serif;
          margin: 0;
          padding: 0;
        }
        
        * {
          box-sizing: border-box;
        }

        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 40;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
          display: none;
        }

        .sidebar-overlay.active {
          opacity: 1;
          pointer-events: all;
          display: block;
        }

        .app-sidebar {
          width: 16rem;
          background: linear-gradient(180deg, #1e293b 0%, #334155 100%);
          border-right: 1px solid rgba(59, 130, 246, 0.2);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 100;
          overflow-y: auto;
        }

        .mobile-menu-button {
          position: fixed;
          top: 1rem;
          left: 1rem;
          z-index: 60;
          display: none;
        }

        .main-content {
          margin-left: 16rem;
          position: relative;
          z-index: 1;
          min-height: 100vh;
        }

        @media (min-width: 769px) {
          .sidebar-close-btn {
            display: none !important;
          }
        }

        @media (max-width: 768px) {
          .mobile-menu-button {
            display: flex;
          }
          
          .app-sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }
          
          .app-sidebar.open {
            transform: translateX(0);
          }
          
          .main-content {
            margin-left: 0;
          }
        }
      `}</style>

      <div className="min-h-screen flex">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="mobile-menu-button items-center justify-center w-12 h-12 bg-slate-800 hover:bg-slate-700 border border-blue-500/30 rounded-xl shadow-lg transition-all"
        >
          <Menu className="w-6 h-6 text-blue-500" />
        </button>

        <div 
          className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        <aside className={`app-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="sidebar-close-btn absolute top-4 right-4 p-2 hover:bg-slate-700 rounded-lg transition-colors z-10"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          <div className="p-6 border-b border-blue-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{t.appName}</h1>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {t.tagline}
            </p>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path.split('?')[0]);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-600 text-white font-semibold shadow-lg' 
                      : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-blue-500/20">
            <Button
              size="sm"
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-slate-700"
              onClick={() => setLanguage(language === "zh-TW" ? "en" : "zh-TW")}
            >
              <Globe className="w-4 h-4 mr-2" />
              {t.switchLanguage}
            </Button>
          </div>
        </aside>

        <main className="main-content flex-1 overflow-auto">
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>

      <AlertManager />
    </LanguageContext.Provider>
  );
}

