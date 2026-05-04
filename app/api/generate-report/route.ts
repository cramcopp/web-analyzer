

import { NextRequest, NextResponse } from 'next/server';
import { verifyReportGrounding } from '@/lib/reporting/report-verifier';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { getCacheJson, putCacheJson } from '@/lib/cloudflare-cache';
import { normalizePlan } from '@/lib/plans';
import {
  buildDeterministicReport,
  buildGroundedReportPayload,
  createAiReportCacheKey,
  getAiAttemptLimit,
  getAiReportMode,
  getAiReportModels,
  requestGeminiContent,
  shouldRunAiReport,
} from '@/lib/ai-cost-control';

export const runtime = 'nodejs';

function getAiReportCacheTtl(env: Record<string, any>) {
  const configured = Number(env.AI_REPORT_CACHE_TTL_SECONDS);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return 60 * 60 * 24 * 7;
}

export async function POST(req: NextRequest) {
  try {
    const env = getRuntimeEnv();
    const { scrapeData, url, plan = 'free' } = await req.json();

    if (!scrapeData) {
      return NextResponse.json({ error: 'No scrape data provided' }, { status: 400 });
    }

    const scanPlan = normalizePlan(scrapeData.scanPlan || scrapeData.plan || plan);
    scrapeData.scanPlan = scanPlan;
    scrapeData.plan = scanPlan;

    const groundedData = buildGroundedReportPayload(scrapeData, url, scanPlan);
    const aiMode = getAiReportMode(env);
    const cacheKey = await createAiReportCacheKey({
      version: 'report-v2',
      url,
      plan: scanPlan,
      aiMode,
      groundedData,
    });

    const cached = await getCacheJson<any>(env, `ai-report:${cacheKey}`).catch(() => null);
    if (cached?.report) {
      return NextResponse.json({
        ...cached.report,
        aiCost: {
          mode: aiMode,
          cached: true,
          cacheKey,
        },
      });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!shouldRunAiReport(env, groundedData)) {
      const reason = apiKey ? `AI_REPORT_MODE=${aiMode}` : 'Gemini API-Key nicht gesetzt';
      const fallback = verifyReportGrounding(buildDeterministicReport(scrapeData, url, reason), scrapeData, url);
      return NextResponse.json({
        ...fallback,
        aiCost: {
          mode: aiMode,
          cached: false,
          skipped: true,
          reason,
        },
      });
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
        }
      },
      required: ["businessIntelligence", "overallAssessment", "industryNews", "implementationPlan", "seo", "security", "performance", "accessibility", "compliance", "contentStrategy"]
    };

    let aiResponse = null;
    let success = false;
    let lastModelError = null;
    let aiProvider = 'not-run';

    const models = getAiReportModels(scanPlan, aiMode, env);
    const attemptsPerModel = getAiAttemptLimit(aiMode);


    for (const modelId of models) {
      for (let attempt = 0; attempt < attemptsPerModel; attempt++) {
        try {
          let prompt = scanPlan === 'agency'
            ? `Du bist ein Senior Technical SEO Consultant fuer ein DACH Website-Governance-SaaS. Erstelle einen klaren, direkten Agenturbericht fuer ${url}.`
            : `Du bist ein hilfreicher und konstruktiver SEO- und Website-Berater. Erstelle einen ehrlichen Bericht in deutscher Sprache fuer ${url}.`;

          prompt += `

          Harte Regeln fuer Datenwahrheit:
          - Nutze nur Daten aus issues, evidence, crawlSummary, realProviderFacts, GSC, PSI oder CrUX.
          - Erfinde keine Rankings, Backlinks, Suchvolumen, Trafficdaten, Wettbewerberwerte oder AI-Visibility-Metriken.
          - Behaupte keine Core-Web-Vitals, Lighthouse- oder PSI-Werte, wenn psiMetrics/cruxMetrics fehlen.
          - Jede Empfehlung muss auf vorhandene issue ids, evidence ids oder crawlSummary-Fakten zurueckfuehrbar sein.
          - Wenn Daten fehlen, schreibe "Nicht verfuegbar" oder "Provider nicht verbunden".
          - Scores aus dem JSON sind deterministische Scanner-Scores; veraendere sie inhaltlich nicht.
          - competitorBenchmarking darf nur echte realProviderFacts.competitorFacts nutzen. Wenn leer, gib [] zurueck oder markiere Nicht verfuegbar.
          - keywordGapAnalysis sind nur Themenhinweise aus vorhandenen Inhalten/Issues, keine Suchvolumen- oder Ranking-Fakten.

          Erstelle den Bericht ausschliesslich aus diesem Grounding-JSON:
          ${JSON.stringify(groundedData)}`;


          const { response, provider } = await requestGeminiContent({
            modelId,
            apiKey: apiKey!,
            env,
            cacheKey,
            body: {
              contents: [{
                parts: [{ text: prompt }]
              }],
              generationConfig: {
                response_mime_type: "application/json",
                response_schema: responseSchema,
                temperature: 0.2,
              }
            },
          });
          aiProvider = provider;

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

    const verifiedReport = verifyReportGrounding(aiResponse, scrapeData, url);
    const reportWithCost = {
      ...verifiedReport,
      aiCost: {
        mode: aiMode,
        cached: false,
        cacheKey,
        modelsTried: models,
        gateway: aiProvider,
      },
    };

    await putCacheJson(env, `ai-report:${cacheKey}`, {
      report: reportWithCost,
      url,
      plan: scanPlan,
      aiMode,
      createdAt: new Date().toISOString(),
    }, getAiReportCacheTtl(env)).catch((error) => {
      console.warn('AI report cache write skipped:', error instanceof Error ? error.message : 'Unknown error');
    });

    return NextResponse.json(reportWithCost);
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
