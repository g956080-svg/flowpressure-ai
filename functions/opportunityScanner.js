import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * FlowPressure Opportunity Scanner
 * Market-wide semantic trigger detection with AI verification
 */

const KEYWORD_FAMILIES = {
  funding: [
    "capital raise", "funding", "loan approved", "private placement",
    "acquisition", "merger", "share repurchase", "投資", "增資", "增貸",
    "募集資金", "私募", "入股", "併購", "回購"
  ],
  order: [
    "order expected", "framework agreement", "partnership",
    "mass production plan", "contract", "deal signed",
    "有望獲取訂單", "簽約在即", "合作框架", "量產計畫"
  ],
  rd: [
    "R&D success", "trial success", "FDA clearance", "patent granted",
    "pilot passed", "AI breakthrough", "研發成功", "臨床成功",
    "專利獲批", "試產成功", "AI突破"
  ],
  risk: [
    "layoff", "cash shortage", "default", "downgrade", "order canceled",
    "halt shipment", "bankruptcy", "裁員", "違約", "減資",
    "現金短缺", "暫停出貨", "破產保護"
  ]
};

const ALL_KEYWORDS = Object.values(KEYWORD_FAMILIES).flat();

// Source credibility scoring
function getSourceScore(domain) {
  const tier1Domains = ['sec.gov', 'investor.', 'ir.', 'investors.'];
  const tier2Domains = ['reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com', 'cnbc.com'];
  
  if (tier1Domains.some(d => domain.includes(d))) return 25;
  if (tier2Domains.some(d => domain.includes(d))) return 20;
  return 10; // social/other
}

// Extract ticker from text
function extractTicker(text) {
  // Look for patterns like $TSLA, (NVDA), AAPL, etc.
  const patterns = [
    /\$([A-Z]{1,5})\b/g,
    /\(([A-Z]{1,5})\)/g,
    /\b([A-Z]{2,5})\b/g
  ];
  
  const matches = new Set();
  
  for (const pattern of patterns) {
    const found = [...text.matchAll(pattern)];
    found.forEach(match => matches.add(match[1]));
  }
  
  return Array.from(matches);
}

// Calculate impact score
function calculateImpactScore(scores) {
  const total = scores.source + scores.corroboration + scores.velocity + 
                scores.entity_precision + scores.sentiment + scores.price_sensitivity;
  return Math.max(0, Math.min(100, total));
}

// Determine verification flag
function getVerificationFlag(sourceScore, corroborationScore) {
  if (sourceScore >= 25 || corroborationScore >= 20) return 'verified';
  if (corroborationScore >= 10) return 'watch';
  return 'likely_false';
}

// Get sentiment polarity
function getSentimentPolarity(sentiment) {
  if (sentiment > 0.2) return 'positive';
  if (sentiment < -0.2) return 'negative';
  return 'neutral';
}

// Get keyword category
function getKeywordCategory(keyword) {
  for (const [category, keywords] of Object.entries(KEYWORD_FAMILIES)) {
    if (keywords.some(k => keyword.toLowerCase().includes(k.toLowerCase()))) {
      return category;
    }
  }
  return 'other';
}

// Get price sensitivity score
function getPriceSensitivityScore(category) {
  const scores = {
    funding: 8,
    order: 7,
    rd: 9,
    risk: 10
  };
  return scores[category] || 5;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mode = 'scan', symbols = [] } = await req.json();

    // Mode: scan - Scan market for opportunities
    if (mode === 'scan') {
      console.log('🔍 Starting market-wide opportunity scan...');
      
      const opportunities = [];
      const alerts = [];

      // Use AI to search for financial events with keywords
      const keywordGroups = [
        KEYWORD_FAMILIES.funding.slice(0, 5),
        KEYWORD_FAMILIES.order.slice(0, 5),
        KEYWORD_FAMILIES.rd.slice(0, 5),
        KEYWORD_FAMILIES.risk.slice(0, 5)
      ];

      for (const keywordGroup of keywordGroups) {
        try {
          const keywordStr = keywordGroup.join(', ');
          
          const prompt = `Search for recent (past 24 hours) financial news, SEC filings, and social media discussions about publicly traded companies.
Look for events related to these keywords: ${keywordStr}

For each company/event found:
1. Identify the company ticker symbol and full name
2. Identify which specific keyword or event was detected
3. Provide source information (domain, title, credibility level)
4. Assess the sentiment (positive/negative/neutral)
5. Note if multiple sources report the same event

Return up to 10 significant events with clear company identification.`;

          const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                events: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      ticker: {
                        type: "string",
                        description: "Stock ticker symbol (e.g., TSLA, NVDA)"
                      },
                      company: {
                        type: "string",
                        description: "Full company name"
                      },
                      keyword: {
                        type: "string",
                        description: "The keyword that triggered this detection"
                      },
                      event_description: {
                        type: "string",
                        description: "Brief description of the event"
                      },
                      sentiment: {
                        type: "string",
                        enum: ["positive", "negative", "neutral"],
                        description: "Overall sentiment"
                      },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            domain: { type: "string" },
                            credibility: {
                              type: "string",
                              enum: ["high", "medium", "low"]
                            }
                          }
                        },
                        description: "Source information"
                      },
                      confidence: {
                        type: "number",
                        description: "Confidence in ticker identification (0-1)"
                      }
                    }
                  }
                }
              }
            }
          });

          // Process each event
          for (const event of response.events || []) {
            if (!event.ticker || !event.company || event.confidence < 0.6) continue;

            // Calculate scores
            const sourceScore = event.sources && event.sources.length > 0
              ? Math.min(30, event.sources.reduce((sum, s) => {
                  if (s.credibility === 'high') return sum + 25;
                  if (s.credibility === 'medium') return sum + 20;
                  return sum + 10;
                }, 0) / event.sources.length)
              : 10;

            const corroborationScore = event.sources && event.sources.length >= 3 ? 25 
              : event.sources && event.sources.length >= 2 ? 12 : 0;

            const velocityScore = 10; // Simplified - all recent events get base score

            const entityPrecisionScore = event.confidence >= 0.9 ? 10 
              : event.confidence >= 0.7 ? 7 : 5;

            const sentimentScore = event.sentiment === 'positive' ? 8 
              : event.sentiment === 'negative' ? -8 : 0;

            const category = getKeywordCategory(event.keyword);
            const priceSensitivityScore = getPriceSensitivityScore(category);

            const scores = {
              source: sourceScore,
              corroboration: corroborationScore,
              velocity: velocityScore,
              entity_precision: entityPrecisionScore,
              sentiment: sentimentScore,
              price_sensitivity: priceSensitivityScore
            };

            const impactScore = calculateImpactScore(scores);
            const verificationFlag = getVerificationFlag(sourceScore, corroborationScore);
            
            // Calculate semantic pressure contribution
            const semanticPressure = Math.round((impactScore / 100) * 30 * 10) / 10;

            // Get price pressure if available
            const pressureRecords = await base44.asServiceRole.entities.StockPressure.filter({ 
              symbol: event.ticker 
            });
            const pricePressure = pressureRecords.length > 0 
              ? pressureRecords[0].final_pressure 
              : 50;

            // Calculate total pressure
            const totalPressure = Math.round((pricePressure * 0.7 + semanticPressure * 0.3) * 10) / 10;

            // Check if alert should be triggered
            const alertTriggered = impactScore >= 75 || verificationFlag === 'verified';

            if (alertTriggered) {
              alerts.push({
                ticker: event.ticker,
                keyword: event.keyword,
                impact: impactScore,
                flag: verificationFlag
              });
            }

            // Create opportunity record
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 48);

            const opportunityData = {
              ticker: event.ticker,
              company: event.company,
              keyword: event.keyword,
              keyword_category: category,
              impact_score: Math.round(impactScore * 10) / 10,
              source_score: Math.round(sourceScore * 10) / 10,
              corroboration_score: Math.round(corroborationScore * 10) / 10,
              velocity_score: Math.round(velocityScore * 10) / 10,
              entity_precision_score: Math.round(entityPrecisionScore * 10) / 10,
              sentiment_score: Math.round(sentimentScore * 10) / 10,
              price_sensitivity_score: Math.round(priceSensitivityScore * 10) / 10,
              sentiment: event.sentiment,
              verification_flag: verificationFlag,
              sources: JSON.stringify(event.sources || []),
              source_count: event.sources ? event.sources.length : 0,
              semantic_pressure: semanticPressure,
              total_pressure: totalPressure,
              alert_triggered: alertTriggered,
              expires_at: expiresAt.toISOString(),
              timestamp: new Date().toISOString()
            };

            await base44.asServiceRole.entities.OpportunityScanner.create(opportunityData);

            opportunities.push({
              success: true,
              data: opportunityData
            });

            console.log(`✅ ${event.ticker}: Impact ${impactScore.toFixed(0)} - ${verificationFlag}`);
          }

          // Rate limiting between keyword groups
          await new Promise(resolve => setTimeout(resolve, 3000));

        } catch (error) {
          console.error(`❌ Error scanning keyword group:`, error);
        }
      }

      return Response.json({
        success: true,
        timestamp: new Date().toISOString(),
        opportunities,
        alerts,
        stats: {
          total_scanned: opportunities.length,
          high_impact: opportunities.filter(o => o.data?.impact_score >= 70).length,
          verified: opportunities.filter(o => o.data?.verification_flag === 'verified').length,
          alerts_triggered: alerts.length
        }
      });
    }

    // Mode: cleanup - Remove expired opportunities
    if (mode === 'cleanup') {
      const now = new Date().toISOString();
      const allOpportunities = await base44.asServiceRole.entities.OpportunityScanner.filter({});
      
      let deletedCount = 0;
      for (const opp of allOpportunities) {
        if (opp.expires_at && new Date(opp.expires_at) < new Date()) {
          await base44.asServiceRole.entities.OpportunityScanner.delete(opp.id);
          deletedCount++;
        }
      }

      return Response.json({
        success: true,
        deleted: deletedCount,
        message: `Cleaned up ${deletedCount} expired opportunities`
      });
    }

    // Mode: export - Export daily report
    if (mode === 'export') {
      const today = new Date().toISOString().split('T')[0];
      
      const allData = await base44.asServiceRole.entities.OpportunityScanner.filter({});
      
      const todayData = allData.filter(record => {
        const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
        return recordDate === today;
      });

      const exportData = {
        report_date: today,
        total_opportunities: todayData.length,
        opportunities: todayData.map(opp => ({
          ticker: opp.ticker,
          company: opp.company,
          keyword: opp.keyword,
          impact: opp.impact_score,
          sentiment: opp.sentiment,
          flag: opp.verification_flag,
          sources: JSON.parse(opp.sources || '[]'),
          semantic_pressure: opp.semantic_pressure,
          total_pressure_after_merge: opp.total_pressure
        })),
        market_summary: {
          high_impact_count: todayData.filter(o => o.impact_score >= 70).length,
          verified_count: todayData.filter(o => o.verification_flag === 'verified').length,
          avg_impact: todayData.reduce((sum, o) => sum + o.impact_score, 0) / todayData.length,
          sentiment_distribution: {
            positive: todayData.filter(o => o.sentiment === 'positive').length,
            neutral: todayData.filter(o => o.sentiment === 'neutral').length,
            negative: todayData.filter(o => o.sentiment === 'negative').length
          }
        },
        generated_at: new Date().toISOString()
      };

      return Response.json({
        success: true,
        export_data: exportData,
        message: `Exported ${todayData.length} opportunities for ${today}`
      });
    }

    return Response.json({ error: 'Invalid mode' }, { status: 400 });

  } catch (error) {
    console.error('Opportunity Scanner error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});