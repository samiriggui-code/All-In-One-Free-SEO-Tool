-- IA-3: actions the assistant proposes and a person confirms before they run.
CREATE TABLE IF NOT EXISTS `ai_approvals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tool` text NOT NULL,
	`args` text NOT NULL,
	`summary` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`result` text,
	`client_id` integer,
	`user_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`decided_at` integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ai_approvals_status_idx` ON `ai_approvals` (`status`, `created_at`);
