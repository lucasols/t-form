import { useCallback, useMemo } from 'react'
import { deepEqual, useCreateStore, Store } from 't-state'
import { useConst, useLatestValue } from './utils/hooks'
import { mapObjectToObject, objectTypedEntries } from './utils/object'
import { SetValue, unwrapSetterValue } from './utils/unwrapSetterValue'
import { keepPrevIfUnchanged, unwrapGetterOrValue } from './utils/utils'
import { invariant, isObject } from './utils/assertions'

const globalConfig = {
  defaultRequiredMsg: 'This field is required',
  errorElementSelector: '.showErrors',
}

export function setGlobalConfig(config: Partial<typeof globalConfig>) {
  Object.assign(globalConfig, config)
}

type FieldInitialConfig<T = unknown, M = unknown> = {
  initialValue: T
  required?: boolean
  metadata?: M
  requiredErrorMsg?: string | false
}

type FieldDerivatedConfig<T, F extends FieldsState<any>> = {
  checkIfIsEmpty?: (value: T) => boolean
  required?: (fieldsState: F) => boolean
}

type FieldIsValid<T, M, F extends FieldsState<any>> = (
  value: T,
  context: { metadata: M; formState: F },
) => true | string | string[] | { silentInvalid: true } | { isLoading: true }

type FieldValidation<T, M, F extends FieldsState<any>> =
  | FieldIsValid<T, M, F>
  | FieldIsValid<T, M, F>[]

type FieldConfig = FieldInitialConfig & {
  derived: FieldDerivatedConfig<unknown, any> | undefined
  validations: FieldValidation<unknown, unknown, any> | undefined
  arrayConfig:
    | ArrayFieldsConfig<
        Record<string, FieldInitialConfig<any[], unknown>>
      >[string]
    | undefined
}

type FormStoreState<T extends FieldsInitialConfig> = {
  fields: {
    [K in keyof T]: FieldState<T[K]['initialValue'], T[K]['metadata']>
  }
  formError: string | false
  validationWasForced: boolean
}

type FieldsInitialConfig = Record<string, FieldInitialConfig>

export type FieldState<V, M> = {
  value: V
  initialValue: V
  metadata: M
  required: boolean
  isValid: boolean
  errors: string[] | null
  isTouched: boolean
  isDiffFromInitial: boolean
  isEmpty: boolean
  isLoading: boolean
}

type FieldsState<T extends FieldsInitialConfig> = {
  [P in keyof T]: FieldState<T[P]['initialValue'], T[P]['metadata']>
}

type FieldsDerivatedConfig<T extends FieldsInitialConfig> = {
  [K in keyof T]?: FieldDerivatedConfig<T[K]['initialValue'], FieldsState<T>>
}

type FieldsValidation<T extends FieldsInitialConfig> = {
  [K in keyof T]?: FieldValidation<
    T[K]['initialValue'],
    T[K]['metadata'],
    { [P in keyof T]: FieldState<T[P]['initialValue'], T[P]['metadata']> }
  >
}

type FormStore<T extends FieldsInitialConfig> = Store<FormStoreState<T>>

export type UpdateFieldConfig<
  T extends FieldsInitialConfig,
  K extends keyof T,
> = {
  replace?: boolean
  value?: T[K]['initialValue']
  initialValue?: T[K]['initialValue']
  required?: boolean
  isTouched?: boolean
  metadata?: T[K]['metadata']
  requiredErrorMsg?: string | false
  checkIfIsEmpty?: (value: T[K]['initialValue']) => boolean
  derivedRequired?: (fieldsState: FieldsState<T>) => boolean
  fieldIsValid?: FieldValidation<
    T[K]['initialValue'],
    T[K]['metadata'],
    FieldsState<T>
  >
}

export type UpdateFormConfig<T extends FieldsInitialConfig> = {
  [K in keyof T]?: UpdateFieldConfig<T, K> | 'remove'
}

export type DynamicFormInitialConfig<V = unknown, M = unknown> = Record<
  string,
  FieldInitialConfig<V, M>
>

type AdvancedFormValidation<T extends FieldsInitialConfig> = (methods: {
  fieldsState: FieldsState<T>
  setFormError: (error: string) => void
}) => void

type ArrayFieldsConfig<T extends FieldsInitialConfig> = {
  [K in keyof T]?: T[K]['initialValue'] extends (infer U)[]
    ? {
        getItemId: (item: U) => string
      }
    : never
}

export function useForm<T extends FieldsInitialConfig>({
  initialConfig: fieldsInitialConfig,
  derivatedConfig: fieldsDerivatedConfig,
  fieldIsValid: validations,
  advancedFormValidation,
  arrayFieldsConfig,
}: {
  initialConfig: T | (() => T)
  derivatedConfig?: FieldsDerivatedConfig<T> | (() => FieldsDerivatedConfig<T>)
  fieldIsValid?: FieldsValidation<T> | (() => FieldsValidation<T>)
  advancedFormValidation?: AdvancedFormValidation<T>
  arrayFieldsConfig?: ArrayFieldsConfig<T> | (() => ArrayFieldsConfig<T>)
}) {
  type FieldsId = keyof T

  const formConfig = useConst(() => {
    const configs = unwrapGetterOrValue(fieldsInitialConfig)
    const derivatedConfig = unwrapGetterOrValue(fieldsDerivatedConfig)
    const fieldValidations = unwrapGetterOrValue(validations)
    const arraysConfig = unwrapGetterOrValue(arrayFieldsConfig)

    const mapConfig = new Map<FieldsId, FieldConfig>()

    for (const [id, initialConfig] of objectTypedEntries(configs)) {
      mapConfig.set(id, {
        ...initialConfig,
        derived: derivatedConfig?.[id],
        validations: fieldValidations?.[id],
        arrayConfig: arraysConfig?.[id],
      })
    }

    return { fieldsMap: mapConfig }
  })

  type InternalFormStoreState = FormStoreState<T>

  function performAdvancedFormValidation(
    formStoreState: InternalFormStoreState,
  ) {
    if (!advancedFormValidation) {
      return
    }

    const methods = {
      fieldsState: formStoreState.fields,
      setFormError: (error: string) => {
        formStoreState.formError = error
      },
    }

    advancedFormValidation(methods)
  }

  const latestFormValidation = useLatestValue(performAdvancedFormValidation)

  function getInitialState(): InternalFormStoreState {
    const formStoreState: InternalFormStoreState = {
      fields: {} as any,
      formError: false,
      validationWasForced: false,
    }

    for (const [id, config] of formConfig.fieldsMap) {
      formStoreState.fields[id] = getInitialStateFromConfig(config)

      updateFieldStateFromValue(
        config,
        config.initialValue,
        formStoreState.fields[id],
        true,
      )
    }

    performExtraUpdates(formStoreState)

    return formStoreState
  }

  const performExtraUpdates = useCallback(
    (formStoreState: InternalFormStoreState) => {
      updateDerivedConfig(
        formConfig.fieldsMap as Map<string, FieldConfig>,
        formStoreState,
      )

      performFormValidation(
        formConfig.fieldsMap as Map<string, FieldConfig>,
        formStoreState,
      )

      latestFormValidation.insideMemo(formStoreState)
    },
    [formConfig, latestFormValidation],
  )

  const formStore: FormStore<T> = useCreateStore<InternalFormStoreState>(
    () => ({
      state: getInitialState(),
    }),
  )

  const useFormState = useCallback(
    ({ mustBeDiffFromInitial = false } = {}) => {
      type UseFormState = {
        formFields: FieldsState<T>
        fieldEntries: [
          keyof T,
          FieldState<T[keyof T]['initialValue'], T[keyof T]['metadata']>,
        ][]
        formError: string | false
        someFieldIsLoading: boolean
        validationWasForced: boolean
        isDiffFromInitial: boolean
        formIsValid: boolean
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
        }
      })
    },
    [formStore],
  )

  type ValueArg<K extends FieldsId> = SetValue<T[K]['initialValue']>

  const handleChange = useCallback(
    <K extends FieldsId>(
      ...args:
        | [id: K, value: ValueArg<K>, skipTouch?: boolean]
        | [fields: { [P in K]?: ValueArg<K> }, skipTouch?: boolean]
    ) => {
      const firstArg = args[0]
      const skipTouch =
        typeof args[0] === 'string' ? args[2] : (args[1] as boolean | undefined)

      const valuesToUpdate: Partial<Record<K, ValueArg<K>>> =
        typeof firstArg !== 'object'
          ? ({ [firstArg]: args[1] } as Record<K, ValueArg<K>>)
          : firstArg

      formStore.produceState((draft) => {
        for (const [id, value] of objectTypedEntries(valuesToUpdate)) {
          const fieldState = draft.fields[id]
          const fieldConfig = formConfig.fieldsMap.get(id)

          invariant(
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            fieldState && fieldConfig,
            fieldNotFoundMessage(id),
          )

          const newValue = unwrapSetterValue(value, fieldState.value)

          updateFieldStateFromValue(
            fieldConfig,
            newValue,
            fieldState,
            !!skipTouch,
          )
        }

        updateDerivedConfig(
          formConfig.fieldsMap as Map<string, FieldConfig>,
          draft,
        )

        performExtraUpdates(draft)
      })
    },
    [formStore, formConfig, performExtraUpdates],
  )

  const forceFormUpdate = useCallback(
    (skipTouch: boolean) => {
      formStore.batch(() => {
        handleChange(
          mapObjectToObject(formStore.state.fields, (id, { value }) => [
            id,
            value,
          ]),
          skipTouch,
        )
      })
    },
    [formStore, handleChange],
  )

  const forceFormValidation = useCallback(() => {
    formStore.batch(() => {
      formStore.setKey('validationWasForced', true)

      forceFormUpdate(false)
    })

    setTimeout(() => {
      document
        .querySelector(globalConfig.errorElementSelector)
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
    }, 90)
  }, [formStore, forceFormUpdate])

  const touchField = useCallback(
    (id: FieldsId) => {
      const field = formStore.state.fields[id]

      invariant(field, fieldNotFoundMessage(id))

      if (!field.isTouched) {
        handleChange(id, field.value)
      }
    },
    [handleChange, formStore],
  )

  const updateConfig = useCallback(
    (
      fieldsToUpdate: UpdateFormConfig<T>,
      mode: 'merge' | 'overrideAll' | 'mergeAndRemoveExcessFields' = 'merge',
    ) => {
      formStore.batch(() => {
        formStore.produceState((draft) => {
          for (const [id, newConfig] of objectTypedEntries(fieldsToUpdate)) {
            const fieldConfig = formConfig.fieldsMap.get(id)

            if (!newConfig) continue

            if (
              newConfig !== 'remove' &&
              (!fieldConfig || newConfig.replace || mode === 'overrideAll')
            ) {
              if (!Object.hasOwn(newConfig, 'initialValue')) {
                throw new Error(
                  `Missing "initialValue" for field "${String(id)}"`,
                )
              }

              if (Object.hasOwn(newConfig, 'value')) {
                throw new Error("Can't set value when replacing/adding fields")
              }

              const config = {
                initialValue: newConfig.initialValue,
                required: newConfig.required ?? false,
                requiredErrorMsg: newConfig.requiredErrorMsg,
                derived: {
                  checkIfIsEmpty: newConfig.checkIfIsEmpty,
                  required: newConfig.derivedRequired,
                },
                validations: newConfig.fieldIsValid,
                metadata: newConfig.metadata,
                arrayConfig: fieldConfig?.arrayConfig,
              }

              formConfig.fieldsMap.set(id, config)

              draft.fields[id] = getInitialStateFromConfig(config)

              continue
            }

            if (newConfig === 'remove') {
              formConfig.fieldsMap.delete(id)
              delete draft.fields[id]

              continue
            }

            const fieldState = draft.fields[id]

            if (!fieldConfig) continue

            if (newConfig.required !== undefined) {
              fieldConfig.required = newConfig.required
              fieldState.required = newConfig.required
            }

            if (newConfig.requiredErrorMsg !== undefined) {
              fieldConfig.requiredErrorMsg = newConfig.requiredErrorMsg
            }

            if (Object.hasOwn(newConfig, 'initialValue')) {
              fieldConfig.initialValue = newConfig.initialValue
              fieldState.initialValue = newConfig.initialValue
            }

            if (Object.hasOwn(newConfig, 'value')) {
              fieldState.value = newConfig.value
            }

            if (newConfig.isTouched !== undefined) {
              fieldState.isTouched = newConfig.isTouched
            }

            if (newConfig.fieldIsValid !== undefined) {
              fieldConfig.validations = newConfig.fieldIsValid
            }

            if (newConfig.checkIfIsEmpty !== undefined) {
              fieldConfig.derived = {
                ...fieldConfig.derived,
                checkIfIsEmpty: newConfig.checkIfIsEmpty,
              }
            }

            if (newConfig.derivedRequired !== undefined) {
              fieldConfig.derived = {
                ...fieldConfig.derived,
                required: newConfig.derivedRequired,
              }
            }

            if (newConfig.metadata !== undefined) {
              fieldConfig.metadata = newConfig.metadata
              fieldState.metadata = newConfig.metadata
            }
          }

          if (mode === 'mergeAndRemoveExcessFields' || mode === 'overrideAll') {
            for (const [id] of objectTypedEntries(draft.fields)) {
              if (!fieldsToUpdate[id]) {
                formConfig.fieldsMap.delete(id)
                delete draft.fields[id]
              }
            }
          }
        })

        forceFormUpdate(true)
      })
    },
    [forceFormUpdate, formConfig, formStore],
  )

  const arrayFields = useMemo(() => {
    type ArrayFieldsIds = {
      [K in keyof T]: T[K]['initialValue'] extends any[] ? K : never
    }[keyof T]

    return {
      addItem<K extends ArrayFieldsIds>(
        fieldId: K,
        value: T[K]['initialValue'] extends (infer U)[] ? U : never,
      ) {
        handleChange(fieldId, (currentValue) => [
          ...(currentValue as any[]),
          value,
        ])
      },
      removeItem<K extends ArrayFieldsIds>(fieldId: K, itemId: string) {
        const arrayConfig = formConfig.fieldsMap.get(fieldId)?.arrayConfig

        invariant(arrayConfig, hasNoArrayConfigMessage(fieldId))

        handleChange(fieldId, (currentValue) => {
          const array = currentValue as any[]

          return array.filter((item) => arrayConfig.getItemId(item) !== itemId)
        })
      },
      toggleItem<K extends ArrayFieldsIds>(
        fieldId: K,
        itemId: string,
        value: T[K]['initialValue'] extends (infer U)[] ? U : never,
      ) {
        const arrayConfig = formConfig.fieldsMap.get(fieldId)?.arrayConfig

        invariant(arrayConfig, hasNoArrayConfigMessage(fieldId))

        handleChange(fieldId, (currentValue) => {
          const array = currentValue as any[]
          const itemIndex = array.findIndex(
            (item) => arrayConfig.getItemId(item) === itemId,
          )

          if (itemIndex === -1) {
            return [...array, value]
          }

          return array.filter((item) => arrayConfig.getItemId(item) !== itemId)
        })
      },
      updateItem<K extends ArrayFieldsIds>(
        fieldId: K,
        itemId: string,
        value: T[K]['initialValue'] extends (infer U)[]
          ? U extends Record<string, any>
            ? Partial<U>
            : U
          : never,
      ) {
        const arrayConfig = formConfig.fieldsMap.get(fieldId)?.arrayConfig

        invariant(arrayConfig, hasNoArrayConfigMessage(fieldId))

        handleChange(fieldId, (currentValue) => {
          const array = currentValue as any[]

          return array.map((item) =>
            arrayConfig.getItemId(item) === itemId
              ? isObject(value)
                ? { ...item, ...value }
                : value
              : item,
          )
        })
      },
    }
  }, [formConfig, handleChange])

  return {
    useFormState,
    handleChange,
    formStore,
    touchField,
    updateConfig,
    forceFormValidation,
    forceFormUpdate,
    arrayFields,
  }
}

function hasNoArrayConfigMessage(id: string | number | symbol) {
  return `Field with id "${String(id)}" has no arrayConfig`
}

function fieldNotFoundMessage(id: string | number | symbol) {
  return `Field with id "${String(id)}" not found`
}

function getInitialStateFromConfig<T extends FieldsInitialConfig>(
  config: FieldConfig,
): {
  [K in keyof T]: FieldState<T[K]['initialValue'], T[K]['metadata']>
}[keyof T] {
  return {
    value: config.initialValue,
    initialValue: config.initialValue,
    required: config.required ?? false,
    errors: null,
    isValid: false,
    isEmpty: true,
    isTouched: false,
    isDiffFromInitial: false,
    metadata: config.metadata,
    isLoading: false,
  }
}

export function getGenericFormState<T extends FieldsInitialConfig>(
  state: FormStoreState<T>,
  fieldEntries: [any, FieldState<any, any>][],
  mustBeDiffFromInitial: boolean,
) {
  let someFieldIsLoading = false
  let isDiffFromInitial = false
  let formIsValid = state.formError === false

  for (const [, fieldState] of fieldEntries) {
    if (fieldState.isLoading) {
      someFieldIsLoading = true
    }

    if (!fieldState.isValid) {
      formIsValid = false
    }

    if (fieldState.isDiffFromInitial) {
      isDiffFromInitial = true
    }
  }
  return {
    someFieldIsLoading,
    formIsValid: mustBeDiffFromInitial
      ? formIsValid && isDiffFromInitial
      : formIsValid,
    isDiffFromInitial,
  }
}

function updateFieldStateFromValue(
  fieldConfig: FieldConfig,
  newValue: unknown,
  draftField: FieldState<unknown, unknown>,
  isInitialState: boolean,
) {
  const normalizedValue = normalizeFormValue(newValue)

  const validationResults = basicFieldValidation(fieldConfig, normalizedValue)

  if (!isInitialState) {
    draftField.isTouched = true
  }

  if (
    draftField.value === normalizedValue &&
    deepEqual(validationResults, {
      errors: draftField.errors,
      isValid: draftField.isValid,
      isEmpty: draftField.isEmpty,
    })
  ) {
    return
  }

  draftField.value = normalizedValue
  draftField.isDiffFromInitial = !deepEqual(
    normalizedValue,
    draftField.initialValue,
  )
  draftField.errors = draftField.isTouched
    ? keepPrevIfUnchanged(validationResults.errors, draftField.errors)
    : null
  draftField.isValid = validationResults.isValid
  draftField.isEmpty = validationResults.isEmpty
  draftField.isLoading = false
}

function basicFieldValidation(
  fieldConfig: FieldConfig,
  value: unknown,
): {
  errors: string[] | null
  isValid: boolean
  isEmpty: boolean
} {
  const errors: string[] = []
  let isValid = true
  const isEmpty =
    fieldConfig.derived?.checkIfIsEmpty?.(value) ?? valueIsEmpty(value)

  if (fieldConfig.required && isEmpty) {
    isValid = false

    if (fieldConfig.requiredErrorMsg !== false) {
      errors.push(
        fieldConfig.requiredErrorMsg || globalConfig.defaultRequiredMsg,
      )
    }
  }

  return { errors: errors.length !== 0 ? errors : null, isValid, isEmpty }
}

function updateDerivedConfig(
  fieldsConfig: Map<string, FieldConfig>,
  formState: FormStoreState<any>,
): void {
  for (const [id, fieldConfig] of fieldsConfig) {
    if (fieldConfig.derived?.required) {
      const fieldState = formState.fields[id]

      if (!fieldState) {
        throw new Error(`Field with id "${String(id)}" not found`)
      }

      const newRequired = fieldConfig.derived.required(formState.fields)

      if (newRequired !== fieldState.required) {
        fieldState.required = newRequired

        const validationResults = basicFieldValidation(
          { ...fieldConfig, required: newRequired },
          fieldState.value,
        )

        fieldState.errors = keepPrevIfUnchanged(
          validationResults.errors,
          fieldState.errors,
        )
        fieldState.isValid = validationResults.isValid
        fieldState.isEmpty = validationResults.isEmpty
      }
    }
  }
}

function performFormValidation(
  fieldsConfig: Map<string, FieldConfig>,
  formState: FormStoreState<any>,
): void {
  for (const [id, fieldConfig] of fieldsConfig) {
    const fieldState = formState.fields[id]

    if (!fieldState) {
      throw new Error(`Field with id "${String(id)}" not found`)
    }

    if (fieldConfig.validations) {
      const validations = Array.isArray(fieldConfig.validations)
        ? fieldConfig.validations
        : [fieldConfig.validations]

      for (const validation of validations) {
        const result = validation(fieldState.value, {
          metadata: fieldConfig.metadata,
          formState: formState.fields,
        })

        if (result !== true) {
          fieldState.isValid = false

          if (typeof result === 'string') {
            if (!fieldState.errors) {
              fieldState.errors = []
            }

            fieldState.errors.push(result)
          } else if (Array.isArray(result)) {
            if (!fieldState.errors) {
              fieldState.errors = []
            }

            fieldState.errors.push(...result)
          } else if ('isLoading' in result) {
            fieldState.isLoading = true
          }
        }
      }
    }
  }
}

export type DynamicFormConfig<V, M = unknown> = Record<
  string,
  UpdateFieldConfig<DynamicFormInitialConfig<V, M>, string>
>

export type DynamicFormStore<V, M = unknown> = FormStore<
  DynamicFormInitialConfig<V, M>
>

export function useDynamicForm<V, M = unknown>({
  getInitialConfig,
  advancedFormValidation,
}: {
  getInitialConfig: () => DynamicFormConfig<V, M>
  advancedFormValidation?: AdvancedFormValidation<
    DynamicFormInitialConfig<V, M>
  >
}) {
  const config = useConst(() => {
    const initialConfig = getInitialConfig()

    const config: DynamicFormInitialConfig<V, M> = {}
    const derivatedConfig: FieldsDerivatedConfig<
      DynamicFormInitialConfig<V, M>
    > = {}
    const fieldIsValid: FieldsValidation<DynamicFormInitialConfig<V, M>> = {}

    for (const [id, fieldConfig] of objectTypedEntries(initialConfig)) {
      if (!Object.hasOwn(fieldConfig, 'initialValue')) {
        throw new Error(`Missing "initialValue" for field "${String(id)}"`)
      }

      if (Object.hasOwn(fieldConfig, 'value')) {
        throw new Error("Can't set value in useDynamicForm initialConfig")
      }

      config[id] = {
        initialValue: fieldConfig.initialValue as V,
        required: fieldConfig.required ?? false,
        requiredErrorMsg: fieldConfig.requiredErrorMsg,
        metadata: fieldConfig.metadata,
      }

      derivatedConfig[id] = {
        checkIfIsEmpty: fieldConfig.checkIfIsEmpty,
        required: fieldConfig.derivedRequired,
      }

      fieldIsValid[id] = fieldConfig.fieldIsValid
    }

    return {
      initialConfig: config,
      derivatedConfig,
      fieldIsValid,
      advancedFormValidation,
    }
  })

  return useForm(config)
}

export function normalizeFormValue(value: unknown) {
  return typeof value === 'string'
    ? value.trim()
    : Array.isArray(value)
    ? value.filter((item) => item !== undefined && item !== null)
    : value
}

export function valueIsEmpty(value: unknown) {
  return Array.isArray(value)
    ? value.length === 0
    : typeof value === 'string'
    ? value.trim() === ''
    : value === undefined || value === null
}
