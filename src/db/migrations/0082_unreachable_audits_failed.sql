-- An audit that could not read a single page was stored as completed with
-- a score of 0. It is a failed audit: it must not count as the project's
-- score, nor mark the project as audited.
UPDATE audits SET status = 'failed' WHERE status = 'completed' AND pages_crawled = 0 AND score = 0;
