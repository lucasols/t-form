import { isFunction } from './assertions'
import { isDraft, current } from 'immer'

export type SetValue<V> = V | SetFieldValueCallback<V>

export type SetFieldValueCallback<V> = (prevValue: V) => V

export function unwrapSetterValue<V>(
  value: V | SetFieldValueCallback<V>,
  currentValue: V,
): V {
  return isFunction(value)
    ? value(isDraft(currentValue) ? current(currentValue) : currentValue)
    : value
}
