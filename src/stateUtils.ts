import type { FieldsState } from './main'
import { objectTypedEntries } from './utils/object'
import type { AnyInitialConfig } from './utils/type'

type FormValuesObj<T extends AnyInitialConfig> = {
  [K in keyof T]: T[K]['initialValue']
}

export function getFormValuesObj<T extends AnyInitialConfig>(
  fieldsState: FieldsState<T>,
  allowInvalid: boolean = false,
): FormValuesObj<T> {
  const values: FormValuesObj<T> = {} as FormValuesObj<T>

  for (const [key, field] of objectTypedEntries(fieldsState)) {
    if (!field.isValid && !allowInvalid) {
      throw new Error(`Field "${key}" is invalid`)
    }

    values[key] = normalizeValue(field.value)
  }

  return values
}

export function getChangedFormValuesObj<T extends AnyInitialConfig>(
  fieldsState: FieldsState<T>,
  allowInvalid: boolean = false,
): Partial<FormValuesObj<T>> {
  const values: Partial<FormValuesObj<T>> = {}

  for (const [key, field] of objectTypedEntries(fieldsState)) {
    if (!field.isValid && !allowInvalid) {
      throw new Error(`Field "${key}" is invalid`)
    }

    if (field.isDiffFromInitial) {
      values[key] = normalizeValue(field.value)
    }
  }

  return values
}

function normalizeValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : value
}
