import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * AI Flow Predictor v2.2 - Rate Limit Optimized
 * 修復：速率限制問題
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    
    const { symbol, symbols, mode } = requestBody;
    
    if (!mode) {
      return Response.json({ error: 'mode is required' }, { status: 400 });
    }
    
    // Mode 1: 進行新預測（單一股票）
    if (mode === 'predict') {
      if (!symbol) {
        return Response.json({ error: 'symbol is required for predict mode' }, { status: 400 });
      }
      
      console.log(`🤖 AI Flow Predictor: Analyzing ${symbol}...`);
      
      // 檢查是否最近已經預測過（避免重複調用）
      const recentPredictions = await base44.asServiceRole.entities.AIPrediction.filter({
        symbol: symbol,
        actual_flow: "PENDING"
      });
      
      const now = new Date();
      const recentPrediction = recentPredictions.find(p => {
        const predTime = new Date(p.prediction_time);
        const minutesSince = (now - predTime) / 1000 / 60;
        return minutesSince < 30; // 30 分鐘內不重複預測
      });
      
      if (recentPrediction) {
        console.log(`⚠️ ${symbol} was predicted ${Math.floor((now - new Date(recentPrediction.prediction_time)) / 1000 / 60)} minutes ago. Skipping.`);
        return Response.json({
          success: true,
          prediction: recentPrediction,
          skipped: true,
          message: `${symbol} was recently predicted. Using existing prediction.`
        });
      }
      
      // 極簡化的 prompt，減少 API 消耗
      const prompt = `Quick ${symbol} analysis: Predict IN/OUT/NEUTRAL flow for next 24h. Confidence 0-100. Brief reasoning (20 words max each lang).`;

      let aiAnalysis;
      try {
        aiAnalysis = await base44.integrations.Core.InvokeLLM({
          prompt: prompt,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              predicted_flow: { type: "string", enum: ["IN", "OUT", "NEUTRAL"] },
              confidence: { type: "number", minimum: 0, maximum: 100 },
              reasoning_en: { type: "string" },
              reasoning_zh: { type: "string" }
            }
          }
        });
      } catch (error) {
        console.error(`AI analysis failed for ${symbol}:`, error);
        
        // 如果是速率限制錯誤，返回特定訊息
        if (error.message && error.message.includes('rate limit')) {
          return Response.json({
            success: false,
            error: 'rate_limit_exceeded',
            message: `Rate limit exceeded. Please wait a few minutes before trying again.`,
            retry_after: 60
          }, { status: 429 });
        }
        
        return Response.json({
          success: false,
          error: 'AI analysis timeout or failed',
          message: `Failed to analyze ${symbol}. Please try again later.`
        }, { status: 503 });
      }
      
      const prediction = await base44.asServiceRole.entities.AIPrediction.create({
        symbol: symbol,
        prediction_time: new Date().toISOString(),
        predicted_flow: aiAnalysis.predicted_flow,
        predicted_confidence: aiAnalysis.confidence,
        prediction_reasoning_en: aiAnalysis.reasoning_en || 'N/A',
        prediction_reasoning_zh: aiAnalysis.reasoning_zh || '無',
        market_temperature: 50,
        social_sentiment_score: 0,
        news_sentiment_score: 0,
        technical_indicators: JSON.stringify({
          key_factors: [],
          latest_news: [],
          social_buzz: '',
          technical: '',
          risks: []
        }),
        actual_flow: "PENDING",
        is_accurate: false,
        accuracy_score: 0
      });
      
      console.log(`✅ AI Prediction recorded for ${symbol}: ${aiAnalysis.predicted_flow} (${aiAnalysis.confidence}% confidence)`);
      
      return Response.json({
        success: true,
        prediction: prediction,
        analysis: aiAnalysis,
        message: `AI predicted ${aiAnalysis.predicted_flow} flow for ${symbol} with ${aiAnalysis.confidence}% confidence`
      });
    }
    
    // Mode 2: 驗證預測準確度
    else if (mode === 'verify') {
      if (!symbol) {
        return Response.json({ error: 'symbol is required for verify mode' }, { status: 400 });
      }
      
      console.log(`🔍 Verifying predictions for ${symbol}...`);
      
      const predictions = await base44.asServiceRole.entities.AIPrediction.filter({
        symbol: symbol,
        actual_flow: "PENDING"
      });
      
      if (predictions.length === 0) {
        return Response.json({
          success: true,
          verified: 0,
          message: "No pending predictions to verify"
        });
      }
      
      let verified = 0;
      let accurate = 0;
      
      for (const pred of predictions) {
        const predTime = new Date(pred.prediction_time);
        const now = new Date();
        const hoursSince = (now - predTime) / 1000 / 60 / 60;
        
        if (hoursSince < 4 || hoursSince > 24) continue;
        
        const verificationPrompt = `Check ${symbol} past ${Math.floor(hoursSince)}h. Was prediction ${pred.predicted_flow} accurate? Brief answer.`;

        let verification;
        try {
          verification = await base44.integrations.Core.InvokeLLM({
            prompt: verificationPrompt,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                actual_flow: { type: "string", enum: ["IN", "OUT", "NEUTRAL"] },
                actual_price_change: { type: "number" },
                is_accurate: { type: "boolean" },
                accuracy_score: { type: "number", minimum: 0, maximum: 100 }
              }
            }
          });
        } catch (error) {
          console.error(`Verification failed for ${symbol}:`, error);
          
          if (error.message && error.message.includes('rate limit')) {
            return Response.json({
              success: false,
              error: 'rate_limit_exceeded',
              message: `Rate limit exceeded. Please wait before verifying.`,
              retry_after: 60
            }, { status: 429 });
          }
          
          continue;
        }
        
        await base44.asServiceRole.entities.AIPrediction.update(pred.id, {
          actual_flow: verification.actual_flow,
          actual_price_change: verification.actual_price_change,
          verification_time: new Date().toISOString(),
          is_accurate: verification.is_accurate,
          accuracy_score: verification.accuracy_score,
          learning_notes: ''
        });
        
        verified++;
        if (verification.is_accurate) accurate++;
        
        console.log(`✅ Verified prediction for ${symbol}: ${verification.is_accurate ? 'ACCURATE' : 'INACCURATE'} (Score: ${verification.accuracy_score})`);
      }
      
      return Response.json({
        success: true,
        verified: verified,
        accurate: accurate,
        accuracy_rate: verified > 0 ? (accurate / verified) * 100 : 0,
        message: `Verified ${verified} predictions, ${accurate} were accurate`
      });
    }
    
    // Mode 3: 批量預測（嚴格限制為 3 個）
    else if (mode === 'batch_predict') {
      if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        return Response.json({ error: 'symbols array is required for batch_predict mode' }, { status: 400 });
      }
      
      // 嚴格限制為 3 個，避免速率限制
      const limitedSymbols = symbols.slice(0, 3);
      console.log(`🤖 Starting batch prediction for ${limitedSymbols.length} stocks (limited from ${symbols.length})...`);
      
      const results = [];
      
      for (const sym of limitedSymbols) {
        try {
          console.log(`Predicting ${sym}...`);
          
          // 檢查最近是否已預測
          const recentPredictions = await base44.asServiceRole.entities.AIPrediction.filter({
            symbol: sym,
            actual_flow: "PENDING"
          });
          
          const now = new Date();
          const recentPrediction = recentPredictions.find(p => {
            const predTime = new Date(p.prediction_time);
            const minutesSince = (now - predTime) / 1000 / 60;
            return minutesSince < 30;
          });
          
          if (recentPrediction) {
            console.log(`⚠️ ${sym} recently predicted. Skipping.`);
            results.push({
              symbol: sym,
              success: true,
              skipped: true,
              prediction: recentPrediction
            });
            continue;
          }
          
          const prompt = `Quick ${sym} analysis: Predict IN/OUT/NEUTRAL flow. Confidence 0-100. Brief reasoning.`;

          const aiAnalysis = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                predicted_flow: { type: "string", enum: ["IN", "OUT", "NEUTRAL"] },
                confidence: { type: "number", minimum: 0, maximum: 100 },
                reasoning_en: { type: "string" },
                reasoning_zh: { type: "string" }
              }
            }
          });
          
          const prediction = await base44.asServiceRole.entities.AIPrediction.create({
            symbol: sym,
            prediction_time: new Date().toISOString(),
            predicted_flow: aiAnalysis.predicted_flow,
            predicted_confidence: aiAnalysis.confidence,
            prediction_reasoning_en: aiAnalysis.reasoning_en || 'N/A',
            prediction_reasoning_zh: aiAnalysis.reasoning_zh || '無',
            market_temperature: 50,
            social_sentiment_score: 0,
            news_sentiment_score: 0,
            technical_indicators: JSON.stringify({ key_factors: [] }),
            actual_flow: "PENDING",
            is_accurate: false,
            accuracy_score: 0
          });
          
          results.push({
            symbol: sym,
            success: true,
            prediction: prediction
          });
          
          console.log(`✅ Predicted ${sym}: ${aiAnalysis.predicted_flow} (${aiAnalysis.confidence}%)`);
          
          // 增加延遲到 5 秒，避免速率限制
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
          console.error(`Error predicting ${sym}:`, error);
          
          if (error.message && error.message.includes('rate limit')) {
            results.push({
              symbol: sym,
              success: false,
              error: 'rate_limit_exceeded'
            });
            break; // 遇到速率限制就停止
          }
          
          results.push({
            symbol: sym,
            success: false,
            error: error.message
          });
        }
      }
      
      return Response.json({
        success: true,
        total: limitedSymbols.length,
        original_count: symbols.length,
        limited: symbols.length > 3,
        results: results,
        message: symbols.length > 3 
          ? `Processed ${limitedSymbols.length} stocks (limited from ${symbols.length} to avoid rate limit)`
          : `Batch prediction completed for ${limitedSymbols.length} stocks`
      });
    }
    
    // Mode 4: 計算整體準確率（不使用 AI，避免速率限制）
    else if (mode === 'calculate_accuracy') {
      const today = new Date().toISOString().split('T')[0];
      
      const allPredictions = await base44.asServiceRole.entities.AIPrediction.filter({});
      const verifiedPredictions = allPredictions.filter(p => p.actual_flow !== "PENDING");
      
      if (verifiedPredictions.length === 0) {
        return Response.json({
          success: true,
          accuracy: 0,
          message: "No verified predictions yet"
        });
      }
      
      const accurate = verifiedPredictions.filter(p => p.is_accurate).length;
      const overallAccuracy = (accurate / verifiedPredictions.length) * 100;
      
      const inPredictions = verifiedPredictions.filter(p => p.predicted_flow === "IN");
      const outPredictions = verifiedPredictions.filter(p => p.predicted_flow === "OUT");
      
      const inAccurate = inPredictions.filter(p => p.is_accurate).length;
      const outAccurate = outPredictions.filter(p => p.is_accurate).length;
      
      const inFlowAccuracy = inPredictions.length > 0 ? (inAccurate / inPredictions.length) * 100 : 0;
      const outFlowAccuracy = outPredictions.length > 0 ? (outAccurate / outPredictions.length) * 100 : 0;
      
      const symbolStats = {};
      verifiedPredictions.forEach(p => {
        if (!symbolStats[p.symbol]) {
          symbolStats[p.symbol] = { total: 0, accurate: 0 };
        }
        symbolStats[p.symbol].total++;
        if (p.is_accurate) symbolStats[p.symbol].accurate++;
      });
      
      let bestSymbol = null;
      let bestAccuracy = 0;
      let worstSymbol = null;
      let worstAccuracy = 100;
      
      for (const [symbol, stats] of Object.entries(symbolStats)) {
        if (stats.total < 3) continue;
        const accuracy = (stats.accurate / stats.total) * 100;
        if (accuracy > bestAccuracy) {
          bestAccuracy = accuracy;
          bestSymbol = symbol;
        }
        if (accuracy < worstAccuracy) {
          worstAccuracy = accuracy;
          worstSymbol = symbol;
        }
      }
      
      // 不使用 AI 生成總結，直接創建簡單總結
      const learningSummary = {
        summary_en: `AI achieved ${overallAccuracy.toFixed(1)}% accuracy across ${verifiedPredictions.length} predictions. IN flow: ${inFlowAccuracy.toFixed(1)}%, OUT flow: ${outFlowAccuracy.toFixed(1)}%.`,
        summary_zh: `AI 在 ${verifiedPredictions.length} 次預測中達到 ${overallAccuracy.toFixed(1)}% 準確率。流入：${inFlowAccuracy.toFixed(1)}%，流出：${outFlowAccuracy.toFixed(1)}%。`,
        key_insights: [`Overall accuracy: ${overallAccuracy.toFixed(1)}%`],
        improvement_suggestions: ['Continue learning from predictions']
      };
      
      await base44.asServiceRole.entities.AIAccuracyLog.create({
        date: today,
        total_predictions: verifiedPredictions.length,
        accurate_predictions: accurate,
        overall_accuracy: overallAccuracy,
        in_flow_accuracy: inFlowAccuracy,
        out_flow_accuracy: outFlowAccuracy,
        best_performing_symbol: bestSymbol,
        worst_performing_symbol: worstSymbol,
        market_condition: "SIDEWAYS",
        ai_learning_summary_en: learningSummary.summary_en,
        ai_learning_summary_zh: learningSummary.summary_zh
      });
      
      return Response.json({
        success: true,
        accuracy: {
          overall: overallAccuracy,
          in_flow: inFlowAccuracy,
          out_flow: outFlowAccuracy,
          total_predictions: verifiedPredictions.length,
          accurate_predictions: accurate
        },
        best_stock: { symbol: bestSymbol, accuracy: bestAccuracy },
        worst_stock: { symbol: worstSymbol, accuracy: worstAccuracy },
        learning: learningSummary,
        message: `Overall AI accuracy: ${overallAccuracy.toFixed(2)}%`
      });
    }
    
    return Response.json({ error: 'Invalid mode' }, { status: 400 });
    
  } catch (error) {
    console.error('AI Flow Predictor error:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});