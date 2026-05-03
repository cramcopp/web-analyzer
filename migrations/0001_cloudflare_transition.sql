PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  photo_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  plan TEXT NOT NULL DEFAULT 'free',
  scan_count INTEGER NOT NULL DEFAULT 0,
  max_scans INTEGER NOT NULL DEFAULT 5,
  last_scan_reset TEXT,
  stripe_customer_id TEXT,
  gsc_tokens_json TEXT,
  profile_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  team_id TEXT,
  name TEXT NOT NULL,
  url TEXT,
  plan TEXT DEFAULT 'free',
  crawl_limit INTEGER,
  last_score INTEGER,
  last_scan_at TEXT,
  members_json TEXT,
  settings_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  project_id TEXT,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scanning',
  progress INTEGER NOT NULL DEFAULT 0,
  plan TEXT DEFAULT 'free',
  score INTEGER,
  summary_json TEXT,
  results_json TEXT,
  raw_artifact_key TEXT,
  result_artifact_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  completed_at TEXT,
  error TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL,
  user_id TEXT,
  project_id TEXT,
  issue_type TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  confidence REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  fix_hint TEXT NOT NULL,
  business_impact TEXT,
  source_type TEXT NOT NULL,
  affected_urls_json TEXT NOT NULL,
  evidence_refs_json TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS evidence_artifacts (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL,
  user_id TEXT,
  project_id TEXT,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_uri TEXT,
  checksum TEXT,
  inline_preview TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS url_snapshots (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL,
  user_id TEXT,
  project_id TEXT,
  url TEXT NOT NULL,
  status_code TEXT,
  content_type TEXT,
  title TEXT,
  meta_description TEXT,
  canonical TEXT,
  robots_meta TEXT,
  x_robots_tag TEXT,
  headers_json TEXT,
  internal_links_json TEXT,
  external_links_json TEXT,
  images_json TEXT,
  headings_json TEXT,
  text_basis TEXT,
  captured_at TEXT NOT NULL,
  FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS scheduled_scans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  url TEXT NOT NULL,
  frequency TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  enabled INTEGER NOT NULL DEFAULT 1,
  next_run_at TEXT,
  last_run_at TEXT,
  data_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  threshold REAL,
  data_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alert_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  issue_id TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  data_json TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS uptime_checks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  status_code INTEGER,
  response_time_ms INTEGER,
  data_json TEXT,
  checked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_diffs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  previous_scan_id TEXT,
  current_scan_id TEXT NOT NULL,
  new_issues_json TEXT NOT NULL,
  open_issues_json TEXT NOT NULL,
  fixed_issues_json TEXT NOT NULL,
  ignored_issues_json TEXT NOT NULL,
  reopened_issues_json TEXT NOT NULL,
  score_delta_json TEXT NOT NULL,
  data_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_shares (
  token TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  project_id TEXT,
  user_id TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private',
  password_hash TEXT,
  branding_json TEXT,
  builder_json TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS issue_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  issue_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  assignee_id TEXT,
  assignee_name TEXT,
  severity TEXT,
  affected_urls_json TEXT,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS issue_comments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  issue_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_branding (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  team_id TEXT,
  project_id TEXT,
  scope TEXT NOT NULL DEFAULT 'project',
  display_name TEXT,
  primary_color TEXT,
  logo_url TEXT,
  footer_note TEXT,
  data_json TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  recipients_json TEXT NOT NULL,
  frequency TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  visibility TEXT NOT NULL DEFAULT 'private',
  builder_json TEXT,
  last_sent_at TEXT,
  mail_provider_connected INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS provider_facts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT,
  fact_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  confidence REAL NOT NULL,
  fact_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS keyword_facts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT,
  keyword TEXT NOT NULL,
  region TEXT NOT NULL,
  language TEXT NOT NULL,
  device TEXT NOT NULL,
  volume INTEGER,
  cpc REAL,
  competition REAL,
  difficulty REAL,
  intent TEXT,
  provider TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  confidence REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS rank_facts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT,
  keyword TEXT NOT NULL,
  domain TEXT NOT NULL,
  url TEXT,
  rank INTEGER,
  previous_rank INTEGER,
  serp_features_json TEXT NOT NULL,
  region TEXT NOT NULL,
  device TEXT NOT NULL,
  provider TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  confidence REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS backlink_facts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT,
  source_url TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  target_url TEXT NOT NULL,
  anchor TEXT,
  nofollow INTEGER NOT NULL DEFAULT 0,
  first_seen TEXT,
  last_seen TEXT,
  lost INTEGER NOT NULL DEFAULT 0,
  authority_metric REAL,
  provider TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  confidence REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS competitor_facts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT,
  competitor_domain TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS traffic_facts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT,
  domain TEXT NOT NULL,
  channel TEXT NOT NULL,
  visits_estimate INTEGER,
  region TEXT NOT NULL,
  provider TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  confidence REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_visibility_facts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT,
  prompt TEXT NOT NULL,
  brand_mentioned INTEGER NOT NULL DEFAULT 0,
  competitors_mentioned_json TEXT NOT NULL,
  source TEXT NOT NULL,
  provider TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  confidence REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_created ON scans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_project_created ON scans(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_url ON scans(url);
CREATE INDEX IF NOT EXISTS idx_issues_scan ON issues(scan_id);
CREATE INDEX IF NOT EXISTS idx_issues_project_status ON issues(project_id, status);
CREATE INDEX IF NOT EXISTS idx_evidence_scan ON evidence_artifacts(scan_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_scan ON url_snapshots(scan_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_scans_next_run ON scheduled_scans(enabled, next_run_at);
CREATE INDEX IF NOT EXISTS idx_alert_events_project_status ON alert_events(project_id, status);
CREATE INDEX IF NOT EXISTS idx_uptime_project_checked ON uptime_checks(project_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_diffs_project_created ON scan_diffs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_shares_report ON report_shares(report_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON issue_tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_provider_facts_project_type ON provider_facts(project_id, fact_type);
CREATE INDEX IF NOT EXISTS idx_keyword_facts_project_keyword ON keyword_facts(project_id, keyword);
CREATE INDEX IF NOT EXISTS idx_rank_facts_project_keyword ON rank_facts(project_id, keyword);
CREATE INDEX IF NOT EXISTS idx_backlink_facts_project ON backlink_facts(project_id);
CREATE INDEX IF NOT EXISTS idx_traffic_facts_project_domain ON traffic_facts(project_id, domain);
CREATE INDEX IF NOT EXISTS idx_ai_visibility_facts_project ON ai_visibility_facts(project_id);
