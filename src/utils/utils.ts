import { isFunction } from './assertions'

import { deepEqual } from 't-state'

export type GetterOrValue<T> = T | (() => T)

export function unwrapGetterOrValue<T>(value: T | (() => T)): T {
  return isFunction(value) ? value() : value
}

export function keepPrevIfUnchanged<T>(newValue: T, prevValue: T): T {
  return deepEqual(newValue, prevValue) ? prevValue : newValue
}

export function deepFreeze<T extends Record<string, any> | any[]>(obj: T): T {
  Object.freeze(obj)

  if (typeof obj === 'object') {
    Object.values(obj).forEach((value) => {
      if (value && typeof value === 'object' && !Object.isFrozen(value)) {
         
        deepFreeze(value)
      }
    })
  }

  return obj
}
