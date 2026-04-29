export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface Project {
  id: string;
  name: string;
  url: string;
  lastScore?: number;
  lastScanAt?: string;
  createdAt: string;
}

export interface HistoryItem {
  id: string;
  url: string;
  score: number;
  date: string;
  rawDate: Date;
  status?: 'scanning' | 'completed' | 'failed';
  progress?: number;
}
