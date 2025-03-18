import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  FieldsInitialConfig,
  FieldsState,
  FieldState,
  FormStore,
  getGenericFormState,
} from './main'
import { objectTypedEntries } from './utils/object'
const formStoreSymbol = Symbol('formStore')
const handleChangeSymbol = Symbol('handleChange')

export type FormTypedCtx<T extends FieldsInitialConfig, M> = {
  [formStoreSymbol]: FormStore<T, M>
  [handleChangeSymbol]: (id: keyof T, value: any, options?: any) => void
}

export function createFormTypedCtx<T extends FieldsInitialConfig, M>(
  formStore: FormStore<T, M>,
  handleChange: (id: keyof T, value: any, options?: any) => void,
) {
  return { [formStoreSymbol]: formStore, [handleChangeSymbol]: handleChange }
}

export function useFormState<T extends FieldsInitialConfig, M>(
  typedCtx: FormTypedCtx<T, M>,
  { mustBeDiffFromInitial = false }: { mustBeDiffFromInitial?: boolean } = {},
) {
  const formStore = typedCtx[formStoreSymbol]
  const handleChange = typedCtx[handleChangeSymbol]

  type UseFormState = {
    formFields: FieldsState<T>
    fieldEntries: [
      keyof T,
      FieldState<T[keyof T]['initialValue'], T[keyof T]['metadata']>,
    ][]
    formError: string | false
    someFieldIsLoading: boolean
    validationWasForced: number
    isDiffFromInitial: boolean
    formIsValid: boolean
    /**
     * @deprecated will be removed in next major version, use `fieldProps` instead
     */
    getFieldProps: <F extends keyof T>(
      id: F,
    ) => {
      value: T[F]['initialValue']
      errors: string[] | null
      onChange: (value: T[F]['initialValue']) => void
    }
    fieldProps: {
      [K in keyof T]: {
        value: T[K]['initialValue']
        errors: string[] | null
        onChange: (value: T[K]['initialValue']) => void
      }
    }
  }

  const state = formStore.useSelector((state) => {
    const fieldEntries = objectTypedEntries(state.fields)

    const { someFieldIsLoading, formIsValid, isDiffFromInitial } =
      getGenericFormState<T>(state, fieldEntries, mustBeDiffFromInitial)

    return {
      formFields: state.fields,
      fieldEntries,
      formError: state.formError,
      validationWasForced: state.validationWasForced,
      someFieldIsLoading,
      formIsValid,
      isDiffFromInitial,
    }
  })

  const getFieldProps: UseFormState['getFieldProps'] = useCallback(
    (id) => {
      const fieldState = state.formFields[id]

      return {
        value: fieldState.value,
        errors: fieldState.errors,
        onChange: (value) => {
          handleChange(id, value)
        },
      }
    },
    [handleChange, state.formFields],
  )

  const prevFieldProps = useRef<
    Record<
      string,
      {
        handleChange: (...args: any[]) => void
        prevValue: {
          value: T[keyof T]['initialValue']
          errors: string[] | null
          onChange: (value: T[keyof T]['initialValue']) => void
        }
      }
    >
  >({})

  const fieldProps = useMemo(() => {
    const fieldProps = {} as UseFormState['fieldProps']

    for (const [id, fieldState] of objectTypedEntries(state.formFields)) {
      const prevFieldState = prevFieldProps.current[id]

      if (
        prevFieldState?.prevValue.value === fieldState.value &&
        prevFieldState.prevValue.errors === fieldState.errors &&
        prevFieldState.handleChange === handleChange
      ) {
        fieldProps[id] = prevFieldState.prevValue
        continue
      }

      fieldProps[id] = {
        errors: fieldState.errors,
        value: fieldState.value,
        onChange: (value) => {
          handleChange(id, value)
        },
      }
    }

    return fieldProps
  }, [handleChange, state.formFields])

  useEffect(() => {
    for (const [id, fieldState] of objectTypedEntries(fieldProps)) {
      prevFieldProps.current[id] = {
        handleChange,
        prevValue: fieldState,
      }
    }
  }, [fieldProps, handleChange])

  return useMemo((): UseFormState => {
    return {
      ...state,
      getFieldProps,
      fieldProps,
    }
  }, [getFieldProps, fieldProps, state])
}
