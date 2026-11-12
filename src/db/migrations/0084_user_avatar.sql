-- The photo a person picks in Settings → My profile: a small square image
-- (256 px, cropped in the browser) stored as a data URL. Null means no
-- photo, and the app shows their initial as before.
ALTER TABLE `users` ADD `avatar` text;
