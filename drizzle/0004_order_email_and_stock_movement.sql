-- Add customer_email to orders for admin display
ALTER TABLE `orders` ADD COLUMN `customer_email` text;

-- Stock movement log for inflow/outflow tracking
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`reason` text NOT NULL,
	`reference` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `stock_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stock_movements_variant_idx` ON `stock_movements` (`variant_id`);
--> statement-breakpoint
CREATE INDEX `stock_movements_type_idx` ON `stock_movements` (`type`);
--> statement-breakpoint
CREATE INDEX `stock_movements_created_idx` ON `stock_movements` (`created_at`);
