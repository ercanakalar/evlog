/**
 * Demo data matching the design mockups: a 2+1 in Çankaya with an owner,
 * a tenant and a few appliances. Safe to run more than once.
 *
 *   owner:  demo.owner@evlog.app   / Demo1234
 *   tenant: demo.tenant@evlog.app  / Demo1234
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client';

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  const passwordHash = await argon2.hash('Demo1234', { type: argon2.argon2id });

  const owner = await prisma.user.upsert({
    where: { email: 'demo.owner@evlog.app' },
    update: {},
    create: { email: 'demo.owner@evlog.app', fullName: 'Demo Owner', passwordHash },
  });
  const tenant = await prisma.user.upsert({
    where: { email: 'demo.tenant@evlog.app' },
    update: {},
    create: { email: 'demo.tenant@evlog.app', fullName: 'Demo Tenant', passwordHash },
  });

  const existing = await prisma.home.findFirst({ where: { ownerId: owner.id } });
  if (existing) {
    console.log('Demo data already present.');
    await prisma.$disconnect();
    return;
  }

  const home = await prisma.home.create({
    data: {
      ownerId: owner.id,
      city: 'Ankara',
      district: 'Çankaya',
      neighborhood: 'Kavaklıdere',
      addressLine: 'Demo Sk. No: 1 D: 3',
      roomLayout: '2+1',
      areaM2: 95,
      tenancies: {
        create: { tenantId: tenant.id, status: 'ACTIVE', startDate: ago(80) },
      },
    },
  });

  const appliances: {
    type: 'COMBI_BOILER' | 'DISHWASHER' | 'WASHING_MACHINE' | 'AIR_CONDITIONER' | 'REFRIGERATOR';
    name: string;
    title: string;
    interval: number;
    lastDone: number;
  }[] = [
    { type: 'COMBI_BOILER', name: 'Combi boiler', title: 'Yearly service', interval: 365, lastDone: 356 },
    { type: 'DISHWASHER', name: 'Dishwasher', title: 'Clean filter', interval: 30, lastDone: 33 },
    { type: 'WASHING_MACHINE', name: 'Washing machine', title: 'Drum clean', interval: 30, lastDone: 16 },
    { type: 'AIR_CONDITIONER', name: 'Air conditioner', title: 'Clean filters', interval: 90, lastDone: 10 },
    { type: 'REFRIGERATOR', name: 'Refrigerator', title: 'Clean coils', interval: 180, lastDone: 60 },
  ];
  for (const a of appliances) {
    await prisma.appliance.create({
      data: {
        homeId: home.id,
        type: a.type,
        name: a.name,
        tasks: {
          create: {
            title: a.title,
            intervalDays: a.interval,
            lastDoneAt: ago(a.lastDone),
            nextDueAt: new Date(ago(a.lastDone).getTime() + a.interval * DAY),
          },
        },
      },
    });
  }

  console.log(`Seeded home ${home.id}`);
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
