CREATE TABLE `project_member_role` (
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`project_id`, `user_id`, `role`),
	FOREIGN KEY (`project_id`,`user_id`) REFERENCES `project_member`(`project_id`,`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `project_member_role` (`project_id`, `user_id`, `role`, `created_at`)
SELECT pm.`project_id`, pm.`user_id`, u.`role`, pm.`created_at`
FROM `project_member` pm
JOIN `user` u ON u.`id` = pm.`user_id`;
--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `role`;