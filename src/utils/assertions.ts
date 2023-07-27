export function isFunction(value: any): value is (...args: any[]) => any {
  return typeof value === 'function'
}

export function isObject(value: any): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function invariant(condition: any, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[t-state-form] ${message}`)
  }
}
