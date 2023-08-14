import { FieldState } from '../../src/main'
import { pick } from '../../src/utils/object'

export function simplifyFieldState(fieldState: FieldState<any, any>) {
  return {
    val: fieldState.value,
    initV: fieldState.initialValue,
    req: fieldState.required ? 'Y' : 'N',
    errors: fieldState.errors,
    isValid: fieldState.isValid ? 'Y' : 'N',
    isEmpty: fieldState.isEmpty ? 'Y' : 'N',
    isTouched: fieldState.isTouched ? 'Y' : 'N',
    isDiff: fieldState.isDiffFromInitial ? 'Y' : 'N',
    m: fieldState.metadata,
    isL: fieldState.valueIsLoading ? 'Y' : 'N',
    warnings: fieldState.warnings ?? undefined,
  }
}
export function simplifyFieldsState(
  fieldState: Record<string, FieldState<any, any>>,
  filterKeys?: (keyof FieldState<any, any>)[],
) {
  return Object.fromEntries(
    Object.entries(fieldState).map(([key, value]) => [
      key,
      filterKeys ? pick(value, filterKeys) : simplifyFieldState(value),
    ]),
  )
}
