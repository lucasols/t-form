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

export type FormTypedProps<T extends FieldsInitialConfig, M> = {
  [formStoreSymbol]: FormStore<T, M>
  [handleChangeSymbol]: (id: keyof T, value: any, options?: any) => void
}

export function createFormTypedProps<T extends FieldsInitialConfig, M>(
  formStore: FormStore<T, M>,
  handleChange: (id: keyof T, value: any, options?: any) => void,
) {
  return { [formStoreSymbol]: formStore, [handleChangeSymbol]: handleChange }
}

export function useFormState<T extends FieldsInitialConfig, M>(
  typedProps: FormTypedProps<T, M>,
  { mustBeDiffFromInitial = false }: { mustBeDiffFromInitial?: boolean } = {},
) {
  const formStore = typedProps[formStoreSymbol]
  const handleChange = typedProps[handleChangeSymbol]

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
    getFieldProps: <F extends keyof T>(
      id: F,
    ) => {
      value: T[F]['initialValue']
      errors: string[] | null
      onChange: (value: T[F]['initialValue']) => void
    }
  }

  return formStore.useSelector((state): UseFormState => {
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
      getFieldProps: (id) => {
        const fieldState = state.fields[id]

        return {
          value: fieldState.value,
          errors: fieldState.errors,
          onChange: (value) => {
            handleChange(id, value)
          },
        }
      },
    }
  })
}
