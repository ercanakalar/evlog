import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService, type LiveEvent } from './events.service';

/** Where the app connects for live updates. */
export const EVENTS_PATH = '/api/v1/events';
/**
 * The app sends "raf" and its access token as WebSocket subprotocols: a
 * browser cannot set headers, and a token in the URL would end up in logs.
 */
const PROTOCOL = 'raf';
const PING_MS = 25_000;
/** Closed because the person's household changed: the app connects again at once. */
export const CLOSE_MOVED = 4001;
export const CLOSE_UNAUTHORIZED = 4401;

interface Connection {
  socket: WebSocket;
  userId: string;
  householdId: string;
  alive: boolean;
}

/**
 * Live updates: each app keeps one WebSocket open and is told which of its
 * household's data changed, so it fetches that again. Nothing else is sent;
 * the data itself always comes from the API.
 */
@Injectable()
export class EventsGateway implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(EventsGateway.name);
  private readonly server = new WebSocketServer({
    noServer: true,
    maxPayload: 1024,
    handleProtocols: (protocols) => (protocols.has(PROTOCOL) ? PROTOCOL : false),
  });
  private readonly connections = new Set<Connection>();
  private ping?: NodeJS.Timeout;
  private unsubscribe?: () => void;

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  onApplicationBootstrap() {
    const http = this.adapterHost.httpAdapter.getHttpServer() as Server;
    http.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      void this.upgrade(request, socket, head);
    });
    this.unsubscribe = this.events.subscribe((event) => this.deliver(event));
    // A phone that went away without closing is noticed and let go.
    this.ping = setInterval(() => {
      for (const c of this.connections) {
        if (!c.alive) {
          c.socket.terminate();
          continue;
        }
        c.alive = false;
        c.socket.ping();
      }
    }, PING_MS);
  }

  onApplicationShutdown() {
    clearInterval(this.ping);
    this.unsubscribe?.();
    for (const c of this.connections) c.socket.close(1001, 'Server restarting');
    this.server.close();
  }

  private async upgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
    if (new URL(request.url ?? '/', 'http://raf').pathname !== EVENTS_PATH) {
      socket.destroy();
      return;
    }
    const user = await this.authenticate(request);
    if (!user) {
      socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      return;
    }
    this.server.handleUpgrade(request, socket, head, (ws) => {
      const connection: Connection = { socket: ws, ...user, alive: true };
      this.connections.add(connection);
      ws.on('pong', () => (connection.alive = true));
      ws.on('close', () => this.connections.delete(connection));
      ws.on('error', () => ws.terminate());
      // Anything typed back is ignored; this channel only speaks.
      ws.on('message', () => undefined);
      ws.send(JSON.stringify({ type: 'hello' }));
    });
  }

  private async authenticate(request: IncomingMessage) {
    const offered = String(request.headers['sec-websocket-protocol'] ?? '')
      .split(',')
      .map((p) => p.trim());
    const token = offered.find((p) => p !== PROTOCOL);
    if (!offered.includes(PROTOCOL) || !token) return null;
    try {
      const { sub } = this.jwt.verify<{ sub: string }>(token);
      const user = await this.prisma.user.findUnique({ where: { id: sub }, select: { id: true, householdId: true } });
      return user ? { userId: user.id, householdId: user.householdId } : null;
    } catch {
      return null;
    }
  }

  private deliver(event: LiveEvent) {
    for (const c of this.connections) {
      if (event.kind === 'moved' && c.userId === event.user) {
        c.socket.close(CLOSE_MOVED, 'Household changed');
      } else if (event.kind === 'changed' && c.householdId === event.household) {
        c.socket.send(JSON.stringify({ type: 'changed', tags: event.tags, by: event.by }));
      } else if (event.kind === 'resync') {
        c.socket.send(JSON.stringify({ type: 'resync' }));
      }
    }
  }
}
