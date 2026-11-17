import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Home, Tenancy } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type HomeRole = 'OWNER' | 'TENANT';

export interface HomeAccess {
  home: Home;
  role: HomeRole;
  /** The caller's active tenancy when role is TENANT. */
  tenancy?: Tenancy;
  /** The home's current active tenancy, whoever the caller is. */
  activeTenancy?: Tenancy;
}

/**
 * Single place that decides who may touch a home. Unknown homes and homes the
 * caller has no link to both return 404 so ids cannot be probed.
 */
@Injectable()
export class HomeAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async get(
    homeId: string,
    userId: string,
    allowed: HomeRole[] = ['OWNER', 'TENANT'],
  ): Promise<HomeAccess> {
    const home = await this.prisma.home.findUnique({
      where: { id: homeId },
      include: {
        tenancies: { where: { status: 'ACTIVE' }, take: 1 },
      },
    });
    if (!home) throw new NotFoundException('Home not found');

    const { tenancies, ...plainHome } = home;
    const activeTenancy = tenancies[0];
    let access: HomeAccess | undefined;
    if (home.ownerId === userId) {
      access = { home: plainHome, role: 'OWNER', activeTenancy };
    } else if (activeTenancy?.tenantId === userId) {
      access = {
        home: plainHome,
        role: 'TENANT',
        tenancy: activeTenancy,
        activeTenancy,
      };
    }
    if (!access) throw new NotFoundException('Home not found');
    if (!allowed.includes(access.role)) {
      throw new ForbiddenException(
        `Only the ${allowed.join(' or ').toLowerCase()} can do this`,
      );
    }
    return access;
  }
}
