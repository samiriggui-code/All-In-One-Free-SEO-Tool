-- One task per problem, with the pages it affects as sub-items.
-- JSON array of { "url": string, "done": boolean } (src/lib/task-pages.ts).
-- Null for tasks that are not about pages (templates, plans, manual tasks).
ALTER TABLE `tasks` ADD `pages_json` text;
