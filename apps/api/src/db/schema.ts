import {
  pgTable, uuid, text, integer, boolean, real, timestamp,
  unique, primaryKey,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  steamId: text('steam_id').primaryKey(),
  username: text('username').notNull(),
  avatar: text('avatar').notNull(),
  profileUrl: text('profile_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const loadouts = pgTable('loadouts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.steamId, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  shareSlug: text('share_slug').unique(),
  likesCount: integer('likes_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const weapons = pgTable('weapons', {
  defIndex: integer('def_index').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  modelPath: text('model_path'),
  iconPath: text('icon_path'),
});

export const skins = pgTable('skins', {
  id: integer('id').primaryKey(),
  weaponDefIndex: integer('weapon_def_index').notNull().references(() => weapons.defIndex),
  paintKitId: integer('paint_kit_id').notNull(),
  name: text('name').notNull(),
  rarity: text('rarity').notNull(),
  finishStyle: text('finish_style').notNull(),
  patternTexture: text('pattern_texture'),
  roughnessTexture: text('roughness_texture'),  // metalness map
  iconPath: text('icon_path'),
  colorA: text('color_a'),   // JSON "[r,g,b,a]" — g_vColor0
  colorB: text('color_b'),   // g_vColor1
  colorC: text('color_c'),   // g_vColor2
  colorD: text('color_d'),   // g_vColor3
  colorWarp: real('color_warp').default(0),   // g_flColorBrightness
  phase: real('phase').default(0),            // g_flPhase
  wearMin: real('wear_min').default(0.0).notNull(),
  wearMax: real('wear_max').default(1.0).notNull(),
});

export const loadoutSlots = pgTable('loadout_slots', {
  id: uuid('id').defaultRandom().primaryKey(),
  loadoutId: uuid('loadout_id').notNull().references(() => loadouts.id, { onDelete: 'cascade' }),
  weaponDefIndex: integer('weapon_def_index').notNull().references(() => weapons.defIndex),
  skinId: integer('skin_id').notNull().references(() => skins.id),
  wear: real('wear').default(0.15).notNull(),
  seed: integer('seed').default(500).notNull(),
  statTrak: boolean('stat_trak').default(false).notNull(),
}, (t) => [unique('unique_slot').on(t.loadoutId, t.weaponDefIndex)]);

export const loadoutLikes = pgTable('loadout_likes', {
  userId: text('user_id').notNull().references(() => users.steamId),
  loadoutId: uuid('loadout_id').notNull().references(() => loadouts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.loadoutId] })]);

export const priceCache = pgTable('price_cache', {
  skinId: integer('skin_id').notNull().references(() => skins.id),
  source: text('source').notNull(),
  price: real('price'),
  currency: text('currency').default('USD').notNull(),
  listingUrl: text('listing_url'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.skinId, t.source] })]);
