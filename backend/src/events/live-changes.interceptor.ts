import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { tap } from 'rxjs';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { EventsService, type DataTag } from './events.service';

/**
 * What a successful change under each part of the API can touch. Saving or
 * deleting a receipt reaches nearly everything (countdowns, at-home counts,
 * lists, spending, the profile's counts). Settings are personal, and
 * household changes are announced by the households service itself.
 */
const TOUCHES: Record<string, DataTag[]> = {
  receipts: ['Receipt', 'Item', 'HomeItem', 'List', 'Insights', 'Me'],
  items: ['Item', 'HomeItem', 'List', 'Insights'],
  'home-items': ['HomeItem', 'List'],
  lists: ['List'],
};

export function touchedBy(method: string, path: string): DataTag[] | null {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null;
  const area = /^\/api\/v\d+\/([^/?]+)/.exec(path)?.[1];
  return (area && TOUCHES[area]) || null;
}

/** After every change a member makes, tells the household's other apps what to fetch again. */
@Injectable()
export class LiveChangesInterceptor implements NestInterceptor {
  constructor(private readonly events: EventsService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthUser | undefined;
    const tags = user ? touchedBy(request.method, request.path) : null;
    if (!user || !tags) return next.handle();
    return next.handle().pipe(
      tap({ complete: () => void this.events.changed(user.householdId, tags, user.id) }),
    );
  }
}
