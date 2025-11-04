import { CONFIG } from "../../config";

export class AISimulator {
  constructor() {
    this.capital = CONFIG.capital;
    this.positions = [];
    this.trades = [];
    this.pnl = 0;
  }

  simulateTick(symbol, flowPressure, price) {
    const openPos = this.positions.find((p) => p.symbol === symbol);
    const now = Date.now();

    if (!openPos && flowPressure > CONFIG.entry_threshold) {
      const size = this.capital * CONFIG.trade_per_signal;
      this.positions.push({ symbol, entry: price, time: now, size });
    }

    if (openPos) {
      const held = (now - openPos.time) / 1000;
      const pnlPct = (price - openPos.entry) / openPos.entry;
      const exitCond =
        flowPressure < CONFIG.exit_threshold ||
        pnlPct > CONFIG.take_profit_pct ||
        pnlPct < CONFIG.stop_loss_pct ||
        held >= CONFIG.hold_time_sec;

      if (exitCond) {
        const tradePnl = pnlPct * openPos.size * (1 - CONFIG.fee_rate);
        this.pnl += tradePnl;
        this.trades.push({
          symbol,
          entry: openPos.entry,
          exit: price,
          pnl: tradePnl,
          held,
          time: new Date().toLocaleTimeString(),
        });
        this.positions = this.positions.filter((p) => p.symbol !== symbol);
      }
    }
  }

  getSummary() {
    return {
      capital: this.capital,
      pnl: this.pnl.toFixed(2),
      open_positions: this.positions.length,
      trades: this.trades.slice(-10),
    };
  }
}
