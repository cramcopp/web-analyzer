import type { AlertType } from '@/types/monitoring';

export const DEFAULT_ALERT_TYPES: AlertType[] = [
  'website_down',
  'new_500_error',
  'new_noindex',
  'robots_blocked_important_url',
  'canonical_changed',
  'sitemap_missing',
  'security_header_missing',
  'score_drop',
  'gsc_clicks_drop',
  'gsc_impressions_drop',
  'core_web_vitals_regressed',
];

const providerBackedAlerts = new Set<AlertType>([
  'gsc_clicks_drop',
  'gsc_impressions_drop',
  'core_web_vitals_regressed',
]);

export function alertLabel(type: AlertType) {
  switch (type) {
    case 'website_down':
      return 'Website down';
    case 'new_500_error':
      return 'Neuer 500 Fehler';
    case 'new_noindex':
      return 'Neue noindex Direktive';
    case 'robots_blocked_important_url':
      return 'robots.txt blockiert wichtige URL';
    case 'canonical_changed':
      return 'Canonical geändert';
    case 'sitemap_missing':
      return 'Sitemap verschwunden';
    case 'security_header_missing':
      return 'Security Header verschwunden';
    case 'score_drop':
      return 'Score Drop';
    case 'gsc_clicks_drop':
      return 'GSC Klicks Drop';
    case 'gsc_impressions_drop':
      return 'GSC Impressions Drop';
    case 'core_web_vitals_regressed':
      return 'Core Web Vitals verschlechtert';
    default:
      return type;
  }
}

export function isProviderBackedAlert(type: AlertType) {
  return providerBackedAlerts.has(type);
}

export function providerAvailable(type: AlertType, report: any) {
  if (!isProviderBackedAlert(type)) return true;

  const hasGsc = Boolean(
    report?.gscData ||
    report?.dataSources?.gsc?.type === 'gsc' ||
    report?.dataSources?.gsc?.type === 'real'
  );
  const hasPsiOrCrux = Boolean(
    report?.psiMetrics ||
    report?.cruxMetrics ||
    report?.dataSources?.psi?.type === 'provider' ||
    report?.dataSources?.psi?.type === 'real' ||
    report?.dataSources?.crux?.type === 'provider' ||
    report?.dataSources?.crux?.type === 'real'
  );

  if (type === 'gsc_clicks_drop' || type === 'gsc_impressions_drop') return hasGsc;
  if (type === 'core_web_vitals_regressed') return hasPsiOrCrux;
  return true;
}

export function ruleThreshold(type: AlertType) {
  if (type === 'score_drop') return 10;
  if (type === 'gsc_clicks_drop' || type === 'gsc_impressions_drop') return 20;
  return undefined;
}
