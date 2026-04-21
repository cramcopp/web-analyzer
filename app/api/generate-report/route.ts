import { NextResponse } from 'next/server';

export const runtime = 'edge';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: Request) {
  try {
    const scrapeData = await req.json();

    if (!scrapeData || !scrapeData.urlObj) {
      return NextResponse.json({ error: 'Missing scrape data' }, { status: 400 });
    }

    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    }
    
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
      - Analysiere Security Header (HSTS, CSP, X-Content-Type-Options, etc.). Bei Fehlen: massiver Abzug.
      - Fülle "dataLeakageAssessment" aus: Bewerte Plaintext E-Mail-Adressen (Scraping-Gefahr). Rate zur Verschleierung.
      - Bewerte Angriffsflächen für SQLi und XSS in Bezug auf gefundene Formulare und Software.

      Spezifische Anforderungen für das Performance-Modul:
      - Analysiere Ladegeschwindigkeit und Engpässe wie unoptimierte Bilder, blockierendes JS/CSS.
      - Führe eine TIEFE Caching-Analyse durch (Cache-Control, Expires, CDN Nutzung).
      - Exakte Übernahme der Core Web Vitals aus Google PageSpeed-Daten.

      Spezifische Anforderungen für Accessibility & Compliance:
      - Bewerte Kontraste, ARIA-Tags, fehlerhafte HTML-Semantik.
      - DSGVO/Compliance Check: Werden Drittanbieter (Google Analytics etc.) direkt geladen OHNE Consent Banner? Sind Tracker vorhanden? AGBs und Datenschutz Links im Footer?

      Spezifische Anforderungen für Realtime Industry News:
      - Nutze das eingebundene Google Search Tool, um aktuelle Nachrichten, Trends, Sicherheitslücken oder Google-Updates zu suchen, die exakt zur Branche passen.
      - Fasse 2-3 hochaktuelle Fakten in das Array "industryNews" zusammen.
      
      WICHTIGE REGEL ZU CODE-VORSCHLÄGEN:
      - Es dürfen absolut KEINE Code-Vorschläge, Code-Beispiele, HTML, CSS, JavaScript oder JSON Snippets in den Lösungsansätzen, Empfehlungen oder Actionables enthalten sein.
      - Gib rein strategische und inhaltliche Anweisungen in Fließtext.

      URL: ${scrapeData.urlObj}
      Title: ${scrapeData.title}
      Meta Description: ${scrapeData.metaDescription}
      Meta Keywords: ${scrapeData.metaKeywords}
      HTML Lang Attribute: ${scrapeData.htmlLang}
      Generator (Software): ${scrapeData.generator}
      Viewport: ${scrapeData.viewport}
      Viewport Zoom allowed: ${scrapeData.viewportScalable}
      Robots: ${scrapeData.robots}
      Forms found: ${scrapeData.formsCount} (${(scrapeData.formDetails || []).join(' | ')})
      H1 count: ${scrapeData.h1Count}, H2 count: ${scrapeData.h2Count}
      Images Total: ${scrapeData.imagesTotal}, Images missing ALT: ${scrapeData.imagesWithoutAlt}, Images Lazy-Loaded: ${scrapeData.lazyImages}
      ARIA Attributes Count: ${scrapeData.ariaCount}
      Empty Buttons/Links: ${scrapeData.emptyButtonsLinks}
      Internal Links: ${scrapeData.internalLinksCount}, External Links: ${scrapeData.externalLinksCount}
      
      Technical SEO signals:
      - Canonical URL detected: ${scrapeData.technicalSeo?.canonical || 'None'}
      - robots.txt found: ${scrapeData.technicalSeo?.robotsTxtFound ? 'YES' : 'NO'}
      - Sitemap mentioned in robots.txt: ${scrapeData.technicalSeo?.sitemapMentionedInRobots ? 'YES' : 'NO'}
      - Hreflang tags detected: ${JSON.stringify(scrapeData.technicalSeo?.hreflangs || [])}
      - Semantic DOM Depth: Max ${scrapeData.maxDomDepth} Levels (Über 15 ist kritisch)
      - Semantic HTML Tags Found: ${JSON.stringify(scrapeData.semanticTags)}
      
      Security & Data Leakage:
      - Hardcoded Emails Found: ${scrapeData.dataLeakage?.emailsFoundCount}
      - Found Email Examples (Risk): ${JSON.stringify(scrapeData.dataLeakage?.sampleEmails)}
      - Mailto Links: ${scrapeData.dataLeakage?.mailtoLinksCount}
      - Google Safe Browsing Status:
      ${scrapeData.safeBrowsingStr || 'Nicht geprüft'}

      Social & Schema Context:
      - OpenGraph Title: ${scrapeData.social?.ogTitle || 'None'}
      - OpenGraph Description: ${scrapeData.social?.ogDescription || 'None'}
      - OpenGraph Image: ${scrapeData.social?.ogImage || 'None'}
      - OpenGraph Type: ${scrapeData.social?.ogType || 'None'}
      - Existing JSON-LD Schema Blocks: ${scrapeData.existingSchemaCount}
      
      Scripts (Total / Blocking): ${scrapeData.totalScripts} / ${scrapeData.blockingScripts}
      Stylesheets: ${scrapeData.totalStylesheets}
      Server Response Time (TTFB approx): ${scrapeData.responseTimeMs}ms
      
      ${scrapeData.psiMetricsStr}

      HTTP Headers: ${JSON.stringify(scrapeData.headers)}
      First 80 Links found: ${scrapeData.linkSummary}
      
      Legal signals:
      - Impressum Link detected: ${scrapeData.legal?.impressesumLink ? 'YES' : 'NO'}
      - Privacy Policy Link detected: ${scrapeData.legal?.privacyLink ? 'YES' : 'NO'}
      - Terms of Service Link detected: ${scrapeData.legal?.tosLink ? 'YES' : 'NO'}
      - Cookie Banner logic detected: ${scrapeData.legal?.cookieBannerFound ? 'YES' : 'NO'}
      - Prominence: Privacy Link in footer? ${scrapeData.legal?.privacyInFooter ? 'YES' : 'NO'}
      - Tracking Scripts detected: ${JSON.stringify(scrapeData.legal?.trackingScripts)}
      - CMP (Consent Management Platform) detected: ${JSON.stringify(scrapeData.legal?.cmpDetected)}

      Content Signals:
      - Flesch Reading Ease Score: ${scrapeData.fleschScore}
      - Multiple H1 Headings: ${scrapeData.contentAudit?.duplicateH1s ? 'YES' : 'NO'}
      - Duplicate H2 Headings: ${scrapeData.contentAudit?.duplicateH2s ? 'YES' : 'NO'}
      - Identical H1 and H2 text: ${scrapeData.contentAudit?.identicalHeadings ? 'YES' : 'NO'}

      Excerpt of Body Text (max 15000 chars):
      ${scrapeData.bodyText}
      `;

    const aiResponse = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            businessIntelligence: {
              type: Type.OBJECT,
              properties: {
                businessNiche: { type: Type.STRING, description: "Die exakt erkannte Nische/Branche der Webseite (z.B. 'Döner-Imbiss', 'B2B Software', 'Immobilienmakler')." },
                targetAudience: { type: Type.STRING, description: "Die wahrscheinliche Kern-Zielgruppe der Webseite." },
                keywordGapAnalysis: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Liste von 3-5 harten High-Intent Keywords, die im Text fehlen, aber in dieser Nische kritisch sind (z.B. 'Döner Husum Öffnungszeiten')." }
              },
              required: ["businessNiche", "targetAudience", "keywordGapAnalysis"]
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
                  required: ["keywordAnalysis", "metaTagsAssessment", "linkStructure", "mobileFriendly", "localSeoNap", "contentQuality", "technicalSeo", "prioritizedTasks"]
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
                  required: ["coreVitalsAssessment", "resourceOptimization", "serverAndCache", "lighthouseMetrics", "coreWebVitals", "cachingAnalysis", "chartData", "prioritizedTasks"]
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
          required: ["businessIntelligence", "overallAssessment", "industryNews", "seo", "security", "performance", "accessibility", "compliance"]
        }
      }
    });

    if (!aiResponse.text) {
      throw new Error("No text returned from Gemini");
    }

    const finalReport = JSON.parse(aiResponse.text.trim());
    return NextResponse.json(finalReport);

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message || 'Server error occurred during AI generation.' }, { status: 500 });
  }
}
