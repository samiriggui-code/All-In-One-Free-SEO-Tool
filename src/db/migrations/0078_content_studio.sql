-- Content studio (ported from BlogPilot): articles, saved keyword research,
-- and the per-client brand voice the writer follows.
ALTER TABLE `clients` ADD COLUMN `content_style_profile` text;
--> statement-breakpoint
CREATE TABLE `content_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`status` text DEFAULT 'idea' NOT NULL,
	`title` text,
	`primary_keyword` text,
	`intent` text,
	`outline` text,
	`draft_markdown` text,
	`meta_title` text,
	`meta_description` text,
	`schema_jsonld` text,
	`social` text,
	`newsletter` text,
	`content_score` integer,
	`publish_date` integer,
	`published_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `content_posts_client_idx` ON `content_posts` (`client_id`);
--> statement-breakpoint
CREATE TABLE `content_keyword_research` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`seed` text NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`suggested` text NOT NULL,
	`serp` text,
	`paa` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `content_keyword_research_client_idx` ON `content_keyword_research` (`client_id`);
