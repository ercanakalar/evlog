import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  /** Whose receipts, shelf, at-home counts and lists this person shares. */
  householdId: string;
}

/** Who acts (their own settings apply) and the household whose data it is. */
export type Member = Pick<AuthUser, 'id' | 'householdId'>;

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as AuthUser;
  },
);
