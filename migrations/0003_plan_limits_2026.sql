ALTER TABLE users ADD COLUMN crawl_pages_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN max_crawl_pages INTEGER NOT NULL DEFAULT 1000;

UPDATE users
SET
  max_scans = CASE plan
    WHEN 'business' THEN 5000
    WHEN 'agency' THEN 1000
    WHEN 'pro' THEN 100
    ELSE 10
  END,
  max_crawl_pages = CASE plan
    WHEN 'business' THEN 5000000
    WHEN 'agency' THEN 1000000
    WHEN 'pro' THEN 100000
    ELSE 1000
  END;
