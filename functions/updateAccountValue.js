import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

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

// 防崩壞檢查持倉
async function validatePosition(base44, position) {
  let needsFix = false;
  
  if (position.quantity < 0 || !isFinite(position.quantity)) {
    needsFix = true;
  }
  
  if (position.avg_cost < 0 || !isFinite(position.avg_cost)) {
    needsFix = true;
  }
  
  if (needsFix) {
    await logError(base44, 'SYSTEM', `Invalid position detected for ${position.symbol}, removing`, 'critical', { position });
    await base44.asServiceRole.entities.PortfolioPosition.delete(position.id);
    return null;
  }
  
  return position;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 獲取帳戶
    const accounts = await base44.asServiceRole.entities.AccountState.filter({ user_id: user.email });
    if (accounts.length === 0) {
      return Response.json({ error: 'Account not found' }, { status: 404 });
    }
    
    const account = accounts[0];
    
    // 防崩壞檢查現金
    if (account.cash_balance < 0) {
      await logError(base44, 'SYSTEM', `Negative cash_balance detected: ${account.cash_balance}, fixing`, 'critical', { user_id: user.email });
      account.cash_balance = 0;
      await base44.asServiceRole.entities.AccountState.update(account.id, {
        cash_balance: 0,
        last_update: new Date().toISOString()
      });
    }
    
    // 獲取所有持倉
    let positions = await base44.asServiceRole.entities.PortfolioPosition.filter({ user_id: user.email });
    
    let totalEquityValue = 0;
    let invalidPositionsCount = 0;
    
    // 更新每個持倉的當前價格和損益
    for (const position of positions) {
      // 驗證持倉
      const validPosition = await validatePosition(base44, position);
      if (!validPosition) {
        invalidPositionsCount++;
        continue;
      }
      
      const quotes = await base44.asServiceRole.entities.LiveQuote.filter({ symbol: position.symbol });
      
      if (quotes.length > 0) {
        const currentPrice = quotes[0].last_price;
        
        // 檢查價格有效性
        if (currentPrice <= 0 || !isFinite(currentPrice)) {
          await logError(base44, 'SYSTEM', `Invalid price for ${position.symbol}: ${currentPrice}`, 'warning', { symbol: position.symbol, price: currentPrice });
          continue;
        }
        
        const unrealizedPnl = (currentPrice - position.avg_cost) * position.quantity;
        const unrealizedPnlPct = ((currentPrice - position.avg_cost) / position.avg_cost) * 100;
        
        // 檢查計算結果有效性
        if (!isFinite(unrealizedPnl) || !isFinite(unrealizedPnlPct)) {
          await logError(base44, 'SYSTEM', `Invalid P/L calculation for ${position.symbol}`, 'warning', {
            symbol: position.symbol,
            currentPrice,
            avgCost: position.avg_cost,
            quantity: position.quantity
          });
          continue;
        }
        
        await base44.asServiceRole.entities.PortfolioPosition.update(position.id, {
          current_price: currentPrice,
          unrealized_pnl: unrealizedPnl,
          unrealized_pnl_pct: unrealizedPnlPct,
          updated_at: new Date().toISOString()
        });
        
        totalEquityValue += currentPrice * position.quantity;
      }
    }
    
    // 檢查市值有效性
    if (totalEquityValue < 0 || !isFinite(totalEquityValue)) {
      await logError(base44, 'SYSTEM', `Invalid equity_value calculated: ${totalEquityValue}, resetting`, 'critical', { user_id: user.email });
      totalEquityValue = 0;
    }
    
    // 更新帳戶總值
    const totalValue = account.cash_balance + totalEquityValue;
    
    // 檢查總資產有效性
    if (totalValue < 0 || !isFinite(totalValue)) {
      await logError(base44, 'SYSTEM', `Invalid total_value: ${totalValue}, recalculating`, 'critical', {
        user_id: user.email,
        cash: account.cash_balance,
        equity: totalEquityValue
      });
    }
    
    await base44.asServiceRole.entities.AccountState.update(account.id, {
      equity_value: totalEquityValue,
      total_value: totalValue,
      last_update: new Date().toISOString()
    });
    
    // 計算同步誤差
    const syncError = Math.abs(totalValue - (account.cash_balance + totalEquityValue)) / totalValue * 100;
    
    if (syncError > 1) {
      await logError(base44, 'SYSTEM', `High sync error detected: ${syncError.toFixed(2)}%`, 'warning', {
        user_id: user.email,
        syncError
      });
    }
    
    const response = {
      success: true,
      cash_balance: account.cash_balance,
      equity_value: totalEquityValue,
      total_value: totalValue,
      sync_error: syncError.toFixed(4) + '%'
    };
    
    if (invalidPositionsCount > 0) {
      response.warnings = `${invalidPositionsCount} invalid position(s) removed`;
    }
    
    return Response.json(response);
    
  } catch (error) {
    console.error('Update account error:', error);
    return Response.json({ 
      success: false,
      error: '⚠️ 系統暫時繁忙，請稍後再試',
      details: error.message 
    }, { status: 500 });
  }
});