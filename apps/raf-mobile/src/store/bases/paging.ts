/** Cursor pagination used by list endpoints (`?take=&cursor=<last id>`). */
export const cursorPaging = <T extends { id: string }>(take: number) => ({
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage: T[]) =>
    lastPage.length < take ? undefined : (lastPage[lastPage.length - 1]?.id ?? undefined),
});

export const pageQuery = (take: number, cursor: string | null) => ({
  take,
  ...(cursor ? { cursor } : {}),
});
