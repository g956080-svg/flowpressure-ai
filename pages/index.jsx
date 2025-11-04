import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import StockDetail from "./StockDetail";

import MoneyFlowRadar from "./MoneyFlowRadar";

import AlertCenter from "./AlertCenter";

import SafetyCoach from "./SafetyCoach";

import VirtualPortfolio from "./VirtualPortfolio";

import AutoTradeAI from "./AutoTradeAI";

import RealTimeTrading from "./RealTimeTrading";

import TestTrading from "./TestTrading";

import BigMoneyRadar from "./BigMoneyRadar";

import AILearningDashboard from "./AILearningDashboard";

import WeeklyPerformance from "./WeeklyPerformance";

import PerformanceReport from "./PerformanceReport";

import SentimentRadar from "./SentimentRadar";

import PulseHealth from "./PulseHealth";

import ManualTrading from "./ManualTrading";

import FlowReport from "./FlowReport";

import AIStrategyConfig from "./AIStrategyConfig";

import StrategyBacktest from "./StrategyBacktest";

import StockPressureIndex from "./StockPressureIndex";

import OpportunityScanner from "./OpportunityScanner";

import TradingConsole from "./TradingConsole";

import RadarHub from "./RadarHub";

import ReportsHub from "./ReportsHub";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    StockDetail: StockDetail,
    
    MoneyFlowRadar: MoneyFlowRadar,
    
    AlertCenter: AlertCenter,
    
    SafetyCoach: SafetyCoach,
    
    VirtualPortfolio: VirtualPortfolio,
    
    AutoTradeAI: AutoTradeAI,
    
    RealTimeTrading: RealTimeTrading,
    
    TestTrading: TestTrading,
    
    BigMoneyRadar: BigMoneyRadar,
    
    AILearningDashboard: AILearningDashboard,
    
    WeeklyPerformance: WeeklyPerformance,
    
    PerformanceReport: PerformanceReport,
    
    SentimentRadar: SentimentRadar,
    
    PulseHealth: PulseHealth,
    
    ManualTrading: ManualTrading,
    
    FlowReport: FlowReport,
    
    AIStrategyConfig: AIStrategyConfig,
    
    StrategyBacktest: StrategyBacktest,
    
    StockPressureIndex: StockPressureIndex,
    
    OpportunityScanner: OpportunityScanner,
    
    TradingConsole: TradingConsole,
    
    RadarHub: RadarHub,
    
    ReportsHub: ReportsHub,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/StockDetail" element={<StockDetail />} />
                
                <Route path="/MoneyFlowRadar" element={<MoneyFlowRadar />} />
                
                <Route path="/AlertCenter" element={<AlertCenter />} />
                
                <Route path="/SafetyCoach" element={<SafetyCoach />} />
                
                <Route path="/VirtualPortfolio" element={<VirtualPortfolio />} />
                
                <Route path="/AutoTradeAI" element={<AutoTradeAI />} />
                
                <Route path="/RealTimeTrading" element={<RealTimeTrading />} />
                
                <Route path="/TestTrading" element={<TestTrading />} />
                
                <Route path="/BigMoneyRadar" element={<BigMoneyRadar />} />
                
                <Route path="/AILearningDashboard" element={<AILearningDashboard />} />
                
                <Route path="/WeeklyPerformance" element={<WeeklyPerformance />} />
                
                <Route path="/PerformanceReport" element={<PerformanceReport />} />
                
                <Route path="/SentimentRadar" element={<SentimentRadar />} />
                
                <Route path="/PulseHealth" element={<PulseHealth />} />
                
                <Route path="/ManualTrading" element={<ManualTrading />} />
                
                <Route path="/FlowReport" element={<FlowReport />} />
                
                <Route path="/AIStrategyConfig" element={<AIStrategyConfig />} />
                
                <Route path="/StrategyBacktest" element={<StrategyBacktest />} />
                
                <Route path="/StockPressureIndex" element={<StockPressureIndex />} />
                
                <Route path="/OpportunityScanner" element={<OpportunityScanner />} />
                
                <Route path="/TradingConsole" element={<TradingConsole />} />
                
                <Route path="/RadarHub" element={<RadarHub />} />
                
                <Route path="/ReportsHub" element={<ReportsHub />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}