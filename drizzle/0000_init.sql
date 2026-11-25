CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(80) NOT NULL,
	"email" varchar(254) NOT NULL,
	"phone" varchar(20),
	"company" varchar(120),
	"message" text,
	"locale" varchar(10) DEFAULT 'fr' NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"contacted" boolean DEFAULT false NOT NULL,
	"contacted_at" timestamp with time zone,
	"contacted_by" varchar(254),
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "leads_email_unique" ON "leads" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_contacted_idx" ON "leads" USING btree ("contacted");