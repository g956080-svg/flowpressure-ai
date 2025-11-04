import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * FlowStrike AI AutoTrainer Coordinator
 * 統一協調器 - 根據時間自動執行對應任務
 */

function getCurrentETTime() {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

function getScheduledAction() {
  const etTime = getCurrentETTime();
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // 21:25 (台北時間) = 09:25 (ET) - 初始化
  if (timeInMinutes >= 565 && timeInMinutes < 570) {
    return 'initialize';
  }
  
  // 21:30-04:00 (台北) = 09:30-16:00 (ET) - 交易時段
  if (timeInMinutes >= 570 && timeInMinutes < 960) {
    return 'trade';
  }
  
  // 04:05 (台北) = 16:05 (ET) - 收盤結算
  if (timeInMinutes >= 965 && timeInMinutes < 970) {
    return 'settlement';
  }
  
  return 'idle';
}

async function sendAlert(base44, status, data) {
  try {
    // 記錄到系統日誌
    await base44.asServiceRole.entities.ErrorLog.create({
      timestamp: new Date().toISOString(),
      source: 'FlowStrike_Coordinator',
      message: `Status: ${status}`,
      severity: 'info',
      details: JSON.stringify(data)
    });
    
    console.log(`📢 Alert sent: ${status}`, data);
  } catch (error) {
    console.error('Failed to send alert:', error);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { force_action } = await req.json() || {};
    
    // 確定要執行的動作
    const action = force_action || getScheduledAction();
    
    console.log(`🎯 FlowStrike Coordinator - Action: ${action}`);
    
    const symbols = ["TSLA", "NVDA", "AAPL", "COIN", "PLTR", "AMD", "BABA", "PYPL", "GME"];
    
    let result = {};
    
    // 根據動作執行對應任務
    switch (action) {
      case 'initialize':
        console.log('🚀 Initializing AutoTrader Engine...');
        
        // 調用初始化
        const initResponse = await base44.functions.invoke('autoTraderEngine', {
          mode: 'initialize'
        });
        
        result = {
          action: 'initialize',
          success: initResponse.data.success,
          config: initResponse.data.config
        };
        
        await sendAlert(base44, 'initialized', result);
        break;
        
      case 'trade':
        console.log('💹 Executing trading scan...');
        
        // 先刷新報價
        try {
          await base44.functions.invoke('fetchLiveQuotes', { symbols });
          console.log('✅ Live quotes refreshed');
        } catch (error) {
          console.error('⚠️ Failed to refresh quotes:', error);
        }
        
        // 執行交易掃描
        const tradeResponse = await base44.functions.invoke('autoTraderEngine', {
          mode: 'scan_and_trade',
          symbols: symbols
        });
        
        result = {
          action: 'trade',
          success: tradeResponse.data.success,
          results: tradeResponse.data.results,
          total_actions: tradeResponse.data.total_actions,
          open_positions: tradeResponse.data.open_positions
        };
        
        // 只在有動作時發送通知
        if (tradeResponse.data.total_actions > 0) {
          await sendAlert(base44, 'trade_executed', result);
        }
        break;
        
      case 'settlement':
        console.log('📊 End of day settlement...');
        
        // 執行收盤結算
        const settlementResponse = await base44.functions.invoke('autoTraderEngine', {
          mode: 'end_of_day_settlement'
        });
        
        result = {
          action: 'settlement',
          success: settlementResponse.data.success,
          report: settlementResponse.data.report,
          learning: settlementResponse.data.learning
        };
        
        await sendAlert(base44, 'settlement_complete', {
          win_rate: settlementResponse.data.report.win_rate,
          total_return: settlementResponse.data.report.total_return_pct,
          ai_state: settlementResponse.data.learning.new_state
        });
        break;
        
      case 'idle':
        result = {
          action: 'idle',
          message: 'Outside trading hours. System idle.',
          current_time: getCurrentETTime().toISOString()
        };
        break;
        
      default:
        return Response.json({ 
          error: 'Invalid action',
          valid_actions: ['initialize', 'trade', 'settlement', 'idle'] 
        }, { status: 400 });
    }
    
    return Response.json({
      success: true,
      coordinator_version: '4.0',
      timestamp: new Date().toISOString(),
      scheduled_action: action,
      result: result
    });
    
  } catch (error) {
    console.error('❌ Coordinator error:', error);
    
    // 錯誤處理：自動診斷
    try {
      const base44 = createClientFromRequest(req);
      
      // 記錄錯誤
      await base44.asServiceRole.entities.ErrorLog.create({
        timestamp: new Date().toISOString(),
        source: 'FlowStrike_Coordinator',
        message: `Critical error: ${error.message}`,
        severity: 'critical',
        details: JSON.stringify({
          error: error.message,
          stack: error.stack
        })
      });
      
      // 可選：使用 AI 分析錯誤
      // const diagnosis = await base44.integrations.Core.InvokeLLM({
      //   prompt: `分析以下 FlowStrike 錯誤並提供修復建議：\n\n${error.message}\n\n${error.stack}`,
      //   response_json_schema: {
      //     type: "object",
      //     properties: {
      //       diagnosis: { type: "string" },
      //       fix_suggestions: { type: "array", items: { type: "string" } }
      //     }
      //   }
      // });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});