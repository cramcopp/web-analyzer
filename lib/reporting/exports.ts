function escapeCsvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function issueRows(report: any) {
  return (report?.issues || []).map((issue: any) => ({
    id: issue.id,
    status: issue.status || 'open',
    severity: issue.severity,
    category: issue.category,
    title: issue.title,
    affectedUrls: (issue.affectedUrls || []).join(' | '),
    hiddenAffectedUrls: issue.affectedUrlsHidden || 0,
    confidence: issue.confidence,
  }));
}

export function publicReportCsv(report: any) {
  const header = ['id', 'status', 'severity', 'category', 'title', 'affectedUrls', 'hiddenAffectedUrls', 'confidence'];
  const rows = [header, ...issueRows(report).map((row: any) => header.map((key) => row[key]))];
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

export function publicReportJson(report: any) {
  return JSON.stringify(report, null, 2);
}

function cleanPdfText(value: unknown) {
  const ascii = Array.from(String(value ?? ''))
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126);
    })
    .join('');

  return ascii
    .replace(/[\\()]/g, (match) => `\\${match}`)
    .slice(0, 110);
}

function pdfLines(report: any) {
  const scores = ['seo', 'performance', 'security', 'accessibility', 'compliance']
    .map((key) => `${key}: ${report?.[key]?.score ?? 'n/a'}`);
  const issues = (report?.issues || []).slice(0, 18).map((issue: any) => `${issue.severity || 'info'} - ${issue.title || issue.issueType}`);
  return [
    report?.builder?.title || 'Website Audit Report',
    `URL: ${report?.url || 'n/a'}`,
    `Created: ${report?.createdAt || 'n/a'}`,
    `Scan plan: ${report?.scanPlan || report?.plan || 'n/a'}`,
    `Crawled pages: ${report?.visibilityLimits?.crawledPages ?? report?.crawlSummary?.crawledPagesCount ?? 'n/a'}`,
    `Visible detail pages: ${report?.visibilityLimits?.visibleDetailPages ?? 'n/a'}`,
    `Hidden detail pages: ${report?.visibilityLimits?.hiddenDetailPages ?? 0}`,
    '',
    'Scores',
    ...scores,
    '',
    'Issues',
    ...(issues.length > 0 ? issues : ['Keine Issues im Report.']),
  ].map(cleanPdfText);
}

export function publicReportPdf(report: any) {
  const lines = pdfLines(report);
  const content = [
    'BT',
    '/F1 16 Tf',
    '50 790 Td',
    ...lines.flatMap((line, index) => [
      index === 0 ? `(${line}) Tj` : `0 -18 Td (${line}) Tj`,
    ]),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
