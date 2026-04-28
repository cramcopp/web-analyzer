

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { scrapeData, url, plan = 'free' } = await req.json();

    if (!scrapeData) {
      return NextResponse.json({ error: 'No scrape data provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing');
    }

    // Define the schema for the AI response
    const responseSchema = {
      description: "SEO Analysis Report",
      type: "object",
      properties: {
        businessIntelligence: {
          type: "object",
          properties: {
            businessNiche: { type: "string" },
            keywordGapAnalysis: { type: "array", items: { type: "string" } },
            targetAudienceProfile: { type: "string" },
            uniqueSellingPropositions: { type: "array", items: { type: "string" } }
          },
          required: ["businessNiche", "keywordGapAnalysis", "targetAudienceProfile", "uniqueSellingPropositions"]
        },
        overallAssessment: { type: "string" },
        industryNews: { type: "array", items: { type: "string" } },
        implementationPlan: {
          type: "object",
          properties: {
            phase1: { type: "object", properties: { title: { type: "string" }, tasks: { type: "array", items: { type: "string" } } }, required: ["title", "tasks"] },
            phase2: { type: "object", properties: { title: { type: "string" }, tasks: { type: "array", items: { type: "string" } } }, required: ["title", "tasks"] },
            phase3: { type: "object", properties: { title: { type: "string" }, tasks: { type: "array", items: { type: "string" } } }, required: ["title", "tasks"] },
            developerPrompt: { type: "string" }
          },
          required: ["phase1", "phase2", "phase3", "developerPrompt"]
        },
        competitorBenchmarking: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              url: { type: "string" },
              estimatedScores: {
                type: "object",
                properties: {
                  seo: { type: "integer" },
                  security: { type: "integer" },
                  performance: { type: "integer" }
                },
                required: ["seo", "security", "performance"]
              }
            },
            required: ["name", "url", "estimatedScores"]
          }
        },
        seo: {
          type: "object",
          properties: {
            score: { type: "integer" },
            insights: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            detailedSeo: {
              type: "object",
              properties: {
                keywordAnalysis: { type: "string" },
                metaTagsAssessment: { type: "string" },
                linkStructure: { type: "string" },
                mobileFriendly: { type: "string" },
                localSeoNap: { type: "string" },
                semanticStructure: { type: "string" },
                ctaAnalysis: { type: "string" },
                contentQuality: {
                  type: "object",
                  properties: {
                    readabilityAssessment: { type: "string" },
                    duplicateContentIssues: { type: "string" }
                  },
                  required: ["readabilityAssessment", "duplicateContentIssues"]
                },
                technicalSeo: {
                  type: "object",
                  properties: {
                    sitemapStatus: { type: "string" },
                    robotsTxtStatus: { type: "string" },
                    canonicalStatus: { type: "string" },
                    hreflangStatus: { type: "string" }
                  },
                  required: ["sitemapStatus", "robotsTxtStatus", "canonicalStatus", "hreflangStatus"]
                },
                prioritizedTasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priority: { type: "string", description: "Muss einer dieser Werte sein: CRITICAL, IMPORTANT, PERFECTION" },
                      task: { type: "string" },
                      remediation: { type: "string" }
                    }
                  }
                }
              },
              required: ["keywordAnalysis", "metaTagsAssessment", "linkStructure", "mobileFriendly", "localSeoNap", "semanticStructure", "ctaAnalysis", "contentQuality", "technicalSeo", "prioritizedTasks"]
            }
          },
          required: ["score", "insights", "recommendations", "detailedSeo"]
        },
        security: {
          type: "object",
          properties: {
            score: { type: "integer" },
            insights: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            detailedSecurity: {
              type: "object",
              properties: {
                sqlXssAssessment: { type: "string" },
                headerAnalysis: { type: "string" },
                softwareConfig: { type: "string" },
                dataLeakageAssessment: { type: "string" },
                googleSafeBrowsingStatus: { type: "string" },
                prioritizedTasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priority: { type: "string", description: "Muss einer dieser Werte sein: CRITICAL, IMPORTANT, PERFECTION" },
                      task: { type: "string" },
                      remediation: { type: "string" }
                    }
                  }
                }
              },
              required: ["sqlXssAssessment", "headerAnalysis", "softwareConfig", "dataLeakageAssessment", "googleSafeBrowsingStatus", "prioritizedTasks"]
            }
          },
          required: ["score", "insights", "recommendations", "detailedSecurity"]
        },
        performance: {
          type: "object",
          properties: {
            score: { type: "integer" },
            insights: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            detailedPerformance: {
              type: "object",
              properties: {
                coreVitalsAssessment: { type: "string" },
                resourceOptimization: { type: "string" },
                serverAndCache: { type: "string" },
                domComplexity: { type: "string" },
                perfectionistTweaks: { type: "string", description: "Sehr spezifische Tipps für Perfektionisten (z.B. Font-Loading Optimierung, spezifische DOM-Nodes)." },
                lighthouseMetrics: {
                  type: "object",
                  properties: {
                    performance: { type: "integer" },
                    accessibility: { type: "integer" },
                    bestPractices: { type: "integer" },
                    seo: { type: "integer" }
                  },
                  required: ["performance", "accessibility", "bestPractices", "seo"]
                },
                coreWebVitals: {
                  type: "object",
                  properties: {
                    fcp: { type: "object", properties: { value: { type: "string" }, numericValue: { type: "number" }, status: { type: "string" }, recommendation: { type: "string" } } },
                    lcp: { type: "object", properties: { value: { type: "string" }, numericValue: { type: "number" }, status: { type: "string" }, recommendation: { type: "string" } } },
                    cls: { type: "object", properties: { value: { type: "string" }, numericValue: { type: "number" }, status: { type: "string" }, recommendation: { type: "string" } } }
                  }
                },
                cachingAnalysis: {
                  type: "object",
                  properties: {
                    browserCaching: { type: "string" },
                    serverCaching: { type: "string" },
                    cdnStatus: { type: "string" }
                  }
                },
                chartData: {
                  type: "object",
                  properties: {
                    vitals: { type: "array", items: { type: "object", properties: { metric: { type: "string" }, value: { type: "number" } } } },
                    resources: { type: "array", items: { type: "object", properties: { name: { type: "string" }, count: { type: "integer" } } } }
                  },
                  required: ["vitals", "resources"]
                },
                prioritizedTasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priority: { type: "string", description: "Muss einer dieser Werte sein: CRITICAL, IMPORTANT, PERFECTION" },
                      task: { type: "string" },
                      remediation: { type: "string" }
                    }
                  }
                }
              },
              required: ["coreVitalsAssessment", "resourceOptimization", "serverAndCache", "domComplexity", "perfectionistTweaks", "lighthouseMetrics", "coreWebVitals", "cachingAnalysis", "chartData", "prioritizedTasks"]
            }
          },
          required: ["score", "insights", "recommendations", "detailedPerformance"]
        },
        accessibility: {
          type: "object",
          properties: {
            score: { type: "integer" },
            insights: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            detailedAccessibility: {
              type: "object",
              properties: {
                visualAndContrast: { type: "string" },
                navigationAndSemantics: { type: "string" },
                prioritizedTasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priority: { type: "string", description: "Muss einer dieser Werte sein: CRITICAL, IMPORTANT, PERFECTION" },
                      task: { type: "string" },
                      remediation: { type: "string" }
                    }
                  }
                }
              },
              required: ["visualAndContrast", "navigationAndSemantics", "prioritizedTasks"]
            }
          },
          required: ["score", "insights", "recommendations", "detailedAccessibility"]
        },
        compliance: {
          type: "object",
          properties: {
            score: { type: "integer" },
            insights: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            detailedCompliance: {
              type: "object",
              properties: {
                gdprAssessment: { type: "string" },
                cookieBannerStatus: { type: "string" },
                policyLinksStatus: { type: "string" },
                prioritizedTasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priority: { type: "string", description: "Muss einer dieser Werte sein: CRITICAL, IMPORTANT, PERFECTION" },
                      task: { type: "string" },
                      remediation: { type: "string" }
                    }
                  }
                }
              },
              required: ["gdprAssessment", "cookieBannerStatus", "policyLinksStatus", "prioritizedTasks"]
            }
          },
          required: ["score", "insights", "recommendations", "detailedCompliance"]
        },
        contentStrategy: {
          type: "object",
          properties: {
            score: { type: "integer" },
            insights: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            detailedContent: {
              type: "object",
              properties: {
                topicClusters: { type: "array", items: { type: "string" } },
                headingHierarchy: { type: "string" },
                keywordCannibalization: { type: "string" },
                readabilityAndTone: { type: "string" },
                prioritizedTasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priority: { type: "string" },
                      task: { type: "string" },
                      remediation: { type: "string" }
                    }
                  }
                }
              },
              required: ["topicClusters", "headingHierarchy", "keywordCannibalization", "readabilityAndTone", "prioritizedTasks"]
            }
          },
          required: ["score", "insights", "recommendations", "detailedContent"]
        },
        contentStrategy: {
          type: "object",
          properties: {
            score: { type: "integer" },
            insights: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            detailedContent: {
              type: "object",
              properties: {
                topicClusters: { type: "array", items: { type: "string" } },
                headingHierarchy: { type: "string" },
                keywordCannibalization: { type: "string" },
                readabilityAndTone: { type: "string" },
                prioritizedTasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priority: { type: "string" },
                      task: { type: "string" },
                      remediation: { type: "string" }
                    }
                  }
                }
              },
              required: ["topicClusters", "headingHierarchy", "keywordCannibalization", "readabilityAndTone", "prioritizedTasks"]
            }
          },
          required: ["score", "insights", "recommendations", "detailedContent"]
        }
      },
      required: ["businessIntelligence", "overallAssessment", "industryNews", "implementationPlan", "seo", "security", "performance", "accessibility", "compliance", "contentStrategy"]
    };

    let aiResponse = null;
    let success = false;
    let lastModelError = null;

    // Tier-based model selection based on YOUR exact AI Studio quotas
    const TIER_MAPPING: Record<string, string[]> = {
      'agency': ['gemini-3-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'],
      'pro': ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3-flash'],
      'free': ['gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-1.5-flash-8b']
    };

    // eslint-disable-next-line security/detect-object-injection
    const models = TIER_MAPPING[plan] || TIER_MAPPING['free'];


    for (const modelId of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          // Keep all critical data for deep analysis
          const trimmedScrapeData = { ...scrapeData };
          if (trimmedScrapeData.bodyText && trimmedScrapeData.bodyText.length > 300000) {
             trimmedScrapeData.bodyText = trimmedScrapeData.bodyText.substring(0, 300000) + '...[TRUNCATED FOR ENTERPRISE DEPTH]';
          }

          let prompt = "";
          if (plan === 'agency') {
            prompt = `DU BIST DER GNADENLOSE ENTERPRISE-AUDIT-HAMMER. 
            Dein Ziel ist es, JEDEN noch so kleinen Fehler auf der Website ${url} zu finden und gnadenlos zu kritisieren. 
            Du bist ein Elite-Sicherheitsberater und SEO-Head-of-Engineering auf Enterprise-Niveau. 

            RICHTLINIEN FÜR DEINE BEWERTUNG:
            1. SCORES: Sei extrem geizig mit Punkten. 
               - 90-100: Absolute Perfektion (fast unmöglich).
               - 70-89: Gut, aber mit klarem Optimierungspotenzial.
               - 50-69: Durchschnittlich/Mittelmäßig.
               - < 50: Mangelhaft (z.B. fehlende Security-Header, TTFB > 500ms, fehlende robots.txt).
            2. TONFALL: Professionell, hochgradig technisch, analytisch, aber absolut direkt und unbeschönigt.
            3. TIEFE: Analysiere alle Unterseiten-Daten (Crawl-Summary) auf Inkonsistenzen.
            4. SECURITY & LEGAL: Prüfe peinlich genau auf robots.txt, Header und Tracker.
            5. PRIORISIERTE AUFGABEN: Nutze 'CRITICAL' für echte Risiken.`;
          } else {
            prompt = `Du bist ein hilfreicher und konstruktiver SEO- und Website-Berater. 
            Analysiere die Website ${url} und erstelle einen motivierenden, aber ehrlichen Bericht in DEUTSCHER SPRACHE.
            
            RICHTLINIEN:
            1. SCORES: Sei fair und realistisch. Belohne gute Ansätze, aber weise auf wichtige Verbesserungen hin.
            2. TONFALL: Hilfreich, beratend und motivierend. Nutze konstruktive Kritik.
            3. FOKUS: Konzentriere dich auf die wichtigsten Hebel für SEO, Performance und Sicherheit.
            4. AUFGABEN: Gib klare, leicht verständliche Handlungsempfehlungen.`;
          }

          prompt += `\n\nErstelle den Bericht basierend auf diesen Daten: ${JSON.stringify(trimmedScrapeData)}`;


          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }],
              generationConfig: {
                response_mime_type: "application/json",
                response_schema: responseSchema,
                temperature: 0.2,
              }
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            lastModelError = new Error(`Gemini API error (${modelId}): ${response.status} - ${errorText}`);
            throw lastModelError;
          }

          const result = await response.json();
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error(`No response text from Gemini (${modelId})`);
          
          aiResponse = JSON.parse(text);
          success = true;
          break;
        } catch (err: any) {
          lastModelError = err;
          console.warn(`Attempt ${attempt + 1} with ${modelId} failed:`, err.message);
        }
      }
      if (success) break;
    }

    if (!success) {
      throw lastModelError || new Error('Failed to generate AI report');
    }

    return NextResponse.json(aiResponse);
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

