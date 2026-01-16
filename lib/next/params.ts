export type AsyncParams<T> = Promise<T>

export async function unwrap<T>(p: AsyncParams<T>): Promise<T> {
  return p
}

export function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}
