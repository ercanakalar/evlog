import { Prisma } from '../generated/prisma/client';
import { normalizeProductName } from '../common/utils/normalize';
import { namesMatch } from '../products/product-matcher';

/** Name of the list made for products that run out when the user has none. */
export const DEFAULT_LIST_NAME = 'Shopping list';

/**
 * Puts products that ran out at home on the user's first list (making one
 * if there is none), skipping any still to buy on one of their lists.
 * Returns the list the products went on, or null if none were added.
 */
export async function addRunOut(
  tx: Prisma.TransactionClient,
  userId: string,
  names: string[],
  newListName = DEFAULT_LIST_NAME,
) {
  if (names.length === 0) return null;
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
