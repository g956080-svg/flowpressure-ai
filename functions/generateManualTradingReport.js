import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_date, report_type } = await req.json();

    // 默認為今天
    const targetDate = report_date || new Date().toISOString().split('T')[0];
    const type = report_type || 'DAILY';

    // 計算日期範圍
    let startDate, endDate;
    if (type === 'DAILY') {
      startDate = new Date(targetDate);
      endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (type === 'WEEKLY') {
      endDate = new Date(targetDate);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // 獲取所有交易記錄
    const allTrades = await base44.asServiceRole.entities.AutoTrade.list('-entry_time');

    // 過濾時間範圍內的交易
    const tradesInRange = allTrades.filter(trade => {
      const tradeDate = new Date(trade.entry_time);
      return tradeDate >= startDate && tradeDate <= endDate;
    });

    // 分類手動和自動交易
    const manualTrades = tradesInRange.filter(t => 
      t.entry_reason_en?.includes('Manual') || t.entry_reason_zh?.includes('手動')
    );
    const autoTrades = tradesInRange.filter(t => 
      !t.entry_reason_en?.includes('Manual') && !t.entry_reason_zh?.includes('手動')
    );

    // 計算手動交易統計
    const manualClosed = manualTrades.filter(t => t.status === 'CLOSED');
    const manualStats = {
      total_trades: manualClosed.length,
      win_trades: manualClosed.filter(t => t.trade_type === 'WIN').length,
      win_rate: manualClosed.length > 0 
        ? (manualClosed.filter(t => t.trade_type === 'WIN').length / manualClosed.length) * 100 
        : 0,
      avg_return: manualClosed.length > 0
        ? manualClosed.reduce((sum, t) => sum + (t.pl_percent || 0), 0) / manualClosed.length
        : 0,
      total_pl: manualClosed.reduce((sum, t) => sum + (t.pl_amount || 0), 0)
    };

    // 計算AI交易統計
    const autoClosed = autoTrades.filter(t => t.status === 'CLOSED');
    const autoStats = {
      total_trades: autoClosed.length,
      win_trades: autoClosed.filter(t => t.trade_type === 'WIN').length,
      win_rate: autoClosed.length > 0
        ? (autoClosed.filter(t => t.trade_type === 'WIN').length / autoClosed.length) * 100
        : 0,
      avg_return: autoClosed.length > 0
        ? autoClosed.reduce((sum, t) => sum + (t.pl_percent || 0), 0) / autoClosed.length
        : 0,
      total_pl: autoClosed.reduce((sum, t) => sum + (t.pl_amount || 0), 0)
    };

    // 找出最佳和最差股票
    const getStockPerformance = (trades) => {
      const stockStats = {};
      trades.forEach(trade => {
        if (!stockStats[trade.symbol]) {
          stockStats[trade.symbol] = { returns: [], count: 0 };
        }
        stockStats[trade.symbol].returns.push(trade.pl_percent || 0);
        stockStats[trade.symbol].count++;
      });

      let best = { symbol: 'N/A', avgReturn: 0 };
      let worst = { symbol: 'N/A', avgReturn: 0 };

      Object.entries(stockStats).forEach(([symbol, data]) => {
        const avgReturn = data.returns.reduce((a, b) => a + b, 0) / data.count;
        if (avgReturn > best.avgReturn) {
          best = { symbol, avgReturn };
        }
        if (avgReturn < worst.avgReturn || worst.symbol === 'N/A') {
          worst = { symbol, avgReturn };
        }
      });

      return { best, worst };
    };

    const manualStockPerf = getStockPerformance(manualClosed);
    const autoStockPerf = getStockPerformance(autoClosed);

    // 計算相關性 (簡化版本)
    let correlation = 0.5;
    if (manualStats.total_trades > 0 && autoStats.total_trades > 0) {
      const perfDiff = Math.abs(manualStats.win_rate - autoStats.win_rate);
      correlation = Math.max(0, Math.min(1, 1 - (perfDiff / 100)));
    }

    // 使用 AI 生成評論和建議
    const aiPrompt = `
You are an AI trading performance analyst. Analyze the following trading data and provide insights.

Manual Trading Performance:
- Total Trades: ${manualStats.total_trades}
- Win Rate: ${manualStats.win_rate.toFixed(2)}%
- Average Return: ${manualStats.avg_return.toFixed(2)}%
- Total P/L: $${manualStats.total_pl.toFixed(2)}

AI Auto Trading Performance:
- Total Trades: ${autoStats.total_trades}
- Win Rate: ${autoStats.win_rate.toFixed(2)}%
- Average Return: ${autoStats.avg_return.toFixed(2)}%
- Total P/L: $${autoStats.total_pl.toFixed(2)}

Correlation: ${(correlation * 100).toFixed(1)}%

Provide:
1. A brief commentary comparing manual vs AI performance (2-3 sentences)
2. Three specific, actionable recommendations for improvement

Format your response as JSON:
{
  "commentary": "your commentary here",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}
`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          commentary: { type: "string" },
          recommendations: { type: "array", items: { type: "string" } }
        }
      }
    });

    // 準備交易明細
    const tradeDetails = {
      manual: manualClosed.map(t => ({
        symbol: t.symbol,
        entry_time: t.entry_time,
        exit_time: t.exit_time,
        shares: t.shares,
        buy_price: t.buy_price,
        sell_price: t.sell_price,
        pl_percent: t.pl_percent,
        pl_amount: t.pl_amount,
        result: t.trade_type
      })),
      auto: autoClosed.map(t => ({
        symbol: t.symbol,
        entry_time: t.entry_time,
        exit_time: t.exit_time,
        shares: t.shares,
        buy_price: t.buy_price,
        sell_price: t.sell_price,
        pl_percent: t.pl_percent,
        pl_amount: t.pl_amount,
        result: t.trade_type
      }))
    };

    // 生成中文評論（簡化版本）
    const commentaryZh = aiResponse.commentary
      .replace(/manual/gi, '手動')
      .replace(/AI auto/gi, 'AI自動')
      .replace(/performance/gi, '表現')
      .replace(/win rate/gi, '勝率')
      .replace(/average return/gi, '平均回報');

    const recommendationsZh = aiResponse.recommendations.map(rec => {
      return rec
        .replace(/manual/gi, '手動')
        .replace(/AI/gi, 'AI')
        .replace(/trading/gi, '交易')
        .replace(/strategy/gi, '策略')
        .replace(/performance/gi, '表現');
    });

    // 創建或更新報告
    const existingReports = await base44.asServiceRole.entities.ManualTradingReport.filter({
      report_date: targetDate,
      report_type: type
    });

    const reportData = {
      report_date: targetDate,
      report_type: type,
      manual_total_trades: manualStats.total_trades,
      manual_win_trades: manualStats.win_trades,
      manual_win_rate: manualStats.win_rate,
      manual_avg_return: manualStats.avg_return,
      manual_total_pl: manualStats.total_pl,
      auto_total_trades: autoStats.total_trades,
      auto_win_trades: autoStats.win_trades,
      auto_win_rate: autoStats.win_rate,
      auto_avg_return: autoStats.avg_return,
      auto_total_pl: autoStats.total_pl,
      correlation: correlation,
      manual_best_stock: manualStockPerf.best.symbol,
      manual_best_return: manualStockPerf.best.avgReturn,
      manual_worst_stock: manualStockPerf.worst.symbol,
      manual_worst_return: manualStockPerf.worst.avgReturn,
      auto_best_stock: autoStockPerf.best.symbol,
      auto_best_return: autoStockPerf.best.avgReturn,
      auto_worst_stock: autoStockPerf.worst.symbol,
      auto_worst_return: autoStockPerf.worst.avgReturn,
      ai_commentary_en: aiResponse.commentary,
      ai_commentary_zh: commentaryZh,
      recommendations_en: aiResponse.recommendations,
      recommendations_zh: recommendationsZh,
      trade_details: JSON.stringify(tradeDetails)
    };

    if (existingReports.length > 0) {
      await base44.asServiceRole.entities.ManualTradingReport.update(
        existingReports[0].id,
        reportData
      );
    } else {
      await base44.asServiceRole.entities.ManualTradingReport.create(reportData);
    }

    return Response.json({
      success: true,
      report: reportData,
      message: `${type} report generated for ${targetDate}`
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});