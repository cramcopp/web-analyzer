export type DataSourceType =
  | 'real'
  | 'gsc'
  | 'provider'
  | 'heuristic'
  | 'ai_inferred'
  | 'demo'
  | 'unavailable';

export interface DataSourceMeta {
  type: DataSourceType;
  label?: string;
  provider?: string;
  fetchedAt?: string;
  confidence?: number;
}

export type DataSourceMap = Record<string, DataSourceMeta>;
