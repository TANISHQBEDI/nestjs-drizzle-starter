import { timestamp } from 'drizzle-orm/pg-core';

export const createdAt = {
  createdAt: timestamp('created_at').defaultNow(),
};

export const updatedAt = {
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
};

export const timestamps = {
  ...createdAt,
  ...updatedAt,
};
