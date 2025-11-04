# FlowPressure-AI 🚀
**AI-driven stock flow tracker & autonomous trading simulator**

## Overview
FlowPressure-AI visualizes capital inflow/outflow, detects trading opportunities, and simulates autonomous trading on both bull and bear markets.

**Daily Target:** $2000 capital → $200–$500 profit per trading day (simulated)

## Features
- Hybrid Real-Time Engine™ (mock/live)
- AI Selection Agent scans all U.S. stocks
- AI Simulation Engine executes entry/exit based on flow pressure
- User Mode / Full Auto Mode switch
- Reports daily P&L, win rate, drawdown
- CSV export and multilingual UI

## Setup
```bash
npm install
npm run dev
```

### Environment
Copy `.env.example` to `.env` and fill in your API key:
```
VITE_FINNHUB_KEY=YOUR_KEY_HERE
VITE_API_SOURCE=mock
```

### Configuration
Edit `config.js` for capital, trade_per_signal, thresholds, refresh_interval_sec.

## Mock vs Live
- **Mock Mode:** simulated data stream (default)
- **Live Mode:** requires Finnhub API key

## Reports
Outputs: Total P&L, Win rate, Max drawdown, Trades count.
Export CSV or screenshot reports from the Reports page.

## License
MIT © 2025 FlowPressure-AI Project
