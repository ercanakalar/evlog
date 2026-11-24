import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import type { Env } from '../config/env.validation';

/**
 * node-postgres ignores Prisma's `?schema=` URL parameter, so it is applied
 * twice: to the adapter (generated queries) and to the connection's
 * search_path (raw SQL).
 */
const poolConfig = (databaseUrl: string) => {
  const url = new URL(databaseUrl);
  const schema = url.searchParams.get('schema') ?? 'public';
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    throw new Error(`Invalid database schema name: ${schema}`);
  }
  url.searchParams.delete('schema');
  return {
    schema,
    pool: {
      connectionString: url.toString(),
      // Reconnecting to a hosted database takes about a second; the default is 10 s.
      idleTimeoutMillis: 60_000,
      // Poolers (Neon, PgBouncer) refuse start-up options; "public" needs none.
      ...(schema === 'public' ? {} : { options: `-c search_path="${schema}"` }),
    },
  };
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService<Env, true>) {
    const { pool, schema } = poolConfig(config.get('DATABASE_URL', { infer: true }));
    super({
      adapter: new PrismaPg(pool, { schema }),
      // Saving a long receipt is dozens of queries, which adds up on a hosted
      // database; the default limit is 5 seconds.
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
