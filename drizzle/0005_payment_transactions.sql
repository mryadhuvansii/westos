-- Payment transactions table for PhonePe integration
CREATE TABLE `payment_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`phonepe_transaction_id` text,
	`amount` integer NOT NULL,
	`currency` text NOT NULL DEFAULT 'INR',
	`status` text NOT NULL DEFAULT 'PENDING',
	`phonepe_response` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_payment_transactions_order` ON `payment_transactions` (`order_id`);
--> statement-breakpoint
CREATE INDEX `idx_payment_transactions_status` ON `payment_transactions` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_payment_transactions_phonepe_id` ON `payment_transactions` (`phonepe_transaction_id`);