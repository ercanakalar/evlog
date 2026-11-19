import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { normalizeProductName } from '../common/utils/normalize';
import { HomeItemsService } from '../home-items/home-items.service';
import { PrismaService } from '../prisma/prisma.service';
import { namesMatch } from '../products/product-matcher';
import { AddListItemDto, ListNameDto, UpdateListItemDto } from './dto/list.dto';

/** Name of the list made for products that run out when the user has none. */
export const DEFAULT_LIST_NAME = 'Shopping list';

/** How many recent purchases are searched for a "last price". */
const PRICE_LOOKBACK = 600;

type PriceBook = { name: string; rawName: string; unitPrice: string | null }[];

/**
 * Market lists. Each item carries the price the user last paid for a product
 * with a matching name, so the list can show what the trip will cost.
 */
@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly homeItems: HomeItemsService,
  ) {}

  async all(userId: string) {
    const [lists, prices, low] = await Promise.all([
      this.prisma.shoppingList.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      }),
      this.priceBook(userId),
      this.homeItems.runningLow(userId),
    ]);
    return {
      lists: lists.map((list) => ({
        id: list.id,
        name: list.name,
        createdAt: list.createdAt,
        items: list.items.map((item) => ({
          id: item.id,
          name: item.name,
          done: item.doneAt !== null,
          lastPrice: lastPrice(prices, item.name),
        })),
      })),
      runningLow: low.map((item) => ({
        homeItemId: item.id,
        name: item.name,
        unit: item.unit,
        count: item.count,
        lastPrice: lastPrice(prices, item.name),
      })),
    };
  }

  create(userId: string, dto: ListNameDto) {
    return this.prisma.shoppingList.create({ data: { userId, name: dto.name } });
  }

  async rename(listId: string, userId: string, dto: ListNameDto) {
    await this.ownList(listId, userId);
    return this.prisma.shoppingList.update({ where: { id: listId }, data: { name: dto.name } });
  }

  async remove(listId: string, userId: string) {
    await this.ownList(listId, userId);
    await this.prisma.shoppingList.delete({ where: { id: listId } });
  }

  async addItem(listId: string, userId: string, dto: AddListItemDto) {
    await this.ownList(listId, userId);
    return this.prisma.shoppingListItem.create({
      data: { listId, name: dto.name, normalizedName: normalizeProductName(dto.name) },
    });
  }

  /**
   * Puts products that ran out at home on the user's first list (making one
   * if there is none), skipping any still to buy on one of their lists.
   * Returns the list the products went on, or null if none were added.
   */
  async addRunOut(tx: Prisma.TransactionClient, userId: string, names: string[], newListName = DEFAULT_LIST_NAME) {
    const open = await tx.shoppingListItem.findMany({
      where: { doneAt: null, list: { userId } },
      select: { name: true },
    });
    const missing = names.filter(
      (name, i) =>
        names.indexOf(name) === i && !open.some((item) => namesMatch(name, item.name) || namesMatch(item.name, name)),
    );
    if (missing.length === 0) return null;

    const list =
      (await tx.shoppingList.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } })) ??
      (await tx.shoppingList.create({ data: { userId, name: newListName } }));
    await tx.shoppingListItem.createMany({
      data: missing.map((name) => ({ listId: list.id, name, normalizedName: normalizeProductName(name) })),
    });
    return { id: list.id, name: list.name, added: missing };
  }

  async updateItem(itemId: string, userId: string, dto: UpdateListItemDto) {
    await this.ownItem(itemId, userId);
    return this.prisma.shoppingListItem.update({
      where: { id: itemId },
      data: {
        ...(dto.done !== undefined ? { doneAt: dto.done ? new Date() : null } : {}),
        ...(dto.name ? { name: dto.name, normalizedName: normalizeProductName(dto.name) } : {}),
      },
    });
  }

  async removeItem(itemId: string, userId: string) {
    await this.ownItem(itemId, userId);
    await this.prisma.shoppingListItem.delete({ where: { id: itemId } });
  }

  private async priceBook(userId: string): Promise<PriceBook> {
    const rows = await this.prisma.receiptItem.findMany({
      where: { receipt: { userId, status: 'CONFIRMED' } },
      select: { name: true, rawName: true, unitPrice: true },
      orderBy: { receipt: { issuedAt: 'desc' } },
      take: PRICE_LOOKBACK,
    });
    return rows.map((r) => ({ ...r, unitPrice: r.unitPrice?.toFixed(2) ?? null }));
  }

  private async ownList(listId: string, userId: string) {
    const list = await this.prisma.shoppingList.findUnique({ where: { id: listId } });
    if (!list || list.userId !== userId) throw new NotFoundException('List not found');
    return list;
  }

  private async ownItem(itemId: string, userId: string) {
    const item = await this.prisma.shoppingListItem.findFirst({
      where: { id: itemId, list: { userId } },
    });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }
}

/** Newest price paid for a product whose name matches, or null. */
const lastPrice = (book: PriceBook, name: string): string | null =>
  book.find((row) => namesMatch(name, row.name) || namesMatch(name, row.rawName))?.unitPrice ??
  null;
