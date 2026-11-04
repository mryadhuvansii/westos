CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`name` text NOT NULL,
	`password_hash` text,
	`email_verified` integer NOT NULL DEFAULT 0,
	`phone_verified` integer NOT NULL DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);
--> statement-breakpoint
CREATE INDEX `customers_email_idx` ON `customers` (`email`);
--> statement-breakpoint
CREATE TABLE `customer_addresses` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`label` text NOT NULL DEFAULT 'Home',
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`street` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`pincode` text NOT NULL,
	`is_default` integer NOT NULL DEFAULT 0,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `customer_addresses_customer_idx` ON `customer_addresses` (`customer_id`);
--> statement-breakpoint
CREATE TABLE `customer_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_sessions_token_hash_unique` ON `customer_sessions` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `customer_sessions_customer_idx` ON `customer_sessions` (`customer_id`);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`customer_id` text NOT NULL,
	`status` text NOT NULL DEFAULT 'pending',
	`subtotal` integer NOT NULL,
	`tax` integer NOT NULL DEFAULT 0,
	`shipping` integer NOT NULL DEFAULT 0,
	`total` integer NOT NULL,
	`currency` text NOT NULL DEFAULT 'INR',
	`payment_status` text NOT NULL DEFAULT 'unpaid',
	`payment_provider` text,
	`payment_reference` text,
	`shipping_address_id` text,
	`billing_address_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);
--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`);
--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);
--> statement-breakpoint
CREATE INDEX `orders_order_number_idx` ON `orders` (`order_number`);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`sku` text NOT NULL,
	`product_name` text NOT NULL,
	`color_name` text NOT NULL,
	`size` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`total_price` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `stock_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);
--> statement-breakpoint
CREATE INDEX `order_items_variant_idx` ON `order_items` (`variant_id`);
--> statement-breakpoint
CREATE TABLE `returns` (
	`id` text PRIMARY KEY NOT NULL,
	`return_number` text NOT NULL,
	`order_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`status` text NOT NULL DEFAULT 'requested',
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `returns_return_number_unique` ON `returns` (`return_number`);
--> statement-breakpoint
CREATE INDEX `returns_customer_idx` ON `returns` (`customer_id`);
--> statement-breakpoint
CREATE INDEX `returns_order_idx` ON `returns` (`order_id`);
--> statement-breakpoint
CREATE INDEX `returns_status_idx` ON `returns` (`status`);
--> statement-breakpoint
CREATE TABLE `return_items` (
	`id` text PRIMARY KEY NOT NULL,
	`return_id` text NOT NULL,
	`order_item_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`status` text NOT NULL DEFAULT 'pending',
	FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `return_items_return_idx` ON `return_items` (`return_id`);
--> statement-breakpoint
CREATE INDEX `return_items_order_item_idx` ON `return_items` (`order_item_id`);
