import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Get Hot Stocks - AI 掃描最熱門美股
 * 基於成交量、價格波動、社群熱度等指標
 */

// 熱門股票池（Top 100 美股）
const POPULAR_STOCKS = [
  // 科技巨頭
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD',
  // 熱門科技
  'NFLX', 'DIS', 'PYPL', 'INTC', 'QCOM', 'AVGO', 'CSCO', 'ADBE',
  // 電動車 & 新能源
  'RIVN', 'LCID', 'NIO', 'XPEV', 'LI', 'F', 'GM', 'PLUG',
  // 金融
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'C',
  // 醫療保健
  'JNJ', 'UNH', 'PFE', 'ABBV', 'TMO', 'MRK', 'LLY', 'BMY',
  // 消費品
  'KO', 'PEP', 'WMT', 'HD', 'MCD', 'NKE', 'SBUX', 'TGT',
  // 能源
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO',
  // 半導體
  'TSM', 'ASML', 'AMAT', 'LRCX', 'KLAC', 'MU', 'MRVL', 'NXPI',
  // 通訊
  'T', 'VZ', 'TMUS', 'CMCSA', 'CHTR',
  // 航空 & 旅遊
  'AAL', 'DAL', 'UAL', 'LUV', 'CCL', 'RCL', 'MAR', 'HLT',
  // 零售 & 電商
  'BABA', 'JD', 'PDD', 'SHOP', 'EBAY', 'ETSY', 'W', 'CHWY',
  // 生技
  'MRNA', 'BNTX', 'REGN', 'GILD', 'BIIB', 'VRTX', 'AMGN'
];

// 從 Yahoo Finance 獲取股票數據
async function fetchStockData(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
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
      return null;
    }
    
    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    
    const volumes = quote.volume || [];
    const closes = quote.close || [];
    
    // 計算平均成交量
    const avgVolume = volumes.reduce((sum, v) => sum + (v || 0), 0) / volumes.length;
    
    // 計算價格波動
    const priceChange = closes.length > 1 
      ? Math.abs((closes[closes.length - 1] - closes[0]) / closes[0]) * 100 
      : 0;
    
    // 計算資金活絡度分數
    let flowScore = 0;
    
    // 成交量權重（40%）
    const volumeScore = Math.min((avgVolume / 10000000) * 40, 40);
    flowScore += volumeScore;
    
    // 價格波動權重（30%）
    const volatilityScore = Math.min(priceChange * 10, 30);
    flowScore += volatilityScore;
    
    // 當前價格權重（30%） - 高價股通常交易更活躍
    const priceScore = Math.min((meta.regularMarketPrice / 100) * 30, 30);
    flowScore += priceScore;
    
    return {
      symbol,
      company_name: meta.symbol,
      current_price: meta.regularMarketPrice,
      avg_volume: avgVolume,
      price_change_pct: priceChange,
      flow_score: Math.min(flowScore, 100)
    };
    
  } catch (error) {
    console.error(`Failed to fetch data for ${symbol}:`, error);
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
    
    const { count = 30, force_refresh = false } = await req.json().catch(() => ({}));
    
    console.log(`🔍 Scanning for top ${count} hot stocks...`);
    
    // 檢查是否需要更新
    if (!force_refresh) {
      const existingStocks = await base44.asServiceRole.entities.WatchedStock.filter({ added_by: 'system' });
      
      if (existingStocks.length >= count) {
        const lastUpdated = existingStocks[0]?.last_updated;
        if (lastUpdated) {
          const hoursSinceUpdate = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60);
          if (hoursSinceUpdate < 6) {
            console.log('✅ Using cached hot stocks (updated within 6 hours)');
            return Response.json({
              success: true,
              cached: true,
              stocks: existingStocks.slice(0, count)
            });
          }
        }
      }
    }
    
    // 掃描所有股票
    const results = [];
    
    for (const symbol of POPULAR_STOCKS) {
      const stockData = await fetchStockData(symbol);
      if (stockData && stockData.flow_score > 0) {
        results.push(stockData);
      }
      
      // 避免 API 限流
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 按資金活絡度排序
    results.sort((a, b) => b.flow_score - a.flow_score);
    
    // 取前 N 檔
    const topStocks = results.slice(0, count);
    
    console.log(`✅ Found ${topStocks.length} hot stocks`);
    
    // 清除舊的系統添加的股票
    const oldSystemStocks = await base44.asServiceRole.entities.WatchedStock.filter({ added_by: 'system' });
    for (const stock of oldSystemStocks) {
      await base44.asServiceRole.entities.WatchedStock.delete(stock.id);
    }
    
    // 儲存新的熱門股票
    const timestamp = new Date().toISOString();
    for (const stock of topStocks) {
      await base44.asServiceRole.entities.WatchedStock.create({
        symbol: stock.symbol,
        company_name: stock.company_name,
        added_by: 'system',
        is_hot: true,
        flow_score: stock.flow_score,
        last_updated: timestamp
      });
    }
    
    return Response.json({
      success: true,
      cached: false,
      stocks: topStocks,
      scanned: POPULAR_STOCKS.length,
      timestamp
    });
    
  } catch (error) {
    console.error('Get hot stocks error:', error);
    return Response.json({ 
      success: false,
      error: error.message
    }, { status: 500 });
  }
});