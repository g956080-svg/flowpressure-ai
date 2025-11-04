import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * AI Market Sentiment Pressure Engine
 * Analyzes news and social sentiment to calculate Semantic Pressure Index (SPI)
 */

const POSITIVE_KEYWORDS = [
  "funding", "loan approved", "capital increase", "investment round",
  "acquisition", "merger", "order expected", "patent granted",
  "r&d success", "partnership", "clinical success", "profit", "growth",
  "expansion", "revenue increase", "breakthrough", "collaboration",
  "deal signed", "contract won", "bullish", "upgrade", "outperform"
];

const NEGATIVE_KEYWORDS = [
  "loss widened", "delisting", "bankruptcy", "cash shortage",
  "layoff", "failed test", "order canceled", "lawsuit", "recall",
  "decline", "drop", "plunge", "bearish", "downgrade", "loss",
  "debt", "investigation", "fraud", "scandal", "suspended"
];

const DELAY_COMPENSATION = 3; // seconds

// Simple keyword matching sentiment analysis
function analyzeSentiment(text, keywordWeights = {}) {
  if (!text) return { score: 0, positive: [], negative: [] };
  
  const lowerText = text.toLowerCase();
  const positiveHits = [];
  const negativeHits = [];
  
  // Check positive keywords
  POSITIVE_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      const weight = keywordWeights[keyword] || 1.0;
      positiveHits.push({ keyword, weight });
    }
  });
  
  // Check negative keywords
  NEGATIVE_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      const weight = keywordWeights[keyword] || 1.0;
      negativeHits.push({ keyword, weight });
    }
  });
  
  const positiveScore = positiveHits.reduce((sum, hit) => sum + hit.weight, 0);
  const negativeScore = negativeHits.reduce((sum, hit) => sum + hit.weight, 0);
  const totalHits = positiveScore + negativeScore;
  
  const sentimentScore = totalHits > 0 
    ? (positiveScore - negativeScore) / totalHits 
    : 0;
  
  return {
    score: Math.max(-1, Math.min(1, sentimentScore)),
    positive: positiveHits.map(h => h.keyword),
    negative: negativeHits.map(h => h.keyword),
    positiveCount: positiveHits.length,
    negativeCount: negativeHits.length
  };
}

// Fetch news using LLM with internet context
async function fetchNewsData(base44, symbol) {
  try {
    const prompt = `Search for the latest financial news about ${symbol} stock. 
Find news from the past 24 hours.
Focus on: earnings, partnerships, products, regulatory news, analyst reports.
Return a summary of sentiment and key events.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          news_headlines: {
            type: "array",
            items: { type: "string" },
            description: "Top 5 news headlines"
          },
          overall_sentiment: {
            type: "string",
            enum: ["positive", "negative", "neutral"],
            description: "Overall news sentiment"
          },
          key_events: {
            type: "array",
            items: { type: "string" },
            description: "Key events or announcements"
          }
        }
      }
    });

    return {
      headlines: response.news_headlines || [],
      sentiment: response.overall_sentiment || 'neutral',
      events: response.key_events || [],
      count: response.news_headlines?.length || 0
    };
  } catch (error) {
    console.error(`News fetch error for ${symbol}:`, error);
    return { headlines: [], sentiment: 'neutral', events: [], count: 0 };
  }
}

// Fetch social sentiment using LLM
async function fetchSocialData(base44, symbol) {
  try {
    const prompt = `Search for recent social media discussions about ${symbol} stock on Reddit (r/wallstreetbets, r/stocks) and Twitter/X.
Focus on the past 6 hours.
Identify the general sentiment and trending topics.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          sentiment: {
            type: "string",
            enum: ["positive", "negative", "neutral"],
            description: "Overall social sentiment"
          },
          trending_topics: {
            type: "array",
            items: { type: "string" },
            description: "Trending discussion topics"
          },
          mention_volume: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Volume of mentions"
          }
        }
      }
    });

    const volumeMap = { high: 100, medium: 50, low: 10 };
    
    return {
      sentiment: response.sentiment || 'neutral',
      topics: response.trending_topics || [],
      mentions: volumeMap[response.mention_volume] || 10
    };
  } catch (error) {
    console.error(`Social fetch error for ${symbol}:`, error);
    return { sentiment: 'neutral', topics: [], mentions: 0 };
  }
}

// Calculate Semantic Pressure Index
function calculateSPI(basePressure, sentimentScore) {
  // SPI = base_pressure + (sentiment_score × 25)
  const spi = basePressure + (sentimentScore * 25);
  return Math.max(0, Math.min(100, spi));
}

// Determine AI suggestion
function generateAISuggestion(spi, sentiment, topKeyword) {
  let suggestionEn = '';
  let suggestionZh = '';
  
  if (spi > 60) {
    suggestionEn = `Bullish sentiment (SPI: ${spi.toFixed(0)})`;
    suggestionZh = `看漲情緒（SPI：${spi.toFixed(0)}）`;
    
    if (topKeyword) {
      suggestionEn += ` - Key: ${topKeyword}`;
      suggestionZh += ` - 關鍵字：${topKeyword}`;
    }
  } else if (spi >= 40) {
    suggestionEn = `Neutral sentiment (SPI: ${spi.toFixed(0)})`;
    suggestionZh = `中性情緒（SPI：${spi.toFixed(0)}）`;
  } else {
    suggestionEn = `Bearish sentiment (SPI: ${spi.toFixed(0)})`;
    suggestionZh = `看跌情緒（SPI：${spi.toFixed(0)}）`;
    
    if (topKeyword) {
      suggestionEn += ` - Risk: ${topKeyword}`;
      suggestionZh += ` - 風險：${topKeyword}`;
    }
  }
  
  return { en: suggestionEn, zh: suggestionZh };
}

// Check if alert should be triggered
function checkAlertTrigger(spiChange) {
  return Math.abs(spiChange) > 15;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbols, mode = 'analyze' } = await req.json();

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return Response.json({ error: 'Symbols array required' }, { status: 400 });
    }

    // Mode: analyze - Analyze sentiment and calculate SPI
    if (mode === 'analyze') {
      const results = [];
      const alerts = [];

      for (const symbol of symbols) {
        try {
          console.log(`🔍 Analyzing sentiment for ${symbol}...`);

          // Apply delay compensation
          await new Promise(resolve => setTimeout(resolve, DELAY_COMPENSATION * 1000));

          // Get existing pressure data
          const pressureRecords = await base44.asServiceRole.entities.StockPressure.filter({ symbol });
          const basePressure = pressureRecords.length > 0 
            ? pressureRecords[0].final_pressure 
            : 50;

          // Get previous SPI for change calculation
          const prevSPIRecords = await base44.asServiceRole.entities.SemanticPressure.filter({ symbol });
          const prevSPI = prevSPIRecords.length > 0 ? prevSPIRecords[0].spi : 50;

          // Load keyword weights (AI learning)
          const keywordWeights = prevSPIRecords.length > 0 && prevSPIRecords[0].keyword_weights
            ? JSON.parse(prevSPIRecords[0].keyword_weights)
            : {};

          // Fetch news data
          const newsData = await fetchNewsData(base44, symbol);
          
          // Fetch social data
          const socialData = await fetchSocialData(base44, symbol);

          // Analyze all text content
          const allText = [
            ...newsData.headlines,
            ...newsData.events,
            ...socialData.topics
          ].join(' ');

          const sentimentAnalysis = analyzeSentiment(allText, keywordWeights);

          // Calculate SPI
          const spi = calculateSPI(basePressure, sentimentAnalysis.score);
          const spiChange = spi - prevSPI;

          // Determine overall sentiment
          let overallSentiment = 'neutral';
          if (sentimentAnalysis.score > 0.2) overallSentiment = 'positive';
          else if (sentimentAnalysis.score < -0.2) overallSentiment = 'negative';

          // Get top keyword
          const allKeywords = [...sentimentAnalysis.positive, ...sentimentAnalysis.negative];
          const topKeyword = allKeywords.length > 0 ? allKeywords[0] : null;

          // Generate AI suggestion
          const aiSuggestion = generateAISuggestion(spi, overallSentiment, topKeyword);

          // Check alert trigger
          const alertTriggered = checkAlertTrigger(spiChange);

          if (alertTriggered && topKeyword) {
            alerts.push({
              symbol,
              keyword: topKeyword,
              spiChange,
              sentiment: overallSentiment
            });
          }

          // Create semantic pressure record
          const semanticData = {
            symbol,
            spi: Math.round(spi * 10) / 10,
            sentiment_score: Math.round(sentimentAnalysis.score * 100) / 100,
            sentiment: overallSentiment,
            positive_keywords: sentimentAnalysis.positive,
            negative_keywords: sentimentAnalysis.negative,
            top_keyword: topKeyword,
            news_count: newsData.count,
            social_mentions: socialData.mentions,
            ai_suggestion_en: aiSuggestion.en,
            ai_suggestion_zh: aiSuggestion.zh,
            alert_triggered: alertTriggered,
            spi_change: Math.round(spiChange * 10) / 10,
            keyword_weights: JSON.stringify(keywordWeights),
            data_sources: ['news_api', 'social_media'],
            timestamp: new Date().toISOString()
          };

          await base44.asServiceRole.entities.SemanticPressure.create(semanticData);

          results.push({
            success: true,
            data: semanticData
          });

          console.log(`✅ ${symbol}: SPI ${spi.toFixed(1)} (${overallSentiment})`);

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`❌ Error analyzing ${symbol}:`, error);
          results.push({
            success: false,
            symbol,
            error: error.message
          });
        }
      }

      return Response.json({
        success: true,
        timestamp: new Date().toISOString(),
        results,
        alerts,
        stats: {
          total: symbols.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          alerts_triggered: alerts.length
        }
      });
    }

    // Mode: export - Export daily semantic pressure report
    if (mode === 'export') {
      const today = new Date().toISOString().split('T')[0];
      
      const allData = await base44.asServiceRole.entities.SemanticPressure.filter({});
      
      const todayData = allData.filter(record => {
        const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
        return recordDate === today;
      });

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
          avg_spi: Object.values(symbolMap).reduce((sum, r) => sum + r.spi, 0) / Object.keys(symbolMap).length,
          bullish_count: Object.values(symbolMap).filter(r => r.sentiment === 'positive').length,
          bearish_count: Object.values(symbolMap).filter(r => r.sentiment === 'negative').length,
          neutral_count: Object.values(symbolMap).filter(r => r.sentiment === 'neutral').length
        },
        generated_at: new Date().toISOString()
      };

      return Response.json({
        success: true,
        export_data: exportData,
        message: `Exported semantic pressure data for ${Object.keys(symbolMap).length} symbols`
      });
    }

    // Mode: learn - AI learning loop
    if (mode === 'learn') {
      console.log('🤖 Starting AI learning loop...');
      
      const allSemantic = await base44.asServiceRole.entities.SemanticPressure.list('-timestamp', 200);
      const allPressure = await base44.asServiceRole.entities.StockPressure.list('-timestamp', 200);
      
      const learningResults = [];
      
      for (const symbol of symbols) {
        const semanticRecords = allSemantic.filter(r => r.symbol === symbol).slice(0, 10);
        const pressureRecords = allPressure.filter(r => r.symbol === symbol).slice(0, 10);
        
        if (semanticRecords.length < 2 || pressureRecords.length < 2) continue;
        
        // Check correlation between SPI change and price change
        let correlations = 0;
        let totalComparisons = 0;
        
        for (let i = 0; i < Math.min(semanticRecords.length - 1, 5); i++) {
          const spiChange = semanticRecords[i].spi - semanticRecords[i + 1].spi;
          const priceChange = pressureRecords[i].price - pressureRecords[i + 1].price;
          
          if ((spiChange > 0 && priceChange > 0) || (spiChange < 0 && priceChange < 0)) {
            correlations++;
          }
          totalComparisons++;
        }
        
        const correlationRate = totalComparisons > 0 ? correlations / totalComparisons : 0;
        
        learningResults.push({
          symbol,
          correlation_rate: correlationRate,
          adjustment: correlationRate > 0.6 ? 'increase_weights' : 'decrease_weights'
        });
      }
      
      return Response.json({
        success: true,
        learning_results: learningResults,
        message: 'AI learning completed'
      });
    }

    return Response.json({ error: 'Invalid mode' }, { status: 400 });

  } catch (error) {
    console.error('Semantic Pressure AI error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});