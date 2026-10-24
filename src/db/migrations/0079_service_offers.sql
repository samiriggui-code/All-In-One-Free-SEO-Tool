-- Catalogue of the agency's services, picked into proposals to make quotes.
CREATE TABLE `service_offers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'one_off' NOT NULL,
	`billing` text DEFAULT 'flat' NOT NULL,
	`summary` text,
	`deliverables` text NOT NULL,
	`estimated_hours` integer DEFAULT 0 NOT NULL,
	`duration` integer DEFAULT 0 NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `proposals` ADD COLUMN `offers_json` text;
--> statement-breakpoint
ALTER TABLE `proposals` ADD COLUMN `quote_json` text;
--> statement-breakpoint
ALTER TABLE `invoices` ADD COLUMN `proposal_id` integer;
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_proposal_id_unique` ON `invoices` (`proposal_id`);
