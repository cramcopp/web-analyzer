import { GoogleGenAI, Type } from '@google/genai';

export async function generateReportClientSide(scrapeData: any) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is missing in the environment.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Du bist ein hochkarätiger, extrem kritischer Senior Technical SEO-Auditor, Security-Experte und Web-Performance-Guru.
      Du analysierst den Code und Content bis ins kleinste Detail und gibst gnadenloses, aber sehr konstruktives Feedback auf höchstem Industrie-Standard.
      Dein Ziel ist es, die analysierte Seite nicht nur "ein bisschen besser" zu machen, sondern sie auf ein "100/100 Best of the Best" Level zu heben.
      
      Erstelle einen ausführlichen Bericht (in Deutsch).
      Bewerte streng nach den Kategorien (Score 0-100, sei extrem kritisch!) UND fülle die Module aus.
      
      Spezifische Anforderung: Business Intelligence & Nische (Der Gehirn-Scan)
      - Bevor auch nur ein Fehler gesucht wird, lege als Erstes die Business Identity (businessNiche) fest. Um was handelt es sich? Ein lokales Restaurant? B2B-Software? Nischen-Blog?
      - Führe eine Keyword-Gap-Analyse durch: Welche harten, absichtsbasierten High-Intent Keywords fehlen im Text, sind aber für DIESE erkannte Nische extrem relevant? (Beispiel: Seite sagt "Willkommen", du erkennst "Dönerladen in Husum" -> generiere "Bester Döner Husum", "Imbiss Husum Öffnungszeiten", "Döner Lieferservice").
      - Zielgruppen-Check & Tonalität (toneAndReadabilityAlignment): Passt die Tonalität und der Flesch-Reading-Score zur Nische? Bewerte den Flesch-Wert aktiv im Kontext der Nische (B2B SaaS darf komplexer sein als ein Friseur-Salon).

      WICHTIGE REGEL ZU TASKS UND PRIORISIERUNG (DAS "ROADMAP" KONZEPT):
      - Die reine Anzeige von Problemen überfordert Nutzer. Deshalb teilen wir alle \`prioritizedTasks\` strikt in diese drei Stufen ein:
      - "CRITICAL" (🚨 Sofort tun): App ist rechtlich abmahngefährdet, völlig unsichtbar in Google (Noindex) oder schwer unsicher.
      - "IMPORTANT" (⚠️ Sichtbarkeit & Speed): Harte SEO- und Performance-Bugs, die das Layout verwehen oder Conversions kosten.
      - "PERFECTION" (✨ Der Weg zur 100/100): Mikro-Optimierungen für die absoluten Profis (DOM drastisch reduzieren, Fonts Preloaden, Strict HTTP Headers wie CSP einführen, Edge Caching, NextGen AVIF).
      
      Jeder "prioritizedTask", den du ausgibst, MUSS zwingend als "priority" exakt einen dieser drei starken Begriffe ("CRITICAL", "IMPORTANT", oder "PERFECTION") besitzen!

      Spezifische Anforderungen für das SEO-Modul:
      - Analysiere lokales SEO (NAP-Enforcement): Prüfe anhand der Nische, ob es ein lokales Business ist. Wenn JA und NAP-Signale (Telefon-Links, Maps-Links) fehlen -> Absolute Rote Karte (Vergib die Priorität CRITICAL Task!).
      - Strukturelle Tiefe & HTML5: Bewerte die Semantik-Daten. Fehlen spezifische Tags wie <article>, <nav>, <aside>? Ist die Überschriftenstruktur logisch oder eine sinnlose "Div-Suppe"?
      - Kritischer Call-to-Action (CTA) Check: Sind die gefundenen CTAs (Kaufen, Kontakt, etc.) klar und verkaufsfördernd, oder unklar/fehlend? Bewerte dies aus Conversion-Sensicht.
      - Bewerte Meta-Tags, interne/externe Links sowie Core Web Vitals massiv kritisch. Führe eine technische SEO-Prüfung durch.
      
      Spezifische Anforderungen für das Security-Modul ("Zero Trust" Setup):
      - Data Leakage Check: Analysiere gefundene Plaintext-E-Mails. Wenn welche gefunden wurden, rate MANTRA-ARTIG zur Verschleierung via JavaScript (Schutz vor Spam-Bots). Teile hier keine Gnade aus.
      - Mixed Content & Header-Strenge: Eine reine SSL-Verbindung ist ein Witz. Prüfe explizit das "Security Headers" Objekt: Fehlt HSTS, Content Security Policy (CSP), oder X-Content-Type-Options? Wenn ja -> fetter Punktabzug und roter Alarm!
      - Tech-Stack-Analyse (Information Disclosure): Lies Generator und Server-Response-Header (X-Powered-By, Server) aus. Steht dort "PHP/8.0" oder "WordPress 6.1" drin, schreibe auf, wie gefährlich es ist, Versionen im Klartext zu posaunen. Rate zur Maskierung.
      - Bewerte Angriffsflächen für SQLi und XSS in Bezug auf gefundene Formulare.

      Spezifische Anforderungen für das Performance-Modul:
      - DOM Complexity: Bewerte zwingend die DOM-Tiefe (Semantic DOM Depth Max Level). Ist der Wert über 15? Erkläre gnadenlos, wie das Rendering und RAM auf Mobile-Geräten darunter leidet.
      - Die "Perfectionist" Tasks: Gib als Actionables / Tasks extrem pingelige Empfehlungen (Nutze Priorität: PERFECTION), wenn Signale fehlen: Zeige Lücken beim Preloading von Critical Fonts, rate zu dns-prefetching / preconnect für externe Ressourcen, fordere Inlining von Critical CSS, und weise auf WebP/AVIF hin (hasNextGenImages).
      - Analysiere Ladegeschwindigkeit, blockierendes JS/CSS und exakte Core Web Vitals aus den PageSpeed-Daten.
      - Führe eine TIEFE Caching-Analyse durch (Cache-Control, Expires, CDN Nutzung).

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
      
      Local & Converter Signals:
      - Maps Links (Google Maps): ${scrapeData.napSignals?.googleMapsLinks}
      - Phone Links (tel:): ${scrapeData.napSignals?.phoneLinks}
      - CTA Button Texts (Sample): ${JSON.stringify(scrapeData.ctaTexts || [])}
      
      Security & Data Leakage (Zero Trust):
      - Hardcoded Emails Found: ${scrapeData.dataLeakage?.emailsFoundCount}
      - Found Email Examples (Risk): ${JSON.stringify(scrapeData.dataLeakage?.sampleEmails)}
      - Mailto Links: ${scrapeData.dataLeakage?.mailtoLinksCount}
      - Strict Security Headers:
        - HSTS: ${scrapeData.securityHeaders?.hsts}
        - CSP: ${scrapeData.securityHeaders?.csp}
        - X-Content-Type-Options: ${scrapeData.securityHeaders?.xContentTypeOptions}
        - X-Frame-Options: ${scrapeData.securityHeaders?.xFrameOptions}
      - Tech Stack Identity (Information Disclosure):
        - X-Powered-By: ${scrapeData.securityHeaders?.xPoweredBy}
        - Server: ${scrapeData.securityHeaders?.server}
        - Generator Meta Tag: ${scrapeData.generator}
      - Google Safe Browsing Status:
      ${scrapeData.safeBrowsingStr || 'Nicht geprüft'}

      Social & Schema Context:
      - OpenGraph Title: ${scrapeData.social?.ogTitle || 'None'}
      - OpenGraph Description: ${scrapeData.social?.ogDescription || 'None'}
      - OpenGraph Image: ${scrapeData.social?.ogImage || 'None'}
      - OpenGraph Type: ${scrapeData.social?.ogType || 'None'}
      - Existing JSON-LD Schema Blocks: ${scrapeData.existingSchemaCount}
      
      Perfectionist Performance Signals:
      - Preloaded Fonts: ${scrapeData.preloads?.fonts}
      - DNS-Prefetch Tags: ${scrapeData.preloads?.dnsPrefetch}
      - Preconnect Tags: ${scrapeData.preloads?.preconnect}
      - NextGen Images (WebP/AVIF) detected: ${scrapeData.hasNextGenImages ? 'YES' : 'NO'}
      
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

      Crawl Summary (Site-Wide Audit):
      - Total internal links found: ${scrapeData.crawlSummary?.totalInternalLinks}
      - Subpages scanned: ${scrapeData.crawlSummary?.scannedSubpagesCount}
      - Subpage Details: ${JSON.stringify(scrapeData.crawlSummary?.scannedSubpages)}
      
      Instructions for Site-Wide Audit:
      1. Analyze the Subpage Details for inconsistencies. Are there pages missing H1s? Are meta descriptions duplicated or missing?
      2. Identify patterns. Is the title structure consistent?
      3. Include these findings in the 'seo' and 'overallAssessment' sections.

      Excerpt of Body Text (max 15000 chars):
      ${scrapeData.bodyText}
      `;

  const aiResponse = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
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
              businessNiche: { type: Type.STRING, description: "Die exakt erkannte Business Identity der Webseite (z.B. 'Lokales Restaurant', 'B2B-Software-Unternehmen', 'Nischen-Blog')." },
              targetAudience: { type: Type.STRING, description: "Die wahrscheinliche Kern-Zielgruppe der Webseite." },
              keywordGapAnalysis: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Die KI vergleicht die gefundenen Keywords der Seite mit dem erkannten Business. Liste von Missing High-Intent Keywords (z.B. 'Bester Döner Husum', 'Imbiss Husum Öffnungszeiten', 'Döner Lieferservice')." },
              toneAndReadabilityAlignment: { type: Type.STRING, description: "Zielgruppen-Check: Passt die Tonalität des Textes zur Nische? Bewerte den Flesch-Reading-Score im Kontext der Geschäftsidentität." }
            },
            required: ["businessNiche", "targetAudience", "keywordGapAnalysis", "toneAndReadabilityAlignment"]
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
                  localSeoNap: { type: Type.STRING, description: "Bewertung von Local SEO und NAP (Name, Address, Phone) Präsenz. Lokale Nische ohne NAP/Maps -> Richtig hart kritisieren." },
                  semanticStructure: { type: Type.STRING, description: "Bewertung der HTML5 'Div-Suppe' vs semantischer Tiefe (<article>, <aside>, etc.)." },
                  ctaAnalysis: { type: Type.STRING, description: "Kritischer Blick auf die Button-Texte und CTAs hinsichtlich Conversion-Wahrscheinlichkeit." },
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
                  domComplexity: { type: Type.STRING, description: "Extreme tiefgehende Betrachtung der DOM-Tiefe und ihrer Auswirkung aufs Rendering." },
                  perfectionistTweaks: { type: Type.STRING, description: "Deep-Dive in Sachen Fonts Preload, DNS-Prefetch, AVIF/WebP und Critical CSS Inline." },
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
                required: ["coreVitalsAssessment", "resourceOptimization", "serverAndCache", "domComplexity", "perfectionistTweaks", "lighthouseMetrics", "coreWebVitals", "cachingAnalysis", "chartData", "prioritizedTasks"]
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

  return JSON.parse(aiResponse.text.trim());
}
