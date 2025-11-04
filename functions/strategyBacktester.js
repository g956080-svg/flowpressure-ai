import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { strategy_id, start_date, end_date, initial_capital = 10000 } = await req.json();

    if (!strategy_id) {
      return Response.json({ error: 'Strategy ID required' }, { status: 400 });
    }

    // 獲取策略配置
    const strategy = await base44.asServiceRole.entities.AIStrategy.filter({ id: strategy_id });
    if (strategy.length === 0) {
      return Response.json({ error: 'Strategy not found' }, { status: 404 });
    }

    const strategyConfig = strategy[0];

    // 獲取歷史交易數據（使用已有的交易記錄作為模擬）
    const allTrades = await base44.asServiceRole.entities.AutoTrade.list('-entry_time');
    
    // 過濾日期範圍
    const startDateTime = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDateTime = end_date ? new Date(end_date) : new Date();
    
    const historicalTrades = allTrades.filter(trade => {
      const tradeDate = new Date(trade.entry_time);
      return tradeDate >= startDateTime && tradeDate <= endDateTime && trade.status === 'CLOSED';
    });

    if (historicalTrades.length === 0) {
      return Response.json({ 
        error: 'No historical data available for the specified period',
        suggestion: 'Try a different date range or run some trades first'
      }, { status: 400 });
    }

    // 執行回測模擬
    let capital = initial_capital;
    let maxCapital = initial_capital;
    let minCapital = initial_capital;
    let currentDrawdown = 0;
    let maxDrawdown = 0;
    let maxDrawdownDuration = 0;
    let drawdownStart = null;
    
    const equityCurve = [{ date: startDateTime.toISOString(), equity: capital }];
    const tradeLog = [];
    const dailyReturns = [];
    const performanceBySymbol = {};
    
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentConsecutiveLosses = 0;
    
    let totalTradeDuration = 0;

    // 模擬每筆交易
    for (const trade of historicalTrades) {
      // 應用策略過濾條件
      const tradeConfidence = trade.entry_confidence || 50;
      const volatility = Math.abs(trade.pl_percent || 0);
      
      // 檢查信心度
      if (tradeConfidence < strategyConfig.entry_confidence_min) {
        continue;
      }
      
      // 檢查波動率
      if (volatility > strategyConfig.volatility_threshold) {
        continue;
      }
      
      // 檢查連續虧損冷卻期
      if (currentConsecutiveLosses >= strategyConfig.max_consecutive_losses) {
        currentConsecutiveLosses = 0;
        continue; // 跳過這筆交易（冷卻期）
      }
      
      // 計算倉位大小
      const positionSize = capital * strategyConfig.max_position_size;
      
      // 計算實際損益（考慮策略的止盈止損）
      let actualReturn = trade.pl_percent || 0;
      
      // 應用止盈
      if (actualReturn > strategyConfig.profit_target) {
        actualReturn = strategyConfig.profit_target;
      }
      
      // 應用止損
      if (actualReturn < strategyConfig.stop_loss) {
        actualReturn = strategyConfig.stop_loss;
      }
      
      // 應用移動止損
      if (strategyConfig.trailing_stop && actualReturn > 0) {
        const trailingLevel = actualReturn - strategyConfig.trailing_stop_distance;
        if (trailingLevel > 0) {
          actualReturn = Math.max(trailingLevel, actualReturn);
        }
      }
      
      const pnl = positionSize * (actualReturn / 100);
      capital += pnl;
      
      // 更新最大/最小資金
      if (capital > maxCapital) {
        maxCapital = capital;
        if (drawdownStart) {
          const drawdownDuration = (new Date(trade.exit_time) - drawdownStart) / (1000 * 60 * 60 * 24);
          maxDrawdownDuration = Math.max(maxDrawdownDuration, drawdownDuration);
          drawdownStart = null;
        }
      }
      if (capital < minCapital) {
        minCapital = capital;
        if (!drawdownStart) {
          drawdownStart = new Date(trade.exit_time);
        }
      }
      
      // 計算回撤
      currentDrawdown = ((capital - maxCapital) / maxCapital) * 100;
      maxDrawdown = Math.min(maxDrawdown, currentDrawdown);
      
      // 檢查每日最大虧損
      const dailyLoss = ((capital - initial_capital) / initial_capital) * 100;
      if (dailyLoss <= strategyConfig.max_daily_loss) {
        break; // 達到每日最大虧損限制
      }
      
      // 記錄交易
      const tradeResult = {
        symbol: trade.symbol,
        entry_time: trade.entry_time,
        exit_time: trade.exit_time,
        position_size: positionSize,
        return_pct: actualReturn,
        pnl: pnl,
        capital_after: capital,
        result: pnl >= 0 ? 'WIN' : 'LOSS'
      };
      
      tradeLog.push(tradeResult);
      
      // 更新連勝/連敗
      if (pnl >= 0) {
        consecutiveWins++;
        consecutiveLosses = 0;
        currentConsecutiveLosses = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins);
      } else {
        consecutiveLosses++;
        consecutiveWins = 0;
        currentConsecutiveLosses++;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
      }
      
      // 記錄權益曲線
      equityCurve.push({
        date: trade.exit_time,
        equity: capital
      });
      
      // 記錄每日回報
      const dailyReturn = pnl / (capital - pnl) * 100;
      dailyReturns.push(dailyReturn);
      
      // 按股票統計
      if (!performanceBySymbol[trade.symbol]) {
        performanceBySymbol[trade.symbol] = {
          trades: 0,
          wins: 0,
          total_pnl: 0,
          avg_return: 0
        };
      }
      performanceBySymbol[trade.symbol].trades++;
      if (pnl >= 0) performanceBySymbol[trade.symbol].wins++;
      performanceBySymbol[trade.symbol].total_pnl += pnl;
      
      // 計算持倉時間
      if (trade.entry_time && trade.exit_time) {
        const duration = (new Date(trade.exit_time) - new Date(trade.entry_time)) / (1000 * 60);
        totalTradeDuration += duration;
      }
    }

    // 計算最終指標
    const totalReturn = ((capital - initial_capital) / initial_capital) * 100;
    const winningTrades = tradeLog.filter(t => t.result === 'WIN').length;
    const losingTrades = tradeLog.filter(t => t.result === 'LOSS').length;
    const totalTrades = tradeLog.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    const avgWin = winningTrades > 0
      ? tradeLog.filter(t => t.result === 'WIN').reduce((sum, t) => sum + t.return_pct, 0) / winningTrades
      : 0;
    
    const avgLoss = losingTrades > 0
      ? tradeLog.filter(t => t.result === 'LOSS').reduce((sum, t) => sum + t.return_pct, 0) / losingTrades
      : 0;
    
    const largestWin = tradeLog.length > 0
      ? Math.max(...tradeLog.map(t => t.return_pct))
      : 0;
    
    const largestLoss = tradeLog.length > 0
      ? Math.min(...tradeLog.map(t => t.return_pct))
      : 0;
    
    const totalWinAmount = tradeLog.filter(t => t.result === 'WIN').reduce((sum, t) => sum + t.pnl, 0);
    const totalLossAmount = Math.abs(tradeLog.filter(t => t.result === 'LOSS').reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? 999 : 0;
    
    // 計算夏普比率
    const avgReturn = dailyReturns.length > 0
      ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
      : 0;
    
    const variance = dailyReturns.length > 0
      ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length
      : 0;
    
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
    
    const recoveryFactor = Math.abs(maxDrawdown) > 0 ? totalReturn / Math.abs(maxDrawdown) : 0;
    
    const avgTradeDuration = totalTrades > 0 ? totalTradeDuration / totalTrades : 0;

    // 計算按股票績效
    Object.keys(performanceBySymbol).forEach(symbol => {
      const perf = performanceBySymbol[symbol];
      perf.win_rate = perf.trades > 0 ? (perf.wins / perf.trades) * 100 : 0;
      perf.avg_return = perf.trades > 0 ? perf.total_pnl / perf.trades : 0;
    });

    // 使用 AI 生成評估
    const aiPrompt = `
You are an expert quantitative trading analyst. Evaluate this backtest result:

Strategy: ${strategyConfig.strategy_name}
Risk Tolerance: ${strategyConfig.risk_tolerance}
Period: ${start_date} to ${end_date}

Results:
- Total Return: ${totalReturn.toFixed(2)}%
- Win Rate: ${winRate.toFixed(2)}%
- Total Trades: ${totalTrades}
- Sharpe Ratio: ${sharpeRatio.toFixed(2)}
- Max Drawdown: ${maxDrawdown.toFixed(2)}%
- Profit Factor: ${profitFactor.toFixed(2)}
- Avg Win: ${avgWin.toFixed(2)}%
- Avg Loss: ${avgLoss.toFixed(2)}%

Provide:
1. A brief evaluation (3-4 sentences)
2. Confidence score (0-100) on strategy viability
3. Three specific optimization suggestions

Format as JSON:
{
  "evaluation": "your evaluation",
  "confidence": 85,
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}
`;

    const aiAnalysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          evaluation: { type: "string" },
          confidence: { type: "number" },
          suggestions: { type: "array", items: { type: "string" } }
        }
      }
    });

    // 創建回測結果
    const backtestResult = {
      strategy_id: strategy_id,
      strategy_name: strategyConfig.strategy_name,
      backtest_date: new Date().toISOString(),
      start_date: startDateTime.toISOString().split('T')[0],
      end_date: endDateTime.toISOString().split('T')[0],
      initial_capital: initial_capital,
      final_capital: capital,
      total_return: totalReturn,
      total_trades: totalTrades,
      winning_trades: winningTrades,
      losing_trades: losingTrades,
      win_rate: winRate,
      avg_win: avgWin,
      avg_loss: avgLoss,
      largest_win: largestWin,
      largest_loss: largestLoss,
      profit_factor: profitFactor,
      sharpe_ratio: sharpeRatio,
      max_drawdown: maxDrawdown,
      max_drawdown_duration: maxDrawdownDuration,
      recovery_factor: recoveryFactor,
      consecutive_wins_max: maxConsecutiveWins,
      consecutive_losses_max: maxConsecutiveLosses,
      avg_trade_duration: avgTradeDuration,
      equity_curve: JSON.stringify(equityCurve),
      trade_log: JSON.stringify(tradeLog.slice(0, 100)), // 限制大小
      performance_by_symbol: JSON.stringify(performanceBySymbol),
      ai_evaluation_en: aiAnalysis.evaluation,
      ai_evaluation_zh: aiAnalysis.evaluation, // 簡化版本
      optimization_suggestions: aiAnalysis.suggestions,
      confidence_score: aiAnalysis.confidence
    };

    // 儲存回測結果
    const savedResult = await base44.asServiceRole.entities.BacktestResult.create(backtestResult);

    return Response.json({
      success: true,
      backtest_id: savedResult.id,
      summary: {
        total_return: totalReturn.toFixed(2),
        win_rate: winRate.toFixed(2),
        sharpe_ratio: sharpeRatio.toFixed(2),
        max_drawdown: maxDrawdown.toFixed(2),
        total_trades: totalTrades,
        confidence_score: aiAnalysis.confidence
      },
      message: 'Backtest completed successfully'
    });

  } catch (error) {
    console.error('Backtest error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});