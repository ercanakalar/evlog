import { Controller, Delete, Get, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AccountDeletionService } from './account-deletion.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('me')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountDeletionService,
  ) {}

  /** The signed-in user with the homes they own or rent. */
  @Get()
  async me(@CurrentUser() user: AuthUser) {
    const [profile, owned, rented] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { id: true, email: true, fullName: true, phone: true, createdAt: true },
      }),
      this.prisma.home.findMany({
        where: { ownerId: user.id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.tenancy.findMany({
        where: { tenantId: user.id, status: 'ACTIVE' },
        include: { home: true },
      }),
    ]);
    return {
      ...profile,
      homes: [
        ...owned.map((home) => ({ role: 'OWNER' as const, home })),
        ...rented.map((t) => ({ role: 'TENANT' as const, home: t.home, tenancyId: t.id })),
      ],
    };
  }
  /** Deletes the account; see AccountDeletionService for what stays with others. */
  @Delete()
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser) {
    return this.accounts.remove(user.id);
  }
}
