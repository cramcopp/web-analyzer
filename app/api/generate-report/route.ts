import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { getSessionUser, getSessionToken } from '@/lib/auth-server';
import { getDocument, updateDocument } from '@/lib/firestore-edge';

export const runtime = 'edge';

export async function POST(req: Request) {
  const user = await getSessionUser();
  const token = await getSessionToken();

  try {
    const scrapeData = await req.json();

    if (!scrapeData || !scrapeData.urlObj) {
      return NextResponse.json({ error: 'Missing scrape data' }, { status: 400 });
    }

    // BIZ-01 & BIZ-03: Quota check and Admin Bypass
    let plan = 'free';
    let isAdmin = false;

    // Check for admin bypass (BIZ-03)
    const adminSecret = req.headers.get('x-admin-secret');
    if (adminSecret && adminSecret === process.env.INTERNAL_SECRET) {
      isAdmin = true;
      plan = 'agency'; // Admin/Cron gets agency level analysis
    }

    if (!isAdmin) {
      if (!user || !token) {
        return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
      }

      const userData = await getDocument('users', user.uid, token);
      if (userData) {
        plan = userData.plan || 'free';
        const scanCount = userData.scanCount || 0;
        const maxScans = userData.maxScans || 5;

        // Rate Limiting (Throttle: 1 request per 10 seconds per user)
        const now = Date.now();
        const lastReq = userData.lastReportReqAt ? new Date(userData.lastReportReqAt).getTime() : 0;
        
        if (now - lastReq < 10000) {
          return NextResponse.json({ 
            error: 'Zu viele Anfragen', 
            details: 'Bitte warte einen Moment, bevor du den Bericht generierst.' 
          }, { status: 429 });
        }

        // Update last request time (don't wait for it to continue generation)
        updateDocument('users', user.uid, { lastReportReqAt: new Date(now).toISOString() }, token).catch(console.error);

        if (scanCount >= maxScans) {
          return NextResponse.json({ 
            error: 'Scan-Limit erreicht', 
            details: `Dein Abo erlaubt ${maxScans} Scans. Bitte upgrade für mehr Reports.` 
          }, { status: 403 });
        }
      }
    }


    const apiKey = process.env.GEMINI_API_KEY;


    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Du bist ein hochkarätiger, extrem kritischer Senior Technical SEO-Auditor, Security-Experte und Web-Performance-Guru.
      Du analysierst den Code und Content bis ins kleinste Detail und gibst gnadenloses, aber sehr konstruktives Feedback auf höchstem Industrie-Standard.
      Dein Ziel ist es, die analysierte Seite nicht nur "ein bisschen besser" zu machen, sondern sie auf ein "100/100 Best of the Best" Level zu heben.
      
      Erstelle einen ausführlichen Bericht (in Deutsch).
      Bewerte streng nach den Kategorien (Score 0-100, sei extrem kritisch!) UND fülle die Module aus.
      
      Spezifische Anforderung: Business Intelligence & Nische
      - Identifiziere zuerst exakt die Nische (businessNiche) der Seite anhand des Textes (z.B. "Döner-Imbiss", "B2B Software", "Anwalt für Arbeitsrecht").
      - Führe eine Keyword-Gap-Analyse durch: Welche harten, absichtsbasierten High-Intent Keywords (z.B. "Döner Husum Öffnungszeiten", "Kosten Erstberatung Arbeitsrecht") fehlen im Text, sind aber für diese Nische absolut überlebenswichtig?
      - Sei hier extrem clever und liefere branchenspezifische Keywords, an die der Betreiber vielleicht nicht gedacht hat.

      WICHTIGE REGEL ZU TASKS UND PRIORISIERUNG:
      - Jeder "prioritizedTask", den du ausgibst, MUSS zwingend als Priorität exakt einen dieser drei starken Begriffe haben: "CRITICAL", "IMPORTANT", oder "PERFECTION".
      - "CRITICAL": Sofortige Behebung nötig (Rechtliche Gefahr, Indexierungs-Gefahr, Sicherheitslücke).
      - "IMPORTANT": Starke SEO- und Performance-Bugs.
      - "PERFECTION": Mikro-Optimierungen für absolute Profis (z.B. DOM reduzieren, font-display, Strict HTTP Headers).

      Spezifische Anforderungen für das SEO-Modul:
      - Analysiere lokale SEO-Faktoren extrem kritisch (NAP: Name, Address, Phone Konsistenz in Text/Links).
      - Werte die "Semantic HTML Tags" und die "DOM Depth" aus. Ist der DOM zu tief (über 15 = Warnung)? Fehlen semantische Tags wie <article>, <aside> oder <nav>?
      - Bewerte Meta-Tags, interne und externe Links sowie Core Web Vitals massiv kritisch.
      - Führe eine technische SEO-Prüfung durch (Canonical, robots.txt, Sitemap, Hreflang).
      
      Spezifische Anforderungen für das Security-Modul:
      - Analysiere Security Header (${JSON.stringify(scrapeData.securityHeaders)}) extrem kritisch.
      - Bewerte SSL/TLS Status (${JSON.stringify(scrapeData.sslCertificate)}) und Safe Browsing (${scrapeData.safeBrowsingStr}).
      - Fülle "dataLeakageAssessment" aus: Bewerte Plaintext E-Mail-Adressen (${scrapeData.dataLeakage?.emailsFoundCount} gefunden).
      - Prüfe auf Mixed Content und fehlende Security-Best-Practices (z.B. noopener bei externen Links).

      Spezifische Anforderungen für Accessibility & Compliance:
      - DSGVO/Compliance Check: Werden Drittanbieter (${JSON.stringify(scrapeData.legal?.trackingScripts)}) direkt geladen? 
      - Ist ein Consent Banner (CMP) erkannt worden (${JSON.stringify(scrapeData.legal?.cmpDetected)})?
      - Legal Links Check: Impressum (${scrapeData.legal?.linksInFooter ? 'JA' : 'NEIN'}) und Datenschutz (${scrapeData.legal?.privacyInFooter ? 'JA' : 'NEIN'}) vorhanden?
      - Bewerte rechtliche Risiken bei fehlenden Links oder direkt geladenen Trackern ohne Consent.
      
      URL: ${scrapeData.urlObj}
      Detected Tech-Stack: ${scrapeData.techStack?.join(', ') || 'None detected'}
      Schema.org Types Found: ${JSON.stringify(scrapeData.schemaTypes || [])}
      API Endpoints Found: ${JSON.stringify(scrapeData.apiEndpoints || [])}
      
      Title: ${scrapeData.title}
      Meta Description: ${scrapeData.metaDescription}
      HTML Lang: ${scrapeData.htmlLang}, Generator: ${scrapeData.generator}
      H1: ${scrapeData.h1Count}, H2: ${scrapeData.h2Count}, DOM Depth: ${scrapeData.maxDomDepth}
      Images: ${scrapeData.imagesTotal} total, ${scrapeData.imagesWithoutAlt} missing ALT
      NAP Signals: ${JSON.stringify(scrapeData.napSignals)}
      
      Performance:
      - PSI Metrics (Raw): ${JSON.stringify(scrapeData.psiMetrics)}
      - Lighthouse Scores: ${JSON.stringify(scrapeData.lighthouseScores)}
      - Summary: ${scrapeData.psiMetricsStr}
      - Server Response: ${scrapeData.responseTimeMs}ms
      
      Crawl Summary:
      - Subpages scanned: ${scrapeData.crawlSummary?.scannedSubpagesCount}
      - Broken Links: ${JSON.stringify(scrapeData.crawlSummary?.brokenLinks || [])}

      Excerpt of Body Text:
      ${scrapeData.bodyText}
      `;

    // Model fallback chain — confirmed stable models as of 2026-04-22
    // 2.5-flash has the most generous free-tier limits — always use it first.
    // 2.5-pro has strict free-tier limits so it's only used as a last resort.
    const modelChain = (plan === 'pro' || plan === 'agency')
      ? ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"]
      : ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"];

    let aiResponse: any = null;
    let lastModelError: any = null;

    for (let modelIdx = 0; modelIdx < modelChain.length; modelIdx++) {
      const modelId = modelChain[modelIdx];
      let success = false;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          aiResponse = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            competitorBenchmarking: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  url: { type: Type.STRING },
                  estimatedScores: {
                    type: Type.OBJECT,
                    properties: {
                      seo: { type: Type.NUMBER },
                      security: { type: Type.NUMBER },
                      performance: { type: Type.NUMBER }
                    },
                    required: ["seo", "security", "performance"]
                  }
                },
                required: ["name", "url", "estimatedScores"]
              },
              description: "Daten von 2-3 direkten Wettbewerbern für den Vergleichschart."
            },
            businessIntelligence: {
              type: Type.OBJECT,
              description: "Business Intelligence und Nischen-Analyse der Webseite.",
              properties: {
                businessNiche: { type: Type.STRING, description: "Die exakt erkannte Nische/Branche der Webseite, z.B. 'Döner-Imbiss' oder 'B2B Software'." },
                keywordGapAnalysis: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "High-Intent Keywords, die für die Nische kritisch wichtig sind, aber im Content fehlen."
                },
                targetAudienceProfile: { type: Type.STRING, description: "Kurzbeschreibung der Zielgruppe und deren Suchintention." },
                uniqueSellingPropositions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Erkannte oder empfohlene USPs der Webseite."
                }
              },
              required: ["businessNiche", "keywordGapAnalysis", "targetAudienceProfile", "uniqueSellingPropositions"]
            },
            implementationPlan: {
              type: Type.OBJECT,
              properties: {
                phase1: { 
                  type: Type.OBJECT, 
                  properties: { 
                    title: { type: Type.STRING, description: "Z.B. 'Quick Wins & Kritische Fixes'" }, 
                    tasks: { type: Type.ARRAY, items: { type: Type.STRING } } 
                  },
                  required: ["title", "tasks"]
                },
                phase2: { 
                  type: Type.OBJECT, 
                  properties: { 
                    title: { type: Type.STRING, description: "Z.B. 'Strategische Optimierung'" }, 
                    tasks: { type: Type.ARRAY, items: { type: Type.STRING } } 
                  },
                  required: ["title", "tasks"]
                },
                phase3: { 
                  type: Type.OBJECT, 
                  properties: { 
                    title: { type: Type.STRING, description: "Z.B. 'Exzellenz & Perfektion'" }, 
                    tasks: { type: Type.ARRAY, items: { type: Type.STRING } } 
                  },
                  required: ["title", "tasks"]
                },
                developerPrompt: { type: Type.STRING, description: "Ein kompakter technischer Prompt/Briefing, den man einem Entwickler geben kann, um die Umsetzung zu starten." }
              },
              required: ["phase1", "phase2", "phase3", "developerPrompt"]
            },
            overallAssessment: { type: Type.STRING, description: "Kurze Zusammenfassung der Analyse und des Gesamteindrucks." },
            industryNews: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-3 aktuelle News/Insights zur ermittelten Branche." },
            seo: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER, description: "Bewertung von 0 bis 100" },
                insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
                detailedSeo: {
                  type: Type.OBJECT,
                  properties: {
                    keywordAnalysis: { type: Type.STRING },
                    metaTagsAssessment: { type: Type.STRING },
                    linkStructure: { type: Type.STRING },
                    mobileFriendly: { type: Type.STRING },
                    localSeoNap: { type: Type.STRING },
                    semanticStructure: { type: Type.STRING, description: "Bewertung der H-Hierarchie und semantischen HTML-Tags." },
                    ctaAnalysis: { type: Type.STRING, description: "Analyse der Call-to-Action Elemente und deren Platzierung." },
                    contentQuality: {
                      type: Type.OBJECT,
                      properties: {
                        readabilityAssessment: { type: Type.STRING },
                        duplicateContentIssues: { type: Type.STRING }
                      },
                      required: ["readabilityAssessment", "duplicateContentIssues"]
                    },
                    technicalSeo: {
                      type: Type.OBJECT,
                      properties: {
                        sitemapStatus: { type: Type.STRING, description: "Informationen zur XML-Sitemap (Vorhanden vs. Fehlend)." },
                        robotsTxtStatus: { type: Type.STRING, description: "Bewertung der robots.txt Direktiven." },
                        canonicalStatus: { type: Type.STRING, description: "Einschätzung der Canonical-Tag Implementierung." },
                        hreflangStatus: { type: Type.STRING, description: "Analyse der internationalen Hreflang-Tags." }
                      },
                      required: ["sitemapStatus", "robotsTxtStatus", "canonicalStatus", "hreflangStatus"]
                    },
                    prioritizedTasks: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          priority: { type: Type.STRING, description: "Muss einer dieser Werte sein: CRITICAL, IMPORTANT, PERFECTION" },
                          task: { type: Type.STRING }
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
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
                detailedSecurity: {
                  type: Type.OBJECT,
                  properties: {
                    sqlXssAssessment: { type: Type.STRING },
                    headerAnalysis: { type: Type.STRING },
                    softwareConfig: { type: Type.STRING },
                    dataLeakageAssessment: { type: Type.STRING, description: "Bewertung der gefundenen Plaintext-E-Mails (Scraping-Gefahr)." },
                    googleSafeBrowsingStatus: { type: Type.STRING, description: "Zusammenfassung des Google Safe Browsing Status." },
                    prioritizedTasks: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          priority: { type: Type.STRING, description: "Muss einer dieser Werte sein: CRITICAL, IMPORTANT, PERFECTION" },
                          task: { type: Type.STRING },
                          remediation: { type: Type.STRING }
                        }
                      }
                    }
                  },
                  required: ["sqlXssAssessment", "headerAnalysis", "softwareConfig", "dataLeakageAssessment", "prioritizedTasks"]
                }
              },
              required: ["score", "insights", "recommendations", "detailedSecurity"]
            },
            performance: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
                detailedPerformance: {
                  type: Type.OBJECT,
                  properties: {
                    coreVitalsAssessment: { type: Type.STRING, description: "Einschätzung von Metriken wie FCP, LCP, TTI basierend auf den Daten." },
                    resourceOptimization: { type: Type.STRING, description: "Bewertung von blockierenden Skripten, unoptimierten Bildern und CSS." },
                    serverAndCache: { type: Type.STRING, description: "Server Reaktionszeit, Caching-Header und Komprimierung (GZIP/Brotli)." },
                    domComplexity: { type: Type.STRING, description: "Bewertung der DOM-Gre und Tiefe (maxDomDepth)." },
                    lighthouseMetrics: {
                      type: Type.OBJECT,
                      properties: {
                        performance: { type: Type.INTEGER },
                        accessibility: { type: Type.INTEGER },
                        bestPractices: { type: Type.INTEGER },
                        seo: { type: Type.INTEGER }
                      },
                      required: ["performance", "accessibility", "bestPractices", "seo"]
                    },
                    coreWebVitals: {
                      type: Type.OBJECT,
                      properties: {
                        fcp: {
                          type: Type.OBJECT,
                          properties: {
                            value: { type: Type.STRING, description: "String with dimension, e.g., '1.2 s'" },
                            numericValue: { type: Type.INTEGER, description: "Millisekunden" },
                            status: { type: Type.STRING, description: "good, needs_improvement, or poor" },
                            recommendation: { type: Type.STRING }
                          },
                          required: ["value", "numericValue", "status", "recommendation"]
                        },
                        lcp: {
                          type: Type.OBJECT,
                          properties: {
                            value: { type: Type.STRING, description: "String with dimension, e.g., '2.5 s'" },
                            numericValue: { type: Type.INTEGER, description: "Millisekunden" },
                            status: { type: Type.STRING, description: "good, needs_improvement, or poor" },
                            recommendation: { type: Type.STRING }
                          },
                          required: ["value", "numericValue", "status", "recommendation"]
                        },
                        cls: {
                          type: Type.OBJECT,
                          properties: {
                            value: { type: Type.STRING, description: "String representation, e.g., '0.04'" },
                            numericValue: { type: Type.NUMBER, description: "Dezimalwert" },
                            status: { type: Type.STRING, description: "good, needs_improvement, or poor" },
                            recommendation: { type: Type.STRING }
                          },
                          required: ["value", "numericValue", "status", "recommendation"]
                        }
                      },
                      required: ["fcp", "lcp", "cls"]
                    },
                    cachingAnalysis: {
                      type: Type.OBJECT,
                      properties: {
                        browserCaching: { type: Type.STRING, description: "Details zu Cache-Control, Expires, ETag." },
                        serverCaching: { type: Type.STRING, description: "Details zu Server-seitigem Caching (z.B. Varnish, Nginx)." },
                        cdnStatus: { type: Type.STRING, description: "Erkennung von CDNs wie Cloudflare, Akamai, CloudFront." }
                      },
                      required: ["browserCaching", "serverCaching", "cdnStatus"]
                    },
                    chartData: {
                      type: Type.OBJECT,
                      properties: {
                        vitals: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              metric: { type: Type.STRING, description: "Z.B. TTFB, LCP, TBT" },
                              value: { type: Type.INTEGER, description: "Wert in Millisekunden (geschätzt oder vom System gegeben)" }
                            }
                          }
                        },
                        resources: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              name: { type: Type.STRING, description: "Z.B. Scripts, Styles, Images" },
                              count: { type: Type.INTEGER, description: "Anzahl" }
                            }
                          }
                        }
                      },
                      required: ["vitals", "resources"]
                    },
                    prioritizedTasks: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          priority: { type: Type.STRING, description: "Muss einer dieser Werte sein: CRITICAL, IMPORTANT, PERFECTION" },
                          task: { type: Type.STRING },
                          remediation: { type: Type.STRING }
                        }
                      }
                    }
                  },
                  required: ["coreVitalsAssessment", "resourceOptimization", "serverAndCache", "domComplexity", "lighthouseMetrics", "coreWebVitals", "cachingAnalysis", "chartData", "prioritizedTasks"]
                }
              },
              required: ["score", "insights", "recommendations", "detailedPerformance"]
            },
            accessibility: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
                detailedAccessibility: {
                  type: Type.OBJECT,
                  properties: {
                    visualAndContrast: { type: Type.STRING, description: "Bilder, Alt-Texte und visuelle Zugänglichkeit (Kontraste)." },
                    navigationAndSemantics: { type: Type.STRING, description: "Tastaturnavigation, ARIA-Tags, Semantische HTML5-Struktur (DOM Depth), leere Buttons." },
                    prioritizedTasks: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          priority: { type: Type.STRING, description: "Muss einer dieser Werte sein: CRITICAL, IMPORTANT, PERFECTION" },
                          task: { type: Type.STRING },
                          remediation: { type: Type.STRING }
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
              type: Type.OBJECT,
              properties: {
                score: { type: Type.INTEGER },
                insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
                detailedCompliance: {
                  type: Type.OBJECT,
                  properties: {
                    gdprAssessment: { type: Type.STRING, description: "Allgemeine DSGVO-Einschätzung basierend auf Formularen, Skripten und Text." },
                    cookieBannerStatus: { type: Type.STRING, description: "Status des Cookie-Banners (Vorhanden/Gefunden vs. Fehlend)." },
                    policyLinksStatus: { type: Type.STRING, description: "Einschätzung zu Impressum, Datenschutzerklärung und AGB." },
                    prioritizedTasks: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          priority: { type: Type.STRING, description: "Muss einer dieser Werte sein: CRITICAL, IMPORTANT, PERFECTION" },
                          task: { type: Type.STRING },
                          remediation: { type: Type.STRING }
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
              }
            }
          });
          success = true;
          break; // success — exit retry loop
        } catch (err: any) {
          lastModelError = err;
          const is429 = err?.message?.includes('429') || err?.status === 429 || err?.message?.includes('RESOURCE_EXHAUSTED');
          console.warn(`[GenerateReport] Model ${modelId} attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : 'Unknown error');

          if (is429 && attempt === 0) {
            // Wait before retrying same model
            await new Promise(resolve => setTimeout(resolve, 2000 * (modelIdx + 1)));
          } else {
            break; // non-429 error or final attempt — try next model
          }
        }
      }

      if (success) break; // exit model loop
      console.warn(`[GenerateReport] Falling back from ${modelId} to next model...`);
    }

    if (!aiResponse) {
      console.error("All AI models exhausted");
      return NextResponse.json(
        { error: lastModelError?.message || 'Alle Gemini-Modelle sind momentan nicht verfügbar (Quota). Bitte versuche es in 1 Minute erneut.' },
        { status: 429 }
      );
    }

    if (!aiResponse.text) {
      throw new Error("No text returned from Gemini");
    }

    const finalReport = JSON.parse(aiResponse.text.trim());
    return NextResponse.json(finalReport);

  } catch (error: any) {
    console.error("AI Generation Global Error:", error instanceof Error ? error.message : 'Unknown error');
    const is429 = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    return NextResponse.json(
      { error: error.message || 'Server error occurred during AI generation.' },
      { status: is429 ? 429 : 500 }
    );
  }
}
