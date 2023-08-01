export function asType<T>(value: T) {
  return value
}

export type SingleOrMultiple<T> = T | T[]
