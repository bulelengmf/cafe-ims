CREATE TYPE "public"."supplier_type" AS ENUM('formal', 'market');--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"type" "supplier_type" DEFAULT 'formal' NOT NULL,
	"contact_person" varchar(120),
	"phone" varchar(30),
	"address" text,
	"payment_terms" varchar(120),
	"lead_time_days" integer,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_lead_time_range" CHECK ("suppliers"."lead_time_days" IS NULL OR ("suppliers"."lead_time_days" >= 0 AND "suppliers"."lead_time_days" <= 365))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_name_lower_uq" ON "suppliers" USING btree (lower("name"));