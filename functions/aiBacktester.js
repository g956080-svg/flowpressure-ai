import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * AI Performance Backtester
 * 計算 BigMoney-AI 訊號之實際報酬與勝率
 */

// 記錄錯誤
async function logError(base44, source, message, severity, details = null) {
  try {
    await base44.asServiceRole.entities.ErrorLog.create({
      timestamp: new Date().toISOString(),
      source,
      message,
      severity,
      details: details ? JSON.stringify(details) : null
    });
  } catch (e) {
    console.error('Failed to log error:', e);
  }
}

// 判斷回測結果
function evaluateBacktest(signalType, entryPrice, currentPrice, intensityScore, contProb) {
  const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;
  
  let outcome = 'PENDING';
  let weight = 1.0;
  let feedback = '';
  
  // Signal_IN 邏輯：上漲 0.5% 為 WIN，下跌 0.5% 為 LOSE
  if (signalType === 'IN') {
    if (priceChange >= 0.5) {
      outcome = 'WIN';
      feedback = `✅ IN訊號成功：價格上漲 ${priceChange.toFixed(2)}%`;
      
      // 根據強度和信心度調整權重
      if (intensityScore >= 4 && contProb >= 70) {
        weight = 1.5; // 高強度高信心，增加權重
        feedback += ' | 高信心訊號，權重提升';
      }
    } else if (priceChange <= -0.5) {
      outcome = 'LOSE';
      feedback = `❌ IN訊號失敗：價格下跌 ${priceChange.toFixed(2)}%`;
      
      // 失敗時根據條件調整權重
      if (intensityScore >= 4 && contProb >= 70) {
        weight = 0.5; // 高信心失敗，降低權重
        feedback += ' | 高信心失敗，需要調整';
      }
    } else {
      feedback = `⏳ 等待中：價格變動 ${priceChange.toFixed(2)}%，未達閾值`;
    }
  }
  // Signal_OUT 邏輯：下跌 0.5% 為 WIN，上漲 0.5% 為 LOSE
  else if (signalType === 'OUT') {
    if (priceChange <= -0.5) {
      outcome = 'WIN';
      feedback = `✅ OUT訊號成功：價格下跌 ${Math.abs(priceChange).toFixed(2)}%`;
      
      if (intensityScore >= 4 && contProb >= 70) {
        weight = 1.5;
        feedback += ' | 高信心訊號，權重提升';
      }
    } else if (priceChange >= 0.5) {
      outcome = 'LOSE';
      feedback = `❌ OUT訊號失敗：價格上漲 ${priceChange.toFixed(2)}%`;
      
      if (intensityScore >= 4 && contProb >= 70) {
        weight = 0.5;
        feedback += ' | 高信心失敗，需要調整';
      }
    } else {
      feedback = `⏳ 等待中：價格變動 ${priceChange.toFixed(2)}%，未達閾值`;
    }
  }
  
  return {
    result_pct: priceChange,
    result_outcome: outcome,
    learn_weight: weight,
    feedback_notes: feedback
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { signal_id, check_all_pending } = await req.json();
    
    // 模式 1：檢查單一訊號
    if (signal_id) {
      // 獲取訊號
      const signal = await base44.asServiceRole.entities.BigMoneySignal.get(signal_id);
      if (!signal) {
        return Response.json({ error: 'Signal not found' }, { status: 404 });
      }
      
      // 獲取當前價格
      const quotes = await base44.asServiceRole.entities.LiveQuote.filter({ symbol: signal.symbol });
      if (quotes.length === 0) {
        return Response.json({ error: 'Quote not found' }, { status: 404 });
      }
      
      const currentPrice = quotes[0].last_price;
      const entryPrice = signal.current_price || currentPrice;
      
      // 評估結果
      const result = evaluateBacktest(
        signal.signal_type,
        entryPrice,
        currentPrice,
        signal.intensity_score || signal.panic_score || 1,
        signal.cont_prob
      );
      
      // 檢查是否已有回測記錄
      const existingBacktests = await base44.asServiceRole.entities.AIBacktestLog.filter({ signal_id });
      
      const now = new Date().toISOString();
      const entryTime = signal.timestamp_detected;
      const durationMinutes = Math.floor((new Date() - new Date(entryTime)) / 1000 / 60);
      
      const backtestRecord = {
        signal_id,
        symbol: signal.symbol,
        signal_type: signal.signal_type,
        entry_price: entryPrice,
        exit_price: result.result_outcome !== 'PENDING' ? currentPrice : null,
        result_pct: result.result_pct,
        result_outcome: result.result_outcome,
        intensity_score: signal.intensity_score || signal.panic_score || 1,
        cont_prob: signal.cont_prob,
        learn_weight: result.learn_weight,
        feedback_notes: result.feedback_notes,
        entry_timestamp: entryTime,
        exit_timestamp: result.result_outcome !== 'PENDING' ? now : null,
        duration_minutes: durationMinutes
      };
      
      if (existingBacktests.length > 0) {
        await base44.asServiceRole.entities.AIBacktestLog.update(existingBacktests[0].id, backtestRecord);
      } else {
        await base44.asServiceRole.entities.AIBacktestLog.create(backtestRecord);
      }
      
      return Response.json({
        success: true,
        backtest: backtestRecord
      });
    }
    
    // 模式 2：檢查所有 PENDING 的回測
    if (check_all_pending) {
      const pendingBacktests = await base44.asServiceRole.entities.AIBacktestLog.filter({
        result_outcome: 'PENDING'
      });
      
      const results = [];
      
      for (const backtest of pendingBacktests) {
        try {
          // 獲取當前價格
          const quotes = await base44.asServiceRole.entities.LiveQuote.filter({ symbol: backtest.symbol });
          if (quotes.length === 0) continue;
          
          const currentPrice = quotes[0].last_price;
          
          // 重新評估
          const result = evaluateBacktest(
            backtest.signal_type,
            backtest.entry_price,
            currentPrice,
            backtest.intensity_score,
            backtest.cont_prob
          );
          
          // 如果狀態改變，更新記錄
          if (result.result_outcome !== 'PENDING') {
            const now = new Date().toISOString();
            const entryTime = new Date(backtest.entry_timestamp);
            const durationMinutes = Math.floor((new Date() - entryTime) / 1000 / 60);
            
            await base44.asServiceRole.entities.AIBacktestLog.update(backtest.id, {
              exit_price: currentPrice,
              result_pct: result.result_pct,
              result_outcome: result.result_outcome,
              learn_weight: result.learn_weight,
              feedback_notes: result.feedback_notes,
              exit_timestamp: now,
              duration_minutes: durationMinutes
            });
            
            results.push({
              symbol: backtest.symbol,
              outcome: result.result_outcome,
              pct: result.result_pct
            });
          }
        } catch (error) {
          console.error(`Error processing backtest for ${backtest.symbol}:`, error);
        }
      }
      
      return Response.json({
        success: true,
        processed: results.length,
        results
      });
    }
    
    return Response.json({ error: 'Invalid request' }, { status: 400 });
    
  } catch (error) {
    console.error('Backtest error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});