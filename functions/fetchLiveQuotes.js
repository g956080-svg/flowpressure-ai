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

// 從 Yahoo Finance 獲取完整數據（免費且完整）
async function fetchFromYahooFinance(symbol) {
  try {
    // Yahoo Finance API (免費，無需 API key)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      throw new Error('No data from Yahoo Finance');
    }
    
    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    
    // 獲取最新的數據點
    const timestamps = result.timestamp || [];
    const volumes = quote.volume || [];
    const closes = quote.close || [];
    
    // 取最後一個有效數據
    let lastVolume = 0;
    let lastPrice = meta.regularMarketPrice || meta.previousClose;
    
    // 從後往前找最新的有效成交量
    for (let i = volumes.length - 1; i >= 0; i--) {
      if (volumes[i] && volumes[i] > 0) {
        lastVolume = volumes[i];
        break;
      }
    }
    
    // 計算總成交量（累積當天所有分鐘的成交量）
    let totalVolume = 0;
    for (let i = 0; i < volumes.length; i++) {
      if (volumes[i] && volumes[i] > 0) {
        totalVolume += volumes[i];
      }
    }
    
    const currentPrice = meta.regularMarketPrice || lastPrice;
    const prevClose = meta.previousClose || meta.chartPreviousClose;
    const changePercent = prevClose ? ((currentPrice - prevClose) / prevClose * 100) : 0;
    
    return {
      last_price: currentPrice,
      prev_close: prevClose,
      change_pct: changePercent,
      volume: totalVolume || lastVolume || 0, // 使用累積成交量
      day_high: meta.regularMarketDayHigh,
      day_low: meta.regularMarketDayLow,
      open_price: meta.regularMarketOpen,
      source: 'yahoo_finance'
    };
  } catch (error) {
    console.error(`Yahoo Finance error for ${symbol}:`, error);
    throw error;
  }
}

// 從 Finnhub 獲取即時報價
async function fetchFromFinnhub(symbol) {
  const apiKey = Deno.env.get('FINNHUB_KEY');
  if (!apiKey) {
    throw new Error('FINNHUB_KEY not set');
  }
  
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      last_price: data.c,
      prev_close: data.pc,
      change_pct: data.dp,
      day_high: data.h,
      day_low: data.l,
      open_price: data.o,
      volume: null, // Finnhub quote 不提供成交量
      source: 'finnhub'
    };
  } catch (error) {
    console.error(`Finnhub error for ${symbol}:`, error);
    throw error;
  }
}

// 從 AlphaVantage 獲取數據
async function fetchFromAlphaVantage(symbol) {
  const apiKey = Deno.env.get('ALPHA_VANTAGE_KEY');
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_KEY not set');
  }
  
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`AlphaVantage API error: ${response.status}`);
    }
    
    const data = await response.json();
    const quote = data['Global Quote'];
    
    if (!quote || !quote['05. price']) {
      throw new Error('No data from AlphaVantage');
    }
    
    return {
      last_price: parseFloat(quote['05. price']),
      prev_close: parseFloat(quote['08. previous close']),
      change_pct: parseFloat(quote['10. change percent'].replace('%', '')),
      volume: parseInt(quote['06. volume']) || 0,
      day_high: parseFloat(quote['03. high']),
      day_low: parseFloat(quote['04. low']),
      open_price: parseFloat(quote['02. open']),
      source: 'alpha_vantage'
    };
  } catch (error) {
    console.error(`AlphaVantage error for ${symbol}:`, error);
    throw error;
  }
}

// 獲取成交量數據（專門用於補充成交量）
async function fetchVolumeData(symbol) {
  try {
    // 使用 Yahoo Finance 獲取成交量
    const yahooData = await fetchFromYahooFinance(symbol);
    return yahooData.volume;
  } catch (error) {
    console.error(`Failed to fetch volume for ${symbol}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { symbols } = await req.json();
    
    if (!symbols || !Array.isArray(symbols)) {
      return Response.json({ error: 'symbols array required' }, { status: 400 });
    }
    
    const marketSession = getMarketSession();
    const results = [];
    let successCount = 0;
    
    for (const symbol of symbols) {
      let quoteData = null;
      let source = '';
      let errorFlag = false;
      let errorMessage = '';
      
      try {
        // 策略 1: 優先使用 Yahoo Finance（完整數據 + 即時成交量）
        try {
          console.log(`Trying Yahoo Finance for ${symbol}...`);
          quoteData = await fetchFromYahooFinance(symbol);
          source = 'yahoo_finance';
          console.log(`✅ Yahoo Finance success for ${symbol}, volume: ${quoteData.volume}`);
        } catch (yahooError) {
          console.log(`Yahoo Finance failed for ${symbol}: ${yahooError.message}`);
          
          // 策略 2: 使用 Finnhub 獲取價格，然後補充成交量
          try {
            console.log(`Trying Finnhub for ${symbol}...`);
            quoteData = await fetchFromFinnhub(symbol);
            
            // 嘗試從 Yahoo 補充成交量
            console.log(`Trying to fetch volume for ${symbol}...`);
            const volume = await fetchVolumeData(symbol);
            if (volume && volume > 0) {
              quoteData.volume = volume;
              source = 'finnhub_yahoo_volume';
              console.log(`✅ Combined Finnhub + Yahoo volume for ${symbol}: ${volume}`);
            } else {
              source = 'finnhub';
              console.log(`⚠️ No volume data for ${symbol}`);
            }
          } catch (finnhubError) {
            console.log(`Finnhub failed for ${symbol}: ${finnhubError.message}`);
            
            // 策略 3: 使用 AlphaVantage
            try {
              console.log(`Trying AlphaVantage for ${symbol}...`);
              quoteData = await fetchFromAlphaVantage(symbol);
              source = 'alpha_vantage';
              console.log(`✅ AlphaVantage success for ${symbol}, volume: ${quoteData.volume}`);
            } catch (avError) {
              console.log(`AlphaVantage failed for ${symbol}: ${avError.message}`);
              
              await logError(base44, 'API', `All sources failed for ${symbol}`, 'critical', { 
                symbol,
                yahooError: yahooError.message,
                finnhubError: finnhubError.message,
                avError: avError.message
              });
              
              // 策略 4: 使用現有數據
              const existingQuotes = await base44.asServiceRole.entities.LiveQuote.filter({ symbol });
              if (existingQuotes.length > 0) {
                quoteData = {
                  last_price: existingQuotes[0].last_price || existingQuotes[0].prev_close,
                  prev_close: existingQuotes[0].prev_close,
                  change_pct: 0,
                  volume: existingQuotes[0].volume || 0,
                  source: 'fallback'
                };
                source = 'fallback';
                errorFlag = true;
                errorMessage = '⚠️ 使用快取數據';
              } else {
                throw new Error('No fallback data available');
              }
            }
          }
        }
        
        // 確保成交量不是 null
        if (!quoteData.volume || quoteData.volume === 0) {
          console.log(`⚠️ Warning: ${symbol} has zero or null volume`);
          // 不設置 error flag，因為這可能是正常的（盤前/盤後）
        }
        
        // 更新或創建 LiveQuote
        const existingQuotes = await base44.asServiceRole.entities.LiveQuote.filter({ symbol });
        
        const quoteRecord = {
          symbol,
          last_price: quoteData.last_price || 0,
          change_pct: quoteData.change_pct || 0,
          volume: quoteData.volume || 0,
          prev_close: quoteData.prev_close || 0,
          regular_price: marketSession === 'REG' ? quoteData.last_price : (existingQuotes[0]?.regular_price || quoteData.prev_close),
          premarket_price: marketSession === 'PRE' ? quoteData.last_price : (existingQuotes[0]?.premarket_price || null),
          source_used: source,
          ts_last_update: new Date().toISOString(),
          error_flag: errorFlag,
          error_message: errorMessage,
          market_session: marketSession
        };
        
        if (existingQuotes.length > 0) {
          await base44.asServiceRole.entities.LiveQuote.update(existingQuotes[0].id, quoteRecord);
        } else {
          await base44.asServiceRole.entities.LiveQuote.create(quoteRecord);
        }
        
        successCount++;
        results.push({
          symbol,
          success: true,
          data: quoteRecord
        });
        
        console.log(`✅ Successfully saved ${symbol}: price=${quoteData.last_price}, volume=${quoteData.volume}, source=${source}`);
        
      } catch (error) {
        console.error(`❌ Complete failure for ${symbol}:`, error);
        await logError(base44, 'API', `Complete failure for ${symbol}: ${error.message}`, 'critical', { symbol, error: error.message });
        
        results.push({
          symbol,
          success: false,
          error: error.message
        });
      }
      
      // 避免 API 限流（Yahoo Finance 限制較寬鬆）
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const responseData = {
      market_session: marketSession,
      updated_at: new Date().toISOString(),
      results,
      stats: {
        total: symbols.length,
        success: successCount,
        failed: symbols.length - successCount,
        success_rate: ((successCount / symbols.length) * 100).toFixed(1) + '%'
      }
    };
    
    console.log('📊 Final stats:', responseData.stats);
    
    return Response.json(responseData);
    
  } catch (error) {
    console.error('❌ Server error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});