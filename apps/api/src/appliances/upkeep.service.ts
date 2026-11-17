import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplianceType } from '../generated/prisma/enums';
import { HomeAccessService } from '../homes/home-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, DAY_MS } from '../common/utils/normalize';
import {
  CompleteTaskDto,
  CreateApplianceDto,
  CreateTaskDto,
  UpdateApplianceDto,
} from './dto/appliance.dto';

/** Recommended schedules used when the user does not supply their own. */
export const DEFAULT_TASKS: Record<ApplianceType, { title: string; intervalDays: number }[]> = {
  COMBI_BOILER: [{ title: 'Yearly service', intervalDays: 365 }],
  DISHWASHER: [{ title: 'Clean filter', intervalDays: 30 }],
  WASHING_MACHINE: [{ title: 'Drum clean', intervalDays: 30 }],
  DRYER: [{ title: 'Clean condenser', intervalDays: 30 }],
  AIR_CONDITIONER: [{ title: 'Clean filters', intervalDays: 90 }],
  REFRIGERATOR: [{ title: 'Clean coils', intervalDays: 180 }],
  OVEN: [{ title: 'Deep clean', intervalDays: 90 }],
  WATER_HEATER: [{ title: 'Descale and service', intervalDays: 365 }],
  WATER_PURIFIER: [{ title: 'Replace filter', intervalDays: 180 }],
  OTHER: [],
};

const daysUntil = (date: Date, now = new Date()) =>
  Math.ceil((date.getTime() - now.getTime()) / DAY_MS);

@Injectable()
export class UpkeepService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HomeAccessService,
  ) {}

  async list(homeId: string, userId: string) {
    await this.access.get(homeId, userId);
    const appliances = await this.prisma.appliance.findMany({
      where: { homeId },
      include: { tasks: { orderBy: { nextDueAt: 'asc' } } },
    });
    const now = new Date();
    return appliances
      .map((a) => ({
        ...a,
        hasReceipt: a.receiptId !== null,
        tasks: a.tasks.map((t) => ({ ...t, daysLeft: daysUntil(t.nextDueAt, now) })),
      }))
      .sort(
        (a, b) =>
          (a.tasks[0]?.nextDueAt.getTime() ?? Infinity) -
          (b.tasks[0]?.nextDueAt.getTime() ?? Infinity),
      );
  }

  /** The single most urgent task, highlighted on the Home and Upkeep tabs. */
  async nextDue(homeId: string) {
    const task = await this.prisma.maintenanceTask.findFirst({
      where: { appliance: { homeId } },
      orderBy: { nextDueAt: 'asc' },
      include: { appliance: { select: { id: true, name: true, type: true } } },
    });
    return task ? { ...task, daysLeft: daysUntil(task.nextDueAt) } : null;
  }

  async create(homeId: string, userId: string, dto: CreateApplianceDto) {
    await this.access.get(homeId, userId);
    if (dto.receiptId) await this.assertOwnReceipt(dto.receiptId, userId);
    const tasks: CreateTaskDto[] = dto.tasks ?? DEFAULT_TASKS[dto.type];
    const { tasks: _ignored, purchasedAt, warrantyUntil, ...fields } = dto;
    return this.prisma.appliance.create({
      data: {
        ...fields,
        homeId,
        purchasedAt: purchasedAt ? new Date(purchasedAt) : undefined,
        warrantyUntil: warrantyUntil ? new Date(warrantyUntil) : undefined,
        tasks: { create: tasks.map((t) => this.taskData(t)) },
      },
      include: { tasks: true },
    });
  }

  async update(applianceId: string, userId: string, dto: UpdateApplianceDto) {
    await this.appliance(applianceId, userId);
    if (dto.receiptId) await this.assertOwnReceipt(dto.receiptId, userId);
    const { purchasedAt, warrantyUntil, ...fields } = dto;
    return this.prisma.appliance.update({
      where: { id: applianceId },
      data: {
        ...fields,
        ...(purchasedAt ? { purchasedAt: new Date(purchasedAt) } : {}),
        ...(warrantyUntil ? { warrantyUntil: new Date(warrantyUntil) } : {}),
      },
      include: { tasks: true },
    });
  }

  async remove(applianceId: string, userId: string) {
    const appliance = await this.prisma.appliance.findUnique({ where: { id: applianceId } });
    if (!appliance) throw new NotFoundException('Appliance not found');
    await this.access.get(appliance.homeId, userId, ['OWNER']);
    await this.prisma.appliance.delete({ where: { id: applianceId } });
  }

  async addTask(applianceId: string, userId: string, dto: CreateTaskDto) {
    await this.appliance(applianceId, userId);
    return this.prisma.maintenanceTask.create({
      data: { applianceId, ...this.taskData(dto) },
    });
  }

  /** "Mark as done": logs the work and schedules the next one. */
  async complete(taskId: string, userId: string, dto: CompleteTaskDto) {
    const task = await this.prisma.maintenanceTask.findUnique({
      where: { id: taskId },
      include: { appliance: { select: { homeId: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');
    await this.access.get(task.appliance.homeId, userId);
    if (dto.receiptId) await this.assertOwnReceipt(dto.receiptId, userId);
    const doneAt = dto.doneAt ? new Date(dto.doneAt) : new Date();
    if (doneAt > new Date()) throw new BadRequestException('doneAt is in the future');

    const [, updated] = await this.prisma.$transaction([
      this.prisma.maintenanceLog.create({
        data: { taskId, doneById: userId, doneAt, note: dto.note, receiptId: dto.receiptId },
      }),
      this.prisma.maintenanceTask.update({
        where: { id: taskId },
        data: { lastDoneAt: doneAt, nextDueAt: addDays(doneAt, task.intervalDays) },
      }),
    ]);
    return { ...updated, daysLeft: daysUntil(updated.nextDueAt) };
  }

  async history(taskId: string, userId: string) {
    const task = await this.prisma.maintenanceTask.findUnique({
      where: { id: taskId },
      include: { appliance: { select: { homeId: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');
    await this.access.get(task.appliance.homeId, userId);
    return this.prisma.maintenanceLog.findMany({
      where: { taskId },
      orderBy: { doneAt: 'desc' },
      include: { doneBy: { select: { id: true, fullName: true } } },
    });
  }

  private taskData(dto: CreateTaskDto) {
    const lastDoneAt = dto.lastDoneAt ? new Date(dto.lastDoneAt) : null;
    return {
      title: dto.title,
      intervalDays: dto.intervalDays,
      lastDoneAt,
      nextDueAt: addDays(lastDoneAt ?? new Date(), dto.intervalDays),
    };
  }

  private async appliance(applianceId: string, userId: string) {
    const appliance = await this.prisma.appliance.findUnique({ where: { id: applianceId } });
    if (!appliance) throw new NotFoundException('Appliance not found');
    await this.access.get(appliance.homeId, userId);
    return appliance;
  }

  private async assertOwnReceipt(receiptId: string, userId: string) {
    const receipt = await this.prisma.receipt.findUnique({ where: { id: receiptId } });
    if (!receipt || receipt.userId !== userId) {
      throw new BadRequestException('Unknown receipt');
    }
  }
}
