-- IA-2: per-client knowledge base. Documents, their passages, and an FTS5
-- index over the passages kept in step by triggers.
CREATE TABLE IF NOT EXISTS `kb_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL REFERENCES `clients`(`id`) ON DELETE cascade,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`content_hash` text NOT NULL,
	`chars` integer DEFAULT 0 NOT NULL,
	`chunk_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`error` text,
	`manual` integer DEFAULT 0 NOT NULL,
	`created_by` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `kb_documents_source_idx` ON `kb_documents` (`client_id`,`source_type`,`source_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kb_chunks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_id` integer NOT NULL REFERENCES `kb_documents`(`id`) ON DELETE cascade,
	`client_id` integer NOT NULL,
	`ordinal` integer NOT NULL,
	`heading` text,
	`text` text NOT NULL,
	`text_hash` text NOT NULL,
	`embedding` blob,
	`embedding_model` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `kb_chunks_document_idx` ON `kb_chunks` (`document_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `kb_chunks_client_idx` ON `kb_chunks` (`client_id`);
--> statement-breakpoint
-- Accents folded so "referencement" finds "référencement".
CREATE VIRTUAL TABLE IF NOT EXISTS `kb_chunks_fts` USING fts5(
	`heading`, `text`,
	content='kb_chunks', content_rowid='id',
	tokenize='unicode61 remove_diacritics 2'
);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `kb_chunks_ai` AFTER INSERT ON `kb_chunks` BEGIN
	INSERT INTO kb_chunks_fts(rowid, heading, text) VALUES (new.id, new.heading, new.text);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `kb_chunks_ad` AFTER DELETE ON `kb_chunks` BEGIN
	INSERT INTO kb_chunks_fts(kb_chunks_fts, rowid, heading, text) VALUES ('delete', old.id, old.heading, old.text);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `kb_chunks_au` AFTER UPDATE OF `heading`, `text` ON `kb_chunks` BEGIN
	INSERT INTO kb_chunks_fts(kb_chunks_fts, rowid, heading, text) VALUES ('delete', old.id, old.heading, old.text);
	INSERT INTO kb_chunks_fts(rowid, heading, text) VALUES (new.id, new.heading, new.text);
END;
