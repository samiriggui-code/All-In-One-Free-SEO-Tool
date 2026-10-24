-- How deep the rule engine read the site (quick / full) for each audit.
ALTER TABLE `audits` ADD COLUMN `mode` text;
