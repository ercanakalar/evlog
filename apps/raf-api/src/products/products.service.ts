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
   * Brings the table in line with the built-in list on every start: new
   * keywords are added and changed ones updated, so a deployed database
   * picks up fixes without re-running the seed.
   */
  async onApplicationBootstrap() {
    const rows = SHELF_LIFE.map(([keyword, displayName, category, storage, shelfLifeDays, openedShelfLifeDays]) => ({
      keyword,
      displayName,
      category,
      storage,
      shelfLifeDays,
      openedShelfLifeDays,
      source: SHELF_LIFE_SOURCE,
    }));
    const existing = new Map((await this.prisma.shelfLife.findMany()).map((r) => [r.keyword, r]));
    const changed = rows.filter((row) => {
      const current = existing.get(row.keyword);
      return (
        !current ||
        current.displayName !== row.displayName ||
        current.category !== row.category ||
        current.storage !== row.storage ||
        current.shelfLifeDays !== row.shelfLifeDays ||
        current.openedShelfLifeDays !== row.openedShelfLifeDays
      );
    });
    if (changed.length === 0) return;
    await this.prisma.$transaction(
      changed.map((row) =>
        this.prisma.shelfLife.upsert({ where: { keyword: row.keyword }, update: row, create: row }),
      ),
    );
    this.loadedAt = 0; // reload the cache with the new rows
    this.logger.log(`Shelf-life table: ${changed.length} entries added or updated`);
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
