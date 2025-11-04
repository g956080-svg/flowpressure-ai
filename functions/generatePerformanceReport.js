import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Flow-Strike Performance Analyst Agent
 * 每日自動生成績效報告
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { report_date } = await req.json() || {};
    const targetDate = report_date || new Date().toISOString().split('T')[0];
    
    console.log(`📊 Generating performance report for ${targetDate}...`);
    
    // 1. 獲取當日回測記錄
    const backtests = await base44.asServiceRole.entities.AIBacktestLog.filter({});
    
    // 過濾當日數據
    const todayBacktests = backtests.filter(b => {
      if (!b.entry_timestamp) return false;
      const entryDate = new Date(b.entry_timestamp).toISOString().split('T')[0];
      return entryDate === targetDate && b.result_outcome !== 'PENDING';
    });
    
    if (todayBacktests.length === 0) {
      return Response.json({
        success: false,
        message: `No completed trades found for ${targetDate}`
      });
    }
    
    // 2. 獲取帳戶資料
    const accounts = await base44.asServiceRole.entities.VirtualAccount.filter({});
    const account = accounts.length > 0 ? accounts[0] : null;
    
    const capitalStart = 10000; // 預設起始資金
    const capitalEnd = account ? account.total_capital : capitalStart;
    
    // 3. 計算績效指標
    const totalTrades = todayBacktests.length;
    const winTrades = todayBacktests.filter(b => b.result_outcome === 'WIN').length;
    const loseTrades = todayBacktests.filter(b => b.result_outcome === 'LOSE').length;
    const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;
    
    // 計算平均報酬率
    const returns = todayBacktests.map(b => b.result_pct || 0);
    const avgReturnPct = returns.length > 0 
      ? returns.reduce((sum, val) => sum + val, 0) / returns.length 
      : 0;
    
    // 計算總報酬
    const profitUsd = capitalEnd - capitalStart;
    const totalReturnPct = capitalStart > 0 ? (profitUsd / capitalStart) * 100 : 0;
    
    // 計算平均延遲
    const durations = todayBacktests
      .filter(b => b.duration_minutes)
      .map(b => b.duration_minutes);
    const avgLatency = durations.length > 0
      ? durations.reduce((sum, val) => sum + val, 0) / durations.length / 60
      : 0;
    
    // 找出最佳和最差股票
    let bestStock = null;
    let bestReturn = -Infinity;
    let worstStock = null;
    let worstReturn = Infinity;
    
    todayBacktests.forEach(b => {
      if ((b.result_pct || 0) > bestReturn) {
        bestReturn = b.result_pct || 0;
        bestStock = b.symbol;
      }
      if ((b.result_pct || 0) < worstReturn) {
        worstReturn = b.result_pct || 0;
        worstStock = b.symbol;
      }
    });
    
    // 計算高信心勝率 (信心度 >= 70%)
    const highConfBacktests = todayBacktests.filter(b => (b.cont_prob || 0) >= 70);
    const highConfWins = highConfBacktests.filter(b => b.result_outcome === 'WIN').length;
    const highConfWinRate = highConfBacktests.length > 0 
      ? (highConfWins / highConfBacktests.length) * 100 
      : 0;
    
    // 4. AI 學習狀態判斷
    let aiState = "Stable";
    if (winRate >= 70 && avgLatency < 2.5) {
      aiState = "Optimized";
    } else if (winRate >= 60) {
      aiState = "Learning";
    } else if (winRate < 55) {
      aiState = "Adjusting";
    }
    
    // 5. AI 建議生成
    let suggestionEn = "";
    let suggestionZh = "";
    let messageEn = "";
    let messageZh = "";
    
    if (winRate < 65) {
      suggestionEn = "⚙️ Increase social sentiment weight by 10%, reduce large order weight by 5%.";
      suggestionZh = "⚙️ 提高社群情緒權重 10%，降低大單比例權重 5%。";
      messageEn = "⚠️ Market volatility detected. AI is auto-adjusting strategy. Please monitor.";
      messageZh = "⚠️ 市場震盪中，AI 正在自動調整策略。請保持觀察。";
    } else if (avgLatency > 3) {
      suggestionEn = `🔧 Optimize latency: Try reducing delay compensation from ${avgLatency.toFixed(1)}s to 2.5s.`;
      suggestionZh = `🔧 優化延遲：嘗試將延遲補償從 ${avgLatency.toFixed(1)} 秒降低至 2.5 秒。`;
      messageEn = "⏱️ Latency optimization needed. Adjusting execution speed.";
      messageZh = "⏱️ 需要優化延遲。正在調整執行速度。";
    } else if (totalReturnPct > 20) {
      suggestionEn = "✅ AI model performing excellently. Maintain current strategy.";
      suggestionZh = "✅ AI 模型穩定進化，表現優異，建議維持現有策略。";
      messageEn = `🎯 Outstanding performance today! Simulated profit: +${totalReturnPct.toFixed(1)}%. Latency control perfect.`;
      messageZh = `🎯 AI 今日表現亮眼！模擬獲利 +${totalReturnPct.toFixed(1)}%，延遲控制完美。`;
    } else {
      suggestionEn = "📊 Performance stable. Continue monitoring market conditions.";
      suggestionZh = "📊 績效穩定。持續監控市場狀況。";
      messageEn = `✓ Solid performance with ${winRate.toFixed(1)}% win rate.`;
      messageZh = `✓ 穩健表現，勝率 ${winRate.toFixed(1)}%。`;
    }
    
    // 6. 準備交易明細
    const tradeDetails = todayBacktests.map(b => ({
      symbol: b.symbol,
      signal: b.signal_type,
      result: b.result_outcome,
      return_pct: (b.result_pct || 0).toFixed(2),
      confidence: Math.round((b.cont_prob || 0)),
      latency_sec: (b.duration_minutes || 0) / 60
    }));
    
    // 7. 創建報告
    const report = await base44.asServiceRole.entities.DailyPerformanceReport.create({
      report_date: targetDate,
      capital_start: capitalStart,
      capital_end: capitalEnd,
      total_trades: totalTrades,
      win_trades: winTrades,
      lose_trades: loseTrades,
      win_rate: winRate,
      avg_return_pct: avgReturnPct,
      total_return_pct: totalReturnPct,
      profit_usd: profitUsd,
      avg_latency: avgLatency,
      best_stock: bestStock,
      best_stock_return: bestReturn,
      worst_stock: worstStock,
      worst_stock_return: worstReturn,
      ai_learning_state: aiState,
      ai_suggestion_en: suggestionEn,
      ai_suggestion_zh: suggestionZh,
      performance_message_en: messageEn,
      performance_message_zh: messageZh,
      trade_details: JSON.stringify(tradeDetails),
      high_confidence_win_rate: highConfWinRate
    });
    
    console.log(`✅ Performance report generated for ${targetDate}`);
    console.log(`   Win Rate: ${winRate.toFixed(1)}%`);
    console.log(`   Total Return: ${totalReturnPct.toFixed(1)}%`);
    console.log(`   AI State: ${aiState}`);
    
    // 8. 返回完整報告數據
    return Response.json({
      success: true,
      report: report,
      summary: {
        date: targetDate,
        total_trades: totalTrades,
        win_rate: winRate.toFixed(1) + '%',
        total_return: totalReturnPct.toFixed(1) + '%',
        profit_usd: profitUsd.toFixed(2),
        ai_state: aiState
      },
      ui_data: {
        header: "Flow-Strike AI 每日績效回報",
        subheader: `模擬交易成果 (${targetDate})`,
        summary_card: {
          "起始資金": `$${capitalStart.toFixed(0)}`,
          "收盤資金": `$${capitalEnd.toFixed(0)}`,
          "當日報酬率": `${totalReturnPct >= 0 ? '+' : ''}${totalReturnPct.toFixed(1)}%`,
          "平均單筆報酬": `${avgReturnPct >= 0 ? '+' : ''}${avgReturnPct.toFixed(2)}%`,
          "勝率": `${winRate.toFixed(1)}%`,
          "AI狀態": aiState
        },
        performance_stats: {
          total_win_rate: winRate.toFixed(1),
          high_confidence_win_rate: highConfWinRate.toFixed(1)
        },
        trade_records: tradeDetails,
        ai_suggestion: suggestionZh,
        performance_message: messageZh
      }
    });
    
  } catch (error) {
    console.error('Performance report generation error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});