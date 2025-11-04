import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * AI Self-Learning Reinforcer
 * 統計勝率並自動調整權重
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

// 計算勝率
function calculateWinRate(backtests, filterFn = null) {
  const filtered = filterFn ? backtests.filter(filterFn) : backtests;
  const completed = filtered.filter(b => b.result_outcome !== 'PENDING');
  
  if (completed.length === 0) return 0;
  
  const wins = completed.filter(b => b.result_outcome === 'WIN').length;
  return (wins / completed.length) * 100;
}

// 生成 AI 狀態
function determineAIStatus(winRateOverall, totalSignals) {
  if (totalSignals < 20) {
    return '初始化';
  } else if (totalSignals < 100) {
    return '學習中';
  } else if (winRateOverall >= 60 && winRateOverall <= 75) {
    return '穩定';
  } else if (winRateOverall < 55) {
    return '重新校正中';
  } else {
    return '穩定';
  }
}

// 生成效能註記
function generatePerformanceNotes(stats, backtests) {
  const notes = [];
  
  // 總體表現
  if (stats.win_rate_overall >= 70) {
    notes.push('✅ 總體勝率優秀 (≥70%)');
  } else if (stats.win_rate_overall >= 60) {
    notes.push('✓ 總體勝率達標 (60-70%)');
  } else if (stats.win_rate_overall >= 50) {
    notes.push('⚠️ 總體勝率偏低 (50-60%)，需要優化');
  } else {
    notes.push('❌ 總體勝率不佳 (<50%)，建議重新校正');
  }
  
  // 強度分析
  if (stats.win_rate_intensity_5 > stats.win_rate_intensity_4) {
    notes.push('💡 強度5表現優於強度4，演算法合理');
  } else {
    notes.push('⚠️ 強度評分可能需要調整');
  }
  
  // 信心度分析
  if (stats.win_rate_high_conf >= 70) {
    notes.push('🎯 高信心訊號表現優異');
  } else if (stats.win_rate_high_conf < 60) {
    notes.push('⚠️ 高信心訊號未達預期，需檢視 cont_prob 計算');
  }
  
  // 樣本數量
  const completedCount = backtests.filter(b => b.result_outcome !== 'PENDING').length;
  if (completedCount < 50) {
    notes.push(`📊 樣本數：${completedCount}，建議累積更多數據`);
  } else {
    notes.push(`📊 樣本數：${completedCount}，數據充足`);
  }
  
  return notes.join(' | ');
}

// 生成權重調整建議
function generateUpdatedWeights(stats, backtests) {
  const weights = {
    volume_multiplier: 4,
    trade_size_multiplier: 8,
    intensity_threshold: 4,
    cont_prob_threshold: 70,
    adjustments: []
  };
  
  // 根據勝率調整閾值
  if (stats.win_rate_overall < 55) {
    weights.intensity_threshold = 5;
    weights.adjustments.push('提高 intensity_threshold 至 5');
  }
  
  if (stats.win_rate_high_conf < 60) {
    weights.cont_prob_threshold = 75;
    weights.adjustments.push('提高 cont_prob_threshold 至 75');
  }
  
  // 根據強度勝率調整
  if (stats.win_rate_intensity_4 < 55) {
    weights.volume_multiplier = 5;
    weights.adjustments.push('提高 volume_multiplier 至 5');
  }
  
  return weights;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { limit = 100 } = await req.json() || {};
    
    // 獲取最近的回測記錄
    const backtests = await base44.asServiceRole.entities.AIBacktestLog.list('-entry_timestamp', limit);
    
    if (backtests.length === 0) {
      return Response.json({
        success: false,
        message: '尚無回測數據'
      });
    }
    
    // 計算各項勝率
    const stats = {
      total_signals_analyzed: backtests.length,
      win_rate_overall: calculateWinRate(backtests),
      win_rate_intensity_1: calculateWinRate(backtests, b => b.intensity_score === 1),
      win_rate_intensity_2: calculateWinRate(backtests, b => b.intensity_score === 2),
      win_rate_intensity_3: calculateWinRate(backtests, b => b.intensity_score === 3),
      win_rate_intensity_4: calculateWinRate(backtests, b => b.intensity_score === 4),
      win_rate_intensity_5: calculateWinRate(backtests, b => b.intensity_score === 5),
      win_rate_high_conf: calculateWinRate(backtests, b => b.cont_prob >= 70),
      win_rate_medium_conf: calculateWinRate(backtests, b => b.cont_prob >= 50 && b.cont_prob < 70),
      win_rate_low_conf: calculateWinRate(backtests, b => b.cont_prob < 50)
    };
    
    // 判斷 AI 狀態
    const aiStatus = determineAIStatus(stats.win_rate_overall, stats.total_signals_analyzed);
    
    // 生成權重調整
    const updatedWeights = generateUpdatedWeights(stats, backtests);
    
    // 生成效能註記
    const performanceNotes = generatePerformanceNotes(stats, backtests);
    
    // 創建學習記錄
    const learningRecord = {
      timestamp: new Date().toISOString(),
      total_signals_analyzed: stats.total_signals_analyzed,
      win_rate_overall: stats.win_rate_overall,
      win_rate_intensity_1: stats.win_rate_intensity_1,
      win_rate_intensity_2: stats.win_rate_intensity_2,
      win_rate_intensity_3: stats.win_rate_intensity_3,
      win_rate_intensity_4: stats.win_rate_intensity_4,
      win_rate_intensity_5: stats.win_rate_intensity_5,
      win_rate_high_conf: stats.win_rate_high_conf,
      win_rate_medium_conf: stats.win_rate_medium_conf,
      win_rate_low_conf: stats.win_rate_low_conf,
      ai_status: aiStatus,
      updated_weights: JSON.stringify(updatedWeights),
      performance_notes: performanceNotes,
      algorithm_version: 'BigMoney-AI-v1.0'
    };
    
    const created = await base44.asServiceRole.entities.AILearningLog.create(learningRecord);
    
    // 記錄學習事件
    await logError(base44, 'SYSTEM', `AI Learning completed: ${stats.total_signals_analyzed} signals analyzed, ${stats.win_rate_overall.toFixed(1)}% win rate`, 'info', {
      win_rate: stats.win_rate_overall,
      ai_status: aiStatus
    });
    
    return Response.json({
      success: true,
      learning: learningRecord,
      stats: {
        ...stats,
        ai_status: aiStatus,
        performance_notes: performanceNotes
      },
      recommendations: updatedWeights.adjustments
    });
    
  } catch (error) {
    console.error('AI Learning error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});