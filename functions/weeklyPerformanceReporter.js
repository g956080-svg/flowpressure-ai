import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Weekly Performance Reporter
 * 統計每週績效並產生學習回饋
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

// 獲取本週的起始和結束日期
function getWeekDates(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // 調整到週日
  
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return {
    start: weekStart.toISOString(),
    end: weekEnd.toISOString(),
    startDate: weekStart.toISOString().split('T')[0],
    endDate: weekEnd.toISOString().split('T')[0]
  };
}

// 計算每支股票的勝率
function calculateSymbolWinRates(backtests) {
  const symbolStats = {};
  
  backtests.forEach(backtest => {
    if (backtest.result_outcome === 'PENDING') return;
    
    if (!symbolStats[backtest.symbol]) {
      symbolStats[backtest.symbol] = {
        wins: 0,
        losses: 0,
        total: 0
      };
    }
    
    symbolStats[backtest.symbol].total++;
    if (backtest.result_outcome === 'WIN') {
      symbolStats[backtest.symbol].wins++;
    } else if (backtest.result_outcome === 'LOSE') {
      symbolStats[backtest.symbol].losses++;
    }
  });
  
  // 計算勝率
  const symbolWinRates = {};
  for (const symbol in symbolStats) {
    const stats = symbolStats[symbol];
    if (stats.total > 0) {
      symbolWinRates[symbol] = (stats.wins / stats.total) * 100;
    }
  }
  
  return symbolWinRates;
}

// 生成學習回饋
function generateLearningNote(weeklyWinRate, avgIntensity, avgConfidence) {
  const notes = {
    zh: '',
    en: ''
  };
  
  if (weeklyWinRate >= 70) {
    notes.zh = '🎉 AI 表現強勁，維持現有策略。高勝率顯示演算法精準度優秀。';
    notes.en = '🎉 AI performing excellently, maintain current strategy. High win rate shows outstanding algorithm precision.';
  } else if (weeklyWinRate >= 60) {
    notes.zh = '✅ 達標範圍 (60-70%)，建議微調 cont_prob 閾值 +5% 以提升信心度篩選。';
    notes.en = '✅ Within target range (60-70%), suggest fine-tuning cont_prob threshold +5% to improve confidence filtering.';
  } else if (weeklyWinRate >= 55) {
    notes.zh = '⚠️ 勝率略低於目標，建議提高 intensity_threshold 至 5，並增加延遲補償 +1 秒。';
    notes.en = '⚠️ Win rate slightly below target, suggest raising intensity_threshold to 5 and adding +1s delay compensation.';
  } else {
    notes.zh = '❌ 策略偏弱，建議重新校正：提高 volume_multiplier 至 5，並檢視市場波動度調整參數。';
    notes.en = '❌ Strategy underperforming, suggest recalibration: raise volume_multiplier to 5 and review market volatility adjustments.';
  }
  
  // 額外建議
  if (avgIntensity < 3) {
    notes.zh += ' 平均強度偏低，可能過於保守。';
    notes.en += ' Average intensity low, possibly too conservative.';
  }
  
  if (avgConfidence < 60) {
    notes.zh += ' 平均信心度不足，建議提高 cont_prob 計算權重。';
    notes.en += ' Average confidence insufficient, suggest increasing cont_prob calculation weights.';
  }
  
  return notes;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { week_offset = 0 } = await req.json() || {};
    
    // 計算目標週的日期範圍
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - (week_offset * 7));
    const weekDates = getWeekDates(targetDate);
    
    // 檢查是否已有該週的報告
    const existingReports = await base44.asServiceRole.entities.AIWeeklyPerformanceLog.filter({
      week_start_date: weekDates.startDate
    });
    
    if (existingReports.length > 0 && week_offset === 0) {
      // 如果是當前週且已有報告，更新它
      const reportId = existingReports[0].id;
      // 繼續執行以更新數據
    }
    
    // 獲取該週的所有回測記錄
    const allBacktests = await base44.asServiceRole.entities.AIBacktestLog.list('-entry_timestamp', 1000);
    
    const weekBacktests = allBacktests.filter(backtest => {
      const entryTime = new Date(backtest.entry_timestamp);
      return entryTime >= new Date(weekDates.start) && entryTime <= new Date(weekDates.end);
    });
    
    if (weekBacktests.length === 0) {
      return Response.json({
        success: false,
        message: '該週無回測數據'
      });
    }
    
    // 統計數據
    const completed = weekBacktests.filter(b => b.result_outcome !== 'PENDING');
    const wins = completed.filter(b => b.result_outcome === 'WIN').length;
    const losses = completed.filter(b => b.result_outcome === 'LOSE').length;
    const neutrals = weekBacktests.filter(b => b.result_outcome === 'PENDING').length;
    
    const totalSignals = weekBacktests.length;
    const weeklyWinRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;
    
    // 計算平均強度和信心度
    const avgIntensity = weekBacktests.reduce((sum, b) => sum + (b.intensity_score || 0), 0) / weekBacktests.length;
    const avgConfidence = weekBacktests.reduce((sum, b) => sum + (b.cont_prob || 0), 0) / weekBacktests.length;
    
    // 找出最佳和最差股票
    const symbolWinRates = calculateSymbolWinRates(completed);
    const symbols = Object.keys(symbolWinRates);
    
    let bestSymbol = '';
    let bestWinRate = 0;
    let worstSymbol = '';
    let worstWinRate = 100;
    
    symbols.forEach(symbol => {
      const winRate = symbolWinRates[symbol];
      if (winRate > bestWinRate) {
        bestWinRate = winRate;
        bestSymbol = symbol;
      }
      if (winRate < worstWinRate) {
        worstWinRate = winRate;
        worstSymbol = symbol;
      }
    });
    
    // 生成學習回饋
    const learningNotes = generateLearningNote(weeklyWinRate, avgIntensity, avgConfidence);
    
    // 創建報告記錄
    const reportData = {
      week_start_date: weekDates.startDate,
      week_end_date: weekDates.endDate,
      total_signals: totalSignals,
      win_signals: wins,
      lose_signals: losses,
      neutral_signals: neutrals,
      weekly_win_rate: weeklyWinRate,
      avg_intensity: avgIntensity,
      avg_confidence: avgConfidence,
      best_symbol: bestSymbol || 'N/A',
      best_symbol_win_rate: bestWinRate,
      worst_symbol: worstSymbol || 'N/A',
      worst_symbol_win_rate: worstWinRate,
      learning_note: learningNotes.zh,
      learning_note_en: learningNotes.en,
      algorithm_version: 'BigMoney-AI-v1.0',
      created_at: new Date().toISOString()
    };
    
    // 更新或創建報告
    if (existingReports.length > 0) {
      await base44.asServiceRole.entities.AIWeeklyPerformanceLog.update(existingReports[0].id, reportData);
    } else {
      await base44.asServiceRole.entities.AIWeeklyPerformanceLog.create(reportData);
    }
    
    // 記錄到日誌
    await logError(base44, 'SYSTEM', `Weekly report generated: ${weekDates.startDate} to ${weekDates.endDate}, Win Rate: ${weeklyWinRate.toFixed(1)}%`, 'info', {
      week: weekDates.startDate,
      win_rate: weeklyWinRate,
      total_signals: totalSignals
    });
    
    return Response.json({
      success: true,
      report: reportData,
      summary: {
        week: `${weekDates.startDate} ~ ${weekDates.endDate}`,
        win_rate: `${weeklyWinRate.toFixed(1)}%`,
        signals: `${totalSignals} (WIN ${wins} / LOSE ${losses} / NEU ${neutrals})`,
        best: `${bestSymbol} (${bestWinRate.toFixed(1)}%)`,
        worst: `${worstSymbol} (${worstWinRate.toFixed(1)}%)`,
        feedback: learningNotes.zh
      }
    });
    
  } catch (error) {
    console.error('Weekly reporter error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});