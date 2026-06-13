CREATE TYPE "public"."match_stage" AS ENUM('GROUP', 'LAST_16', 'QUARTER', 'SEMI', 'THIRD_PLACE', 'FINAL');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"external_id" integer PRIMARY KEY NOT NULL,
	"home_team" text NOT NULL,
	"away_team" text NOT NULL,
	"home_crest" text,
	"away_crest" text,
	"kickoff_at" timestamp with time zone NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"status" "match_status" DEFAULT 'SCHEDULED' NOT NULL,
	"stage" "match_stage" NOT NULL,
	"group_name" text,
	"manual_override" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"match_id" integer NOT NULL,
	"home_score" integer NOT NULL,
	"away_score" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "predictions_user_match_unique" UNIQUE("user_id","match_id")
);
--> statement-breakpoint
CREATE TABLE "sync_meta" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"last_sync_at" timestamp with time zone,
	"syncing" boolean DEFAULT false NOT NULL,
	"last_sync_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_matches_external_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("external_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "matches_stage_group_idx" ON "matches" USING btree ("stage","group_name");--> statement-breakpoint
CREATE INDEX "matches_kickoff_idx" ON "matches" USING btree ("kickoff_at");--> statement-breakpoint
CREATE INDEX "predictions_user_id_idx" ON "predictions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "predictions_match_id_idx" ON "predictions" USING btree ("match_id");