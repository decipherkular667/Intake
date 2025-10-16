CREATE TABLE "food_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"food_name" text NOT NULL,
	"serving_size" real NOT NULL,
	"serving_unit" text NOT NULL,
	"meal_type" text NOT NULL,
	"entry_date" text NOT NULL,
	"nutrition_data" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "health_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"gender" text,
	"height" integer NOT NULL,
	"weight" integer NOT NULL,
	"birth_year" integer NOT NULL,
	"birth_month" integer NOT NULL,
	"medical_conditions" text DEFAULT '[]',
	"allergies" text DEFAULT '[]',
	"medications" text DEFAULT '[]',
	"smoking_status" text,
	"smoking_frequency" text,
	"activity_level" text,
	"dietary_restrictions" text DEFAULT '[]',
	"health_goals" text DEFAULT '[]',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"data" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"minute_count" integer DEFAULT 0 NOT NULL,
	"minute_reset_at" integer NOT NULL,
	"hour_count" integer DEFAULT 0 NOT NULL,
	"hour_reset_at" integer NOT NULL,
	"day_count" integer DEFAULT 0 NOT NULL,
	"day_reset_at" integer NOT NULL,
	"total_requests" integer DEFAULT 0 NOT NULL,
	"last_request_at" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_profile_id_health_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."health_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD CONSTRAINT "health_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_profile_id_health_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."health_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;