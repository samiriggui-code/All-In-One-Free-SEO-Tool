-- IA-5: AI step in automations, scheduled trigger, and run history.
ALTER TABLE `automations` ADD `schedule` text;
--> statement-breakpoint
ALTER TABLE `automations` ADD `next_run_at` integer;
--> statement-breakpoint
ALTER TABLE `automations` ADD `failures` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `automation_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`automation_id` integer NOT NULL REFERENCES `automations`(`id`) ON DELETE cascade,
	`client_id` integer REFERENCES `clients`(`id`) ON DELETE cascade,
	`trigger` text NOT NULL,
	`status` text NOT NULL,
	`output` text,
	`steps` text,
	`error` text,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `automation_runs_automation_idx` ON `automation_runs` (`automation_id`, `started_at`);
