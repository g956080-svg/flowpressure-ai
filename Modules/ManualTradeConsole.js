/**
 * ManualTradeConsole.js
 * FlowPressure 手動交易模組：結合壓力值與語意指標
 */
export default class ManualTradeConsole {
  constructor({ symbols, tradeSettings, pressureIndex }) {
    this.symbols = symbols;
    this.tradeSettings = tradeSettings;
    this.pressureIndex = pressureIndex;
    this.manualLog = [];
  }
  decideAction(pressure, spi) {
    const combined = (pressure * 0.7) + (spi * 0.3);
    if (combined < 45) return "BUY";
    if (combined > 70) return "SELL";
    return "HOLD";
  }
  executeManualTrade(symbol, action, price) {
    const record = {
      mode: "manual",
      symbol,
      action,
      price,
      capital_used: this.tradeSettings.capital * this.tradeSettings.trade_per_signal,
      fee: this.tradeSettings.fee_rate,
      time: new Date().toISOString()
    };
    this.manualLog.push(record);
    console.log(`[ManualTrade] ${symbol} ${action} @ ${price}`);
  }
  displayConsole() {
    console.log("=== Manual Trade Console ===");
    this.symbols.forEach(s => {
      const p = this.pressureIndex[s]?.pressure || 50;
      const spi = this.pressureIndex[s]?.spi || 50;
      const suggestion = this.decideAction(p, spi);
      console.log(`${s} → Pressure: ${p}, SPI: ${spi}, Suggest: ${suggestion}`);
    });
  }
  getLog() {
    return this.manualLog;
  }
}