-- An article the agency opened for the client to read before it goes
-- live: /portal/<token>/articles/<id>. Null means not shared, so nothing
-- written before this migration becomes visible in a portal.
ALTER TABLE `content_posts` ADD `review_shared_at` integer;
