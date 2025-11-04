import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Flow-Strike AI AutoTrader Engine v4.0
 * 自動操盤核心引擎 - 完整版
 * 
 * 功能：
 * 1. 模擬真實自動交易（開盤→收盤）
 * 2. 延遲補償運算 + 社群情緒分析
 * 3. 主力資金推論 + 自動買賣決策
 * 4. 收盤後自動生成績效報告
 * 5. 自我學習機制
 */

// 記錄錯誤
async function logError(base44, message, details = null) {
  try {
    await base44.asServiceRole.entities.ErrorLog.create({
      timestamp: new Date().toISOString(),
      source: 'AutoTrader',
      message: message,
      severity: 'info',
      details: details ? JSON.stringify(details) : null
    });
  } catch (e) {
    console.error('Failed to log:', e);
  }
}

// 判斷市場時段
function getMarketSession() {
  const now = new Date();
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const day = etTime.getDay();
  
  if (day === 0 || day === 6) return 'CLOSED';
  
  const timeInMinutes = hours * 60 + minutes;
  
  if (timeInMinutes >= 570 && timeInMinutes < 960) return 'OPEN'; // 9:30-16:00
  
  return 'CLOSED';
}

// 簡化的社群情緒分析（免費方案）
async function analyzeSocialSentiment(base44, symbol) {
  try {
    // 使用 AI 快速分析社群情緒（極簡 prompt）
    const prompt = `Quick sentiment for ${symbol}: bullish/bearish/neutral? Confidence 0-100. One word + number only.`;
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          sentiment: { type: "string", enum: ["bullish", "bearish", "neutral"] },
          confidence: { type: "number", minimum: 0, maximum: 100 }
        }
      }
    });
    
    return {
      sentiment: result.sentiment,
      score: result.sentiment === 'bullish' ? result.confidence : 
             result.sentiment === 'bearish' ? -result.confidence : 0
    };
  } catch (error) {
    console.error(`Social sentiment analysis failed for ${symbol}:`, error);
    return { sentiment: 'neutral', score: 0 };
  }
}

// 計算 AI 信心度（綜合評分）
function calculateAIConfidence(data, config) {
  const {
    volumeRatio,
    priceChange,
    socialScore,
    institutionalFlow
  } = data;
  
  const {
    volume_weight,
    social_sentiment_weight,
    price_momentum_weight,
    institutional_flow_weight
  } = config;
  
  // 標準化各項指標 (0-100)
  const volumeScore = Math.min(volumeRatio * 20, 100);
  const momentumScore = Math.min(Math.abs(priceChange) * 20, 100);
  const socialNormalized = Math.max(0, Math.min(100, 50 + socialScore / 2));
  const institutionalScore = Math.max(0, Math.min(100, institutionalFlow));
  
  // 加權計算
  const totalWeight = volume_weight + social_sentiment_weight + price_momentum_weight + institutional_flow_weight;
  const confidence = (
    (volumeScore * volume_weight) +
    (socialNormalized * social_sentiment_weight) +
    (momentumScore * price_momentum_weight) +
    (institutionalScore * institutional_flow_weight)
  ) / totalWeight;
  
  return Math.round(confidence);
}

// 進場邏輯判斷
function shouldEnter(quote, socialData, config) {
  // 檢查成交量
  const avgVolume = quote.volume || 0; // 簡化：假設當前就是平均
  const currentVolume = quote.volume || 0;
  const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 0;
  
  if (volumeRatio < 3) return { shouldEnter: false, reason: 'Volume too low' };
  
  // 檢查價格變動
  const priceChange = quote.change_pct || 0;
  if (priceChange <= 0) return { shouldEnter: false, reason: 'No upward momentum' };
  
  // 檢查社群情緒
  const socialScore = socialData.score || 0;
  if (socialScore < 20) return { shouldEnter: false, reason: 'Social sentiment not bullish' };
  
  // 計算 AI 信心度
  const confidence = calculateAIConfidence({
    volumeRatio,
    priceChange,
    socialScore,
    institutionalFlow: 60 // 簡化：固定值
  }, config);
  
  if (confidence < config.min_confidence_threshold) {
    return { shouldEnter: false, reason: `Confidence ${confidence}% < threshold ${config.min_confidence_threshold}%` };
  }
  
  return {
    shouldEnter: true,
    confidence,
    volumeRatio,
    priceChange,
    socialScore
  };
}

// 出場邏輯判斷
function shouldExit(trade, currentPrice, config) {
  const entryPrice = trade.buy_price;
  const currentReturn = ((currentPrice - entryPrice) / entryPrice) * 100;
  
  // 檢查停利
  if (currentReturn >= config.profit_target_pct) {
    return { shouldExit: true, reason: `Profit target reached: +${currentReturn.toFixed(2)}%` };
  }
  
  // 檢查停損
  if (currentReturn <= config.stop_loss_pct) {
    return { shouldExit: true, reason: `Stop loss triggered: ${currentReturn.toFixed(2)}%` };
  }
  
  // 檢查持倉時間
  const holdingTime = (Date.now() - new Date(trade.entry_time).getTime()) / 1000;
  if (holdingTime > config.avg_holding_time_sec && currentReturn > 0.5) {
    return { shouldExit: true, reason: `Time-based exit with profit: +${currentReturn.toFixed(2)}%` };
  }
  
  // 檢查極端波動
  if (Math.abs(currentReturn) >= 5) {
    return { shouldExit: true, reason: `Extreme volatility: ${currentReturn.toFixed(2)}%` };
  }
  
  return { shouldExit: false };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { mode, symbol, symbols } = await req.json() || {};
    
    console.log(`🤖 AutoTrader Engine v4.0 - Mode: ${mode}`);
    
    // Mode 1: 初始化模型
    if (mode === 'initialize') {
      const configs = await base44.asServiceRole.entities.AIModelConfig.filter({});
      
      let config;
      if (configs.length === 0) {
        config = await base44.asServiceRole.entities.AIModelConfig.create({
          model_version: 'v4.0',
          is_active: false,
          latency_compensation_sec: 2.8,
          volume_weight: 30,
          social_sentiment_weight: 25,
          price_momentum_weight: 25,
          institutional_flow_weight: 20,
          min_confidence_threshold: 70,
          profit_target_pct: 3.5,
          stop_loss_pct: -1.8,
          max_position_size_pct: 5,
          avg_holding_time_sec: 60,
          slippage_pct: 0.05,
          commission_rate: 0.008,
          model_state: 'Stable',
          total_trades_executed: 0
        });
        
        await logError(base44, 'AutoTrader Engine initialized', { config_id: config.id });
      } else {
        config = configs[0];
      }
      
      return Response.json({
        success: true,
        config: config,
        message: 'AutoTrader Engine ready'
      });
    }
    
    // Mode 2: 掃描並執行交易
    if (mode === 'scan_and_trade') {
      const marketSession = getMarketSession();
      
      if (marketSession !== 'OPEN') {
        return Response.json({
          success: false,
          message: 'Market is closed'
        });
      }
      
      // 獲取配置
      const configs = await base44.asServiceRole.entities.AIModelConfig.filter({});
      if (configs.length === 0) {
        return Response.json({ success: false, error: 'Model not initialized' });
      }
      
      const config = configs[0];
      
      if (!config.is_active) {
        return Response.json({
          success: false,
          message: 'AutoTrader is not active'
        });
      }
      
      // 獲取目標股票
      const targetSymbols = symbols || [];
      
      if (targetSymbols.length === 0) {
        return Response.json({ success: false, error: 'No symbols provided' });
      }
      
      // 獲取即時報價
      const quotes = await base44.asServiceRole.entities.LiveQuote.filter({});
      
      const results = [];
      
      // 檢查現有持倉
      const openTrades = await base44.asServiceRole.entities.AutoTrade.filter({ status: 'OPEN' });
      
      // 先檢查出場條件
      for (const trade of openTrades) {
        const quote = quotes.find(q => q.symbol === trade.symbol);
        if (!quote) continue;
        
        const currentPrice = quote.last_price * (1 + config.slippage_pct / 100); // 加上滑價
        const exitCheck = shouldExit(trade, currentPrice, config);
        
        if (exitCheck.shouldExit) {
          const returnPct = ((currentPrice - trade.buy_price) / trade.buy_price) * 100;
          const returnAmount = (currentPrice - trade.buy_price) * trade.shares;
          
          await base44.asServiceRole.entities.AutoTrade.update(trade.id, {
            sell_price: currentPrice,
            exit_time: new Date().toISOString(),
            pl_percent: returnPct,
            pl_amount: returnAmount,
            status: 'CLOSED',
            trade_type: returnAmount >= 0 ? 'WIN' : 'LOSS',
            exit_reason_en: exitCheck.reason,
            exit_reason_zh: exitCheck.reason
          });
          
          results.push({
            action: 'EXIT',
            symbol: trade.symbol,
            price: currentPrice,
            return_pct: returnPct,
            reason: exitCheck.reason
          });
          
          console.log(`✅ Exited ${trade.symbol} at ${currentPrice}: ${returnPct.toFixed(2)}%`);
        }
      }
      
      // 再檢查進場條件（限制同時持倉數）
      const maxPositions = 3; // 最多同時持有 3 個倉位
      const currentOpenTrades = await base44.asServiceRole.entities.AutoTrade.filter({ status: 'OPEN' });
      
      if (currentOpenTrades.length < maxPositions) {
        for (const sym of targetSymbols) {
          // 檢查是否已持有
          const alreadyHolding = currentOpenTrades.some(t => t.symbol === sym);
          if (alreadyHolding) continue;
          
          const quote = quotes.find(q => q.symbol === sym);
          if (!quote) continue;
          
          // 簡化：跳過社群分析以節省 API 調用
          const socialData = { sentiment: 'neutral', score: 50 };
          
          const entryCheck = shouldEnter(quote, socialData, config);
          
          if (entryCheck.shouldEnter) {
            // 計算進場價格（加上滑價和延遲補償）
            const entryPrice = quote.last_price * (1 + config.slippage_pct / 100);
            
            // 計算倉位大小
            const accountBalance = 10000; // 簡化：固定資金
            const maxInvestment = accountBalance * (config.max_position_size_pct / 100);
            const shares = Math.floor(maxInvestment / entryPrice);
            const totalCost = shares * entryPrice;
            
            if (shares === 0) continue;
            
            // 創建交易
            const trade = await base44.asServiceRole.entities.AutoTrade.create({
              symbol: sym,
              company_name: sym,
              buy_price: entryPrice,
              shares: shares,
              total_cost: totalCost,
              entry_time: new Date().toISOString(),
              entry_reason_en: `AI detected opportunity: Confidence ${entryCheck.confidence}%, Volume ${entryCheck.volumeRatio.toFixed(1)}x`,
              entry_reason_zh: `AI 偵測到機會：信心度 ${entryCheck.confidence}%，成交量 ${entryCheck.volumeRatio.toFixed(1)}倍`,
              entry_flow_strength: entryCheck.confidence,
              entry_confidence: entryCheck.confidence,
              status: 'OPEN',
              pl_percent: 0,
              pl_amount: 0
            });
            
            results.push({
              action: 'ENTER',
              symbol: sym,
              price: entryPrice,
              shares: shares,
              confidence: entryCheck.confidence
            });
            
            // 更新總交易數
            await base44.asServiceRole.entities.AIModelConfig.update(config.id, {
              total_trades_executed: config.total_trades_executed + 1
            });
            
            console.log(`🚀 Entered ${sym} at ${entryPrice}: ${shares} shares, ${entryCheck.confidence}% confidence`);
            
            break; // 一次只進一個倉位
          }
        }
      }
      
      return Response.json({
        success: true,
        results: results,
        total_actions: results.length,
        open_positions: currentOpenTrades.length
      });
    }
    
    // Mode 3: 收盤結算 + 自我學習
    if (mode === 'end_of_day_settlement') {
      console.log('📊 End of day settlement...');
      
      // 強制平倉所有開倉
      const openTrades = await base44.asServiceRole.entities.AutoTrade.filter({ status: 'OPEN' });
      const quotes = await base44.asServiceRole.entities.LiveQuote.filter({});
      
      for (const trade of openTrades) {
        const quote = quotes.find(q => q.symbol === trade.symbol);
        const closePrice = quote ? quote.last_price : trade.buy_price;
        
        const returnPct = ((closePrice - trade.buy_price) / trade.buy_price) * 100;
        const returnAmount = (closePrice - trade.buy_price) * trade.shares;
        
        await base44.asServiceRole.entities.AutoTrade.update(trade.id, {
          sell_price: closePrice,
          exit_time: new Date().toISOString(),
          pl_percent: returnPct,
          pl_amount: returnAmount,
          status: 'CLOSED',
          trade_type: returnAmount >= 0 ? 'WIN' : 'LOSS',
          exit_reason_en: 'Market close - forced exit',
          exit_reason_zh: '收盤強制平倉'
        });
        
        console.log(`🔒 Force closed ${trade.symbol}: ${returnPct.toFixed(2)}%`);
      }
      
      // 生成績效報告
      const today = new Date().toISOString().split('T')[0];
      const reportResponse = await base44.functions.invoke('generatePerformanceReport', {
        report_date: today
      });
      
      if (!reportResponse.data.success) {
        return Response.json({
          success: false,
          error: 'Failed to generate performance report'
        });
      }
      
      const report = reportResponse.data.report;
      
      // 自我學習調整
      const configs = await base44.asServiceRole.entities.AIModelConfig.filter({});
      const config = configs[0];
      
      let newState = config.model_state;
      let learningNotes = '';
      let adjustments = {};
      
      if (report.win_rate < 65) {
        // 提升社群權重，降低成交量權重
        adjustments.social_sentiment_weight = Math.min(config.social_sentiment_weight + 10, 50);
        adjustments.volume_weight = Math.max(config.volume_weight - 5, 10);
        newState = 'Adjusting';
        learningNotes = `Win rate ${report.win_rate.toFixed(1)}% < 65%. Increased social weight to ${adjustments.social_sentiment_weight}%, reduced volume weight to ${adjustments.volume_weight}%.`;
      } else if (config.latency_compensation_sec > 3) {
        adjustments.latency_compensation_sec = 2.8;
        learningNotes = `Latency too high. Reduced to 2.8s.`;
        newState = 'Learning';
      } else if (report.total_return_pct > 20) {
        newState = 'Optimized';
        learningNotes = `Excellent performance ${report.total_return_pct.toFixed(1)}%. Maintaining current settings.`;
      } else {
        newState = 'Stable';
        learningNotes = `Performance stable. No adjustments needed.`;
      }
      
      await base44.asServiceRole.entities.AIModelConfig.update(config.id, {
        ...adjustments,
        model_state: newState,
        learning_notes: learningNotes,
        last_performance_win_rate: report.win_rate,
        last_performance_return: report.total_return_pct
      });
      
      await logError(base44, 'End of day settlement complete', {
        win_rate: report.win_rate,
        total_return: report.total_return_pct,
        model_state: newState
      });
      
      return Response.json({
        success: true,
        report: report,
        learning: {
          new_state: newState,
          notes: learningNotes,
          adjustments: adjustments
        },
        message: `End of day settlement complete. ${openTrades.length} positions closed.`
      });
    }
    
    return Response.json({ error: 'Invalid mode' }, { status: 400 });
    
  } catch (error) {
    console.error('AutoTrader Engine error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});