export type ToolInputMode = 'url' | 'keyword' | 'text';

export type ToolCheckStatus = 'good' | 'warning' | 'bad' | 'info';

export type ToolCheckItem = {
  label: string;
  value: string;
  status: ToolCheckStatus;
  detail?: string;
};

export type ToolCheckResult = {
  tool: string;
  target: string;
  mode: 'single-url' | 'single-file' | 'keyword-local' | 'text-local' | 'provider-required';
  checkedAt: string;
  costProfile: 'lightweight';
  score: number | null;
  summary: string;
  items: ToolCheckItem[];
  preview?: string;
  nextStep?: string;
};
