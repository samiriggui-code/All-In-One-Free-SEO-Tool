-- IA-1: where each AI call came from, and the local guardrail incidents.
ALTER TABLE `ai_calls` ADD `channel` text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `guardrail_incidents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`direction` text NOT NULL,
	`action` text NOT NULL,
	`kinds` text NOT NULL,
	`feature` text,
	`channel` text,
	`client_id` integer,
	`user_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `guardrail_incidents_created_idx` ON `guardrail_incidents` (`created_at`);
