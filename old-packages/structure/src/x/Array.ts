export type ArrayLike<T> =
  | T[]
  | Promise<T[]>
  | IterableIterator<T>
  | undefined
  | void
  | null

export async function ArrayLike_normalize<T>(x: ArrayLike<T>): Promise<T[]> {
  if (x instanceof Promise) {
    return x
  }
  if (x === null) {
    return []
  }
  if (typeof x === 'undefined') {
    return []
  }
  return [...x]
}

export function iter<T>(f: () => IterableIterator<T>) {
  return Array.from(f())
}
