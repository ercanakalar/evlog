import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BRANDS } from './brands.data';
import { findBrand, matchProduct, packOf, type BrandEntry, type ProductMatch, type ShelfLifeEntry } from './product-matcher';
import { SHELF_LIFE, SHELF_LIFE_SOURCE } from './shelf-life.data';

/** A matched line plus its brand and printed pack size, as stored on a receipt line. */
export type LineMatch = ProductMatch & { brandId: string | null; packAmount: number | null; packUnit: string | null };

const CACHE_MS = 5 * 60_000;

/**
 * Looks up a product's category and shelf life in the reference table, and
 * its brand in the brand table. Both are small and rarely change, so they
 * are cached in memory.
 */
@Injectable()
export class ProductsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProductsService.name);
  private catalog: ShelfLifeEntry[] = [];
  private brands: BrandEntry[] = [];
  private loadedAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Brings the table in line with the built-in list on every start: new
   * keywords are added and changed ones updated, so a deployed database
   * picks up fixes without re-running the seed.
   */
  async onApplicationBootstrap() {
    await this.syncShelfLife();
    await this.syncBrands();
  }

  private async syncShelfLife() {
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
    // New rows go in together: on a new database that is all of them.
    await this.prisma.$transaction([
      this.prisma.shelfLife.createMany({
        data: changed.filter((row) => !existing.has(row.keyword)),
        skipDuplicates: true,
      }),
      ...changed
        .filter((row) => existing.has(row.keyword))
        .map((row) => this.prisma.shelfLife.update({ where: { keyword: row.keyword }, data: row })),
    ]);
    this.loadedAt = 0; // reload the cache with the new rows
    this.logger.log(`Shelf-life table: ${changed.length} entries added or updated`);
  }

  /**
   * Same for brands: the built-in list is added and kept up to date. When it
   * changed, lines saved before a brand was known get their brand and pack
   * size filled in.
   */
  private async syncBrands() {
    const existing = new Map((await this.prisma.brand.findMany()).map((b) => [b.name, b]));
    const changed = BRANDS.map(([name, ...keywords]) => ({ name, keywords })).filter((row) => {
      const current = existing.get(row.name);
      return !current || current.keywords.join('|') !== row.keywords.join('|');
    });
    if (changed.length === 0) return;
    await this.prisma.$transaction([
      this.prisma.brand.createMany({
        data: changed.filter((row) => !existing.has(row.name)),
        skipDuplicates: true,
      }),
      ...changed
        .filter((row) => existing.has(row.name))
        .map((row) => this.prisma.brand.update({ where: { name: row.name }, data: row })),
    ]);
    this.loadedAt = 0;
    this.logger.log(`Brands: ${changed.length} added or updated`);
    await this.backfill();
  }

  /** Brand and pack size for lines that have neither (saved before they were read). */
  private async backfill() {
    const brands = await this.prisma.brand.findMany();
    const lines = await this.prisma.receiptItem.findMany({
      where: { brandId: null },
      select: { id: true, rawName: true, packAmount: true },
    });
    let updated = 0;
    for (const line of lines) {
      const brand = findBrand(line.rawName, brands);
      const pack = line.packAmount === null ? packOf(line.rawName) : null;
      if (!brand && !pack) continue;
      await this.prisma.receiptItem.update({
        where: { id: line.id },
        data: {
          ...(brand ? { brandId: brand.id } : {}),
          ...(pack ? { packAmount: pack.amount, packUnit: pack.unit } : {}),
        },
      });
      updated += 1;
    }
    if (updated > 0) this.logger.log(`Brands: ${updated} saved lines filled in`);
  }

  async match(rawName: string, quantity?: number, unit?: string | null): Promise<ProductMatch> {
    return matchProduct(rawName, (await this.entries()).catalog, quantity, unit);
  }

  /** Each line's product, brand and printed pack size. */
  async matchMany(lines: { name: string; quantity?: number; unit?: string | null }[]): Promise<LineMatch[]> {
    const { catalog, brands } = await this.entries();
    return lines.map((line) => {
      const pack = packOf(line.name);
      return {
        ...matchProduct(line.name, catalog, line.quantity, line.unit),
        brandId: findBrand(line.name, brands)?.id ?? null,
        packAmount: pack?.amount ?? null,
        packUnit: pack?.unit ?? null,
      };
    });
  }

  private async entries(): Promise<{ catalog: ShelfLifeEntry[]; brands: BrandEntry[] }> {
    if (Date.now() - this.loadedAt > CACHE_MS) {
      this.brands = await this.prisma.brand.findMany({ select: { id: true, name: true, keywords: true } });
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
    return { catalog: this.catalog, brands: this.brands };
  }
}
