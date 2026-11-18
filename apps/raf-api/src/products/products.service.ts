import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { matchProduct, type ProductMatch, type ShelfLifeEntry } from './product-matcher';
import { SHELF_LIFE, SHELF_LIFE_SOURCE } from './shelf-life.data';

const CACHE_MS = 5 * 60_000;

/**
 * Looks up a product's category and shelf life in the reference table.
 * The table is small and rarely changes, so it is cached in memory.
 */
@Injectable()
export class ProductsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProductsService.name);
  private catalog: ShelfLifeEntry[] = [];
  private loadedAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * A fresh database gets the built-in table on first boot, so the app works
   * without running the seed. `npm run db:seed` updates existing rows.
   */
  async onApplicationBootstrap() {
    if ((await this.prisma.shelfLife.count()) > 0) return;
    const { count } = await this.prisma.shelfLife.createMany({
      data: SHELF_LIFE.map(([keyword, displayName, category, storage, shelfLifeDays, openedShelfLifeDays]) => ({
        keyword,
        displayName,
        category,
        storage,
        shelfLifeDays,
        openedShelfLifeDays,
        source: SHELF_LIFE_SOURCE,
      })),
      skipDuplicates: true,
    });
    this.logger.log(`Loaded ${count} shelf-life entries`);
  }

  async match(rawName: string, quantity?: number, unit?: string | null): Promise<ProductMatch> {
    return matchProduct(rawName, await this.entries(), quantity, unit);
  }

  async matchMany(lines: { name: string; quantity?: number; unit?: string | null }[]) {
    const catalog = await this.entries();
    return lines.map((line) => matchProduct(line.name, catalog, line.quantity, line.unit));
  }

  private async entries(): Promise<ShelfLifeEntry[]> {
    if (Date.now() - this.loadedAt > CACHE_MS) {
      this.catalog = await this.prisma.shelfLife.findMany({
        select: {
          keyword: true,
          displayName: true,
          category: true,
          storage: true,
          shelfLifeDays: true,
          openedShelfLifeDays: true,
        },
      });
      this.loadedAt = Date.now();
    }
    return this.catalog;
  }
}
