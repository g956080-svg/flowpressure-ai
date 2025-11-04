import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Stock Pressure Index Calculator
 * Calculates individual pressure index for each stock
 * Data source: Finnhub API
 * Refresh rate: 10 seconds
 * Delay compensation: 3 seconds
 */

const DELAY_COMPENSATION = 3; // seconds
const PRESSURE_THRESHOLDS = {
  BUY_ZONE: 45,
  SELL_ZONE: 70
};

function calculatePressureIndex(current, low, high) {
  if (high === low) return 50; // Neutral if no range
  return ((current - low) / (high - low)) * 100;
}

function calculateVolatilityAdjustment(volume) {
  return volume * 0.0001;
}

function determinePressureZone(pressure) {
  if (pressure < 40) return 'BUY_ZONE';
  if (pressure > 70) return 'SELL_ZONE';
  return 'NEUTRAL_ZONE';
}

function determineAIAction(pressure) {
  if (pressure < PRESSURE_THRESHOLDS.BUY_ZONE) return 'BUY';
  if (pressure > PRESSURE_THRESHOLDS.SELL_ZONE) return 'SELL';
  return 'HOLD';
}

function generateAISuggestion(pressure, action) {
  const suggestions = {
    BUY: {
      en: "Low pressure – consider buying",
      zh: "低壓狀態 – 考慮買入"
    },
    HOLD: {
      en: "Medium pressure – observe",
      zh: "中壓狀態 – 觀察中"
    },
    SELL: {
      en: "High pressure – reduce position",
      zh: "高壓狀態 – 減倉"
    }
  };
  
  return suggestions[action] || suggestions.HOLD;
}

async function fetchStockQuote(symbol, apiKey) {
  const startTime = Date.now();
  
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }
    
    const data = await response.json();
    const fetchDuration = (Date.now() - startTime) / 1000;
    
    return {
      symbol,
      current_price: data.c,
      day_high: data.h,
      day_low: data.l,
      open: data.o,
      prev_close: data.pc,
      timestamp: new Date(data.t * 1000).toISOString(),
      fetch_duration: fetchDuration,
      data_delayed: fetchDuration > DELAY_COMPENSATION
    };
  } catch (error) {
    throw new Error(`Failed to fetch ${symbol}: ${error.message}`);
  }
}

async function fetchStockVolume(symbol, apiKey) {
  try {
    // Get basic profile for volume data
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return 0; // Return 0 if volume data unavailable
    }
    
    const data = await response.json();
    return data.shareOutstanding || 0;
  } catch (error) {
    console.error(`Volume fetch error for ${symbol}:`, error);
    return 0;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbols, mode = 'calculate' } = await req.json();

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return Response.json({ error: 'Symbols array required' }, { status: 400 });
    }

    const finnhubKey = Deno.env.get('FINNHUB_KEY');
    if (!finnhubKey) {
      return Response.json({ error: 'FINNHUB_KEY not configured' }, { status: 500 });
    }

    const results = [];
    const errors = [];
    let totalPressure = 0;
    let successCount = 0;

    // Mode: calculate - Calculate and store pressure for all symbols
    if (mode === 'calculate') {
      for (const symbol of symbols) {
        try {
          console.log(`Calculating pressure for ${symbol}...`);

          // Fetch quote data
          const quote = await fetchStockQuote(symbol, finnhubKey);
          
          // Calculate basic pressure index
          const basicPressure = calculatePressureIndex(
            quote.current_price,
            quote.day_low,
            quote.day_high
          );

          // Fetch volume for volatility adjustment
          const volume = await fetchStockVolume(symbol, finnhubKey);
          const volatilityFactor = calculateVolatilityAdjustment(volume);
          
          // Calculate volatility-adjusted pressure
          const volatilityAdjustedPressure = Math.min(100, basicPressure + volatilityFactor);
          
          // Final pressure (average of basic and adjusted)
          const finalPressure = (basicPressure + volatilityAdjustedPressure) / 2;
          
          // Determine zone and action
          const pressureZone = determinePressureZone(finalPressure);
          const aiAction = determineAIAction(finalPressure);
          const aiSuggestion = generateAISuggestion(finalPressure, aiAction);

          // Create pressure record
          const pressureData = {
            symbol,
            price: quote.current_price,
            day_high: quote.day_high,
            day_low: quote.day_low,
            volume: volume,
            pressure_index: Math.round(basicPressure * 10) / 10,
            volatility_adjusted_pressure: Math.round(volatilityAdjustedPressure * 10) / 10,
            final_pressure: Math.round(finalPressure * 10) / 10,
            ai_action: aiAction,
            ai_suggestion_en: aiSuggestion.en,
            ai_suggestion_zh: aiSuggestion.zh,
            pressure_zone: pressureZone,
            timestamp: new Date().toISOString(),
            data_delayed: quote.data_delayed,
            delay_seconds: quote.fetch_duration
          };

          // Store in database
          await base44.asServiceRole.entities.StockPressure.create(pressureData);

          results.push({
            success: true,
            data: pressureData
          });

          totalPressure += finalPressure;
          successCount++;

          console.log(`✅ ${symbol}: Pressure ${finalPressure.toFixed(1)} - ${aiAction}`);

          // Rate limiting (10 requests per second max)
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`❌ Error processing ${symbol}:`, error);
          errors.push({
            symbol,
            error: error.message
          });
          
          results.push({
            success: false,
            symbol,
            error: error.message
          });
        }
      }

      // Calculate market average pressure
      const marketAvgPressure = successCount > 0 ? totalPressure / successCount : 50;

      return Response.json({
        success: true,
        timestamp: new Date().toISOString(),
        market_avg_pressure: Math.round(marketAvgPressure * 10) / 10,
        results,
        errors,
        stats: {
          total: symbols.length,
          successful: successCount,
          failed: errors.length
        }
      });
    }

    // Mode: export - Export daily pressure report
    if (mode === 'export') {
      const today = new Date().toISOString().split('T')[0];
      
      const allPressureData = await base44.asServiceRole.entities.StockPressure.filter({});
      
      // Filter today's data
      const todayData = allPressureData.filter(record => {
        const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
        return recordDate === today;
      });

      // Group by symbol and get latest record
      const symbolMap = {};
      todayData.forEach(record => {
        if (!symbolMap[record.symbol] || new Date(record.timestamp) > new Date(symbolMap[record.symbol].timestamp)) {
          symbolMap[record.symbol] = record;
        }
      });

      const exportData = {
        report_date: today,
        total_symbols: Object.keys(symbolMap).length,
        symbols: Object.values(symbolMap),
        market_summary: {
          avg_pressure: Object.values(symbolMap).reduce((sum, r) => sum + r.final_pressure, 0) / Object.keys(symbolMap).length,
          buy_signals: Object.values(symbolMap).filter(r => r.ai_action === 'BUY').length,
          hold_signals: Object.values(symbolMap).filter(r => r.ai_action === 'HOLD').length,
          sell_signals: Object.values(symbolMap).filter(r => r.ai_action === 'SELL').length
        },
        generated_at: new Date().toISOString()
      };

      return Response.json({
        success: true,
        export_data: exportData,
        message: `Exported ${Object.keys(symbolMap).length} symbols for ${today}`
      });
    }

    return Response.json({ error: 'Invalid mode' }, { status: 400 });

  } catch (error) {
    console.error('Stock Pressure Index Calculator error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});