export async function generateReportClientSide(scrapeData: any, plan: string = 'free', retries: number = 2) {
  // 1. Data Validation Before API Call
  if (!scrapeData) {
    throw new Error('Validierungsfehler: Keine scrapeData übergeben.');
  }
  if (!scrapeData.urlObj) {
    throw new Error('Validierungsfehler: URL (urlObj) fehlt.');
  }
  if (!scrapeData.bodyText || scrapeData.bodyText.trim() === '') {
    throw new Error('Validierungsfehler: bodyText ist leer. Eine Analyse ist nicht möglich.');
  }
  if (!scrapeData.psiMetricsStr) {
    // Falls PageSpeed fehlt, initialisieren wir es als Fallback text
    scrapeData.psiMetricsStr = 'Lighthouse / PageSpeed Metriken: Nicht verfügbar.';
  }

  // 2. Retry Mechanism with Exponential Backoff
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...scrapeData, plan }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API antwortete mit Status: ${response.status}`);
      }

      const report = await response.json();
      return report;
    } catch (error: any) {
      lastError = error;
      console.warn(`[GenerateReport] Versuch ${attempt + 1} fehlgeschlagen:`, error.message);
      
      if (attempt < retries) {
        // Warte vor dem Retry (z.B. 1500ms, 3000ms...)
        await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
      }
    }
  }

  throw new Error(`Report-Generierung fehlgeschlagen nach ${retries + 1} Versuchen. Letzter Fehler: ${lastError?.message}`);
}

