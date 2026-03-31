CREATE TABLE `bookmark_ai_artifacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bookmark_id` integer NOT NULL,
	`kind` text NOT NULL,
	`value_json` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`version` text DEFAULT 'v1',
	`confidence` real,
	`skipped` integer DEFAULT 0 NOT NULL,
	`reason` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`bookmark_id`) REFERENCES `bookmarks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ai_artifacts_bookmark` ON `bookmark_ai_artifacts` (`bookmark_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_artifacts_kind` ON `bookmark_ai_artifacts` (`kind`);--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`url_hash` text NOT NULL,
	`title` text,
	`description` text,
	`content` text,
	`og_image` text,
	`favicon` text,
	`domain` text,
	`source_type` text DEFAULT 'generic' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`category_id` integer,
	`ai_status` text DEFAULT 'pending',
	`canonical_text` text,
	`summary` text,
	`quality_score` real,
	`embedding_version` text,
	`classification_version` text,
	`embed_model` text,
	`classify_model` text,
	`summary_model` text,
	`artifact_policy_version` text,
	`processed_at` text,
	`failure_reason` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookmarks_url_hash_unique` ON `bookmarks` (`url_hash`);--> statement-breakpoint
CREATE INDEX `idx_bookmarks_status` ON `bookmarks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_bookmarks_category` ON `bookmarks` (`category_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#dbeafe' NOT NULL,
	`icon` text DEFAULT '🗂' NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`bookmark_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payload` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error` text,
	`next_run_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`locked_at` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`bookmark_id`) REFERENCES `bookmarks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bookmark_id` integer NOT NULL,
	`name` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`confidence` real DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`bookmark_id`) REFERENCES `bookmarks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tags_bookmark` ON `tags` (`bookmark_id`);