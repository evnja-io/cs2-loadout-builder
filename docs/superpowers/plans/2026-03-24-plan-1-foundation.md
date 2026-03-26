# CS2 Loadout Builder — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the complete backend API — monorepo, shared Zod types, Fastify with Steam auth, DB schema, loadout CRUD, inventory proxy, and price aggregation — fully tested.

**Architecture:** pnpm monorepo with `packages/shared` (Zod schemas + TS types), `apps/api` (Fastify v5 + Drizzle + PostgreSQL), and `apps/web` skeleton. All external APIs (Steam, CSFloat, Bitskin) are mocked in tests via `vi.mock`. Database tests use `@testcontainers/postgresql` for real isolation.

**Tech Stack:** pnpm workspaces, TypeScript 5, Fastify v5, Drizzle ORM, PostgreSQL 16, Zod v3, Vitest, @testcontainers/postgresql, nanoid

**Spec:** `docs/superpowers/specs/2026-03-24-cs2-loadout-builder-design.md`

---

## File Map

```
loadout-builder/
├── package.json                          # root workspace config
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
├── .npmrc
│
├── packages/shared/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── schemas/
│       │   ├── weapon.ts                 # WeaponSchema, WeaponCategorySchema
│       │   ├── skin.ts                   # SkinSchema, FinishStyleSchema, RaritySchema
│       │   ├── loadout.ts                # LoadoutSchema, LoadoutSlotSchema
│       │   ├── user.ts                   # UserSchema
│       │   └── prices.ts                 # PriceDataSchema, PriceSourceSchema
│       └── index.ts                      # re-exports all schemas + inferred types
│
├── apps/api/
│   ├── package.json
│   ├── tsconfig.json
│   ├── drizzle.config.ts
│   ├── drizzle/                          # generated migrations
│   └── src/
│       ├── app.ts                        # buildApp factory (used in tests + index)
│       ├── index.ts                      # entry point: builds + starts app
│       ├── env.ts                        # typed env validation with Zod
│       ├── db/
│       │   ├── schema.ts                 # all Drizzle table definitions
│       │   └── index.ts                  # DB connection (postgres-js + drizzle)
│       ├── plugins/
│       │   ├── auth.ts                   # JWT cookie plugin + decorateRequest
│       │   ├── cors.ts
│       │   └── rate-limit.ts
│       ├── routes/
│       │   ├── auth.ts                   # /auth/steam, /auth/steam/callback, /auth/me, /auth/logout
│       │   ├── loadouts.ts               # CRUD, slots, likes, share
│       │   ├── weapons.ts                # /weapons, /weapons/:defIndex/skins
│       │   ├── inventory.ts              # /inventory (Steam proxy)
│       │   └── prices.ts                 # /prices
│       ├── services/
│       │   ├── steam-auth.ts             # OpenID 2.0 flow
│       │   ├── steam-inventory.ts        # CS2 inventory fetch + parse
│       │   ├── prices.ts                 # CSFloat + Bitskin + Steam Market
│       │   └── cache.ts                  # in-memory TTL cache
│       └── test-utils/
│           ├── db.ts                     # testcontainers DB setup helper
│           ├── app.ts                    # buildTestApp helper
│           └── fixtures.ts               # seed helpers for tests
│
└── apps/web/
    ├── package.json
    ├── tsconfig.json
    ├── svelte.config.ts
    ├── vite.config.ts
    ├── tailwind.config.ts
    └── src/
        ├── app.html
        ├── routes/
        │   ├── +layout.ts                # auth guard (redirect unauthenticated to /)
        │   ├── +layout.svelte
        │   ├── +page.svelte              # landing
        │   ├── builder/+page.svelte      # (stub for Plan 3)
        │   ├── share/[slug]/+page.svelte # (stub for Plan 3)
        │   └── u/[steamId]/+page.svelte  # (stub for Plan 3)
        └── lib/
            └── api/
                └── client.ts             # base fetch wrapper (used in Plan 3)
```

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.npmrc`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "loadout-builder",
  "private": true,
  "version": "0.0.1",
  "engines": { "node": ">=20", "pnpm": ">=9" },
  "scripts": {
    "dev:api": "pnpm --filter @lb/api dev",
    "dev:web": "pnpm --filter @lb/web dev",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "build": "pnpm -r build"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'scripts/*'
```

- [ ] **Step 3: Create .npmrc**

```
shamefully-hoist=false
strict-peer-dependencies=false
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
.env
.env.*
!.env.example
drizzle/
*.db
.superpowers/
```

- [ ] **Step 6: Install pnpm and verify workspaces**

```bash
pnpm install
```
Expected: no error, `pnpm-lock.yaml` created.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "chore: init monorepo scaffold"
```

---

## Task 2: packages/shared — Zod Schemas

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/schemas/weapon.ts`
- Create: `packages/shared/src/schemas/skin.ts`
- Create: `packages/shared/src/schemas/loadout.ts`
- Create: `packages/shared/src/schemas/user.ts`
- Create: `packages/shared/src/schemas/prices.ts`
- Create: `packages/shared/src/index.ts`
- Test: `packages/shared/src/schemas/__tests__/schemas.test.ts`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@lb/shared",
  "version": "0.0.1",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": { "zod": "^3.24.0" },
  "devDependencies": { "typescript": "^5.7.0", "vitest": "^3.0.0" }
}
```

- [ ] **Step 2: Create packages/shared/src/schemas/weapon.ts**

```typescript
import { z } from 'zod';

export const WeaponCategorySchema = z.enum([
  'rifles', 'pistols', 'smgs', 'shotguns', 'heavies', 'knives', 'gloves'
]);

export const WeaponSchema = z.object({
  defIndex: z.number().int().nonnegative(),
  name: z.string().min(1),
  category: WeaponCategorySchema,
  modelPath: z.string().nullable(),
  iconPath: z.string().nullable(),
});

export type Weapon = z.infer<typeof WeaponSchema>;
export type WeaponCategory = z.infer<typeof WeaponCategorySchema>;
```

- [ ] **Step 3: Create packages/shared/src/schemas/skin.ts**

```typescript
import { z } from 'zod';

export const RaritySchema = z.enum([
  'consumer', 'industrial', 'mil-spec', 'restricted', 'classified', 'covert', 'contraband'
]);

export const FinishStyleSchema = z.enum([
  'solid', 'hydrographic', 'spray-paint', 'anodized',
  'anodized-multicolored', 'gunsmith', 'custom-paint-job'
]);

export const SkinSchema = z.object({
  id: z.number().int().positive(),
  weaponDefIndex: z.number().int().nonnegative(),
  paintKitId: z.number().int().nonnegative(),
  name: z.string().min(1),
  rarity: RaritySchema,
  finishStyle: FinishStyleSchema,
  patternTexture: z.string().nullable(),
  colorTexture: z.string().nullable(),
  normalTexture: z.string().nullable(),
  roughnessTexture: z.string().nullable(),
  wearMin: z.number().min(0).max(1),
  wearMax: z.number().min(0).max(1),
});

export type Skin = z.infer<typeof SkinSchema>;
export type Rarity = z.infer<typeof RaritySchema>;
export type FinishStyle = z.infer<typeof FinishStyleSchema>;
```

- [ ] **Step 4: Create packages/shared/src/schemas/loadout.ts**

```typescript
import { z } from 'zod';

export const LoadoutSlotSchema = z.object({
  id: z.string().uuid(),
  loadoutId: z.string().uuid(),
  weaponDefIndex: z.number().int().nonnegative(),
  skinId: z.number().int().positive(),
  wear: z.number().min(0).max(1),
  seed: z.number().int().min(1).max(1000),
  statTrak: z.boolean(),
});

export const LoadoutSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string().min(1).max(64),
  isPublic: z.boolean(),
  shareSlug: z.string().length(8).nullable(),
  likesCount: z.number().int().nonnegative(),
  slots: z.array(LoadoutSlotSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateLoadoutSchema = z.object({
  name: z.string().min(1).max(64),
});

export const UpdateLoadoutSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  isPublic: z.boolean().optional(),
});

export const UpsertSlotSchema = z.object({
  weaponDefIndex: z.number().int().nonnegative(),
  skinId: z.number().int().positive(),
  wear: z.number().min(0).max(1).default(0.15),
  seed: z.number().int().min(1).max(1000).default(500),
  statTrak: z.boolean().default(false),
});

export const BulkSlotsSchema = z.object({
  slots: z.array(UpsertSlotSchema),
});

export type Loadout = z.infer<typeof LoadoutSchema>;
export type LoadoutSlot = z.infer<typeof LoadoutSlotSchema>;
export type CreateLoadout = z.infer<typeof CreateLoadoutSchema>;
export type UpsertSlot = z.infer<typeof UpsertSlotSchema>;
```

- [ ] **Step 5: Create packages/shared/src/schemas/user.ts**

```typescript
import { z } from 'zod';

export const UserSchema = z.object({
  steamId: z.string().regex(/^\d{17}$/),
  username: z.string().min(1),
  avatar: z.string().url(),
  profileUrl: z.string().url(),
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;
```

- [ ] **Step 6: Create packages/shared/src/schemas/prices.ts**

```typescript
import { z } from 'zod';

export const PriceSourceSchema = z.enum(['steam', 'csfloat', 'bitskin']);

export const PriceDataSchema = z.object({
  skinId: z.number().int().positive(),
  source: PriceSourceSchema,
  price: z.number().positive().nullable(),
  currency: z.string().default('USD'),
  listingUrl: z.string().url().nullable(),
  updatedAt: z.string().datetime(),
});

export const InventoryItemSchema = z.object({
  weaponDefIndex: z.number().int().nonnegative(),
  skinId: z.number().int().positive(),
  wear: z.number().min(0).max(1),
  seed: z.number().int().min(1).max(1000),
  statTrak: z.boolean(),
  iconUrl: z.string().url(),
  marketHashName: z.string(),
});

export type PriceSource = z.infer<typeof PriceSourceSchema>;
export type PriceData = z.infer<typeof PriceDataSchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
```

- [ ] **Step 7: Create packages/shared/src/index.ts**

```typescript
export * from './schemas/weapon.js';
export * from './schemas/skin.js';
export * from './schemas/loadout.js';
export * from './schemas/user.js';
export * from './schemas/prices.js';
```

- [ ] **Step 8: Write failing tests**

Create `packages/shared/src/schemas/__tests__/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { WeaponSchema, SkinSchema, LoadoutSchema, UserSchema, InventoryItemSchema } from '../../index.js';

describe('WeaponSchema', () => {
  it('accepts valid weapon', () => {
    const result = WeaponSchema.safeParse({
      defIndex: 7, name: 'AK-47', category: 'rifles', modelPath: null, iconPath: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown category', () => {
    const result = WeaponSchema.safeParse({
      defIndex: 7, name: 'AK-47', category: 'bazooka', modelPath: null, iconPath: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('SkinSchema', () => {
  it('rejects wear out of range', () => {
    const result = SkinSchema.safeParse({
      id: 1, weaponDefIndex: 7, paintKitId: 44, name: 'Redline',
      rarity: 'classified', finishStyle: 'hydrographic',
      patternTexture: null, colorTexture: null, normalTexture: null, roughnessTexture: null,
      wearMin: -0.1, wearMax: 0.45,
    });
    expect(result.success).toBe(false);
  });
});

describe('LoadoutSchema', () => {
  it('rejects seed out of range', () => {
    const { UpsertSlotSchema } = await import('../../schemas/loadout.js');
    const result = UpsertSlotSchema.safeParse({
      weaponDefIndex: 7, skinId: 1, wear: 0.15, seed: 0, statTrak: false,
    });
    expect(result.success).toBe(false);
  });
});

describe('UserSchema', () => {
  it('rejects non-17-digit steamId', () => {
    const result = UserSchema.safeParse({
      steamId: '123', username: 'test', avatar: 'https://a.com/a.png',
      profileUrl: 'https://steamcommunity.com/id/test', createdAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 9: Run tests**

```bash
pnpm --filter @lb/shared test
```
Expected: All PASS — all schemas are created in steps 2–7.

- [ ] **Step 11: Typecheck**

```bash
pnpm --filter @lb/shared typecheck
```
Expected: No errors.

- [ ] **Step 12: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add Zod schemas for all domain types"
```

---

## Task 3: apps/api — Skeleton + Environment

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/env.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/.env.example`

- [ ] **Step 1: Create apps/api/package.json**

```json
{
  "name": "@lb/api",
  "version": "0.0.1",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "@lb/shared": "workspace:*",
    "fastify": "^5.2.0",
    "@fastify/cookie": "^11.0.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/jwt": "^9.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "drizzle-orm": "^0.40.0",
    "postgres": "^3.4.5",
    "nanoid": "^5.0.9",
    "openid": "^1.1.1",
    "fastify-plugin": "^4.5.1",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@testcontainers/postgresql": "^10.24.0",
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create apps/api/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create apps/api/src/env.ts**

```typescript
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  STEAM_API_KEY: z.string().min(1),
  API_URL: z.string().url(),   // e.g. http://localhost:3001
  WEB_URL: z.string().url(),   // e.g. http://localhost:5173
});

export const env = EnvSchema.parse(process.env);
```

- [ ] **Step 4: Create apps/api/.env.example**

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/loadout_builder
JWT_SECRET=change-me-to-a-32-char-minimum-secret
STEAM_API_KEY=your-steam-api-key
API_URL=http://localhost:3001
WEB_URL=http://localhost:5173
```

- [ ] **Step 5: Create apps/api/src/app.ts**

```typescript
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './db/schema.js';

export interface AppOptions {
  db?: NodePgDatabase<typeof schema>;
  jwtSecret?: string;
  webUrl?: string;
  logger?: boolean;
}

export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false });

  await app.register(cookie);
  await app.register(cors, {
    origin: opts.webUrl ?? process.env.WEB_URL ?? 'http://localhost:5173',
    credentials: true,
  });
  await app.register(jwt, {
    secret: opts.jwtSecret ?? process.env.JWT_SECRET ?? 'dev-secret',
    cookie: { cookieName: 'token', signed: false },
  });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  // Health check
  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
```

- [ ] **Step 6: Write health check test**

Create `apps/api/src/routes/__tests__/health.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildApp } from '../../app.js';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 7: Run test (expect fail — app not built yet)**

```bash
pnpm --filter @lb/api test
```
Expected: FAIL or PASS depending on whether app.ts compiles.

- [ ] **Step 8: Create apps/api/src/index.ts**

```typescript
import { buildApp } from './app.js';
import { env } from './env.js';

const app = await buildApp({ logger: true, webUrl: env.WEB_URL });

await app.listen({ port: env.PORT, host: '0.0.0.0' });
console.log(`API running on http://localhost:${env.PORT}`);
```

- [ ] **Step 9: Run test (expect pass)**

```bash
pnpm --filter @lb/api test
```
Expected: PASS — health check returns 200.

- [ ] **Step 10: Commit**

```bash
git add apps/api
git commit -m "feat(api): add Fastify skeleton with health check"
```

---

## Task 4: Database Schema + Drizzle

**Files:**
- Create: `apps/api/src/db/schema.ts`
- Create: `apps/api/src/db/index.ts`
- Create: `apps/api/drizzle.config.ts`
- Create: `apps/api/src/test-utils/db.ts`

- [ ] **Step 1: Create apps/api/src/db/schema.ts**

```typescript
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
  colorTexture: text('color_texture'),
  normalTexture: text('normal_texture'),
  roughnessTexture: text('roughness_texture'),
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
```

- [ ] **Step 2: Create apps/api/src/db/index.ts**

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { env } from '../env.js';

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });
export type Db = typeof db;
```

- [ ] **Step 3: Create apps/api/drizzle.config.ts**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 4: Create apps/api/src/test-utils/db.ts**

```typescript
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '../db/schema.js';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface TestDb {
  db: ReturnType<typeof drizzle<typeof schema>>;
  container: StartedPostgreSqlContainer;
  cleanup: () => Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const client = postgres(container.getConnectionUri());
  const db = drizzle(client, { schema });

  await migrate(db, {
    migrationsFolder: join(__dirname, '../../drizzle'),
  });

  return {
    db,
    container,
    cleanup: async () => {
      await client.end();
      await container.stop();
    },
  };
}
```

- [ ] **Step 5: Create apps/api/src/test-utils/fixtures.ts**

```typescript
import type { Db } from '../db/index.js';
import { weapons, skins, users } from '../db/schema.js';

export async function seedWeapons(db: Db) {
  await db.insert(weapons).values([
    { defIndex: 7, name: 'AK-47', category: 'rifles', modelPath: null, iconPath: null },
    { defIndex: 16, name: 'M4A4', category: 'rifles', modelPath: null, iconPath: null },
    { defIndex: 1, name: 'Desert Eagle', category: 'pistols', modelPath: null, iconPath: null },
    { defIndex: 507, name: 'Karambit', category: 'knives', modelPath: null, iconPath: null },
  ]);
}

export async function seedSkins(db: Db) {
  await db.insert(skins).values([
    {
      id: 1, weaponDefIndex: 7, paintKitId: 44, name: 'Redline',
      rarity: 'classified', finishStyle: 'hydrographic',
      patternTexture: null, colorTexture: null, normalTexture: null, roughnessTexture: null,
      wearMin: 0.1, wearMax: 0.45,
    },
    {
      id: 2, weaponDefIndex: 7, paintKitId: 675, name: 'Asiimov',
      rarity: 'covert', finishStyle: 'hydrographic',
      patternTexture: null, colorTexture: null, normalTexture: null, roughnessTexture: null,
      wearMin: 0.18, wearMax: 1.0,
    },
  ]);
}

export async function seedUser(db: Db, steamId = '76561198000000001') {
  await db.insert(users).values({
    steamId,
    username: 'TestPlayer',
    avatar: 'https://avatars.steamstatic.com/test.jpg',
    profileUrl: 'https://steamcommunity.com/id/test',
  });
  return steamId;
}
```

- [ ] **Step 6: Write schema integration test**

Create `apps/api/src/db/__tests__/schema.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test-utils/db.js';
import { seedWeapons, seedSkins, seedUser } from '../../test-utils/fixtures.js';
import { weapons, skins, loadouts, loadoutSlots } from '../schema.js';
import { eq } from 'drizzle-orm';

let testDb: TestDb;

beforeAll(async () => {
  testDb = await createTestDb();
}, 60_000);

afterAll(async () => { await testDb.cleanup(); });

describe('DB Schema', () => {
  it('can insert and retrieve weapons', async () => {
    await seedWeapons(testDb.db);
    const rows = await testDb.db.select().from(weapons);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.find(w => w.defIndex === 7)?.name).toBe('AK-47');
  });

  it('enforces unique slot per weapon per loadout', async () => {
    const steamId = await seedUser(testDb.db);
    await seedSkins(testDb.db);

    const [loadout] = await testDb.db.insert(loadouts)
      .values({ userId: steamId, name: 'Test Loadout' })
      .returning();

    await testDb.db.insert(loadoutSlots).values({
      loadoutId: loadout!.id, weaponDefIndex: 7, skinId: 1, wear: 0.15, seed: 500, statTrak: false,
    });

    await expect(
      testDb.db.insert(loadoutSlots).values({
        loadoutId: loadout!.id, weaponDefIndex: 7, skinId: 2, wear: 0.2, seed: 300, statTrak: false,
      })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 7: Generate migration**

```bash
pnpm --filter @lb/api db:generate
```
Expected: `drizzle/0000_*.sql` migration file created.

- [ ] **Step 8: Run DB tests**

```bash
pnpm --filter @lb/api test src/db/__tests__/schema.test.ts
```
Expected: PASS (testcontainers pulls postgres:16-alpine and runs migration).

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/db apps/api/src/test-utils apps/api/drizzle apps/api/drizzle.config.ts
git commit -m "feat(api): add Drizzle schema, migrations, and test infrastructure"
```

---

## Task 5: Steam Auth

**Files:**
- Create: `apps/api/src/services/steam-auth.ts`
- Create: `apps/api/src/plugins/auth.ts`
- Create: `apps/api/src/routes/auth.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/routes/__tests__/auth.test.ts`

- [ ] **Step 1: Create apps/api/src/services/steam-auth.ts**

```typescript
import { RelyingParty } from 'openid';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid';

export function createRelyingParty(apiUrl: string) {
  return new RelyingParty(
    `${apiUrl}/auth/steam/callback`,
    null,
    true,
    true,
    []
  );
}

export async function getSteamAuthUrl(relyingParty: RelyingParty): Promise<string> {
  return new Promise((resolve, reject) => {
    relyingParty.authenticate(STEAM_OPENID_URL, false, (err, url) => {
      if (err || !url) reject(err ?? new Error('No auth URL'));
      else resolve(url);
    });
  });
}

export async function validateSteamCallback(
  relyingParty: RelyingParty,
  requestUrl: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    relyingParty.verifyAssertion(requestUrl, (err, result) => {
      if (err || !result?.authenticated || !result.claimedIdentifier) {
        reject(err ?? new Error('Steam auth failed'));
      } else {
        const steamId = result.claimedIdentifier.split('/').pop()!;
        resolve(steamId);
      }
    });
  });
}

export async function fetchSteamProfile(steamId: string, apiKey: string) {
  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);
  const data = await res.json() as { response: { players: Array<{
    steamid: string; personaname: string; avatarfull: string; profileurl: string;
  }> } };
  const player = data.response.players[0];
  if (!player) throw new Error('Steam player not found');
  return {
    steamId: player.steamid,
    username: player.personaname,
    avatar: player.avatarfull,
    profileUrl: player.profileurl,
  };
}
```

- [ ] **Step 2: Create apps/api/src/plugins/auth.ts**

```typescript
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string | null;
  }
}

export default fp(async (app: FastifyInstance) => {
  app.decorateRequest('userId', null);

  app.addHook('onRequest', async (request) => {
    try {
      await request.jwtVerify({ onlyCookie: true });
      request.userId = (request.user as { steamId: string }).steamId;
    } catch {
      request.userId = null;
    }
  });
});
```

- [ ] **Step 3: Create apps/api/src/routes/auth.ts**

```typescript
import type { FastifyInstance } from 'fastify';
import { createRelyingParty, getSteamAuthUrl, validateSteamCallback, fetchSteamProfile } from '../services/steam-auth.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.js';

export async function authRoutes(app: FastifyInstance, opts: { db: Db; steamApiKey: string; apiUrl: string; webUrl: string }) {
  const relyingParty = createRelyingParty(opts.apiUrl);

  app.get('/auth/steam', async (request, reply) => {
    const url = await getSteamAuthUrl(relyingParty);
    return reply.redirect(url);
  });

  app.get('/auth/steam/callback', async (request, reply) => {
    const fullUrl = `${opts.apiUrl}${request.url}`;
    const steamId = await validateSteamCallback(relyingParty, fullUrl);
    const profile = await fetchSteamProfile(steamId, opts.steamApiKey);

    await opts.db.insert(users).values({
      steamId: profile.steamId,
      username: profile.username,
      avatar: profile.avatar,
      profileUrl: profile.profileUrl,
    }).onConflictDoUpdate({
      target: users.steamId,
      set: { username: profile.username, avatar: profile.avatar },
    });

    const token = app.jwt.sign({ steamId: profile.steamId }, { expiresIn: '7d' });
    reply.setCookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return reply.redirect(`${opts.webUrl}/builder`);
  });

  app.get('/auth/me', async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });
    const [user] = await opts.db.select().from(users).where(eq(users.steamId, request.userId));
    if (!user) return reply.status(404).send({ error: 'User not found' });
    return user;
  });

  app.post('/auth/logout', async (request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { ok: true };
  });
}
```

- [ ] **Step 4: Write auth route tests**

Create `apps/api/src/routes/__tests__/auth.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestDb, type TestDb } from '../../test-utils/db.js';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

vi.mock('../../services/steam-auth.js', () => ({
  createRelyingParty: vi.fn(() => ({})),
  getSteamAuthUrl: vi.fn().mockResolvedValue('https://steamcommunity.com/openid/login?...'),
  validateSteamCallback: vi.fn().mockResolvedValue('76561198000000001'),
  fetchSteamProfile: vi.fn().mockResolvedValue({
    steamId: '76561198000000001',
    username: 'TestPlayer',
    avatar: 'https://avatars.steamstatic.com/test.jpg',
    profileUrl: 'https://steamcommunity.com/id/test',
  }),
}));

let testDb: TestDb;
let app: FastifyInstance;

beforeAll(async () => {
  testDb = await createTestDb();
  app = await buildApp({ db: testDb.db, jwtSecret: 'test-secret-32-chars-minimum-len', webUrl: 'http://localhost:5173' });
}, 60_000);

afterAll(async () => {
  await app.close();
  await testDb.cleanup();
});

describe('GET /auth/steam', () => {
  it('redirects to Steam OpenID URL', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/steam' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('steamcommunity.com');
  });
});

describe('GET /auth/steam/callback', () => {
  it('creates user and sets JWT cookie', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/steam/callback?openid.mode=id_res' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('http://localhost:5173/builder');
    expect(res.cookies.find(c => c.name === 'token')).toBeDefined();
  });
});

describe('GET /auth/me', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('returns user profile when authenticated', async () => {
    // First authenticate
    await app.inject({ method: 'GET', url: '/auth/steam/callback?openid.mode=id_res' });
    const token = app.jwt.sign({ steamId: '76561198000000001' });

    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { token },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().steamId).toBe('76561198000000001');
  });
});
```

- [ ] **Step 5: Update app.ts to register auth plugin + routes**

In `apps/api/src/app.ts`, add after existing plugins:

```typescript
import authPlugin from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { db as defaultDb } from './db/index.js';
import { env } from './env.js';

// Inside buildApp, after plugin registrations:
await app.register(authPlugin);
await app.register(authRoutes, {
  db: opts.db ?? defaultDb,
  steamApiKey: process.env.STEAM_API_KEY ?? '',
  apiUrl: process.env.API_URL ?? 'http://localhost:3001',
  webUrl: opts.webUrl ?? process.env.WEB_URL ?? 'http://localhost:5173',
});
```

- [ ] **Step 6: Run auth tests**

```bash
pnpm --filter @lb/api test src/routes/__tests__/auth.test.ts
```
Expected: All PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/services/steam-auth.ts apps/api/src/plugins/auth.ts apps/api/src/routes/auth.ts
git commit -m "feat(api): add Steam OpenID auth with JWT cookie"
```

---

## Task 6: Catalogue API (Weapons & Skins)

**Files:**
- Create: `apps/api/src/routes/weapons.ts`
- Test: `apps/api/src/routes/__tests__/weapons.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/routes/__tests__/weapons.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test-utils/db.js';
import { seedWeapons, seedSkins } from '../../test-utils/fixtures.js';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

let testDb: TestDb;
let app: FastifyInstance;

beforeAll(async () => {
  testDb = await createTestDb();
  await seedWeapons(testDb.db);
  await seedSkins(testDb.db);
  app = await buildApp({ db: testDb.db });
}, 60_000);

afterAll(async () => { await app.close(); await testDb.cleanup(); });

describe('GET /weapons', () => {
  it('returns weapons grouped by category', async () => {
    const res = await app.inject({ method: 'GET', url: '/weapons' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.rifles).toBeDefined();
    expect(body.rifles.some((w: any) => w.name === 'AK-47')).toBe(true);
  });
});

describe('GET /weapons/:defIndex/skins', () => {
  it('returns skins for a weapon', async () => {
    const res = await app.inject({ method: 'GET', url: '/weapons/7/skins' });
    expect(res.statusCode).toBe(200);
    const skins = res.json();
    expect(Array.isArray(skins)).toBe(true);
    expect(skins.find((s: any) => s.name === 'Redline')).toBeDefined();
  });

  it('returns 404 for unknown weapon', async () => {
    const res = await app.inject({ method: 'GET', url: '/weapons/9999/skins' });
    expect(res.statusCode).toBe(404);
  });

  it('filters by rarity', async () => {
    const res = await app.inject({ method: 'GET', url: '/weapons/7/skins?rarity=classified' });
    expect(res.statusCode).toBe(200);
    const skins = res.json();
    expect(skins.every((s: any) => s.rarity === 'classified')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests (expect fail)**

```bash
pnpm --filter @lb/api test src/routes/__tests__/weapons.test.ts
```
Expected: FAIL — route not registered.

- [ ] **Step 3: Create apps/api/src/routes/weapons.ts**

```typescript
import type { FastifyInstance } from 'fastify';
import { weapons, skins } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { Db } from '../db/index.js';

export async function weaponRoutes(app: FastifyInstance, opts: { db: Db }) {
  app.get('/weapons', async () => {
    const rows = await opts.db.select().from(weapons);
    return rows.reduce<Record<string, typeof rows>>((acc, w) => {
      (acc[w.category] ??= []).push(w);
      return acc;
    }, {});
  });

  app.get<{ Params: { defIndex: string }; Querystring: { rarity?: string; maxPrice?: string } }>(
    '/weapons/:defIndex/skins',
    async (request, reply) => {
      const defIndex = parseInt(request.params.defIndex, 10);
      const [weapon] = await opts.db.select().from(weapons).where(eq(weapons.defIndex, defIndex));
      if (!weapon) return reply.status(404).send({ error: 'Weapon not found' });

      const conditions = [eq(skins.weaponDefIndex, defIndex)];
      if (request.query.rarity) {
        conditions.push(eq(skins.rarity, request.query.rarity));
      }

      return opts.db.select().from(skins).where(and(...conditions));
    }
  );
}
```

- [ ] **Step 4: Register route in app.ts**

Add to `buildApp` in `apps/api/src/app.ts`:
```typescript
import { weaponRoutes } from './routes/weapons.js';
// Inside buildApp:
await app.register(weaponRoutes, { db: opts.db ?? defaultDb });
```

- [ ] **Step 5: Run tests (expect pass)**

```bash
pnpm --filter @lb/api test src/routes/__tests__/weapons.test.ts
```
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/weapons.ts
git commit -m "feat(api): add weapons and skins catalogue endpoints"
```

---

## Task 7: Loadout CRUD + Sharing + Likes

**Files:**
- Create: `apps/api/src/routes/loadouts.ts`
- Test: `apps/api/src/routes/__tests__/loadouts.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/routes/__tests__/loadouts.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '../../test-utils/db.js';
import { seedWeapons, seedSkins, seedUser } from '../../test-utils/fixtures.js';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

let testDb: TestDb;
let app: FastifyInstance;
const JWT_SECRET = 'test-secret-32-chars-minimum-len';
const STEAM_ID = '76561198000000001';

function authCookie(app: FastifyInstance, steamId = STEAM_ID) {
  return { token: app.jwt.sign({ steamId }) };
}

beforeAll(async () => {
  testDb = await createTestDb();
  await seedWeapons(testDb.db);
  await seedSkins(testDb.db);
  await seedUser(testDb.db, STEAM_ID);
  app = await buildApp({ db: testDb.db, jwtSecret: JWT_SECRET });
}, 60_000);

afterAll(async () => { await app.close(); await testDb.cleanup(); });

describe('POST /loadouts', () => {
  it('creates a loadout for authenticated user', async () => {
    const res = await app.inject({
      method: 'POST', url: '/loadouts',
      cookies: authCookie(app),
      payload: { name: 'My First Loadout' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe('My First Loadout');
    expect(res.json().id).toBeDefined();
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/loadouts', payload: { name: 'x' } });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /loadouts', () => {
  it('returns only the authenticated user loadouts', async () => {
    const res = await app.inject({
      method: 'GET', url: '/loadouts',
      cookies: authCookie(app),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });
});

describe('PUT /loadouts/:id/slots', () => {
  it('upserts slots for a loadout', async () => {
    const create = await app.inject({
      method: 'POST', url: '/loadouts',
      cookies: authCookie(app),
      payload: { name: 'Slot Test' },
    });
    const loadoutId = create.json().id;

    const res = await app.inject({
      method: 'PUT', url: `/loadouts/${loadoutId}/slots`,
      cookies: authCookie(app),
      payload: { slots: [{ weaponDefIndex: 7, skinId: 1, wear: 0.15, seed: 500, statTrak: false }] },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /share/:slug', () => {
  it('returns 404 for unknown slug', async () => {
    const res = await app.inject({ method: 'GET', url: '/share/notaslug' });
    expect(res.statusCode).toBe(404);
  });

  it('returns public loadout by slug', async () => {
    // Create + make public
    const create = await app.inject({
      method: 'POST', url: '/loadouts',
      cookies: authCookie(app),
      payload: { name: 'Public Loadout' },
    });
    const { id } = create.json();
    await app.inject({
      method: 'PATCH', url: `/loadouts/${id}`,
      cookies: authCookie(app),
      payload: { isPublic: true },
    });
    const updated = await app.inject({ method: 'GET', url: `/loadouts/${id}`, cookies: authCookie(app) });
    const { shareSlug } = updated.json();

    const res = await app.inject({ method: 'GET', url: `/share/${shareSlug}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Public Loadout');
  });
});
```

- [ ] **Step 2: Run tests (expect fail)**

```bash
pnpm --filter @lb/api test src/routes/__tests__/loadouts.test.ts
```

- [ ] **Step 3: Create apps/api/src/routes/loadouts.ts**

```typescript
import type { FastifyInstance } from 'fastify';
import { loadouts, loadoutSlots, loadoutLikes } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { BulkSlotsSchema, CreateLoadoutSchema, UpdateLoadoutSchema } from '@lb/shared';
import type { Db } from '../db/index.js';

async function generateUniqueSlug(db: Db): Promise<string> {
  for (let i = 0; i < 3; i++) {
    const slug = nanoid(8);
    const [existing] = await db.select().from(loadouts).where(eq(loadouts.shareSlug, slug));
    if (!existing) return slug;
  }
  throw new Error('Could not generate unique slug');
}

export async function loadoutRoutes(app: FastifyInstance, opts: { db: Db }) {
  const { db } = opts;

  app.get('/loadouts', async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });
    return db.select().from(loadouts).where(eq(loadouts.userId, request.userId));
  });

  app.post<{ Body: { name: string } }>('/loadouts', async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });
    const body = CreateLoadoutSchema.parse(request.body);
    const [loadout] = await db.insert(loadouts)
      .values({ userId: request.userId, name: body.name })
      .returning();
    return reply.status(201).send(loadout);
  });

  app.get<{ Params: { id: string } }>('/loadouts/:id', async (request, reply) => {
    const [loadout] = await db.select().from(loadouts).where(eq(loadouts.id, request.params.id));
    if (!loadout) return reply.status(404).send({ error: 'Not found' });
    if (!loadout.isPublic && loadout.userId !== request.userId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    const slots = await db.select().from(loadoutSlots).where(eq(loadoutSlots.loadoutId, loadout.id));
    return { ...loadout, slots };
  });

  app.patch<{ Params: { id: string }; Body: unknown }>('/loadouts/:id', async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });
    const body = UpdateLoadoutSchema.parse(request.body);
    const [existing] = await db.select().from(loadouts).where(eq(loadouts.id, request.params.id));
    if (!existing) return reply.status(404).send({ error: 'Not found' });
    if (existing.userId !== request.userId) return reply.status(403).send({ error: 'Forbidden' });

    const updates: Partial<typeof existing> & { shareSlug?: string } = {
      ...body, updatedAt: new Date(),
    };
    if (body.isPublic && !existing.shareSlug) {
      updates.shareSlug = await generateUniqueSlug(db);
    }

    const [updated] = await db.update(loadouts).set(updates)
      .where(eq(loadouts.id, request.params.id)).returning();
    return updated;
  });

  app.delete<{ Params: { id: string } }>('/loadouts/:id', async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });
    const [existing] = await db.select().from(loadouts).where(eq(loadouts.id, request.params.id));
    if (!existing) return reply.status(404).send({ error: 'Not found' });
    if (existing.userId !== request.userId) return reply.status(403).send({ error: 'Forbidden' });
    await db.delete(loadouts).where(eq(loadouts.id, request.params.id));
    return reply.status(204).send();
  });

  app.put<{ Params: { id: string }; Body: unknown }>('/loadouts/:id/slots', async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });
    const [loadout] = await db.select().from(loadouts).where(eq(loadouts.id, request.params.id));
    if (!loadout) return reply.status(404).send({ error: 'Not found' });
    if (loadout.userId !== request.userId) return reply.status(403).send({ error: 'Forbidden' });

    const { slots } = BulkSlotsSchema.parse(request.body);
    await db.delete(loadoutSlots).where(eq(loadoutSlots.loadoutId, loadout.id));
    if (slots.length > 0) {
      await db.insert(loadoutSlots).values(slots.map(s => ({ ...s, loadoutId: loadout.id })));
    }
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/loadouts/:id/like', async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });
    const [loadout] = await db.select().from(loadouts).where(eq(loadouts.id, request.params.id));
    if (!loadout || !loadout.isPublic) return reply.status(404).send({ error: 'Not found' });

    const [existing] = await db.select().from(loadoutLikes)
      .where(and(eq(loadoutLikes.userId, request.userId), eq(loadoutLikes.loadoutId, loadout.id)));

    if (existing) {
      await db.delete(loadoutLikes)
        .where(and(eq(loadoutLikes.userId, request.userId), eq(loadoutLikes.loadoutId, loadout.id)));
      await db.update(loadouts).set({ likesCount: sql`${loadouts.likesCount} - 1` })
        .where(eq(loadouts.id, loadout.id));
      return { liked: false };
    } else {
      await db.insert(loadoutLikes).values({ userId: request.userId, loadoutId: loadout.id });
      await db.update(loadouts).set({ likesCount: sql`${loadouts.likesCount} + 1` })
        .where(eq(loadouts.id, loadout.id));
      return { liked: true };
    }
  });

  app.get<{ Params: { slug: string } }>('/share/:slug', async (request, reply) => {
    const [loadout] = await db.select().from(loadouts)
      .where(and(eq(loadouts.shareSlug, request.params.slug), eq(loadouts.isPublic, true)));
    if (!loadout) return reply.status(404).send({ error: 'Not found' });
    const slots = await db.select().from(loadoutSlots).where(eq(loadoutSlots.loadoutId, loadout.id));
    return { ...loadout, slots };
  });

  app.get<{ Params: { steamId: string } }>('/users/:steamId/loadouts', async (request, reply) => {
    return db.select().from(loadouts)
      .where(and(eq(loadouts.userId, request.params.steamId), eq(loadouts.isPublic, true)));
  });
}
```

- [ ] **Step 4: Register route in app.ts**

```typescript
import { loadoutRoutes } from './routes/loadouts.js';
// In buildApp:
await app.register(loadoutRoutes, { db: opts.db ?? defaultDb });
```

- [ ] **Step 5: Run tests (expect pass)**

```bash
pnpm --filter @lb/api test src/routes/__tests__/loadouts.test.ts
```
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/loadouts.ts
git commit -m "feat(api): add loadout CRUD, slots, sharing, and likes"
```

---

## Task 8: Steam Inventory Proxy

**Files:**
- Create: `apps/api/src/services/steam-inventory.ts`
- Create: `apps/api/src/services/cache.ts`
- Create: `apps/api/src/routes/inventory.ts`
- Test: `apps/api/src/routes/__tests__/inventory.test.ts`

- [ ] **Step 1: Create apps/api/src/services/cache.ts**

```typescript
interface CacheEntry<T> { value: T; expiresAt: number }

export function createCache<T>(ttlMs: number) {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | null {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) { store.delete(key); return null; }
      return entry.value;
    },
    set(key: string, value: T) {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    delete(key: string) { store.delete(key); },
  };
}
```

- [ ] **Step 2: Create apps/api/src/services/steam-inventory.ts**

```typescript
import type { Db } from '../db/index.js';
import { skins } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { InventoryItem } from '@lb/shared';

interface SteamAsset { classid: string; instanceid: string; amount: string }
interface SteamDescription {
  classid: string; instanceid: string; market_hash_name: string;
  icon_url: string;
  tags: Array<{ category: string; internal_name: string }>;
}

export async function fetchCs2Inventory(steamId: string): Promise<InventoryItem[]> {
  const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=500`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(`Steam inventory error: ${res.status}`);
  const data = await res.json() as { assets: SteamAsset[]; descriptions: SteamDescription[] };
  return data.descriptions ?? [];
}

export async function parseInventoryItems(
  steamDescriptions: SteamDescription[],
  db: Db
): Promise<InventoryItem[]> {
  const results: InventoryItem[] = [];

  for (const desc of steamDescriptions) {
    const defIndexTag = desc.tags.find(t => t.category === 'Type');
    const paintKitTag = desc.tags.find(t => t.category === 'Quality');

    // Extract float/seed from market_hash_name if available
    // CS2 inventory items store wear in market_hash_name e.g. "AK-47 | Redline (Field-Tested)"
    const wearMap: Record<string, number> = {
      'Factory New': 0.07, 'Minimal Wear': 0.15, 'Field-Tested': 0.38,
      'Well-Worn': 0.45, 'Battle-Scarred': 0.75,
    };
    const wearMatch = desc.market_hash_name.match(/\(([^)]+)\)$/);
    const wear = wearMatch ? (wearMap[wearMatch[1]!] ?? 0.5) : 0.5;

    // Find matching skin in DB by market_hash_name prefix
    const weaponSkinName = desc.market_hash_name.replace(/ \([^)]+\)$/, '');
    const [skinRow] = await db.select().from(skins)
      .where(eq(skins.name, weaponSkinName.split(' | ')[1] ?? ''));

    if (!skinRow) continue;

    results.push({
      weaponDefIndex: skinRow.weaponDefIndex,
      skinId: skinRow.id,
      wear,
      seed: 500, // seed not available from inventory API directly
      statTrak: desc.market_hash_name.startsWith('StatTrak™'),
      // NOTE: seed=500 is intentional — Steam's inventory API does not expose the
      // pattern seed. Users can manually adjust the seed in the builder after import.
      iconUrl: `https://community.cloudflare.steamstatic.com/economy/image/${desc.icon_url}`,
      marketHashName: desc.market_hash_name,
    });
  }

  return results;
}
```

- [ ] **Step 3: Create apps/api/src/routes/inventory.ts**

```typescript
import type { FastifyInstance } from 'fastify';
import { fetchCs2Inventory, parseInventoryItems } from '../services/steam-inventory.js';
import { createCache } from '../services/cache.js';
import type { Db } from '../db/index.js';
import type { InventoryItem } from '@lb/shared';

const inventoryCache = createCache<InventoryItem[]>(5 * 60 * 1000); // 5 min TTL

export async function inventoryRoutes(app: FastifyInstance, opts: { db: Db }) {
  app.get('/inventory', {
    config: { rateLimit: { max: 2, timeWindow: '30s' } },
  }, async (request, reply) => {
    if (!request.userId) return reply.status(401).send({ error: 'Unauthorized' });

    const cached = inventoryCache.get(request.userId);
    if (cached) return cached;

    const descriptions = await fetchCs2Inventory(request.userId);
    const items = await parseInventoryItems(descriptions, opts.db);
    inventoryCache.set(request.userId, items);
    return items;
  });
}
```

- [ ] **Step 4: Write inventory tests**

Create `apps/api/src/routes/__tests__/inventory.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestDb, type TestDb } from '../../test-utils/db.js';
import { seedWeapons, seedSkins, seedUser } from '../../test-utils/fixtures.js';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

vi.mock('../../services/steam-inventory.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/steam-inventory.js')>();
  return {
    ...original,
    fetchCs2Inventory: vi.fn().mockResolvedValue([
      {
        classid: '1', instanceid: '1',
        market_hash_name: 'AK-47 | Redline (Field-Tested)',
        icon_url: 'abc123',
        tags: [{ category: 'Type', internal_name: 'Rifle' }],
      },
    ]),
  };
});

let testDb: TestDb;
let app: FastifyInstance;

beforeAll(async () => {
  testDb = await createTestDb();
  await seedWeapons(testDb.db);
  await seedSkins(testDb.db);
  await seedUser(testDb.db);
  app = await buildApp({ db: testDb.db, jwtSecret: 'test-secret-32-chars-minimum-len' });
}, 60_000);

afterAll(async () => { await app.close(); await testDb.cleanup(); });

describe('GET /inventory', () => {
  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/inventory' });
    expect(res.statusCode).toBe(401);
  });

  it('returns parsed inventory items', async () => {
    const token = app.jwt.sign({ steamId: '76561198000000001' });
    const res = await app.inject({
      method: 'GET', url: '/inventory',
      cookies: { token },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });
});
```

- [ ] **Step 5: Register + run tests**

Add `await app.register(inventoryRoutes, { db: opts.db ?? defaultDb })` to `app.ts`.

```bash
pnpm --filter @lb/api test src/routes/__tests__/inventory.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services apps/api/src/routes/inventory.ts
git commit -m "feat(api): add Steam inventory proxy with 5min cache"
```

---

## Task 9: Price Aggregation API

**Files:**
- Create: `apps/api/src/services/prices.ts`
- Create: `apps/api/src/routes/prices.ts`
- Test: `apps/api/src/routes/__tests__/prices.test.ts`

- [ ] **Step 1: Create apps/api/src/services/prices.ts**

```typescript
import type { Db } from '../db/index.js';
import { priceCache } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import type { PriceData, PriceSource } from '@lb/shared';

type PriceFetcher = (skinId: number) => Promise<PriceData>;

export const STEAM_TTL = 15 * 60 * 1000;

async function fetchSteamPrice(skinId: number, marketHashName: string): Promise<PriceData> {
  const encoded = encodeURIComponent(marketHashName);
  const url = `https://steamcommunity.com/market/priceoverview/?currency=1&appid=730&market_hash_name=${encoded}`;
  const res = await fetch(url);
  const data = await res.json() as { success: boolean; lowest_price?: string };
  const price = data.success && data.lowest_price
    ? parseFloat(data.lowest_price.replace(/[^0-9.]/g, ''))
    : null;
  return { skinId, source: 'steam', price, currency: 'USD', listingUrl: null, updatedAt: new Date().toISOString() };
}

async function fetchCsFloatPrice(skinId: number): Promise<PriceData> {
  // CSFloat public price endpoint
  const url = `https://csfloat.com/api/v1/meta/prices?app_id=730`;
  // In production: use CSFloat API with skinId mapping
  // For now returns null (needs CSFloat API key for detailed listings)
  return { skinId, source: 'csfloat', price: null, currency: 'USD', listingUrl: `https://csfloat.com/`, updatedAt: new Date().toISOString() };
}

async function fetchBitskinPrice(skinId: number): Promise<PriceData> {
  return { skinId, source: 'bitskin', price: null, currency: 'USD', listingUrl: `https://bitskins.com/`, updatedAt: new Date().toISOString() };
}

export async function getPrices(skinId: number, sources: PriceSource[], db: Db, marketHashName: string): Promise<PriceData[]> {
  const now = Date.now();
  const results: PriceData[] = [];
  const toFetch: PriceSource[] = [];

  for (const source of sources) {
    const [cached] = await db.select().from(priceCache)
      .where(and(eq(priceCache.skinId, skinId), eq(priceCache.source, source)));

    const age = cached ? now - new Date(cached.updatedAt).getTime() : Infinity;
    if (cached && age < STEAM_TTL) {
      results.push({ ...cached, updatedAt: cached.updatedAt.toISOString() });
    } else {
      toFetch.push(source);
      // stale-while-revalidate: serve stale immediately, refresh in background
      if (cached) results.push({ ...cached, updatedAt: cached.updatedAt.toISOString() });
    }
  }

  // Refresh stale/missing prices in background
  if (toFetch.length > 0) {
    const fetchers: Record<PriceSource, () => Promise<PriceData>> = {
      steam: () => fetchSteamPrice(skinId, marketHashName),
      csfloat: () => fetchCsFloatPrice(skinId),
      bitskin: () => fetchBitskinPrice(skinId),
    };

    (async () => {
      for (const source of toFetch) {
        try {
          const data = await fetchers[source]();
          await db.insert(priceCache).values({
            skinId: data.skinId, source: data.source, price: data.price,
            currency: data.currency, listingUrl: data.listingUrl,
          }).onConflictDoUpdate({
            target: [priceCache.skinId, priceCache.source],
            set: { price: data.price, listingUrl: data.listingUrl, updatedAt: new Date() },
          });
          if (!results.find(r => r.source === source)) results.push(data);
        } catch { /* swallow, price data is non-critical */ }
      }
    })();
  }

  return results;
}
```

- [ ] **Step 2: Create apps/api/src/routes/prices.ts**

```typescript
import type { FastifyInstance } from 'fastify';
import { getPrices } from '../services/prices.js';
import { skins } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.js';
import { PriceSourceSchema } from '@lb/shared';

export async function priceRoutes(app: FastifyInstance, opts: { db: Db }) {
  app.get<{ Querystring: { skinId: string; sources?: string } }>('/prices', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const skinId = parseInt(request.query.skinId, 10);
    if (isNaN(skinId)) return reply.status(400).send({ error: 'Invalid skinId' });

    const rawSources = (request.query.sources ?? 'steam,csfloat,bitskin').split(',');
    const sources = rawSources
      .map(s => PriceSourceSchema.safeParse(s.trim()))
      .filter(r => r.success)
      .map(r => r.data!);

    const [skin] = await opts.db.select().from(skins).where(eq(skins.id, skinId));
    if (!skin) return reply.status(404).send({ error: 'Skin not found' });

    return getPrices(skinId, sources, opts.db, skin.name);
  });
}
```

- [ ] **Step 3: Write and run tests**

Create `apps/api/src/routes/__tests__/prices.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestDb, type TestDb } from '../../test-utils/db.js';
import { seedWeapons, seedSkins } from '../../test-utils/fixtures.js';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';

vi.mock('../../services/prices.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/prices.js')>();
  return {
    ...original,
    getPrices: vi.fn().mockResolvedValue([
      { skinId: 1, source: 'steam', price: 5.23, currency: 'USD', listingUrl: null, updatedAt: new Date().toISOString() },
    ]),
  };
});

let testDb: TestDb;
let app: FastifyInstance;

beforeAll(async () => {
  testDb = await createTestDb();
  await seedWeapons(testDb.db);
  await seedSkins(testDb.db);
  app = await buildApp({ db: testDb.db });
}, 60_000);

afterAll(async () => { await app.close(); await testDb.cleanup(); });

describe('GET /prices', () => {
  it('returns price data for a skin', async () => {
    const res = await app.inject({ method: 'GET', url: '/prices?skinId=1' });
    expect(res.statusCode).toBe(200);
    expect(res.json()[0].source).toBe('steam');
  });

  it('returns 400 for invalid skinId', async () => {
    const res = await app.inject({ method: 'GET', url: '/prices?skinId=abc' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for unknown skin', async () => {
    const res = await app.inject({ method: 'GET', url: '/prices?skinId=9999' });
    expect(res.statusCode).toBe(404);
  });
});
```

Add `await app.register(priceRoutes, { db: opts.db ?? defaultDb })` to `app.ts`.

```bash
pnpm --filter @lb/api test src/routes/__tests__/prices.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/services/prices.ts apps/api/src/routes/prices.ts
git commit -m "feat(api): add price aggregation with stale-while-revalidate cache"
```

---

## Task 10: SvelteKit Skeleton

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/svelte.config.ts`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/app.html`
- Create: `apps/web/src/routes/+layout.ts`
- Create: `apps/web/src/routes/+layout.svelte`
- Create: `apps/web/src/routes/+page.svelte`
- Create: `apps/web/src/lib/api/client.ts`

- [ ] **Step 1: Create apps/web/package.json**

```json
{
  "name": "@lb/web",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "svelte-kit sync && tsc --noEmit"
  },
  "dependencies": {
    "@lb/shared": "workspace:*",
    "@sveltejs/kit": "^2.16.0",
    "@threlte/core": "^8.0.0",
    "@threlte/extras": "^8.0.0",
    "svelte": "^5.20.0",
    "three": "^0.171.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-static": "^3.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create apps/web/svelte.config.ts**

```typescript
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: 'index.html' }),
  },
};
```

- [ ] **Step 3: Create apps/web/vite.config.ts**

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
});
```

- [ ] **Step 4: Create apps/web/src/app.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

- [ ] **Step 5: Create apps/web/src/lib/api/client.ts**

```typescript
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}
```

- [ ] **Step 6: Create apps/web/src/routes/+layout.ts**

```typescript
// Auth guard: redirect unauthenticated users away from /builder
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { page } from '$app/state';

export const ssr = false; // SPA mode

export async function load() {
  return {};
}
```

> Note: The per-route guard for `/builder` goes in `apps/web/src/routes/builder/+page.ts` (Plan 3). The root layout just disables SSR globally.

- [ ] **Step 7: Create apps/web/src/routes/+layout.svelte**

```svelte
<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
```

- [ ] **Step 8: Create apps/web/src/app.css**

```css
@import "tailwindcss";
```

- [ ] **Step 9: Create apps/web/src/routes/+page.svelte**

```svelte
<script lang="ts">
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
</script>

<main class="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center">
  <h1 class="text-4xl font-bold mb-4">CS2 Loadout Builder</h1>
  <p class="text-gray-400 mb-8">Build and share your perfect CS2 loadout with 3D skin previews.</p>
  <a
    href="{API_URL}/auth/steam"
    class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
  >
    Login with Steam
  </a>
</main>
```

- [ ] **Step 10: Create stub routes**

Create `apps/web/src/routes/builder/+page.svelte`:
```svelte
<p>Builder — coming in Plan 3</p>
```

Create `apps/web/src/routes/share/[slug]/+page.svelte`:
```svelte
<script lang="ts">
  const { params } = $props();
</script>
<p>Share page for {params.slug} — coming in Plan 3</p>
```

Create `apps/web/src/routes/u/[steamId]/+page.svelte`:
```svelte
<script lang="ts">
  const { params } = $props();
</script>
<p>Profile for {params.steamId} — coming in Plan 3</p>
```

- [ ] **Step 11: Create apps/web/.env.example**

```
VITE_API_URL=http://localhost:3001
VITE_ASSETS_BASE_URL=http://localhost:3001/assets
VITE_TEXTURE_CACHE_SIZE=16
```

- [ ] **Step 12: Install and verify**

```bash
pnpm install
pnpm --filter @lb/web dev
```
Expected: SvelteKit dev server running on `http://localhost:5173`. Landing page visible.

- [ ] **Step 13: Commit**

```bash
git add apps/web
git commit -m "feat(web): add SvelteKit SPA skeleton with Tailwind and auth landing"
```

---

## Task 11: Full Test Run + Typecheck

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```
Expected: All unit + integration tests PASS across `packages/shared` and `apps/api`.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```
Expected: No TypeScript errors.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: plan 1 complete — API foundation fully tested"
```

---

## Verification

1. Start API: `cd apps/api && cp .env.example .env` (fill in values) → `pnpm dev`
2. Visit `http://localhost:3001/health` → `{ "status": "ok" }`
3. Visit `http://localhost:5173` → Landing page with Steam login button
4. Click "Login with Steam" → redirects to Steam → back to `/builder` stub
5. `GET http://localhost:3001/weapons` → grouped weapon catalogue
6. `GET http://localhost:3001/weapons/7/skins` → AK-47 skins list
