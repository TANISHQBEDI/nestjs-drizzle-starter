import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from './schema';
import { DrizzleDB } from './types/drizzle';

/**
 * Drizzle Database Module
 * Provides a Drizzle ORM database connection using PostgresSQL.
 * The connection is configured using environment variables managed by ConfigService.
 * The module exports a provider identified by the DRIZZLE token for injection into other parts of the application.
 *
 * Usage:
 *
 *  ADD TABLE :
 *  To add new tables define schema in /schema/ and export it from schema/index.ts and run npx drizzle-kit push or pnpm run db:push
 *
 *  INJECTING THE CONNECTION:
 *  To use this module add the service to the constructor as follows:
 *  constructor (@Inject(DRIZZLE) private readonly db: DrizzleDB) { }
 *
 *  READING DATA:
 *  To read data can use db.query(...) methods.
 *
 *  WRITING DATA:
 *  To write data use db.insert(...).values(...), db.update(...).set(...).where(...) and db.delete(...).where(...) methods.
 *
 *  TRANSACTIONS:
 *  To perform transactions use db.transaction( async(tx) => { ... } ) method.
 *
 *
 */

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

          // Enable SSL in production environment
          ssl: configService.getOrThrow('env') === 'production',
        });
        try {
          await Promise.race([
            pool.connect(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('DB timeout')), 2000),
            ),
          ]);
          console.log("Database connection established")
        } catch (error) {
          console.error('DB warmup failed:', error);
          // Don't throw - let Drizzle handle lazy connections
        }
        return drizzle(pool, {
          schema,
        }) as DrizzleDB;
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
