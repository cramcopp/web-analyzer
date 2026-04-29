export async function generateReportClientSide(scrapeData: any, plan: string = 'free', retries: number = 2) {
  // 1. Data Validation & Self-Healing
  if (!scrapeData) {
    throw new Error('Validierungsfehler: Keine Daten für die Analyse gefunden.');
  }

  // Self-healing: Ensure URL is present
  const targetUrl = scrapeData.urlObj || scrapeData.url;
  if (!targetUrl) {
    console.error('[GenerateReport] Missing URL in scrapeData:', scrapeData);
    throw new Error('Validierungsfehler: URL fehlt. Der Bericht konnte nicht eindeutig zugeordnet werden.');
  }
  
  // Back-populate both fields for consistency
  scrapeData.url = targetUrl;
  scrapeData.urlObj = targetUrl;

  // Check for content
  if (!scrapeData.bodyText || scrapeData.bodyText.trim() === '') {
    // If bodyText is missing (e.g. from an old saved report), we try to use metadata or results
    console.warn('[GenerateReport] bodyText is missing, using fallback structure');
    scrapeData.bodyText = `Analyse für ${targetUrl}. Titel: ${scrapeData.title || 'Unbekannt'}. Beschreibung: ${scrapeData.metaDescription || 'Keine'}`;
  }

  if (!scrapeData.psiMetricsStr) {
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
        body: JSON.stringify({ scrapeData, url: targetUrl, plan }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const is429 = response.status === 429;
        if (is429) {
          throw new Error('QUOTA_EXCEEDED:' + (errorData.error || 'KI-Limit überschritten. Bitte kurz warten.'));
        }
        throw new Error(errorData.error || `API-Fehler: ${response.status}`);
      }

      const report = await response.json();
      return report;
    } catch (error: any) {
      lastError = error;
      const is429 = error.message?.startsWith('QUOTA_EXCEEDED:');
      console.warn(`[GenerateReport] Versuch ${attempt + 1} fehlgeschlagen:`, error.message);

      if (attempt < retries) {
        const waitMs = is429 ? 8000 * (attempt + 1) : 2000 * (attempt + 1);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }
  }

  throw new Error(`Bericht-Erstellung fehlgeschlagen. Letzter Fehler: ${lastError?.message}`);
}
