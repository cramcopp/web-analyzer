'use server';

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { scrapeData, url } = await req.json();

    if (!scrapeData) {
      return NextResponse.json({ error: 'No scrape data provided' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    
    // Define the schema for the AI response
    const schema: any = {
      description: "SEO Analysis Report",
      type: SchemaType.OBJECT,
      properties: {
        businessIntelligence: {
          type: SchemaType.OBJECT,
          properties: {
            businessNiche: { type: SchemaType.STRING },
            keywordGapAnalysis: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            targetAudienceProfile: { type: SchemaType.STRING },
            uniqueSellingPropositions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
          },
          required: ["businessNiche", "keywordGapAnalysis", "targetAudienceProfile", "uniqueSellingPropositions"]
        },
        overallAssessment: { type: SchemaType.STRING },
        industryNews: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        implementationPlan: {
          type: SchemaType.OBJECT,
          properties: {
            phase1: { type: SchemaType.OBJECT, properties: { title: { type: SchemaType.STRING }, tasks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }, required: ["title", "tasks"] },
            phase2: { type: SchemaType.OBJECT, properties: { title: { type: SchemaType.STRING }, tasks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }, required: ["title", "tasks"] },
            phase3: { type: SchemaType.OBJECT, properties: { title: { type: SchemaType.STRING }, tasks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }, required: ["title", "tasks"] },
            developerPrompt: { type: SchemaType.STRING }
          },
          required: ["phase1", "phase2", "phase3", "developerPrompt"]
        },
        competitorBenchmarking: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              url: { type: SchemaType.STRING },
              estimatedScores: {
                type: SchemaType.OBJECT,
                properties: {
                  seo: { type: SchemaType.INTEGER },
                  security: { type: SchemaType.INTEGER },
                  performance: { type: SchemaType.INTEGER }
                },
                required: ["seo", "security", "performance"]
              }
            },
            required: ["name", "url", "estimatedScores"]
          }
        },
        seo: {
          type: SchemaType.OBJECT,
          properties: {
            score: { type: SchemaType.INTEGER },
            insights: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            detailedSeo: {
              type: SchemaType.OBJECT,
              properties: {
                keywordAnalysis: { type: SchemaType.STRING },
                metaTagsAssessment: { type: SchemaType.STRING },
                linkStructure: { type: SchemaType.STRING },
                mobileFriendly: { type: SchemaType.STRING },
                localSeoNap: { type: SchemaType.STRING },
                semanticStructure: { type: SchemaType.STRING },
                ctaAnalysis: { type: SchemaType.STRING },
                contentQuality: {
                  type: SchemaType.OBJECT,
                  properties: {
                    readabilityAssessment: { type: SchemaType.STRING },
                    duplicateContentIssues: { type: SchemaType.STRING }
                  },
                  required: ["readabilityAssessment", "duplicateContentIssues"]
                },
                technicalSeo: {
                  type: SchemaType.OBJECT,
                  properties: {
                    sitemapStatus: { type: SchemaType.STRING },
                    robotsTxtStatus: { type: SchemaType.STRING },
                    canonicalStatus: { type: SchemaType.STRING },
                    hreflangStatus: { type: SchemaType.STRING }
                  },
                  required: ["sitemapStatus", "robotsTxtStatus", "canonicalStatus", "hreflangStatus"]
                },
                prioritizedTasks: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      priority: { type: SchemaType.STRING, description: "Muss einer dieser Werte sein: CRITICAL, IMPORTANT, PERFECTION" },
                      task: { type: SchemaType.STRING },
                      remediation: { type: SchemaType.STRING }
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
          type: SchemaType.OBJECT,
          properties: {
            score: { type: SchemaType.INTEGER },
            insights: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            detailedSecurity: {
              type: SchemaType.OBJECT,
              properties: {
                sqlXssAssessment: { type: SchemaType.STRING },
                headerAnalysis: { type: SchemaType.STRING },
                softwareConfig: { type: SchemaType.STRING },
                dataLeakageAssessment: { type: SchemaType.STRING },
                googleSafeBrowsingStatus: { type: SchemaType.STRING },
                prioritizedTasks: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      priority: { type: SchemaType.STRING, description: "Muss einer dieser Werte sein: CRITICAL, IMPORTANT, PERFECTION" },
                      task: { type: SchemaType.STRING },
                      remediation: { type: SchemaType.STRING }
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
          type: SchemaType.OBJECT,
          properties: {
            score: { type: SchemaType.INTEGER },
            insights: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            detailedPerformance: {
              type: SchemaType.OBJECT,
              properties: {
                coreVitalsAssessment: { type: SchemaType.STRING },
                resourceOptimization: { type: SchemaType.STRING },
                serverAndCache: { type: SchemaType.STRING },
                domComplexity: { type: SchemaType.STRING },
                perfectionistTweaks: { type: SchemaType.STRING, description: "Sehr spezifische Tipps für Perfektionisten (z.B. Font-Loading Optimierung, spezifische DOM-Nodes)." },
                lighthouseMetrics: {
                  type: SchemaType.OBJECT,
                  properties: {
                    performance: { type: SchemaType.INTEGER },
                    accessibility: { type: SchemaType.INTEGER },
                    bestPractices: { type: SchemaType.INTEGER },
                    seo: { type: SchemaType.INTEGER }
                  },
                  required: ["performance", "accessibility", "bestPractices", "seo"]
                },
                coreWebVitals: {
                  type: SchemaType.OBJECT,
                  properties: {
                    fcp: { type: SchemaType.OBJECT, properties: { value: { type: SchemaType.STRING }, numericValue: { type: SchemaType.NUMBER }, status: { type: SchemaType.STRING }, recommendation: { type: SchemaType.STRING } } },
                    lcp: { type: SchemaType.OBJECT, properties: { value: { type: SchemaType.STRING }, numericValue: { type: SchemaType.NUMBER }, status: { type: SchemaType.STRING }, recommendation: { type: SchemaType.STRING } } },
                    cls: { type: SchemaType.OBJECT, properties: { value: { type: SchemaType.STRING }, numericValue: { type: SchemaType.NUMBER }, status: { type: SchemaType.STRING }, recommendation: { type: SchemaType.STRING } } }
                  }
                },
                cachingAnalysis: {
                  type: SchemaType.OBJECT,
                  properties: {
                    browserCaching: { type: SchemaType.STRING },
                    serverCaching: { type: SchemaType.STRING },
                    cdnStatus: { type: SchemaType.STRING }
                  }
                },
                chartData: {
                  type: SchemaType.OBJECT,
                  properties: {
                    vitals: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { metric: { type: SchemaType.STRING }, value: { type: SchemaType.NUMBER } } } },
                    resources: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { name: { type: SchemaType.STRING }, count: { type: SchemaType.INTEGER } } } }
                  },
                  required: ["vitals", "resources"]
                },
                prioritizedTasks: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      priority: { type: SchemaType.STRING, description: "Muss einer dieser Werte sein: CRITICAL, IMPORTANT, PERFECTION" },
                      task: { type: SchemaType.STRING },
                      remediation: { type: SchemaType.STRING }
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
          type: SchemaType.OBJECT,
          properties: {
            score: { type: SchemaType.INTEGER },
            insights: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            detailedAccessibility: {
              type: SchemaType.OBJECT,
              properties: {
                visualAndContrast: { type: SchemaType.STRING },
                navigationAndSemantics: { type: SchemaType.STRING },
                prioritizedTasks: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      priority: { type: SchemaType.STRING, description: "Muss einer dieser Werte sein: CRITICAL, IMPORTANT, PERFECTION" },
                      task: { type: SchemaType.STRING },
                      remediation: { type: SchemaType.STRING }
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
          type: SchemaType.OBJECT,
          properties: {
            score: { type: SchemaType.INTEGER },
            insights: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            detailedCompliance: {
              type: SchemaType.OBJECT,
              properties: {
                gdprAssessment: { type: SchemaType.STRING },
                cookieBannerStatus: { type: SchemaType.STRING },
                policyLinksStatus: { type: SchemaType.STRING },
                prioritizedTasks: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      priority: { type: SchemaType.STRING, description: "Muss einer dieser Werte sein: CRITICAL, IMPORTANT, PERFECTION" },
                      task: { type: SchemaType.STRING },
                      remediation: { type: SchemaType.STRING }
                    }
                  }
                }
              },
              required: ["gdprAssessment", "cookieBannerStatus", "policyLinksStatus", "prioritizedTasks"]
            }
          },
          required: ["score", "insights", "recommendations", "detailedCompliance"]
        }
      },
      required: ["businessIntelligence", "overallAssessment", "industryNews", "implementationPlan", "seo", "security", "performance", "accessibility", "compliance"]
    };

    let aiResponse = null;
    let success = false;
    let lastModelError = null;

    const models = ["gemini-1.5-flash", "gemini-1.5-pro"];

    for (const modelId of models) {
      const model = genAI.getGenerativeModel({
        model: modelId,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.2,
        },
      });

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const prompt = `Analysiere die folgenden Website-Daten für ${url} und erstelle einen detaillierten SEO-Bericht in deutscher Sprache. Nutze die Daten für Wettbewerber-Benchmarking, Keyword-Lücken-Analyse und einen konkreten Umsetzungsplan für Entwickler.
          
          Daten: ${JSON.stringify(scrapeData)}`;

          const result = await model.generateContent(prompt);
          aiResponse = JSON.parse(result.response.text());
          success = true;
          break;
        } catch (err) {
          lastModelError = err;
          console.warn(`Attempt ${attempt + 1} with ${modelId} failed:`, err);
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
