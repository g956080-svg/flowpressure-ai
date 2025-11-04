import { base44 } from "@/api/base44Client";

/**
 * Fetch pre-market data for U.S. stocks
 * Pre-market session: 4:00 AM - 9:30 AM ET
 */

export const isPreMarketHours = () => {
  const now = new Date();
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const day = etTime.getDay();
  
  // Monday (1) to Friday (5), 4:00 AM to 9:30 AM ET
  if (day >= 1 && day <= 5) {
    if (hours === 4 || hours === 5 || hours === 6 || hours === 7 || hours === 8) {
      return true;
    }
    if (hours === 9 && minutes < 30) {
      return true;
    }
  }
  
  return false;
};

export const fetchPreMarketData = async (symbol) => {
  try {
    const prompt = `
Get the LATEST pre-market trading data for ${symbol} stock. Current time is ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET.

IMPORTANT: Search for REAL pre-market data from financial websites (Yahoo Finance, MarketWatch, CNBC, etc.) that show extended hours trading.

Provide:
1. Pre-market Price (current trading price in extended hours)
2. Pre-market % Change from previous day close
3. Pre-market Volume (shares traded before market open)
4. Pre-market High and Low
5. Previous day closing price for reference
6. Is there active pre-market trading? (true/false)
7. Regular session data (current/last close price, change %, volume)
8. Company name and full profile
9. Top 3 recent news headlines (last 24 hours)
10. Pre-market flow analysis

Pre-Market Flow Analysis:
- If pre-market price UP +2% or more with high volume → Flow: IN (strong buying interest)
- If pre-market price DOWN -2% or more with high volume → Flow: OUT (selling pressure)
- Otherwise → Flow: NEUTRAL

Confidence Score (0-100):
- High pre-market volume + large price move = High confidence (80-100)
- Moderate activity = Medium confidence (50-79)
- Low activity = Low confidence (0-49)

Be specific and provide ACTUAL real-time data from extended hours trading.
`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          symbol: { type: "string" },
          premarket_price: { type: "number" },
          premarket_change_percent: { type: "number" },
          premarket_volume: { type: "number" },
          premarket_high: { type: "number" },
          premarket_low: { type: "number" },
          is_premarket_active: { type: "boolean" },
          price: { type: "number" },
          change_percent: { type: "number" },
          volume: { type: "number" },
          previous_close: { type: "number" },
          market_cap: { type: "number" },
          pe_ratio: { type: "number" },
          week_52_high: { type: "number" },
          week_52_low: { type: "number" },
          day_high: { type: "number" },
          day_low: { type: "number" },
          open_price: { type: "number" },
          dividend_yield: { type: "number" },
          earnings_date: { type: "string" },
          analyst_rating: { type: "string" },
          theme: { type: "string", enum: ["AI", "EV", "Energy", "Finance", "Tech", "Healthcare", "Consumer", "Semiconductor", "Cloud", "Biotech"] },
          flow: { type: "string", enum: ["IN", "OUT", "NEUTRAL"] },
          confidence: { type: "number" },
          ai_signal: { type: "string", enum: ["Entry", "Exit", "Observation"] },
          ai_comment_en: { type: "string" },
          ai_comment_zh: { type: "string" },
          ai_analysis_en: { type: "string" },
          ai_analysis_zh: { type: "string" },
          news_headlines: { type: "array", items: { type: "string" } },
          sector_trend: { type: "string" }
        }
      }
    });

    return result;
  } catch (error) {
    console.error(`Error fetching pre-market data for ${symbol}:`, error);
    return null;
  }
};

export const getTopPreMarketMovers = async (symbols) => {
  try {
    const results = await Promise.all(
      symbols.map(symbol => fetchPreMarketData(symbol))
    );
    
    // Filter and sort by pre-market activity
    const activeMovers = results
      .filter(stock => stock && stock.is_premarket_active && Math.abs(stock.premarket_change_percent) >= 2)
      .sort((a, b) => {
        // Sort by combination of % change and confidence
        const scoreA = Math.abs(a.premarket_change_percent) * 0.6 + a.confidence * 0.4;
        const scoreB = Math.abs(b.premarket_change_percent) * 0.6 + b.confidence * 0.4;
        return scoreB - scoreA;
      })
      .slice(0, 3);
    
    return activeMovers;
  } catch (error) {
    console.error('Error fetching top pre-market movers:', error);
    return [];
  }
};

export default {
  isPreMarketHours,
  fetchPreMarketData,
  getTopPreMarketMovers
};