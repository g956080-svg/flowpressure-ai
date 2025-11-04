/**
 * FlowReportGenerator.js
 * FlowPressure 報告生成模組：匯總績效、產出報表
 */
import fs from "fs";
export default class FlowReportGenerator {
  constructor({ autoLog, manualLog, quoteAudit }) {
    this.autoLog = autoLog;
    this.manualLog = manualLog;
    this.quoteAudit = quoteAudit;
  }
  calculateProfit(log) {
    const grouped = {};
    log.forEach(t => {
      if (!grouped[t.symbol]) grouped[t.symbol] = 0;
      grouped[t.symbol] += t.action === "SELL" ? +t.price : -t.price;
    });
    return grouped;
  }
  generateSummary() {
    const autoTrades = this.autoLog.length;
    const manualTrades = this.manualLog.length;
    const profit = this.calculateProfit(this.autoLog.concat(this.manualLog));
    const totalProfit = Object.values(profit).reduce((a, b) => a + b, 0);
    return {
      date: new Date().toISOString().split("T")[0],
      totalTrades: autoTrades + manualTrades,
      autoTrades,
      manualTrades,
      totalProfit,
      quoteFreshRatio:
        this.quoteAudit.filter(q => q.status === "FRESH").length /
        Math.max(this.quoteAudit.length, 1),
    };
  }
  exportReport(path = "./reports/FlowReport.json") {
    const summary = this.generateSummary();
    fs.mkdirSync("./reports", { recursive: true });
    fs.writeFileSync(path, JSON.stringify(summary, null, 2));
    console.log("[Report Generated] →", path);
    return summary;
  }
}