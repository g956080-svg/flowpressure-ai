/**
 * SemanticPressureAI.js
 * FlowPressure AI 模組：偵測社群 / 新聞關鍵字，計算語意壓力
 */
import axios from "axios";
export default class SemanticPressureAI {
  constructor(config) {
    this.keywordsPositive = [
      "funding", "capital raise", "loan approved", "acquisition",
      "partnership", "order expected", "AI breakthrough", "patent granted"
    ];
    this.keywordsNegative = [
      "layoff", "cash shortage", "default", "bankruptcy",
      "order canceled", "delay", "downgrade"
    ];
    this.config = config;
    this.results = [];
  }
  async fetchNews(symbol) {
    try {
      const url = `https://newsapi.org/v2/everything?q=${symbol}&apiKey=${this.config.news_key}`;
      const res = await axios.get(url);
      return res.data.articles || [];
    } catch (e) {
      console.warn("News fetch error:", e.message);
      return [];
    }
  }
  analyzeSentiment(text) {
    const lower = text.toLowerCase();
    let score = 0;
    this.keywordsPositive.forEach(k => { if (lower.includes(k)) score += 1; });
    this.keywordsNegative.forEach(k => { if (lower.includes(k)) score -= 1; });
    return score;
  }
  async computeSPI(symbol) {
    const articles = await this.fetchNews(symbol);
    if (!articles.length) return { symbol, spi: 50, sentiment: "neutral" };
    let totalScore = 0;
    articles.slice(0, 20).forEach(a => totalScore += this.analyzeSentiment(a.title + " " + a.description));
    const avg = totalScore / Math.max(articles.length, 1);
    const spi = Math.min(100, Math.max(0, 50 + avg * 10));
    const sentiment = spi > 55 ? "positive" : spi < 45 ? "negative" : "neutral";
    this.results.push({ symbol, spi, sentiment, time: new Date().toISOString() });
    return { symbol, spi, sentiment };
  }
  async run(symbols) {
    const outputs = [];
    for (const s of symbols) {
      const r = await this.computeSPI(s);
      outputs.push(r);
      console.log(`[SemanticPressureAI] ${s} → SPI: ${r.spi}, Sentiment: ${r.sentiment}`);
    }
    return outputs;
  }
}