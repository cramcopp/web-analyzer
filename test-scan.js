async function runTest() {
  console.log('Starting Dogfooding Test...');
  console.log('Keys:', process.env.GEMINI_API_KEY, process.env.NEXT_PUBLIC_GEMINI_API_KEY);
  try {
    console.log('1. Hitting /api/analyze...');
    const analyzeRes = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://vercel.com' })
    });
    
    if (!analyzeRes.ok) {
        console.log('Analyze HTTP Error:', analyzeRes.status);
    }
    
    const scrapeData = await analyzeRes.json();
    if (scrapeData.error) {
      console.error('Analyze Error:', scrapeData.error);
      return;
    }
    console.log('Scrape successful! Data length:', JSON.stringify(scrapeData).length);
    console.log('DOM Depth:', scrapeData.maxDomDepth);
    console.log('Emails found:', scrapeData.dataLeakage?.emailsFoundCount);

    console.log('\n2. Hitting /api/generate-report...');
    const reportRes = await fetch('http://localhost:3000/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scrapeData)
    });
    
    if (!reportRes.ok) {
        console.log('Report HTTP Error:', reportRes.status);
        const errText = await reportRes.text();
        console.log('Details:', errText);
    }
    
    const reportData = await reportRes.json();
    if (reportData.error) {
      console.error('Report Error:', reportData.error);
      return;
    }
    console.log('Report generated successfully!');
    console.log('Business Niche:', reportData.businessIntelligence?.businessNiche);
    console.log('Target Audience:', reportData.businessIntelligence?.targetAudience);
    console.log('SEO Score:', reportData.seo?.score);
    console.log('Prioritized Task Example:', reportData.seo?.detailedSeo?.prioritizedTasks[0]);
    console.log('Missing Keywords:', reportData.businessIntelligence?.keywordGapAnalysis);
    console.log('Data leakage assessment:', reportData.security?.detailedSecurity?.dataLeakageAssessment);
    
  } catch (err) {
    console.error('Test failed:', err);
  }
}
runTest();
