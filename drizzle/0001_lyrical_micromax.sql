CREATE TABLE `stock_requests` (
	`request_id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`operation_token` text NOT NULL,
	`reservation_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_reservation_lines` (
	`reservation_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`returned` integer DEFAULT 0 NOT NULL,
	`sku` text NOT NULL,
	`product_name` text NOT NULL,
	`color_name` text NOT NULL,
	`size` integer NOT NULL,
	PRIMARY KEY(`reservation_id`, `variant_id`),
	FOREIGN KEY (`reservation_id`) REFERENCES `stock_reservations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `stock_variants`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stock_line_quantity" CHECK("stock_reservation_lines"."quantity" > 0 AND "stock_reservation_lines"."quantity" <= 1000000 AND "stock_reservation_lines"."returned" >= 0 AND "stock_reservation_lines"."returned" <= "stock_reservation_lines"."quantity")
);
--> statement-breakpoint
CREATE INDEX `stock_lines_variant_idx` ON `stock_reservation_lines` (`variant_id`);--> statement-breakpoint
CREATE TABLE `stock_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`status` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "stock_reservation_status" CHECK("stock_reservations"."status" IN ('held','committed','released'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_reservations_reference_unique` ON `stock_reservations` (`reference`);--> statement-breakpoint
CREATE INDEX `stock_reservations_expiry_idx` ON `stock_reservations` (`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `stock_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`color_id` text NOT NULL,
	`size` integer NOT NULL,
	`sku` text NOT NULL,
	`on_hand` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `store_products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stock_on_hand_nonnegative" CHECK("stock_variants"."on_hand" >= 0 AND "stock_variants"."on_hand" <= 1000000),
	CONSTRAINT "stock_variant_active" CHECK("stock_variants"."active" IN (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_variants_sku_unique` ON `stock_variants` (`sku`);--> statement-breakpoint
CREATE INDEX `stock_variants_product_idx` ON `stock_variants` (`product_id`);--> statement-breakpoint
ALTER TABLE `store_products` ADD `inventory_version` integer DEFAULT 0 NOT NULL;