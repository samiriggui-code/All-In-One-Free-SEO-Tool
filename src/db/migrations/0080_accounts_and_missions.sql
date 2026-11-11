-- Client -> Project -> Mission.
--
-- A row of `clients` has always been one site: its URL, its Search Console
-- property, its WordPress bridge. That is a project. What was missing is
-- the company above it (one client, several sites) and what was sold on
-- each site (an audit, monthly SEO, the whole circuit, a redesign).
--
-- So nothing is re-pointed: the 55 tables keyed on client_id keep meaning
-- "this site". `client_accounts` is the company a project belongs to, and
-- `missions` is the work agreed on a project.
CREATE TABLE `client_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`contact_name` text,
	`email` text,
	`phone` text,
	`address` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `clients` ADD COLUMN `account_id` integer REFERENCES `client_accounts`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX `clients_account_id_idx` ON `clients` (`account_id`);
--> statement-breakpoint
-- One account per existing project, carrying its contact details. The
-- temporary `notes` marker pairs each new account with its project, then
-- is cleared.
INSERT INTO `client_accounts` (`name`, `email`, `phone`, `address`, `notes`)
SELECT `name`, `email`, `phone`, `address`, '__backfill:' || `id` FROM `clients` WHERE `account_id` IS NULL;
--> statement-breakpoint
UPDATE `clients` SET `account_id` = (
	SELECT `id` FROM `client_accounts` WHERE `notes` = '__backfill:' || `clients`.`id`
) WHERE `account_id` IS NULL;
--> statement-breakpoint
UPDATE `client_accounts` SET `notes` = NULL WHERE `notes` LIKE '__backfill:%';
--> statement-breakpoint
CREATE TABLE `missions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL REFERENCES `clients`(`id`) ON DELETE CASCADE,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`offers_json` text,
	`target_stack` text,
	`notes` text,
	`proposal_id` integer REFERENCES `proposals`(`id`) ON DELETE SET NULL,
	`started_at` integer,
	`ended_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `missions_client_id_idx` ON `missions` (`client_id`);
