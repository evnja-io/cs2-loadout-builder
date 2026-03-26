CREATE TABLE "loadout_likes" (
	"user_id" text NOT NULL,
	"loadout_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loadout_likes_user_id_loadout_id_pk" PRIMARY KEY("user_id","loadout_id")
);
--> statement-breakpoint
CREATE TABLE "loadout_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loadout_id" uuid NOT NULL,
	"weapon_def_index" integer NOT NULL,
	"skin_id" integer NOT NULL,
	"wear" real DEFAULT 0.15 NOT NULL,
	"seed" integer DEFAULT 500 NOT NULL,
	"stat_trak" boolean DEFAULT false NOT NULL,
	CONSTRAINT "unique_slot" UNIQUE("loadout_id","weapon_def_index")
);
--> statement-breakpoint
CREATE TABLE "loadouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"share_slug" text,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loadouts_share_slug_unique" UNIQUE("share_slug")
);
--> statement-breakpoint
CREATE TABLE "price_cache" (
	"skin_id" integer NOT NULL,
	"source" text NOT NULL,
	"price" real,
	"currency" text DEFAULT 'USD' NOT NULL,
	"listing_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_cache_skin_id_source_pk" PRIMARY KEY("skin_id","source")
);
--> statement-breakpoint
CREATE TABLE "skins" (
	"id" integer PRIMARY KEY NOT NULL,
	"weapon_def_index" integer NOT NULL,
	"paint_kit_id" integer NOT NULL,
	"name" text NOT NULL,
	"rarity" text NOT NULL,
	"finish_style" text NOT NULL,
	"pattern_texture" text,
	"color_texture" text,
	"normal_texture" text,
	"roughness_texture" text,
	"wear_min" real DEFAULT 0 NOT NULL,
	"wear_max" real DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"steam_id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"avatar" text NOT NULL,
	"profile_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weapons" (
	"def_index" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"model_path" text,
	"icon_path" text
);
--> statement-breakpoint
ALTER TABLE "loadout_likes" ADD CONSTRAINT "loadout_likes_user_id_users_steam_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("steam_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loadout_likes" ADD CONSTRAINT "loadout_likes_loadout_id_loadouts_id_fk" FOREIGN KEY ("loadout_id") REFERENCES "public"."loadouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loadout_slots" ADD CONSTRAINT "loadout_slots_loadout_id_loadouts_id_fk" FOREIGN KEY ("loadout_id") REFERENCES "public"."loadouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loadout_slots" ADD CONSTRAINT "loadout_slots_weapon_def_index_weapons_def_index_fk" FOREIGN KEY ("weapon_def_index") REFERENCES "public"."weapons"("def_index") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loadout_slots" ADD CONSTRAINT "loadout_slots_skin_id_skins_id_fk" FOREIGN KEY ("skin_id") REFERENCES "public"."skins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loadouts" ADD CONSTRAINT "loadouts_user_id_users_steam_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("steam_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_cache" ADD CONSTRAINT "price_cache_skin_id_skins_id_fk" FOREIGN KEY ("skin_id") REFERENCES "public"."skins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skins" ADD CONSTRAINT "skins_weapon_def_index_weapons_def_index_fk" FOREIGN KEY ("weapon_def_index") REFERENCES "public"."weapons"("def_index") ON DELETE no action ON UPDATE no action;