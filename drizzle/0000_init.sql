CREATE TABLE "abandoned_carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email_lower" varchar(255) NOT NULL,
	"items" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"stage" integer DEFAULT 0 NOT NULL,
	"recovery_token" varchar(64) NOT NULL,
	"converted_at" timestamp,
	"last_email_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "abandoned_carts_recovery_token_unique" UNIQUE("recovery_token")
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(50),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"address_1" varchar(255) NOT NULL,
	"address_2" varchar(255),
	"city" varchar(100) NOT NULL,
	"state" varchar(50) NOT NULL,
	"zip" varchar(20) NOT NULL,
	"country" varchar(2) DEFAULT 'US' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_outreach" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"channel" varchar(20) NOT NULL,
	"recipient" varchar(50),
	"template_key" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliate_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"landing_path" varchar(500),
	"country" varchar(2),
	"dedupe_hash" varchar(64) NOT NULL,
	"referer" varchar(500),
	"user_agent" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"affiliate_code" varchar(30) NOT NULL,
	"commission_rate" numeric(5, 4) DEFAULT '0.1000' NOT NULL,
	"total_earned" integer DEFAULT 0 NOT NULL,
	"total_paid" integer DEFAULT 0 NOT NULL,
	"payout_method" varchar(20) DEFAULT 'crypto' NOT NULL,
	"payout_details" jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"application_notes" text,
	"coupon_discount_percent" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "affiliates_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "affiliates_affiliate_code_unique" UNIQUE("affiliate_code")
);
--> statement-breakpoint
CREATE TABLE "cart_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" varchar(100) NOT NULL,
	"product_name" varchar(200) NOT NULL,
	"variant_sku" varchar(100) NOT NULL,
	"price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_slug" varchar(255) NOT NULL,
	"variant_sku" varchar(100),
	"batch_number" varchar(100) NOT NULL,
	"file_data" "bytea" NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) DEFAULT 'application/pdf' NOT NULL,
	"test_date" date,
	"purity_percent" numeric(5, 2),
	"lab_name" varchar(255),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"uploaded_by" uuid,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"order_total" integer NOT NULL,
	"commission_amount" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(255) NOT NULL,
	"subject" varchar(100) NOT NULL,
	"order_number" varchar(50),
	"message" text NOT NULL,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"user_id" uuid,
	"order_id" uuid,
	"discount_applied_cents" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" varchar(255),
	"discount_type" varchar(20) NOT NULL,
	"discount_cents" integer,
	"discount_percent" integer,
	"free_shipping" boolean DEFAULT false NOT NULL,
	"applies_to" jsonb,
	"min_subtotal_cents" integer,
	"max_redemptions" integer,
	"max_per_user" integer,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"times_redeemed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to_email" varchar(255) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"template" varchar(100),
	"status" varchar(20) NOT NULL,
	"provider" varchar(50) DEFAULT 'mailtrap' NOT NULL,
	"provider_message_id" varchar(200),
	"provider_response" text,
	"error_message" text,
	"html_body" text,
	"text_body" text,
	"related_order_id" uuid,
	"related_user_id" uuid,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gate_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ruo_attested_at" timestamp,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"email" varchar(255),
	"phone" varchar(30),
	"researcher_type" varchar(40),
	"contact_at" timestamp,
	"ip" varchar(45),
	"user_agent" text,
	"country" varchar(2),
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" varchar(100) NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"variant_sku" varchar(100) NOT NULL,
	"variant_size" varchar(50) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"line_total" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(20) NOT NULL,
	"invoice_seq" integer,
	"customer_phone" varchar(30),
	"refunded_amount_cents" integer DEFAULT 0 NOT NULL,
	"user_id" uuid,
	"email" varchar(255) NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"subtotal" integer NOT NULL,
	"shipping_cost" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"card_surcharge" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"shipping_address" jsonb,
	"payment_status" varchar(30) DEFAULT 'unpaid',
	"payment_gateway" varchar(40),
	"payment_reference" varchar(255),
	"researcher_type" varchar(40),
	"research_use_acknowledged" boolean,
	"coupon_id" uuid,
	"coupon_code" varchar(50),
	"referral_affiliate_id" uuid,
	"subscription_id" uuid,
	"wholesale_account_id" uuid,
	"po_number" varchar(100),
	"shipstation_order_id" integer,
	"shipstation_order_key" varchar(50),
	"shipstation_pushed_at" timestamp,
	"tracking_number" varchar(100),
	"tracking_url" varchar(500),
	"tracking_carrier" varchar(100),
	"tracking_synced" boolean DEFAULT false,
	"tracking_milestone" varchar(30),
	"tracking_last_event" text,
	"tracking_last_checked" timestamp,
	"delivered_at" timestamp,
	"notes" text,
	"fraud_score" integer,
	"fraud_signals" text[],
	"bump_shown" boolean DEFAULT false NOT NULL,
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(200),
	"utm_content" varchar(200),
	"utm_term" varchar(200),
	"landing_path" varchar(255),
	"referrer_domain" varchar(255),
	"shipping_sms_sent_at" timestamp,
	"shipping_sms_sid" varchar(100),
	"dup_of_order_id" uuid,
	"dup_confirmation_sms_sent_at" timestamp,
	"thank_you_sms_sent_at" timestamp,
	"recovery_sms_sent_at" timestamp,
	"admin_followup_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(100) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"method" varchar(20) NOT NULL,
	"transaction_reference" varchar(255),
	"commission_ids" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "shared_carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(20) NOT NULL,
	"items" jsonb NOT NULL,
	"notes" text,
	"created_by" uuid,
	"redeem_count" integer DEFAULT 0 NOT NULL,
	"first_redeemed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shared_carts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"event" varchar(50) NOT NULL,
	"details" jsonb,
	"order_id" uuid,
	"payment_reference" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"product_id" varchar(100) NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"variant_sku" varchar(100) NOT NULL,
	"variant_size" varchar(50) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"base_price" integer NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"pause_reason" varchar(20),
	"frequency" integer DEFAULT 30 NOT NULL,
	"loyalty_tier" varchar(20) DEFAULT 'bronze' NOT NULL,
	"discount_percent" integer DEFAULT 10 NOT NULL,
	"discount_override" boolean DEFAULT false,
	"successful_charges" integer DEFAULT 0 NOT NULL,
	"shipping_address_id" uuid,
	"billing_reference" varchar(255),
	"next_charge_date" timestamp NOT NULL,
	"last_charged_at" timestamp,
	"paused_until" timestamp,
	"last_charge_epoch" varchar(30),
	"processing_at" timestamp,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_retry_at" timestamp,
	"cancel_reason" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255),
	"password_hash" text NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"phone" varchar(20),
	"phone_verified" boolean DEFAULT false NOT NULL,
	"role" varchar(20) DEFAULT 'customer' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"referred_by" uuid,
	"signup_ip" varchar(45),
	"signup_country" varchar(2),
	"signup_region" varchar(10),
	"signup_city" varchar(100),
	"last_winback_email_at" timestamp,
	"cost_plus_margin_cents" integer,
	"researcher_type" varchar(40),
	"research_use_acknowledged_at" timestamp,
	"company_name" varchar(255),
	"ein" varchar(500),
	"institution_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "wholesale_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"website" varchar(255),
	"ein" varchar(100),
	"institution_type" varchar(50) NOT NULL,
	"estimated_monthly_volume" varchar(50),
	"use_case" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"tier" integer DEFAULT 1 NOT NULL,
	"discount_percent" integer DEFAULT 20 NOT NULL,
	"credit_terms" varchar(20) DEFAULT 'prepaid' NOT NULL,
	"credit_limit" integer DEFAULT 0,
	"outstanding_balance" integer DEFAULT 0 NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wholesale_accounts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_outreach" ADD CONSTRAINT "admin_outreach_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_outreach" ADD CONSTRAINT "admin_outreach_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_events" ADD CONSTRAINT "cart_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coas" ADD CONSTRAINT "coas_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_leads" ADD CONSTRAINT "gate_leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_carts" ADD CONSTRAINT "shared_carts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_items" ADD CONSTRAINT "subscription_items_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_shipping_address_id_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wholesale_accounts" ADD CONSTRAINT "wholesale_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abandoned_carts_email_idx" ON "abandoned_carts" USING btree ("email_lower");--> statement-breakpoint
CREATE INDEX "abandoned_carts_stage_idx" ON "abandoned_carts" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "abandoned_carts_updated_idx" ON "abandoned_carts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "addresses_user_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_outreach_customer_idx" ON "admin_outreach" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "admin_outreach_admin_idx" ON "admin_outreach" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "affiliate_clicks_affiliate_idx" ON "affiliate_clicks" USING btree ("affiliate_id");--> statement-breakpoint
CREATE INDEX "affiliate_clicks_created_idx" ON "affiliate_clicks" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_clicks_dedupe_idx" ON "affiliate_clicks" USING btree ("dedupe_hash");--> statement-breakpoint
CREATE INDEX "affiliates_user_idx" ON "affiliates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "affiliates_code_idx" ON "affiliates" USING btree ("affiliate_code");--> statement-breakpoint
CREATE INDEX "cart_events_user_created_idx" ON "cart_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "cart_events_slug_idx" ON "cart_events" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "coas_slug_active_idx" ON "coas" USING btree ("product_slug","is_active");--> statement-breakpoint
CREATE INDEX "coas_uploaded_at_idx" ON "coas" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "coas_batch_idx" ON "coas" USING btree ("batch_number");--> statement-breakpoint
CREATE INDEX "commissions_affiliate_idx" ON "commissions" USING btree ("affiliate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commissions_order_idx" ON "commissions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "commissions_status_idx" ON "commissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_coupon_idx" ON "coupon_redemptions" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_user_idx" ON "coupon_redemptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_order_idx" ON "coupon_redemptions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "coupons_code_idx" ON "coupons" USING btree ("code");--> statement-breakpoint
CREATE INDEX "coupons_active_idx" ON "coupons" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "email_log_to_idx" ON "email_log" USING btree ("to_email");--> statement-breakpoint
CREATE INDEX "email_log_template_idx" ON "email_log" USING btree ("template");--> statement-breakpoint
CREATE INDEX "email_log_sent_at_idx" ON "email_log" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "email_log_status_idx" ON "email_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "gate_leads_user_idx" ON "gate_leads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gate_leads_email_idx" ON "gate_leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "gate_leads_created_idx" ON "gate_leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "reset_tokens_token_idx" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "reset_tokens_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payouts_affiliate_idx" ON "payouts" USING btree ("affiliate_id");--> statement-breakpoint
CREATE INDEX "shared_carts_slug_idx" ON "shared_carts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "shared_carts_created_idx" ON "shared_carts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sub_events_subscription_idx" ON "subscription_events" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "sub_items_subscription_idx" ON "subscription_items" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_next_charge_idx" ON "subscriptions" USING btree ("next_charge_date");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_phone_idx" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "users_signup_country_idx" ON "users" USING btree ("signup_country");--> statement-breakpoint
CREATE INDEX "wholesale_user_idx" ON "wholesale_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wholesale_status_idx" ON "wholesale_accounts" USING btree ("status");