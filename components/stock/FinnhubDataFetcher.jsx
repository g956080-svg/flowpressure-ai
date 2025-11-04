import { base44 } from "@/api/base44Client";

/**
 * Fetch real-time stock data from Finnhub.io
 * Uses demo key if FINNHUB_API_KEY is not set
 */

// Use demo key as fallback
const FINNHUB_API_KEY = 'ctbiv69r01qv7bh4iitgctbiv69r01qv7bh4iiu0';

export const fetchFinnhubStockQuote = async (symbol) => {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );
    
    if (!response.ok) {
      console.error(`Finnhub API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Check if data is valid
    if (data && data.c && data.c > 0) {
      return data;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
};

export const fetchFinnhubCompanyProfile = async (symbol) => {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching profile for ${symbol}:`, error);
    return null;
  }
};

export const fetchFinnhubCompanyNews = async (symbol) => {
  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const from = weekAgo.toISOString().split('T')[0];
    const to = today.toISOString().split('T')[0];
    
    const response = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
    );
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data.slice(0, 3) : [];
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    return [];
  }
};

export const searchFinnhubSymbol = async (query) => {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/search?q=${query}&token=${FINNHUB_API_KEY}`
    );
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error(`Error searching for ${query}:`, error);
    return [];
  }
};

export const fetchCompleteStockData = async (symbol) => {
  try {
    // Fetch all data in parallel
    const [quote, profile, news] = await Promise.all([
      fetchFinnhubStockQuote(symbol),
      fetchFinnhubCompanyProfile(symbol),
      fetchFinnhubCompanyNews(symbol)
    ]);

    if (!quote || !quote.c) {
      console.warn(`No valid quote data for ${symbol}`);
      return null;
    }

    // Calculate change percentage
    const currentPrice = quote.c;
    const previousClose = quote.pc || currentPrice;
    const changePercent = previousClose > 0 
      ? ((currentPrice - previousClose) / previousClose) * 100 
      : 0;

    const newsHeadlines = Array.isArray(news) ? news.map(n => n.headline).filter(Boolean) : [];

    // Use AI to analyze money flow
    const aiAnalysisPrompt = `
Analyze the following real-time stock data for ${symbol} and determine capital flow:

Current Price: $${currentPrice}
Previous Close: $${previousClose}
Change: ${changePercent.toFixed(2)}%
High: $${quote.h || currentPrice}
Low: $${quote.l || currentPrice}
Open: $${quote.o || currentPrice}
Volume: ${quote.v || 'N/A'}

Company: ${profile?.name || symbol}
Industry: ${profile?.finnhubIndustry || 'Technology'}
Market Cap: ${profile?.marketCapitalization ? '$' + profile.marketCapitalization + 'M' : 'N/A'}

Recent News:
${newsHeadlines.length > 0 ? newsHeadlines.join('\n') : 'No recent news available'}

Based on this data, determine:
1. Money Flow: IN (institutional buying), OUT (institutional selling), or NEUTRAL
2. Confidence Score (0-100) based on price movement, volume, and news sentiment
3. Brief comment in English (1-2 sentences)
4. Brief comment in Traditional Chinese (1-2 sentences)
5. Detailed analysis in English (2-3 sentences)
6. Detailed analysis in Traditional Chinese (2-3 sentences)
7. Trading signal: Entry, Exit, or Observation

Consider:
- Large price increases with high volume suggest strong inflow (IN)
- Price decreases with high volume suggest outflow (OUT)  
- Sideways movement suggests neutral (NEUTRAL)
- News sentiment affects confidence
`;

    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: aiAnalysisPrompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          flow: { type: "string", enum: ["IN", "OUT", "NEUTRAL"] },
          confidence: { type: "number" },
          ai_signal: { type: "string", enum: ["Entry", "Exit", "Observation"] },
          ai_comment_en: { type: "string" },
          ai_comment_zh: { type: "string" },
          ai_analysis_en: { type: "string" },
          ai_analysis_zh: { type: "string" }
        }
      }
    });

    // Combine Finnhub data with AI analysis
    return {
      name: profile?.name || symbol,
      symbol: symbol,
      price: currentPrice,
      change_percent: changePercent,
      volume: quote.v || 0,
      market_cap: profile?.marketCapitalization || 0,
      pe_ratio: profile?.pe || 0,
      week_52_high: profile?.['52WeekHigh'] || quote.h || currentPrice,
      week_52_low: profile?.['52WeekLow'] || quote.l || currentPrice,
      day_high: quote.h || currentPrice,
      day_low: quote.l || currentPrice,
      open_price: quote.o || currentPrice,
      previous_close: previousClose,
      dividend_yield: profile?.dividendYield || 0,
      earnings_date: profile?.earningsDate || 'N/A',
      analyst_rating: 'N/A',
      theme: categorizeIndustry(profile?.finnhubIndustry || 'Technology'),
      news_headlines: newsHeadlines,
      sector_trend: profile?.finnhubIndustry || 'Technology',
      ...aiResult
    };
  } catch (error) {
    console.error(`Error fetching complete data for ${symbol}:`, error);
    return null;
  }
};

// Helper function to categorize industry into theme
const categorizeIndustry = (industry) => {
  if (!industry) return 'Tech';
  
  const industryLower = industry.toLowerCase();
  
  if (industryLower.includes('ai') || industryLower.includes('artificial intelligence')) {
    return 'AI';
  } else if (industryLower.includes('electric') || industryLower.includes('ev')) {
    return 'EV';
  } else if (industryLower.includes('energy') || industryLower.includes('oil')) {
    return 'Energy';
  } else if (industryLower.includes('bank') || industryLower.includes('financ')) {
    return 'Finance';
  } else if (industryLower.includes('tech') || industryLower.includes('software')) {
    return 'Tech';
  } else if (industryLower.includes('health') || industryLower.includes('pharma') || industryLower.includes('bio')) {
    return 'Healthcare';
  } else if (industryLower.includes('consumer') || industryLower.includes('retail')) {
    return 'Consumer';
  } else if (industryLower.includes('semiconductor') || industryLower.includes('chip')) {
    return 'Semiconductor';
  } else if (industryLower.includes('cloud')) {
    return 'Cloud';
  }
  
  return 'Tech';
};

export default {
  fetchFinnhubStockQuote,
  fetchFinnhubCompanyProfile,
  fetchFinnhubCompanyNews,
  searchFinnhubSymbol,
  fetchCompleteStockData
};