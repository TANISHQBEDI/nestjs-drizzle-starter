# NestJS + Drizzle ORM

This project is a backend service built with **NestJS** and **Drizzle ORM** using **PostgreSQL**. The repository is already wired with a basic Drizzle setup so you can start defining tables and writing queries immediately.

---

## 1. Requirements

Make sure you have the following installed before you start:

- **Node.js**: >= 20 (LTS recommended)
- **pnpm**: >= 8 (project uses `pnpm-lock.yaml`)
- **PostgreSQL**: >= 14
- **Docker & Docker Compose** (optional but recommended – used via `compose.yaml`)

Environment variables:

- `DATABASE_URL` – PostgreSQL connection string, e.g.
  - `postgres://user:password@localhost:5432/db_name`

Depending on your `ConfigService` setup (see `src/config/env.ts`), you’ll usually also have:

- `NODE_ENV` or `env` – environment (e.g. `development`, `production`)
- Any other app-specific variables you define in `env.ts`

---

## 2. Install dependencies

From the project root :

```bash
pnpm install
```

If you prefer npm or yarn you can adapt, but pnpm is the default and recommended.

---

## 3. Database & Drizzle Setup Overview

### 3.1. Drizzle config

The Drizzle config lives in `drizzle.config.ts`:

- Uses the `postgresql` dialect
- Reads `DATABASE_URL` from your environment
- Points to the schema entry file at `./src/common/databases/drizzle/schema/index.ts`

```ts
export default defineConfig({
  schema: './src/common/databases/drizzle/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 3.2. Drizzle module

The NestJS module that exposes the Drizzle connection is `src/common/databases/drizzle/drizzle.module.ts`.

- Uses `pg.Pool` under the hood
- Creates a Drizzle instance with the schema from `src/common/databases/drizzle/schema`
- Exports a `DRIZZLE` injection token
- Uses `ConfigService` to read the database URL

```ts
export const DRIZZLE = Symbol('drizzle-connection');

@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const databaseUrl: string = configService.getOrThrow('database.url');
        const pool = new Pool({
          connectionString: databaseUrl,
          ssl: configService.getOrThrow('env') === 'production',
        });
        return drizzle(pool, { schema }) as DrizzleDB;
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
```

> In production, SSL is enabled automatically based on the `env` config value.

### 3.3. Existing schema

The base schema is in `src/common/databases/drizzle/schema`:

- `auth.schema.ts` – contains tables:
  - `users`
  - `oauth_accounts`
  - `refresh_tokens`
- `utils.ts` – shared timestamp columns
- `index.ts` – re-exports schema files for Drizzle

These are already wired into Drizzle and will be pushed to your database via migrations.

---

## 4. Running the database

### Option A – Using Docker (recommended)

If your `compose.yaml` defines a Postgres service (typical for local dev):

```bash
pnpm dcup
```

This will run:

```json
"dcup": "docker compose up -d"
```

To stop and remove containers/volumes:

```bash
pnpm dcdown
```

> Check `compose.yaml` to adjust database name, user, and password and make sure your `DATABASE_URL` matches those values.

### Option B – Local Postgres

If you run PostgreSQL locally (outside Docker):

1. Create a database, e.g. `db_name`.
2. Set `DATABASE_URL` accordingly.
3. Ensure the DB is reachable from your Nest server.

---

## 5. Applying schema to the database (Drizzle migrations)

Once `DATABASE_URL` is set and the database is running, push the existing schema:

```bash
pnpm db:push
```

This runs:

```json
"db:push": "npx drizzle-kit push"
```

It will create the `users`, `oauth_accounts`, and `refresh_tokens` tables (and any additional tables you export from `schema/index.ts`).

---

## 6. Starting the NestJS server

### Development mode

```bash
pnpm start:dev
```

### Production build

```bash
pnpm build
pnpm start:prod
```

By default, Nest will bootstrap from `src/main.ts` and load `AppModule` (see `src/app.module.ts`). Make sure `DrizzleModule` is imported into `AppModule` or appropriate feature modules.

---

## 7. Using Drizzle in your NestJS code

### 7.1. Injecting the Drizzle connection

Anywhere you need database access, inject the Drizzle connection using the `DRIZZLE` token and the `DrizzleDB` type:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/common/databases/drizzle/drizzle.module';
import { DrizzleDB } from 'src/common/databases/drizzle/types/drizzle';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}
}
```

Make sure the module that provides `UsersService` imports `DrizzleModule` so the provider is available.

### 7.2. Reading data

Use `db.query.<table>` helpers or the fluent query builder:

```ts
import { usersTable } from 'src/common/databases/drizzle/schema/auth.schema';

// Example: find all users
const users = await this.db.select().from(usersTable);

// Example: using query API (if generated by drizzle)
// const users = await this.db.query.usersTable.findMany();
```

### 7.3. Writing data

```ts
import { usersTable } from 'src/common/databases/drizzle/schema/auth.schema';

// Insert
await this.db.insert(usersTable).values({
  email: 'test@example.com',
  hashedPassword: 'hashed-password',
});

// Update
await this.db
  .update(usersTable)
  .set({ emailVerified: true })
  .where(eq(usersTable.id, userId));

// Delete
await this.db.delete(usersTable).where(eq(usersTable.id, userId));
```

### 7.4. Transactions

```ts
await this.db.transaction(async (tx) => {
  // use `tx` instead of `this.db` inside the transaction
});
```

---

## 8. Adding new tables / extending the schema

1. **Create a new schema file** under `src/common/databases/drizzle/schema/`, e.g. `appointments.schema.ts`.
2. **Define your table(s)** using Drizzle’s `pgTable` helpers.
3. **Export** them from `schema/index.ts`, e.g.

   ```ts
   export * from './auth.schema';
   ```

4. **Run migrations** to apply the changes:

   ```bash
   pnpm db:push
   ```

5. **Use in code** by importing from your new schema file and issuing queries via the injected `DrizzleDB` instance.

---

## 9. Running tests

Unit tests:

```bash
pnpm test
```

E2E tests:

```bash
pnpm test:e2e
```

Coverage:

```bash
pnpm test:cov
```

---

## 10. Quick start checklist

1. Install dependencies: `pnpm install`
2. Start Postgres (Docker: `pnpm dcup` or local DB)
3. Set `DATABASE_URL` in `.env` or your environment
4. Push schema: `pnpm db:push`
5. Start dev server: `pnpm start:dev`
6. Inject `DRIZZLE` and start writing queries

