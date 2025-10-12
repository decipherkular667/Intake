CREATE TABLE `rate_limits` (
	`user_id` text PRIMARY KEY NOT NULL,
	`minute_count` integer DEFAULT 0 NOT NULL,
	`minute_reset_at` integer NOT NULL,
	`hour_count` integer DEFAULT 0 NOT NULL,
	`hour_reset_at` integer NOT NULL,
	`day_count` integer DEFAULT 0 NOT NULL,
	`day_reset_at` integer NOT NULL,
	`total_requests` integer DEFAULT 0 NOT NULL,
	`last_request_at` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_food_entries` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))) NOT NULL,
	`profile_id` text NOT NULL,
	`food_name` text NOT NULL,
	`serving_size` real NOT NULL,
	`serving_unit` text NOT NULL,
	`meal_type` text NOT NULL,
	`entry_date` text NOT NULL,
	`nutrition_data` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`profile_id`) REFERENCES `health_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_food_entries`("id", "profile_id", "food_name", "serving_size", "serving_unit", "meal_type", "entry_date", "nutrition_data", "created_at") SELECT "id", "profile_id", "food_name", "serving_size", "serving_unit", "meal_type", "entry_date", "nutrition_data", "created_at" FROM `food_entries`;--> statement-breakpoint
DROP TABLE `food_entries`;--> statement-breakpoint
ALTER TABLE `__new_food_entries` RENAME TO `food_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;