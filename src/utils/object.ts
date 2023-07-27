export function objectTypedEntries<T extends Record<string, unknown>>(obj: T) {
  return Object.entries(obj) as [keyof T, T[keyof T]][]
}

export function pick<T, K extends keyof T>(
  obj: T | undefined,
  keys: K[],
  rename?: Partial<Record<K, string>>,
): Record<string, unknown> {
  const result: any = {}

  if (!obj) {
    return result
  }

  for (const key of keys) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    result[rename?.[key] || key] = obj[key]
  }
  return result
}

export function mapArrayToObject<T, K extends string, O>(
  array: T[],
  mapper: (item: T, index: number) => [K, O],
): Record<K, O> {
  return Object.fromEntries(array.map(mapper)) as any
}

export function mapObjectToObject<
  I extends Record<string | number | symbol, unknown>,
  K extends string | number | symbol,
  O,
>(obj: I, mapper: (key: keyof I, value: I[keyof I]) => [K, O]): Record<K, O> {
  return Object.fromEntries(
    objectTypedEntries(obj).map(([key, value]) => mapper(key, value)),
  ) as any
}
