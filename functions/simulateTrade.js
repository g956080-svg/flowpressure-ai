import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// 判斷市場時段
function getMarketSession() {
  const now = new Date();
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const day = etTime.getDay();
  
  if (day === 0 || day === 6) return 'CLOSED';
  
  const timeInMinutes = hours * 60 + minutes;
  
  if (timeInMinutes >= 240 && timeInMinutes < 570) return 'PRE';
  else if (timeInMinutes >= 570 && timeInMinutes < 960) return 'REG';
  else if (timeInMinutes >= 961 && timeInMinutes < 1200) return 'POST';
  
  return 'CLOSED';
}

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

// 防崩壞檢查與修正
async function validateAndFixAccount(base44, account) {
  let needsUpdate = false;
  const fixes = [];
  
  // 檢查現金餘額
  if (account.cash_balance < 0) {
    fixes.push(`Negative cash_balance detected: ${account.cash_balance}, fixing to 0`);
    account.cash_balance = 0;
    needsUpdate = true;
  }
  
  // 檢查市值
  if (account.equity_value < 0) {
    fixes.push(`Negative equity_value detected: ${account.equity_value}, fixing to 0`);
    account.equity_value = 0;
    needsUpdate = true;
  }
  
  // 檢查總資產
  if (account.total_value < 0 || !isFinite(account.total_value)) {
    fixes.push(`Invalid total_value detected: ${account.total_value}, recalculating`);
    account.total_value = account.cash_balance + account.equity_value;
    needsUpdate = true;
  }
  
  if (needsUpdate) {
    await logError(base44, 'SYSTEM', 'Account data corruption detected and fixed', 'critical', { fixes });
    await base44.asServiceRole.entities.AccountState.update(account.id, {
      cash_balance: account.cash_balance,
      equity_value: account.equity_value,
      total_value: account.total_value,
      last_update: new Date().toISOString()
    });
  }
  
  return account;
}

// 防崩壞檢查持倉
async function validateAndFixPosition(base44, position) {
  let needsUpdate = false;
  const fixes = [];
  
  // 檢查數量
  if (position.quantity < 0 || !isFinite(position.quantity)) {
    fixes.push(`Invalid quantity detected: ${position.quantity}, fixing to 0`);
    position.quantity = 0;
    needsUpdate = true;
  }
  
  // 檢查平均成本
  if (position.avg_cost < 0 || !isFinite(position.avg_cost)) {
    fixes.push(`Invalid avg_cost detected: ${position.avg_cost}, fixing to current price`);
    position.avg_cost = position.current_price || 0;
    needsUpdate = true;
  }
  
  if (needsUpdate) {
    await logError(base44, 'SYSTEM', `Position data corruption detected and fixed for ${position.symbol}`, 'critical', { fixes, symbol: position.symbol });
    
    if (position.quantity === 0) {
      // 刪除無效持倉
      await base44.asServiceRole.entities.PortfolioPosition.delete(position.id);
    } else {
      await base44.asServiceRole.entities.PortfolioPosition.update(position.id, {
        quantity: position.quantity,
        avg_cost: position.avg_cost,
        updated_at: new Date().toISOString()
      });
    }
  }
  
  return position;
}

// 帶重試的交易記錄寫入
async function recordTradeWithRetry(base44, tradeData, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await base44.asServiceRole.entities.TradeHistory.create(tradeData);
    } catch (error) {
      if (i === retries) {
        await logError(base44, 'SYSTEM', `Failed to record trade after ${retries} retries: ${error.message}`, 'critical', { tradeData });
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { action, symbol, quantity } = await req.json();
    
    if (!action || !symbol || !quantity) {
      return Response.json({ error: 'action, symbol, quantity required' }, { status: 400 });
    }
    
    const marketSession = getMarketSession();
    const timestamp = new Date().toISOString();
    
    // 檢查交易時段（只允許 REG）
    if (marketSession !== 'REG') {
      const note = '⚠️ 僅能在美股正常交易時段 (09:30–16:00 ET) 模擬下單。';
      
      await recordTradeWithRetry(base44, {
        user_id: user.email,
        timestamp,
        action: 'REJECTED',
        symbol,
        fill_price: 0,
        quantity,
        cash_before: 0,
        cash_after: 0,
        note,
        market_session: marketSession
      });
      
      return Response.json({
        success: false,
        message: note
      });
    }
    
    // === 同步鎖開始 ===
    // 獲取當前價格
    const quotes = await base44.asServiceRole.entities.LiveQuote.filter({ symbol });
    if (quotes.length === 0) {
      await logError(base44, 'TRADE', `No quote found for ${symbol}`, 'warning', { symbol });
      return Response.json({ error: 'Stock quote not found' }, { status: 404 });
    }
    const currentPrice = quotes[0].last_price;
    
    // 獲取帳戶狀態
    let accounts = await base44.asServiceRole.entities.AccountState.filter({ user_id: user.email });
    let account;
    
    if (accounts.length === 0) {
      // 初始化帳戶
      account = await base44.asServiceRole.entities.AccountState.create({
        user_id: user.email,
        cash_balance: 100000,
        equity_value: 0,
        total_value: 100000,
        trading_locked: false,
        last_update: timestamp
      });
      
      await logError(base44, 'SYSTEM', `New account created for ${user.email}`, 'info', { user_id: user.email });
    } else {
      account = accounts[0];
      // 防崩壞檢查
      account = await validateAndFixAccount(base44, account);
    }
    
    const cashBefore = account.cash_balance;
    
    // BUY 邏輯
    if (action === 'BUY') {
      const totalCost = currentPrice * quantity;
      
      if (account.cash_balance < totalCost) {
        const note = '⚠️ 資金不足，訂單未成交。';
        
        await recordTradeWithRetry(base44, {
          user_id: user.email,
          timestamp,
          action: 'REJECTED',
          symbol,
          fill_price: currentPrice,
          quantity,
          cash_before: cashBefore,
          cash_after: cashBefore,
          note,
          market_session: marketSession
        });
        
        return Response.json({
          success: false,
          message: note
        });
      }
      
      // 扣款
      const newCashBalance = account.cash_balance - totalCost;
      
      // 更新持倉
      const positions = await base44.asServiceRole.entities.PortfolioPosition.filter({
        user_id: user.email,
        symbol
      });
      
      if (positions.length > 0) {
        let position = positions[0];
        position = await validateAndFixPosition(base44, position);
        
        const totalShares = position.quantity + quantity;
        const newAvgCost = (position.avg_cost * position.quantity + currentPrice * quantity) / totalShares;
        
        await base44.asServiceRole.entities.PortfolioPosition.update(position.id, {
          avg_cost: newAvgCost,
          quantity: totalShares,
          current_price: currentPrice,
          unrealized_pnl: (currentPrice - newAvgCost) * totalShares,
          unrealized_pnl_pct: ((currentPrice - newAvgCost) / newAvgCost) * 100,
          updated_at: timestamp
        });
      } else {
        await base44.asServiceRole.entities.PortfolioPosition.create({
          user_id: user.email,
          symbol,
          avg_cost: currentPrice,
          quantity,
          current_price: currentPrice,
          unrealized_pnl: 0,
          unrealized_pnl_pct: 0,
          updated_at: timestamp
        });
      }
      
      // 更新帳戶
      await base44.asServiceRole.entities.AccountState.update(account.id, {
        cash_balance: newCashBalance,
        last_update: timestamp
      });
      
      // 記錄交易
      await recordTradeWithRetry(base44, {
        user_id: user.email,
        timestamp,
        action: 'BUY',
        symbol,
        fill_price: currentPrice,
        quantity,
        cash_before: cashBefore,
        cash_after: newCashBalance,
        note: `✅ 已用 $${currentPrice.toFixed(2)} 成功買進 ${symbol} x ${quantity} 股（模擬）。`,
        market_session: marketSession
      });
      
      await logError(base44, 'TRADE', `BUY executed: ${symbol} x ${quantity} @ $${currentPrice.toFixed(2)}`, 'info', {
        symbol,
        quantity,
        price: currentPrice,
        user_id: user.email
      });
      
      // === 同步鎖結束 ===
      
      return Response.json({
        success: true,
        message: `✅ 已用 $${currentPrice.toFixed(2)} 成功買進 ${symbol} x ${quantity} 股（模擬）。`,
        cash_balance: newCashBalance,
        fill_price: currentPrice
      });
    }
    
    // SELL 邏輯
    else if (action === 'SELL') {
      const positions = await base44.asServiceRole.entities.PortfolioPosition.filter({
        user_id: user.email,
        symbol
      });
      
      if (positions.length === 0 || positions[0].quantity < quantity) {
        const note = '⚠️ 持股數不足，訂單未成交。';
        
        await recordTradeWithRetry(base44, {
          user_id: user.email,
          timestamp,
          action: 'REJECTED',
          symbol,
          fill_price: currentPrice,
          quantity,
          cash_before: cashBefore,
          cash_after: cashBefore,
          note,
          market_session: marketSession
        });
        
        return Response.json({
          success: false,
          message: note
        });
      }
      
      let position = positions[0];
      position = await validateAndFixPosition(base44, position);
      
      const totalRevenue = currentPrice * quantity;
      const newCashBalance = account.cash_balance + totalRevenue;
      const newQuantity = position.quantity - quantity;
      
      // 更新持倉
      if (newQuantity === 0) {
        await base44.asServiceRole.entities.PortfolioPosition.delete(position.id);
      } else {
        await base44.asServiceRole.entities.PortfolioPosition.update(position.id, {
          quantity: newQuantity,
          current_price: currentPrice,
          unrealized_pnl: (currentPrice - position.avg_cost) * newQuantity,
          unrealized_pnl_pct: ((currentPrice - position.avg_cost) / position.avg_cost) * 100,
          updated_at: timestamp
        });
      }
      
      // 更新帳戶
      await base44.asServiceRole.entities.AccountState.update(account.id, {
        cash_balance: newCashBalance,
        last_update: timestamp
      });
      
      // 記錄交易
      await recordTradeWithRetry(base44, {
        user_id: user.email,
        timestamp,
        action: 'SELL',
        symbol,
        fill_price: currentPrice,
        quantity,
        cash_before: cashBefore,
        cash_after: newCashBalance,
        note: `✅ 已用 $${currentPrice.toFixed(2)} 成功賣出 ${symbol} x ${quantity} 股（模擬）。`,
        market_session: marketSession
      });
      
      await logError(base44, 'TRADE', `SELL executed: ${symbol} x ${quantity} @ $${currentPrice.toFixed(2)}`, 'info', {
        symbol,
        quantity,
        price: currentPrice,
        user_id: user.email
      });
      
      // === 同步鎖結束 ===
      
      return Response.json({
        success: true,
        message: `✅ 已用 $${currentPrice.toFixed(2)} 成功賣出 ${symbol} x ${quantity} 股（模擬）。`,
        cash_balance: newCashBalance,
        fill_price: currentPrice
      });
    }
    
    return Response.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Trade error:', error);
    return Response.json({ 
      success: false,
      error: '⚠️ 系統暫時繁忙，請稍後再試',
      details: error.message 
    }, { status: 500 });
  }
});