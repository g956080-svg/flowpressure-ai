import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Real-Time Market Data Stream Function
 * Connects to multiple data sources and provides live updates
 * Supports: Alpha Vantage, Finnhub, Yahoo Finance
 */

async function fetchFromAlphaVantage(symbol, apiKey) {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    const quote = data['Global Quote'];
    
    if (!quote || !quote['05. price']) {
      throw new Error('No data from Alpha Vantage');
    }
    
    return {
      symbol,
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      change_percent: parseFloat(quote['10. change percent'].replace('%', '')),
      volume: parseInt(quote['06. volume']) || 0,
      timestamp: new Date().toISOString(),
      source: 'alpha_vantage'
    };
  } catch (error) {
    throw new Error(`Alpha Vantage error: ${error.message}`);
  }
}

async function fetchFromFinnhub(symbol, apiKey) {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    return {
      symbol,
      price: data.c,
      change: data.d,
      change_percent: data.dp,
      volume: null,
      high: data.h,
      low: data.l,
      open: data.o,
      prev_close: data.pc,
      timestamp: new Date(data.t * 1000).toISOString(),
      source: 'finnhub'
    };
  } catch (error) {
    throw new Error(`Finnhub error: ${error.message}`);
  }
}

async function fetchFromYahoo(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const data = await response.json();
    const result = data.chart.result[0];
    const meta = result.meta;
    
    return {
      symbol,
      price: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.previousClose,
      change_percent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      volume: meta.regularMarketVolume || 0,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      open: meta.regularMarketOpen,
      prev_close: meta.previousClose,
      timestamp: new Date().toISOString(),
      source: 'yahoo'
    };
  } catch (error) {
    throw new Error(`Yahoo error: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbols, source = 'auto', include_technicals = false } = await req.json();

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return Response.json({ error: 'Symbols array required' }, { status: 400 });
    }

    const alphaVantageKey = Deno.env.get('ALPHA_VANTAGE_KEY');
    const finnhubKey = Deno.env.get('FINNHUB_KEY');

    const results = [];
    const errors = [];

    for (const symbol of symbols) {
      let quoteData = null;
      let usedSource = null;

      try {
        // Auto source selection with fallback
        if (source === 'auto' || source === 'yahoo') {
          try {
            quoteData = await fetchFromYahoo(symbol);
            usedSource = 'yahoo';
          } catch (e) {
            if (source === 'yahoo') throw e;
          }
        }

        if (!quoteData && finnhubKey && (source === 'auto' || source === 'finnhub')) {
          try {
            quoteData = await fetchFromFinnhub(symbol, finnhubKey);
            usedSource = 'finnhub';
          } catch (e) {
            if (source === 'finnhub') throw e;
          }
        }

        if (!quoteData && alphaVantageKey && (source === 'auto' || source === 'alpha_vantage')) {
          try {
            quoteData = await fetchFromAlphaVantage(symbol, alphaVantageKey);
            usedSource = 'alpha_vantage';
          } catch (e) {
            if (source === 'alpha_vantage') throw e;
          }
        }

        if (!quoteData) {
          throw new Error('All data sources failed');
        }

        // Calculate additional technicals if requested
        if (include_technicals) {
          const prevQuotes = await base44.asServiceRole.entities.LiveQuote.filter({ symbol });
          
          if (prevQuotes.length > 0) {
            const prevPrice = prevQuotes[0].last_price;
            quoteData.momentum = ((quoteData.price - prevPrice) / prevPrice) * 100;
            quoteData.volatility = Math.abs(quoteData.change_percent);
          }
        }

        // Update database
        const existingQuotes = await base44.asServiceRole.entities.LiveQuote.filter({ symbol });
        
        const updateData = {
          symbol,
          last_price: quoteData.price,
          change_pct: quoteData.change_percent,
          volume: quoteData.volume || 0,
          prev_close: quoteData.prev_close || quoteData.price,
          day_high: quoteData.high,
          day_low: quoteData.low,
          open_price: quoteData.open,
          source_used: usedSource,
          ts_last_update: quoteData.timestamp,
          error_flag: false,
          error_message: null,
          market_session: 'REG'
        };

        if (existingQuotes.length > 0) {
          await base44.asServiceRole.entities.LiveQuote.update(existingQuotes[0].id, updateData);
        } else {
          await base44.asServiceRole.entities.LiveQuote.create(updateData);
        }

        results.push({
          success: true,
          data: quoteData
        });

      } catch (error) {
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

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      errors,
      stats: {
        total: symbols.length,
        successful: results.filter(r => r.success).length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('Real-time data stream error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});