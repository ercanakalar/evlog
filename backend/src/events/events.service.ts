import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import type { Env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';

/** What the app keeps cached, by the names its API client uses. */
export type DataTag = 'Me' | 'Household' | 'Receipt' | 'Item' | 'HomeItem' | 'List' | 'Insights';
export const ALL_TAGS: DataTag[] = ['Me', 'Household', 'Receipt', 'Item', 'HomeItem', 'List', 'Insights'];

export type LiveEvent =
  /** Something in the household changed: its members' apps fetch these again. */
  | { kind: 'changed'; household: string; tags: DataTag[]; by?: string }
  /** The person joined or left a household, or deleted their account. */
  | { kind: 'moved'; user: string }
  /** This instance may have missed events: every app fetches everything again. */
  | { kind: 'resync' };

const CHANNEL = 'raf_live';
/** Migrations and LISTEN need the database itself, not a pooler that drops session state. */
const direct = (url: string) => url.replace(/-pooler(?=\.[^/@]*\.neon\.tech)/, '');

/**
 * Tells everyone in a household that its data changed, on every instance of
 * the API: each sends a Postgres NOTIFY, and each instance LISTENs and
 * passes what it hears to the apps connected to it.
 */
@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private readonly handlers = new Set<(event: LiveEvent) => void>();
  private listener?: Client;
  private retry?: NodeJS.Timeout;
  private retryMs = 1_000;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit() {
    void this.listen();
  }

  async onModuleDestroy() {
    this.stopped = true;
    clearTimeout(this.retry);
    await this.listener?.end().catch(() => undefined);
  }

  /** Called with every event any instance sends. */
  subscribe(handler: (event: LiveEvent) => void) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /** Never throws: a missed update is fetched on the app's next refresh. */
  changed(household: string, tags: DataTag[], by?: string) {
    return this.send({ kind: 'changed', household, tags, by });
  }

  moved(user: string) {
    return this.send({ kind: 'moved', user });
  }

  private async send(event: LiveEvent) {
    try {
      await this.prisma.$executeRaw`SELECT pg_notify(${CHANNEL}, ${JSON.stringify(event)})`;
    } catch (error) {
      this.logger.warn(`Could not send a live update: ${String(error)}`);
    }
  }

  private emit(event: LiveEvent) {
    for (const handler of this.handlers) handler(event);
  }

  private async listen() {
    const client = new Client({ connectionString: direct(this.config.get('DATABASE_URL', { infer: true })) });
    // Errors also end the connection; listening starts again after a pause.
    client.on('error', (error) => this.logger.warn(`Live updates lost the database: ${error.message}`));
    client.on('end', () => this.reconnect(client));
    client.on('notification', (message) => {
      if (message.channel !== CHANNEL || !message.payload) return;
      try {
        this.emit(JSON.parse(message.payload) as LiveEvent);
      } catch {
        // Not ours.
      }
    });
    try {
      await client.connect();
      await client.query(`LISTEN ${CHANNEL}`);
      const missedSome = this.listener !== undefined;
      this.listener = client;
      this.retryMs = 1_000;
      if (missedSome) this.emit({ kind: 'resync' });
    } catch (error) {
      this.logger.warn(`Live updates could not listen: ${String(error)}`);
      await client.end().catch(() => undefined);
      this.reconnect(client);
    }
  }

  private reconnect(client: Client) {
    if (this.stopped || (this.listener && this.listener !== client)) return;
    clearTimeout(this.retry);
    this.retry = setTimeout(() => void this.listen(), this.retryMs);
    this.retryMs = Math.min(this.retryMs * 2, 30_000);
  }
}
