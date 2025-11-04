import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * FlowPressure Advanced Order Engine
 * Handles stop-loss, take-profit, bracket, OCO orders with AI optimization
 */

const CONFIG = {
  FEE_RATE: 0.008,          // 0.8% fee
  SLIPPAGE_RATE: 0.0005,    // 0.05% slippage
  DELAY_SECONDS: 3,         // 3s execution delay
  CHECK_INTERVAL: 5000      // 5s order check interval
};

// Calculate total cost including fees and slippage
function calculateTotalCost(price, quantity, side) {
  const baseCost = price * quantity;
  const fee = baseCost * CONFIG.FEE_RATE;
  const slippage = baseCost * CONFIG.SLIPPAGE_RATE;
  
  if (side === 'BUY') {
    return {
      baseCost,
      fee,
      slippage,
      total: baseCost + fee + slippage
    };
  } else {
    return {
      baseCost,
      fee,
      slippage,
      total: baseCost - fee - slippage  // net proceeds
    };
  }
}

// Get current market data
async function getMarketData(base44, symbol) {
  // Get pressure data
  const pressureData = await base44.asServiceRole.entities.StockPressure.filter({ 
    symbol 
  });
  const pressure = pressureData.length > 0 
    ? pressureData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
    : null;

  // Get sentiment data
  const sentimentData = await base44.asServiceRole.entities.SemanticPressure.filter({ 
    symbol 
  });
  const sentiment = sentimentData.length > 0 
    ? sentimentData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
    : null;

  // Get live quote
  const quoteData = await base44.asServiceRole.entities.LiveQuote.filter({ 
    symbol 
  });
  const quote = quoteData.length > 0 
    ? quoteData.sort((a, b) => new Date(b.ts_last_update) - new Date(a.ts_last_update))[0]
    : null;

  return {
    price: quote?.last_price || pressure?.price || 0,
    pressure: pressure?.final_pressure || 50,
    sentiment: sentiment?.sentiment || 'neutral',
    spi: sentiment?.spi || 50,
    quote,
    pressure_data: pressure,
    sentiment_data: sentiment
  };
}

// AI order optimization
async function optimizeOrderWithAI(base44, order, marketData) {
  const prompt = `Analyze this trading order and provide optimization advice:

Symbol: ${order.symbol}
Order Type: ${order.order_type}
Side: ${order.side}
Quantity: ${order.quantity}
Entry Price: $${order.entry_price?.toFixed(2) || 'Market'}

Market Conditions:
- Current Price: $${marketData.price.toFixed(2)}
- Pressure Index: ${marketData.pressure.toFixed(0)}/100
- Sentiment: ${marketData.sentiment}
- SPI: ${marketData.spi.toFixed(0)}

Stop Loss: ${order.stop_loss_price ? `$${order.stop_loss_price.toFixed(2)}` : order.stop_loss_percent ? `${order.stop_loss_percent}%` : 'None'}
Take Profit: ${order.take_profit_price ? `$${order.take_profit_price.toFixed(2)}` : order.take_profit_percent ? `${order.take_profit_percent}%` : 'None'}

Provide:
1. Confidence score (0-100) for this order
2. Optimal execution timing suggestion
3. Risk assessment
4. Brief reasoning in both English and Chinese`;

  try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          confidence: {
            type: "number",
            description: "AI confidence score 0-100"
          },
          timing: {
            type: "string",
            enum: ["EXECUTE_NOW", "WAIT_FOR_BETTER_PRICE", "CANCEL_RISKY"],
            description: "Execution timing recommendation"
          },
          risk_level: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH"],
            description: "Risk assessment"
          },
          reasoning_en: {
            type: "string",
            description: "Reasoning in English"
          },
          reasoning_zh: {
            type: "string",
            description: "Reasoning in Traditional Chinese"
          },
          suggested_stop_loss: {
            type: "number",
            description: "AI suggested stop loss price"
          },
          suggested_take_profit: {
            type: "number",
            description: "AI suggested take profit price"
          }
        }
      }
    });

    return response;
  } catch (error) {
    console.error('AI optimization error:', error);
    return {
      confidence: 50,
      timing: 'EXECUTE_NOW',
      risk_level: 'MEDIUM',
      reasoning_en: 'AI analysis unavailable, proceeding with order as specified.',
      reasoning_zh: 'AI 分析暫時無法使用，按指定參數執行訂單。',
      suggested_stop_loss: order.stop_loss_price,
      suggested_take_profit: order.take_profit_price
    };
  }
}

// Check if order should trigger
function shouldTrigger(order, marketData) {
  // Check pressure condition
  if (order.pressure_condition !== 'NONE' && order.pressure_trigger) {
    if (order.pressure_condition === 'ABOVE' && marketData.pressure < order.pressure_trigger) {
      return false;
    }
    if (order.pressure_condition === 'BELOW' && marketData.pressure > order.pressure_trigger) {
      return false;
    }
  }

  // Check sentiment condition
  if (order.sentiment_trigger !== 'ANY') {
    if (order.sentiment_trigger !== marketData.sentiment.toUpperCase()) {
      return false;
    }
  }

  // Check price trigger for stop loss
  if (order.order_type === 'STOP_LOSS') {
    if (order.side === 'SELL' && marketData.price <= order.stop_loss_price) {
      return true;
    }
    if (order.side === 'BUY' && marketData.price >= order.stop_loss_price) {
      return true;
    }
    return false;
  }

  // Check price trigger for take profit
  if (order.order_type === 'TAKE_PROFIT') {
    if (order.side === 'SELL' && marketData.price >= order.take_profit_price) {
      return true;
    }
    if (order.side === 'BUY' && marketData.price <= order.take_profit_price) {
      return true;
    }
    return false;
  }

  return true;
}

// Execute order
async function executeOrder(base44, order, marketData) {
  console.log(`🔵 Executing order ${order.id}:`, order.symbol, order.order_type, order.side);

  // Simulate execution delay
  await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_SECONDS * 1000));

  const executionPrice = marketData.price;
  const costBreakdown = calculateTotalCost(executionPrice, order.quantity, order.side);

  // Create trade record
  const tradeData = {
    symbol: order.symbol,
    company_name: order.symbol,
    shares: order.quantity,
    status: 'OPEN',
    entry_time: new Date().toISOString(),
    entry_confidence: order.ai_confidence || 50,
    entry_flow_strength: marketData.pressure
  };

  if (order.side === 'BUY') {
    tradeData.buy_price = executionPrice;
    tradeData.total_cost = costBreakdown.total;
    tradeData.entry_reason_en = `Advanced Order: ${order.order_type} BUY executed at $${executionPrice.toFixed(2)}. ${order.ai_reasoning_en || ''}`;
    tradeData.entry_reason_zh = `進階訂單：${order.order_type} 買入執行於 $${executionPrice.toFixed(2)}。${order.ai_reasoning_zh || ''}`;
    tradeData.pl_percent = 0;
    tradeData.pl_amount = 0;
  } else {
    // For SELL orders, need to find open position
    const openPositions = await base44.asServiceRole.entities.AutoTrade.filter({
      symbol: order.symbol,
      status: 'OPEN'
    });

    if (openPositions.length > 0) {
      const position = openPositions[0];
      const gainAmount = costBreakdown.total - position.total_cost;
      const gainPercent = (gainAmount / position.total_cost) * 100;

      await base44.asServiceRole.entities.AutoTrade.update(position.id, {
        sell_price: executionPrice,
        exit_time: new Date().toISOString(),
        pl_percent: gainPercent,
        pl_amount: gainAmount,
        exit_reason_en: `Advanced Order: ${order.order_type} SELL executed at $${executionPrice.toFixed(2)}. ${order.ai_reasoning_en || ''}`,
        exit_reason_zh: `進階訂單：${order.order_type} 賣出執行於 $${executionPrice.toFixed(2)}。${order.ai_reasoning_zh || ''}`,
        status: 'CLOSED',
        trade_type: gainAmount >= 0 ? 'WIN' : 'LOSS'
      });

      console.log(`✅ Position closed: ${order.symbol}, P/L: ${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%`);
    }
  }

  if (order.side === 'BUY') {
    await base44.asServiceRole.entities.AutoTrade.create(tradeData);
  }

  // Update order status
  await base44.asServiceRole.entities.AdvancedOrder.update(order.id, {
    status: 'FILLED',
    filled_price: executionPrice,
    filled_quantity: order.quantity,
    filled_time: new Date().toISOString()
  });

  console.log(`✅ Order filled: ${order.symbol} ${order.side} @ $${executionPrice.toFixed(2)}`);

  return {
    success: true,
    filled_price: executionPrice,
    cost_breakdown: costBreakdown
  };
}

// Handle OCO cancellation
async function cancelOCOPair(base44, ocoOrderId, exceptOrderId) {
  const ocoOrders = await base44.asServiceRole.entities.AdvancedOrder.filter({
    oco_pair_id: ocoOrderId
  });

  for (const order of ocoOrders) {
    if (order.id !== exceptOrderId && order.status !== 'FILLED' && order.status !== 'CANCELLED') {
      await base44.asServiceRole.entities.AdvancedOrder.update(order.id, {
        status: 'CANCELLED',
        last_checked: new Date().toISOString()
      });
      console.log(`❌ OCO order cancelled: ${order.id}`);
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

    const { mode = 'create', order_data, order_id } = await req.json();

    // Mode: create - Create new advanced order
    if (mode === 'create') {
      console.log('🔵 Creating advanced order:', order_data);

      const marketData = await getMarketData(base44, order_data.symbol);
      
      // Calculate estimates
      const entryPrice = order_data.entry_price || marketData.price;
      const costEstimate = calculateTotalCost(entryPrice, order_data.quantity, order_data.side);

      // Calculate stop loss and take profit prices if percentages provided
      let stopLossPrice = order_data.stop_loss_price;
      let takeProfitPrice = order_data.take_profit_price;

      if (order_data.stop_loss_percent && !stopLossPrice) {
        stopLossPrice = entryPrice * (1 + order_data.stop_loss_percent / 100);
      }

      if (order_data.take_profit_percent && !takeProfitPrice) {
        takeProfitPrice = entryPrice * (1 + order_data.take_profit_percent / 100);
      }

      // AI optimization
      const aiAnalysis = await optimizeOrderWithAI(base44, {
        ...order_data,
        entry_price: entryPrice,
        stop_loss_price: stopLossPrice,
        take_profit_price: takeProfitPrice
      }, marketData);

      // Create main order
      const orderRecord = {
        user_id: user.email,
        symbol: order_data.symbol,
        order_type: order_data.order_type,
        side: order_data.side,
        quantity: order_data.quantity,
        entry_price: entryPrice,
        limit_price: order_data.limit_price,
        stop_loss_price: stopLossPrice || aiAnalysis.suggested_stop_loss,
        stop_loss_percent: order_data.stop_loss_percent,
        take_profit_price: takeProfitPrice || aiAnalysis.suggested_take_profit,
        take_profit_percent: order_data.take_profit_percent,
        trailing_stop: order_data.trailing_stop || false,
        trailing_stop_distance: order_data.trailing_stop_distance,
        pressure_trigger: order_data.pressure_trigger,
        pressure_condition: order_data.pressure_condition || 'NONE',
        sentiment_trigger: order_data.sentiment_trigger || 'ANY',
        status: 'PENDING',
        slippage_estimate: costEstimate.slippage,
        fee_estimate: costEstimate.fee,
        total_cost_estimate: costEstimate.total,
        ai_confidence: aiAnalysis.confidence,
        ai_reasoning_en: aiAnalysis.reasoning_en,
        ai_reasoning_zh: aiAnalysis.reasoning_zh,
        created_at: new Date().toISOString(),
        expires_at: order_data.expires_at,
        last_checked: new Date().toISOString()
      };

      const mainOrder = await base44.asServiceRole.entities.AdvancedOrder.create(orderRecord);

      // Handle bracket order (create stop loss and take profit as children)
      if (order_data.order_type === 'BRACKET') {
        const childOrders = [];

        // Create stop loss child
        if (stopLossPrice) {
          const stopLossOrder = await base44.asServiceRole.entities.AdvancedOrder.create({
            user_id: user.email,
            symbol: order_data.symbol,
            order_type: 'STOP_LOSS',
            side: order_data.side === 'BUY' ? 'SELL' : 'BUY',
            quantity: order_data.quantity,
            stop_loss_price: stopLossPrice,
            parent_order_id: mainOrder.id,
            status: 'PENDING',
            created_at: new Date().toISOString(),
            last_checked: new Date().toISOString()
          });
          childOrders.push(stopLossOrder.id);
        }

        // Create take profit child
        if (takeProfitPrice) {
          const takeProfitOrder = await base44.asServiceRole.entities.AdvancedOrder.create({
            user_id: user.email,
            symbol: order_data.symbol,
            order_type: 'TAKE_PROFIT',
            side: order_data.side === 'BUY' ? 'SELL' : 'BUY',
            quantity: order_data.quantity,
            take_profit_price: takeProfitPrice,
            parent_order_id: mainOrder.id,
            status: 'PENDING',
            created_at: new Date().toISOString(),
            last_checked: new Date().toISOString()
          });
          childOrders.push(takeProfitOrder.id);
        }

        // Update main order with child IDs
        await base44.asServiceRole.entities.AdvancedOrder.update(mainOrder.id, {
          child_order_ids: childOrders
        });
      }

      // Handle OCO order
      if (order_data.order_type === 'OCO' && order_data.oco_pair_data) {
        const ocoPairId = `OCO_${Date.now()}`;

        // Update main order with OCO pair ID
        await base44.asServiceRole.entities.AdvancedOrder.update(mainOrder.id, {
          oco_pair_id: ocoPairId
        });

        // Create paired order
        const pairedOrder = await base44.asServiceRole.entities.AdvancedOrder.create({
          user_id: user.email,
          symbol: order_data.symbol,
          order_type: order_data.oco_pair_data.order_type,
          side: order_data.oco_pair_data.side,
          quantity: order_data.quantity,
          entry_price: order_data.oco_pair_data.entry_price,
          stop_loss_price: order_data.oco_pair_data.stop_loss_price,
          take_profit_price: order_data.oco_pair_data.take_profit_price,
          oco_pair_id: ocoPairId,
          status: 'PENDING',
          created_at: new Date().toISOString(),
          last_checked: new Date().toISOString()
        });

        console.log(`✅ OCO pair created: ${mainOrder.id} & ${pairedOrder.id}`);
      }

      return Response.json({
        success: true,
        order: mainOrder,
        ai_analysis: aiAnalysis,
        cost_estimate: costEstimate,
        market_data: marketData,
        message: `Order created successfully. AI confidence: ${aiAnalysis.confidence}%`
      });
    }

    // Mode: check - Check and execute pending orders
    if (mode === 'check') {
      const pendingOrders = await base44.asServiceRole.entities.AdvancedOrder.filter({
        user_id: user.email,
        status: 'PENDING'
      });

      const results = [];

      for (const order of pendingOrders) {
        try {
          const marketData = await getMarketData(base44, order.symbol);

          // Update last checked time
          await base44.asServiceRole.entities.AdvancedOrder.update(order.id, {
            last_checked: new Date().toISOString()
          });

          // Check if order should trigger
          if (shouldTrigger(order, marketData)) {
            console.log(`⚡ Order triggered: ${order.id}`);

            // Execute order
            const execution = await executeOrder(base44, order, marketData);

            // Handle OCO cancellation
            if (order.oco_pair_id) {
              await cancelOCOPair(base44, order.oco_pair_id, order.id);
            }

            results.push({
              order_id: order.id,
              status: 'EXECUTED',
              execution
            });
          } else {
            results.push({
              order_id: order.id,
              status: 'PENDING',
              reason: 'Conditions not met'
            });
          }
        } catch (error) {
          console.error(`Error processing order ${order.id}:`, error);
          results.push({
            order_id: order.id,
            status: 'ERROR',
            error: error.message
          });
        }
      }

      return Response.json({
        success: true,
        checked: pendingOrders.length,
        results
      });
    }

    // Mode: cancel - Cancel order
    if (mode === 'cancel' && order_id) {
      const order = await base44.asServiceRole.entities.AdvancedOrder.filter({
        id: order_id,
        user_id: user.email
      });

      if (order.length === 0) {
        return Response.json({ error: 'Order not found' }, { status: 404 });
      }

      await base44.asServiceRole.entities.AdvancedOrder.update(order_id, {
        status: 'CANCELLED',
        last_checked: new Date().toISOString()
      });

      // Cancel child orders if bracket
      if (order[0].child_order_ids && order[0].child_order_ids.length > 0) {
        for (const childId of order[0].child_order_ids) {
          await base44.asServiceRole.entities.AdvancedOrder.update(childId, {
            status: 'CANCELLED'
          });
        }
      }

      // Cancel OCO pair
      if (order[0].oco_pair_id) {
        await cancelOCOPair(base44, order[0].oco_pair_id, order_id);
      }

      return Response.json({
        success: true,
        message: 'Order cancelled'
      });
    }

    return Response.json({ error: 'Invalid mode' }, { status: 400 });

  } catch (error) {
    console.error('Advanced Order Engine error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});