import {
  uuid,
  text,
  varchar,
  boolean,
  pgTable,
  bigint,
  timestamp,
} from 'drizzle-orm/pg-core';
import { createdAt, timestamps } from './utils';
import { check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { uniqueIndex } from 'drizzle-orm/pg-core';

export const usersTable = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    email: varchar('email', { length: 255 }).unique().notNull(),
    hashedPassword: text('hashed_password'),

    emailVerified: boolean('email_verified').default(false),

    role: varchar('role', { length: 20 }).default('doctor').notNull(),

    ...timestamps,
  },
  (table) => [
    check('role_check', sql`${table.role} IN ('doctor', 'patient', 'admin')`),
    uniqueIndex('unique_email_index').on(table.email),
  ],
);

export const oauthAccountsTable = pgTable('oauth_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => usersTable.id, { onDelete: 'cascade' })
    .notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerUserId: varchar('provider_user_id', { length: 255 })
    .unique()
    .notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),

  expiresAt: bigint('expires_at', { mode: 'bigint' }),

  ...createdAt,
});

export const refreshTokensTable = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => usersTable.id, { onDelete: 'cascade' })
    .notNull(),
  hashedToken: text('hashed_token').notNull(),

  expiresAt: timestamp('expires_at').notNull(),
  ...createdAt,

  revoked: boolean('revoked').default(false),

  replacedBy: uuid('replaced_by').references(() => refreshTokensTable.id),
});
