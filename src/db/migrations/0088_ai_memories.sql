-- IA-4: what the assistant remembers, for one person, the whole team or one client.
CREATE TABLE IF NOT EXISTS `ai_memories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scope` text NOT NULL,
	`user_id` integer,
	`client_id` integer REFERENCES `clients`(`id`) ON DELETE cascade,
	`text` text NOT NULL,
	`category` text DEFAULT 'fact' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`edited` integer DEFAULT 0 NOT NULL,
	`created_by` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ai_memories_scope_idx` ON `ai_memories` (`scope`, `user_id`, `client_id`, `status`);
