import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

/** Reads the role on every request, so taking it away works immediately. */
@Injectable()
export class ModeratorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest<{ user: AuthUser }>();
    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    if (account?.role !== 'MODERATOR') throw new ForbiddenException('Moderators only');
    return true;
  }
}
