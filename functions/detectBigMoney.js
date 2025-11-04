import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Big Money AI - 主力資金偵測引擎 v3.0
 * 結合真實市場數據 + 多媒體資訊 + 社群情緒分析
 */

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

// 從 Yahoo Finance 獲取詳細市場數據
async function fetchMarketData(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=5d`;
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
    
    const timestamps = result.timestamp || [];
    const volumes = quote.volume || [];
    const closes = quote.close || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    
    const recentMinutes = 30;
    const recentData = {
      volumes: volumes.slice(-recentMinutes),
      closes: closes.slice(-recentMinutes),
      highs: highs.slice(-recentMinutes),
      lows: lows.slice(-recentMinutes),
      timestamps: timestamps.slice(-recentMinutes)
    };
    
    const baselineHours = 4;
    const baselineMinutes = baselineHours * 60;
    const baselineData = {
      volumes: volumes.slice(-baselineMinutes, -recentMinutes),
      closes: closes.slice(-baselineMinutes, -recentMinutes)
    };
    
    return {
      symbol,
      currentPrice: meta.regularMarketPrice || closes[closes.length - 1],
      prevClose: meta.previousClose,
      recentData,
      baselineData,
      meta
    };
  } catch (error) {
    console.error(`Failed to fetch market data for ${symbol}:`, error);
    throw error;
  }
}

// 使用 AI 獲取多媒體資訊和社群情緒
async function fetchMultiMediaIntelligence(base44, symbol) {
  try {
    console.log(`🔍 Fetching multi-media intelligence for ${symbol}...`);
    
    const prompt = `
Analyze ${symbol} stock using the latest real-time information from multiple sources:

1. **Latest News & Media**:
   - Search for the most recent news articles about ${symbol}
   - Look for breaking news, earnings reports, product launches
   - Check financial media (CNBC, Bloomberg, Reuters, WSJ)
   - Identify any major announcements or events

2. **Social Media Sentiment**:
   - Analyze sentiment on Twitter/X for ${symbol}
   - Check Reddit discussions (r/wallstreetbets, r/stocks, r/investing)
   - Look for trending topics or viral discussions
   - Identify influencer opinions

3. **Institutional Activity**:
   - Recent insider trading reports
   - Institutional buying/selling patterns
   - Analyst upgrades/downgrades
   - Price target changes

4. **Market Context**:
   - Sector performance today
   - Related stocks movement
   - Overall market sentiment
   - Economic events affecting the stock

5. **Key Catalysts**:
   - Upcoming earnings date
   - Product launches or events
   - Regulatory news
   - Partnership announcements

Provide a comprehensive analysis with:
- Overall sentiment score (-100 to +100)
- Key news summary
- Social buzz level (0-100)
- Institutional signal (BULLISH/BEARISH/NEUTRAL)
- Risk factors
- Recommendation impact on money flow

Be specific and use real, current data from your internet search.
`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          sentiment_score: {
            type: "number",
            description: "Overall sentiment from -100 (very bearish) to +100 (very bullish)"
          },
          social_buzz_level: {
            type: "number",
            description: "Social media activity level 0-100"
          },
          institutional_signal: {
            type: "string",
            enum: ["BULLISH", "BEARISH", "NEUTRAL"],
            description: "Institutional activity signal"
          },
          latest_news_headlines: {
            type: "array",
            items: { type: "string" },
            description: "Top 5 most recent news headlines"
          },
          key_catalysts: {
            type: "array",
            items: { type: "string" },
            description: "Key upcoming catalysts or recent events"
          },
          risk_factors: {
            type: "array",
            items: { type: "string" },
            description: "Current risk factors"
          },
          social_sentiment_summary: {
            type: "string",
            description: "Summary of social media sentiment"
          },
          news_impact_summary: {
            type: "string",
            description: "Summary of how news is affecting the stock"
          },
          institutional_activity_summary: {
            type: "string",
            description: "Summary of institutional trading activity"
          },
          recommendation: {
            type: "string",
            enum: ["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"],
            description: "Overall recommendation based on all factors"
          },
          confidence_level: {
            type: "number",
            description: "Confidence in the analysis 0-100"
          }
        }
      }
    });
    
    console.log(`✅ Multi-media intelligence fetched for ${symbol}`);
    return response;
    
  } catch (error) {
    console.error(`Failed to fetch multi-media intelligence for ${symbol}:`, error);
    return null;
  }
}

// 計算平均值
function average(arr) {
  const filtered = arr.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, val) => sum + val, 0) / filtered.length;
}

// 計算標準差
function standardDeviation(arr) {
  const avg = average(arr);
  const filtered = arr.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (filtered.length === 0) return 0;
  const squareDiffs = filtered.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = average(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

// 分析市場數據
function analyzeMarketData(marketData) {
  const { recentData, baselineData, currentPrice, prevClose } = marketData;
  
  const baselineVolume = average(baselineData.volumes);
  const baselineVolumeStd = standardDeviation(baselineData.volumes);
  
  const recentVolume = recentData.volumes.reduce((sum, v) => sum + (v || 0), 0);
  const recentAvgVolume = average(recentData.volumes);
  
  const biggestTradeSize = Math.max(...recentData.volumes.filter(v => v > 0));
  const avgTradeSize = average(baselineData.volumes);
  
  const recentPriceChange = ((currentPrice - recentData.closes[0]) / recentData.closes[0]) * 100;
  let recentPriceMove = 'flat';
  if (recentPriceChange > 0.3) recentPriceMove = 'up';
  else if (recentPriceChange < -0.3) recentPriceMove = 'down';
  
  let aggressorScore = 0;
  for (let i = 1; i < recentData.closes.length; i++) {
    const priceChange = recentData.closes[i] - recentData.closes[i - 1];
    const volumeWeight = recentData.volumes[i] || 0;
    aggressorScore += priceChange * volumeWeight;
  }
  
  const recentAggressor = aggressorScore > 0 ? 'took_ask' : aggressorScore < 0 ? 'hit_bid' : 'mixed';
  
  const recentHigh = Math.max(...recentData.highs.filter(h => h > 0));
  const recentLow = Math.min(...recentData.lows.filter(l => l > 0));
  const baselineHigh = Math.max(...baselineData.closes.filter(c => c > 0));
  const baselineLow = Math.min(...baselineData.closes.filter(c => c > 0));
  
  const breakoutPunch = currentPrice > baselineHigh * 1.005;
  const supportBreak = currentPrice < baselineLow * 0.995;
  
  const volumeSpike = recentVolume / (baselineVolume * 30);
  const priorSimilarSignals = volumeSpike > 3 ? 2 : volumeSpike > 2 ? 1 : 0;
  
  return {
    symbol: marketData.symbol,
    baseline_volume: baselineVolume,
    recent_volume: recentVolume,
    biggest_trade_size: biggestTradeSize,
    avg_trade_size: avgTradeSize,
    recent_aggressor: recentAggressor,
    recent_price_move: recentPriceMove,
    support_break: supportBreak,
    breakout_punch: breakoutPunch,
    prior_similar_signals: priorSimilarSignals,
    current_price: currentPrice,
    analysis_details: {
      baseline_volume_std: baselineVolumeStd,
      recent_avg_volume: recentAvgVolume,
      recent_price_change_pct: recentPriceChange,
      aggressor_score: aggressorScore,
      volume_spike_ratio: volumeSpike,
      recent_high: recentHigh,
      recent_low: recentLow,
      baseline_high: baselineHigh,
      baseline_low: baselineLow
    }
  };
}

// 結合技術分析和多媒體資訊判斷訊號
function detectSignalWithIntelligence(data, intelligence) {
  const conditions = {
    in: [],
    out: []
  };
  
  // 技術面條件檢查
  if (data.recent_volume >= data.baseline_volume * 4) {
    conditions.in.push('recent_volume >= baseline_volume * 4');
  }
  
  if (data.biggest_trade_size >= data.avg_trade_size * 8) {
    conditions.in.push('biggest_trade_size >= avg_trade_size * 8');
  }
  
  if (data.breakout_punch === true) {
    conditions.in.push('breakout_punch == true');
  }
  
  if (data.recent_aggressor === 'took_ask' && data.recent_price_move === 'up') {
    conditions.in.push('took_ask AND price_up');
  }
  
  if (data.recent_volume >= data.baseline_volume * 4 && data.recent_price_move === 'down') {
    conditions.out.push('high_volume AND price_down');
  }
  
  if (data.biggest_trade_size >= data.avg_trade_size * 8 && data.recent_aggressor === 'hit_bid') {
    conditions.out.push('large_trade AND hit_bid');
  }
  
  if (data.support_break === true) {
    conditions.out.push('support_break == true');
  }
  
  if (data.recent_aggressor === 'hit_bid' && data.recent_price_move === 'down') {
    conditions.out.push('hit_bid AND price_down (panic selling)');
  }
  
  // 整合多媒體資訊
  if (intelligence) {
    // 正面新聞和情緒支持 IN 訊號
    if (intelligence.sentiment_score > 50) {
      conditions.in.push('positive_sentiment (score: ' + intelligence.sentiment_score + ')');
    }
    
    if (intelligence.institutional_signal === 'BULLISH') {
      conditions.in.push('institutional_bullish');
    }
    
    if (intelligence.social_buzz_level > 70) {
      conditions.in.push('high_social_buzz');
    }
    
    // 負面新聞和情緒支持 OUT 訊號
    if (intelligence.sentiment_score < -50) {
      conditions.out.push('negative_sentiment (score: ' + intelligence.sentiment_score + ')');
    }
    
    if (intelligence.institutional_signal === 'BEARISH') {
      conditions.out.push('institutional_bearish');
    }
    
    if (intelligence.risk_factors && intelligence.risk_factors.length > 2) {
      conditions.out.push('high_risk_factors');
    }
  }
  
  // 判斷訊號（需要至少 2 個條件）
  if (conditions.in.length >= 2) {
    return { type: 'IN', conditions: conditions.in };
  } else if (conditions.out.length >= 2) {
    return { type: 'OUT', conditions: conditions.out };
  } else {
    return { type: 'NONE', conditions: [] };
  }
}

// 計算強度分數（考慮多媒體資訊）
function calculateIntensity(data, signalType, intelligence) {
  let score = 1;
  const reasons = [];
  
  if (data.biggest_trade_size >= data.avg_trade_size * 10) {
    score += 2;
    reasons.push('+2: biggest_trade >= avg * 10');
  }
  
  if (data.recent_volume >= data.baseline_volume * 6) {
    score += 1;
    reasons.push('+1: volume >= baseline * 6');
  }
  
  if (data.prior_similar_signals >= 2) {
    score += 1;
    reasons.push('+1: prior_signals >= 2');
  }
  
  if (signalType === 'IN' && data.breakout_punch === true) {
    score += 1;
    reasons.push('+1: breakout_punch');
  } else if (signalType === 'OUT' && data.support_break === true) {
    score += 1;
    reasons.push('+1: support_break');
  }
  
  // 多媒體資訊加分
  if (intelligence) {
    if (signalType === 'IN' && intelligence.sentiment_score > 70) {
      score += 1;
      reasons.push('+1: strong_positive_sentiment');
    } else if (signalType === 'OUT' && intelligence.sentiment_score < -70) {
      score += 1;
      reasons.push('+1: strong_negative_sentiment');
    }
  }
  
  score = Math.min(5, Math.max(1, score));
  
  return { score, reasons };
}

// 計算動能延續機率（考慮多媒體資訊）
function calculateContinuationProb(data, signalType, intelligence) {
  let prob = 40;
  const reasons = [];
  
  if (data.prior_similar_signals >= 2) {
    prob += 20;
    reasons.push('+20: prior_signals >= 2');
  }
  
  if (signalType === 'IN' && data.recent_aggressor === 'took_ask' && data.recent_price_move === 'up') {
    prob += 20;
    reasons.push('+20: IN signal with took_ask & up');
  } else if (signalType === 'OUT' && data.recent_aggressor === 'hit_bid' && data.recent_price_move === 'down') {
    prob += 20;
    reasons.push('+20: OUT signal with hit_bid & down');
  }
  
  if (data.biggest_trade_size >= data.avg_trade_size * 10) {
    prob += 10;
    reasons.push('+10: biggest_trade >= avg * 10');
  }
  
  if (data.recent_price_move === 'flat') {
    prob -= 10;
    reasons.push('-10: price_move flat (stalled)');
  }
  
  // 多媒體資訊影響機率
  if (intelligence) {
    if (signalType === 'IN') {
      if (intelligence.institutional_signal === 'BULLISH') {
        prob += 15;
        reasons.push('+15: institutional_bullish');
      }
      if (intelligence.social_buzz_level > 80) {
        prob += 10;
        reasons.push('+10: viral_social_buzz');
      }
      if (intelligence.key_catalysts && intelligence.key_catalysts.length > 0) {
        prob += 10;
        reasons.push('+10: positive_catalysts');
      }
    } else if (signalType === 'OUT') {
      if (intelligence.institutional_signal === 'BEARISH') {
        prob += 15;
        reasons.push('+15: institutional_bearish');
      }
      if (intelligence.risk_factors && intelligence.risk_factors.length > 2) {
        prob += 10;
        reasons.push('+10: multiple_risk_factors');
      }
    }
    
    // 信心度影響
    if (intelligence.confidence_level < 50) {
      prob -= 15;
      reasons.push('-15: low_confidence_in_analysis');
    }
  }
  
  prob = Math.min(95, Math.max(10, prob));
  
  return { prob, reasons };
}

// 生成行動建議（考慮多媒體資訊）
function generateRecommendation(signalType, contProb, intelligence) {
  const rec = {
    zh: '',
    en: ''
  };
  
  if (signalType === 'IN') {
    if (contProb >= 80) {
      rec.zh = '🟢 強烈建議模擬買進跟單（多方面利好匯聚）';
      rec.en = '🟢 Strong buy signal with multi-source confirmation';
    } else if (contProb >= 70) {
      rec.zh = '🟢 建議模擬小量買進跟單（追主力尾巴）';
      rec.en = '🟢 Suggest small buy to follow big money';
    } else if (contProb >= 50) {
      rec.zh = '🟡 可少量試單並設嚴格停損';
      rec.en = '🟡 Small position with tight stop-loss';
    } else {
      rec.zh = '⚪ 觀察即可，先不要追';
      rec.en = '⚪ Watch only, do not chase';
    }
  } else if (signalType === 'OUT') {
    if (contProb >= 80) {
      rec.zh = '🔴 強烈建議立即模擬賣出（多重風險警報）';
      rec.en = '🔴 Strong sell signal with multiple risk factors';
    } else if (contProb >= 70) {
      rec.zh = '🔴 建議減碼或直接模擬賣出，多保留現金';
      rec.en = '🔴 Suggest reduce or exit, preserve cash';
    } else if (contProb >= 50) {
      rec.zh = '🟠 建議減半，鎖利或縮小風險';
      rec.en = '🟠 Suggest half position, lock profit';
    } else {
      rec.zh = '⚪ 可能是假性洗盤，先觀察，別直接砍光';
      rec.en = '⚪ Possibly fake-out, watch, do not panic sell';
    }
  } else {
    rec.zh = '⚪ 無明確主力動作';
    rec.en = '⚪ No clear big money action';
  }
  
  // 添加多媒體資訊摘要
  if (intelligence) {
    if (intelligence.latest_news_headlines && intelligence.latest_news_headlines.length > 0) {
      rec.zh += ` | 最新消息：${intelligence.latest_news_headlines[0]}`;
      rec.en += ` | Latest: ${intelligence.latest_news_headlines[0]}`;
    }
  }
  
  return rec;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const requestBody = await req.json();
    
    // 模式 1：手動測試模式（保留向後兼容）
    if (requestBody.baseline_volume !== undefined) {
      const inputData = requestBody;
      
      const required = [
        'symbol', 'recent_volume', 'baseline_volume', 
        'biggest_trade_size', 'avg_trade_size', 
        'recent_price_move', 'recent_aggressor'
      ];
      
      for (const field of required) {
        if (inputData[field] === undefined || inputData[field] === null) {
          return Response.json({ 
            error: `Missing required field: ${field}`,
            message: '訊號不足，不建議動作'
          }, { status: 400 });
        }
      }
      
      const data = {
        ...inputData,
        support_break: inputData.support_break || false,
        breakout_punch: inputData.breakout_punch || false,
        prior_similar_signals: inputData.prior_similar_signals || 0
      };
      
      const timestamp = new Date().toISOString();
      const signal = detectSignalWithIntelligence(data, null);
      
      let intensityResult = null;
      let scoreField = {};
      
      if (signal.type !== 'NONE') {
        intensityResult = calculateIntensity(data, signal.type, null);
        
        if (signal.type === 'IN') {
          scoreField.intensity_score = intensityResult.score;
        } else {
          scoreField.panic_score = intensityResult.score;
        }
      }
      
      const contResult = calculateContinuationProb(data, signal.type, null);
      const recommendation = generateRecommendation(signal.type, contResult.prob, null);
      
      const debugNotes = [
        `Signal: ${signal.type}`,
        `Conditions met: ${signal.conditions.join(', ') || 'none'}`,
        intensityResult ? `Intensity: ${intensityResult.score}/5 (${intensityResult.reasons.join(', ')})` : '',
        `Cont Prob: ${contResult.prob}% (${contResult.reasons.join(', ')})`,
        `Recommendation: ${recommendation.zh}`
      ].filter(Boolean).join(' | ');
      
      const signalRecord = {
        symbol: data.symbol,
        timestamp_detected: timestamp,
        signal_type: signal.type,
        ...scoreField,
        cont_prob: contResult.prob,
        rec_action: recommendation.zh,
        rec_action_en: recommendation.en,
        debug_notes: debugNotes,
        algorithm_version: 'BigMoney-AI-v3.0',
        input_data: JSON.stringify(data),
        current_price: data.current_price || null,
        recent_volume: data.recent_volume,
        baseline_volume: data.baseline_volume
      };
      
      await base44.asServiceRole.entities.BigMoneySignal.create(signalRecord);
      
      return Response.json({
        success: true,
        signal: signalRecord,
        analysis: {
          signal_type: signal.type,
          conditions_met: signal.conditions,
          intensity: intensityResult,
          continuation_probability: contResult,
          recommendation: recommendation
        }
      });
    }
    
    // 模式 2：自動掃描模式（含多媒體資訊）
    const { symbol, auto_scan, symbols, include_intelligence } = requestBody;
    
    if (auto_scan && symbols && Array.isArray(symbols)) {
      const results = [];
      
      for (const sym of symbols) {
        try {
          console.log(`📊 Scanning ${sym}...`);
          
          // 1. 獲取真實市場數據
          const marketData = await fetchMarketData(sym);
          
          // 2. 獲取多媒體資訊（如果啟用）
          let intelligence = null;
          if (include_intelligence) {
            intelligence = await fetchMultiMediaIntelligence(base44, sym);
          }
          
          // 3. 分析數據
          const analysisData = analyzeMarketData(marketData);
          
          // 4. 偵測訊號（含多媒體資訊）
          const signal = detectSignalWithIntelligence(analysisData, intelligence);
          
          if (signal.type === 'NONE') {
            console.log(`⚪ ${sym}: No signal detected`);
            continue;
          }
          
          // 5. 計算強度和機率（含多媒體資訊）
          const intensityResult = calculateIntensity(analysisData, signal.type, intelligence);
          const contResult = calculateContinuationProb(analysisData, signal.type, intelligence);
          const recommendation = generateRecommendation(signal.type, contResult.prob, intelligence);
          
          const scoreField = signal.type === 'IN' 
            ? { intensity_score: intensityResult.score }
            : { panic_score: intensityResult.score };
          
          const debugNotes = [
            `Signal: ${signal.type}`,
            `Conditions: ${signal.conditions.join(', ')}`,
            `Intensity: ${intensityResult.score}/5`,
            `Cont Prob: ${contResult.prob}%`,
            intelligence ? `Multi-media analysis included` : `Technical analysis only`,
            `Auto-scanned from real market data`
          ].join(' | ');
          
          // 6. 儲存訊號（含多媒體資訊）
          const signalRecord = {
            symbol: sym,
            timestamp_detected: new Date().toISOString(),
            signal_type: signal.type,
            ...scoreField,
            cont_prob: contResult.prob,
            rec_action: recommendation.zh,
            rec_action_en: recommendation.en,
            debug_notes: debugNotes,
            algorithm_version: include_intelligence ? 'BigMoney-AI-v3.0-Full' : 'BigMoney-AI-v3.0-Auto',
            input_data: JSON.stringify({
              ...analysisData,
              intelligence: intelligence ? {
                sentiment_score: intelligence.sentiment_score,
                institutional_signal: intelligence.institutional_signal,
                social_buzz_level: intelligence.social_buzz_level,
                latest_news: intelligence.latest_news_headlines?.[0] || null
              } : null
            }),
            current_price: analysisData.current_price,
            recent_volume: analysisData.recent_volume,
            baseline_volume: analysisData.baseline_volume
          };
          
          await base44.asServiceRole.entities.BigMoneySignal.create(signalRecord);
          
          results.push({
            symbol: sym,
            success: true,
            signal: signalRecord,
            intelligence: intelligence
          });
          
          console.log(`✅ ${sym}: ${signal.type} signal detected (${contResult.prob}% confidence)`);
          
        } catch (error) {
          console.error(`❌ ${sym}: ${error.message}`);
          results.push({
            symbol: sym,
            success: false,
            error: error.message
          });
        }
        
        // 避免 API 限流（多媒體資訊需要更長時間）
        await new Promise(resolve => setTimeout(resolve, include_intelligence ? 2000 : 500));
      }
      
      return Response.json({
        success: true,
        mode: include_intelligence ? 'auto_scan_with_intelligence' : 'auto_scan',
        scanned: symbols.length,
        signals_detected: results.filter(r => r.success).length,
        results
      });
    }
    
    // 模式 3：單一股票自動掃描（含多媒體資訊）
    if (symbol) {
      console.log(`📊 Scanning ${symbol}...`);
      
      const marketData = await fetchMarketData(symbol);
      
      let intelligence = null;
      if (include_intelligence) {
        intelligence = await fetchMultiMediaIntelligence(base44, symbol);
      }
      
      const analysisData = analyzeMarketData(marketData);
      const signal = detectSignalWithIntelligence(analysisData, intelligence);
      
      if (signal.type === 'NONE') {
        return Response.json({
          success: true,
          signal_type: 'NONE',
          message: '目前無明確主力動作',
          intelligence: intelligence
        });
      }
      
      const intensityResult = calculateIntensity(analysisData, signal.type, intelligence);
      const contResult = calculateContinuationProb(analysisData, signal.type, intelligence);
      const recommendation = generateRecommendation(signal.type, contResult.prob, intelligence);
      
      const scoreField = signal.type === 'IN' 
        ? { intensity_score: intensityResult.score }
        : { panic_score: intensityResult.score };
      
      const debugNotes = [
        `Signal: ${signal.type}`,
        `Conditions: ${signal.conditions.join(', ')}`,
        `Intensity: ${intensityResult.score}/5`,
        `Cont Prob: ${contResult.prob}%`,
        intelligence ? `Multi-media analysis included` : `Technical analysis only`,
        `Auto-scanned from real market data`
      ].join(' | ');
      
      const signalRecord = {
        symbol,
        timestamp_detected: new Date().toISOString(),
        signal_type: signal.type,
        ...scoreField,
        cont_prob: contResult.prob,
        rec_action: recommendation.zh,
        rec_action_en: recommendation.en,
        debug_notes: debugNotes,
        algorithm_version: include_intelligence ? 'BigMoney-AI-v3.0-Full' : 'BigMoney-AI-v3.0-Auto',
        input_data: JSON.stringify({
          ...analysisData,
          intelligence: intelligence ? {
            sentiment_score: intelligence.sentiment_score,
            institutional_signal: intelligence.institutional_signal,
            social_buzz_level: intelligence.social_buzz_level,
            latest_news: intelligence.latest_news_headlines?.[0] || null
          } : null
        }),
        current_price: analysisData.current_price,
        recent_volume: analysisData.recent_volume,
        baseline_volume: analysisData.baseline_volume
      };
      
      await base44.asServiceRole.entities.BigMoneySignal.create(signalRecord);
      
      return Response.json({
        success: true,
        signal: signalRecord,
        analysis: analysisData.analysis_details,
        intelligence: intelligence
      });
    }
    
    return Response.json({ error: 'Invalid request' }, { status: 400 });
    
  } catch (error) {
    console.error('Big Money AI error:', error);
    return Response.json({ 
      success: false,
      error: '訊號偵測失敗',
      message: error.message
    }, { status: 500 });
  }
});