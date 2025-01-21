import { useCallback, useMemo } from 'react'
import { deepEqual, Store, useCreateStore } from 't-state'
import { createFormTypedCtx, FormTypedCtx, useFormState } from './useFormState'
import { singleOrMultipleToArray } from './utils/arrays'
import { invariant, isFunction, isObject } from './utils/assertions'
import { useConst, useLatestValue } from './utils/hooks'
import { mapObjectToObject, objectTypedEntries } from './utils/object'
import { SingleOrMultiple } from './utils/typing'
import { SetValue, unwrapSetterValue } from './utils/unwrapSetterValue'
import {
  GetterOrValue,
  keepPrevIfUnchanged,
  unwrapGetterOrValue,
} from './utils/utils'

export { useFormState } from './useFormState'

type GlobalConfig = {
  defaultRequiredMsg: string | (() => string)
  errorElementSelector: string
  handleFormError: (error: Error) => void
}

const globalConfig: GlobalConfig = {
  defaultRequiredMsg: 'This field is required',
  errorElementSelector: '.showErrors',
  handleFormError(error) {
    throw error
  },
}

export function setGlobalConfig(config: Partial<GlobalConfig>) {
  Object.assign(globalConfig, config)
}

export type FieldSimplifiedValidation<V, M = unknown> = SingleOrMultiple<
  (args: {
    value: V
    fieldMetadata?: M
  }) => true | string | string[] | SilentInvalid | SilentInvalidIfNotTouched
>

type FieldInitialConfig<T = unknown, M = unknown> = {
  initialValue: T
  required?: boolean
  metadata?: M
  requiredErrorMsg?: string | false
  untouchable?: boolean
  advancedCustomValue?: T
  /** @internal */
  _validation?: FieldSimplifiedValidation<any, any>
  /** @internal */
  _isEmpty?: (value: any) => boolean
  /** @internal */
  _isLoading?: (value: any) => boolean
}

type FieldDerivedConfig<T, F extends FieldsState<any>, FM> = {
  checkIfIsEmpty?: (value: T) => boolean
  required?: (context: { fields: F; formMetadata: FM | undefined }) => boolean
  resetIfDerivedRequiredChangeToFalse?: { value: T }
  isLoading?: (value: T) => boolean
}

export type SilentInvalid = { silentInvalid: true }
export type SilentInvalidIfNotTouched = {
  silentIfNotTouched: string | string[]
}

export const invalidFormField: {
  silentInvalid: SilentInvalid
  silentIfNotTouched: (msg: string | string[]) => SilentInvalidIfNotTouched
} = {
  silentInvalid: { silentInvalid: true },
  silentIfNotTouched: (msg: string | string[]) => ({ silentIfNotTouched: msg }),
}

export type FieldIsValid<
  Value,
  Metadata,
  FS extends FieldsState<any>,
  FormMetadata,
  FieldId,
> = (context: {
  value: Value
  fieldMetadata: Metadata
  fields: FS
  formMetadata: FormMetadata | undefined
  fieldId: FieldId
}) => true | string | string[] | SilentInvalid | SilentInvalidIfNotTouched

type FieldValidation<T, M, F extends FieldsState<any>, FM, K> =
  | FieldIsValid<T, M, F, FM, K>
  | FieldIsValid<T, M, F, FM, K>[]

type FieldConfig = Omit<
  FieldInitialConfig,
  'metadata' | '_validation' | '_isEmpty'
> & {
  _metadata?: any
  derived: FieldDerivedConfig<unknown, any, any> | undefined
  validations: FieldValidation<unknown, unknown, any, any, any> | undefined
  simpleValidations: FieldSimplifiedValidation<unknown, unknown> | undefined
  arrayConfig:
    | ArrayFieldsConfig<
        Record<string, FieldInitialConfig<any[], unknown>>
      >[string]
    | undefined
}

type FormStoreState<T extends FieldsInitialConfig, M = unknown> = {
  fields: {
    [K in keyof T]: FieldState<T[K]['initialValue'], T[K]['metadata']>
  }
  formError: string | false
  formMetadata: M | undefined
  validationWasForced: number
}

export type FieldsInitialConfig = Record<string, FieldInitialConfig>

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
  valueIsLoading: boolean
}

export type FieldsState<T extends FieldsInitialConfig> = {
  [P in keyof T]: FieldState<T[P]['initialValue'], T[P]['metadata']>
}

type FieldsDerivedConfig<T extends FieldsInitialConfig, FM> = {
  [K in keyof T]?: FieldDerivedConfig<T[K]['initialValue'], FieldsState<T>, FM>
}

type FieldsValidation<T extends FieldsInitialConfig, FM> = {
  [K in keyof T]?: FieldValidation<
    T[K]['initialValue'],
    T[K]['metadata'],
    { [P in keyof T]: FieldState<T[P]['initialValue'], T[P]['metadata']> },
    FM,
    K
  >
}

export type FormStore<T extends FieldsInitialConfig, FM = undefined> = Store<
  FormStoreState<T, FM>
>

export type UpdateFieldConfig<
  T extends FieldsInitialConfig,
  K extends keyof T,
  FM = undefined,
> = {
  replace?: boolean
  value?: T[K]['initialValue']
  initialValue?: T[K]['initialValue']
  required?: boolean
  isTouched?: boolean
  isUntouchable?: boolean
  metadata?: T[K]['metadata']
  requiredErrorMsg?: string | false
  checkIfIsEmpty?: (value: T[K]['initialValue']) => boolean
  isLoading?: (value: T[K]['initialValue']) => boolean
  derivedRequired?: (context: {
    fields: FieldsState<T>
    formMetadata: FM | undefined
  }) => boolean
  simpleFieldIsValid?: FieldSimplifiedValidation<
    T[K]['initialValue'],
    T[K]['metadata']
  >
  fieldIsValid?: FieldValidation<
    T[K]['initialValue'],
    T[K]['metadata'],
    FieldsState<T>,
    FM,
    K
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

export function useForm<T extends FieldsInitialConfig, M = undefined>({
  initialConfig: fieldsInitialConfig,
  derivedConfig: fieldsDerivedConfig,
  fieldIsValid: validations,
  advancedFormValidation,
  arrayFieldsConfig,
  initialFormMetadata,
}: {
  initialConfig: T | (() => T)
  derivedConfig?: FieldsDerivedConfig<T, M> | (() => FieldsDerivedConfig<T, M>)
  fieldIsValid?: FieldsValidation<T, M> | (() => FieldsValidation<T, M>)
  advancedFormValidation?: AdvancedFormValidation<T>
  arrayFieldsConfig?: ArrayFieldsConfig<T> | (() => ArrayFieldsConfig<T>)
  initialFormMetadata?: M | (() => M)
}) {
  type FieldsId = keyof T

  const formConfig = useConst(() => {
    const configs = unwrapGetterOrValue(fieldsInitialConfig)
    const derivedConfig = unwrapGetterOrValue(fieldsDerivedConfig)
    const fieldValidations = unwrapGetterOrValue(validations)
    const arraysConfig = unwrapGetterOrValue(arrayFieldsConfig)

    const mapConfig = new Map<FieldsId, FieldConfig>()

    for (const [id, initialConfig] of objectTypedEntries(configs)) {
      const fieldDerivedCfg = derivedConfig?.[id]

      mapConfig.set(id, {
        ...initialConfig,
        _metadata: initialConfig.metadata,
        derived: {
          ...fieldDerivedCfg,
          checkIfIsEmpty:
            initialConfig._isEmpty ?? fieldDerivedCfg?.checkIfIsEmpty,
          isLoading: initialConfig._isLoading ?? fieldDerivedCfg?.isLoading,
        },
        validations: fieldValidations?.[id],
        arrayConfig: arraysConfig?.[id],
        simpleValidations: initialConfig._validation,
      })
    }

    return {
      fieldsMap: mapConfig,
      formMetadata: unwrapGetterOrValue(initialFormMetadata),
    }
  })

  const tempErrors = useConst(() => new Map<string, string[]>())

  type InternalFormStoreState = FormStoreState<T, M>

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
      validationWasForced: 0,
      formMetadata: formConfig.formMetadata as M,
    }

    for (const [id, config] of formConfig.fieldsMap) {
      formStoreState.fields[id] = getInitialStateFromConfig(config)

      updateFieldStateFromValue(
        id as string,
        null,
        config,
        config.initialValue,
        formStoreState.fields[id],
        true,
      )
    }

    performExtraUpdates(formStoreState, null)

    return formStoreState
  }

  const performExtraUpdates = useCallback(
    (
      formStoreState: InternalFormStoreState,
      errorWasReset: Set<string> | null,
    ) => {
      updateDerivedConfig(
        errorWasReset,
        formConfig.fieldsMap as Map<string, FieldConfig>,
        formStoreState,
      )

      performFormValidation(
        errorWasReset,
        formConfig.fieldsMap as Map<string, FieldConfig>,
        formStoreState,
        tempErrors,
      )

      latestFormValidation.insideMemo(formStoreState)
    },
    [formConfig, latestFormValidation, tempErrors],
  )

  const formStore: FormStore<T, M> = useCreateStore<InternalFormStoreState>(
    () => ({
      state: getInitialState(),
    }),
  )

  type ValueArg<K extends FieldsId> = SetValue<T[K]['initialValue']>

  type HandleChangeOptions = {
    skipTouch?: boolean | string[]
    touchOnly?: string[]
  }

  type HandleChange = {
    <K extends FieldsId>(
      id: K,
      value: ValueArg<K>,
      options?: HandleChangeOptions | boolean,
    ): void
    (
      fields: { [P in keyof T]?: ValueArg<P> },
      options?: HandleChangeOptions | boolean,
    ): void
  }

  const handleChange = useCallback<HandleChange>(
    <K extends FieldsId>(
      ...args:
        | [id: K, value: ValueArg<K>, skipTouch?: HandleChangeOptions | boolean]
        | [
            fields: { [P in FieldsId]?: ValueArg<P> },
            skipTouch?: HandleChangeOptions | boolean,
          ]
    ) => {
      const firstArg = args[0]
      let options =
        typeof args[0] === 'string'
          ? args[2]
          : (args[1] as boolean | HandleChangeOptions | undefined)

      options = typeof options === 'boolean' ? { skipTouch: options } : options

      const errorWasReset = new Set<string>()

      const valuesToUpdate: Partial<Record<K, ValueArg<K>>> =
        typeof firstArg !== 'object'
          ? ({ [firstArg]: args[1] } as Record<K, ValueArg<K>>)
          : firstArg

      formStore.produceState((draft) => {
        const unchangedFields = new Set<string>(Object.keys(draft.fields))

        for (const [id, value] of Object.entries(valuesToUpdate)) {
          if (value === undefined) {
            continue
          }

          const fieldConfig = formConfig.fieldsMap.get(id)

          let shouldSkipTouch = !!fieldConfig?.untouchable

          if (!shouldSkipTouch) {
            const skipTouchConfig = options && options.skipTouch

            if (skipTouchConfig) {
              if (Array.isArray(skipTouchConfig)) {
                shouldSkipTouch = skipTouchConfig.includes(id)
              } else {
                shouldSkipTouch = true
              }
            }

            if (options && options.touchOnly) {
              shouldSkipTouch = !options.touchOnly.includes(id)
            }
          }

          if (!shouldSkipTouch) {
            tempErrors.delete(id)
          }

          const fieldState = draft.fields[id]

          if (!fieldState || !fieldConfig) {
            console.error(fieldNotFoundMessage(id))
            continue
          }

          const newValue = unwrapSetterValue<typeof fieldState.value>(
            value,
            fieldState.value,
          )

          updateFieldStateFromValue(
            id,
            errorWasReset,
            fieldConfig,
            newValue,
            fieldState,
            shouldSkipTouch,
          )

          unchangedFields.delete(id)
        }

        updateDerivedConfig(
          errorWasReset,
          formConfig.fieldsMap as Map<string, FieldConfig>,
          draft,
        )

        performExtraUpdates(draft, errorWasReset)
      })
    },
    [formStore, formConfig, performExtraUpdates, tempErrors],
  )

  const formTypedCtx = useMemo(
    (): FormTypedCtx<T, M> => createFormTypedCtx(formStore, handleChange),
    [formStore, handleChange],
  )

  const useFormStateDeprecated = useCallback(
    ({ mustBeDiffFromInitial = false } = {}) => {
      return useFormState(formTypedCtx, { mustBeDiffFromInitial })
    },
    [formTypedCtx],
  )

  const forceFormUpdate = useCallback(
    (skipTouchOrOptions: boolean | string[] | HandleChangeOptions) => {
      formStore.batch(() => {
        handleChange(
          mapObjectToObject(formStore.state.fields, (id, { value }) => [
            id,
            value,
          ]),
          isObject(skipTouchOrOptions)
            ? skipTouchOrOptions
            : { skipTouch: skipTouchOrOptions },
        )
      })
    },
    [formStore, handleChange],
  )

  const forceFormValidation = useCallback(
    (options?: HandleChangeOptions) => {
      formStore.batch(() => {
        formStore.setKey('validationWasForced', (v) => v + 1)

        forceFormUpdate(options ?? false)
      })

      setTimeout(() => {
        document
          .querySelector(globalConfig.errorElementSelector)
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          })
      }, 90)
    },
    [formStore, forceFormUpdate],
  )

  const touchField = useCallback(
    (id: FieldsId) => {
      const field = formStore.state.fields[id as string]

      if (!field) {
        console.error(fieldNotFoundMessage(id))
        return
      }

      if (!field.isTouched) {
        handleChange(id, field.value)
      }
    },
    [handleChange, formStore],
  )

  const setTemporaryError = useCallback(
    (fields: { [P in keyof T]?: string | string[] }) => {
      for (const [id, error] of objectTypedEntries(fields)) {
        tempErrors.set(id, singleOrMultipleToArray(error))
      }

      forceFormUpdate(true)
    },
    [forceFormUpdate, tempErrors],
  )

  const updateConfig = useCallback(
    ({
      fields,
      updateMode = 'merge',
      formMetadata,
      updateUntouchedValues,
    }: {
      fields?: UpdateFormConfig<T>
      formMetadata?: M
      /**
       * @default merge
       *
       * Modes:
       * - merge: merges the new config with the old one
       * - overwriteAll: overwrites all the fields with the new config
       * - mergeAndRemoveExcessFields: merges the new config with the old one and removes the excess fields
       */
      updateMode?: 'merge' | 'overwriteAll' | 'mergeAndRemoveExcessFields'
      /**
       * If true fields without a new `value` but with a new `initialValue` will update their value if they are untouched
       */
      updateUntouchedValues?: boolean
    }) => {
      formStore.batch(() => {
        if (fields) {
          formStore.produceState((draft) => {
            for (const [id, newConfig] of objectTypedEntries(fields)) {
              const fieldConfig = formConfig.fieldsMap.get(id)

              if (!newConfig) continue

              if (
                newConfig !== 'remove' &&
                (!fieldConfig ||
                  newConfig.replace ||
                  updateMode === 'overwriteAll')
              ) {
                if (!Object.hasOwn(newConfig, 'initialValue')) {
                  globalConfig.handleFormError(
                    new Error(
                      `Missing "initialValue" for field "${String(id)}"`,
                    ),
                  )
                  return
                }

                const config: FieldConfig = {
                  initialValue: newConfig.initialValue,
                  required: newConfig.required ?? false,
                  requiredErrorMsg: newConfig.requiredErrorMsg,
                  derived: {
                    checkIfIsEmpty: newConfig.checkIfIsEmpty,
                    required: newConfig.derivedRequired,
                  },
                  validations: newConfig.fieldIsValid,
                  untouchable: newConfig.isUntouchable ?? false,
                  _metadata: newConfig.metadata,
                  arrayConfig: fieldConfig?.arrayConfig,
                  simpleValidations: fieldConfig?.simpleValidations,
                }

                formConfig.fieldsMap.set(id, config)

                draft.fields[id] = getInitialStateFromConfig(config)

                continue
              }

              // merge mode

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

              if (newConfig.isUntouchable !== undefined) {
                fieldConfig.untouchable = newConfig.isUntouchable
              }

              if (!fieldConfig.untouchable) {
                if (newConfig.isTouched !== undefined) {
                  fieldState.isTouched = newConfig.isTouched
                }
              }

              let valueWasChanged = false
              if (Object.hasOwn(newConfig, 'value')) {
                const skipUpdate = updateUntouchedValues && fieldState.isTouched

                if (!skipUpdate) {
                  valueWasChanged = true
                  fieldState.value = newConfig.value
                }
              }

              if (
                !valueWasChanged &&
                updateUntouchedValues &&
                !fieldState.isTouched &&
                Object.hasOwn(newConfig, 'initialValue')
              ) {
                fieldState.value = fieldState.initialValue
              }

              if (newConfig.fieldIsValid !== undefined) {
                fieldConfig.validations = newConfig.fieldIsValid
              }

              if (newConfig.simpleFieldIsValid !== undefined) {
                fieldConfig.simpleValidations = newConfig.simpleFieldIsValid
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

              if (newConfig.isLoading !== undefined) {
                fieldConfig.derived = {
                  ...fieldConfig.derived,
                  isLoading: newConfig.isLoading,
                }
              }

              if (newConfig.metadata !== undefined) {
                fieldConfig._metadata = newConfig.metadata
                fieldState.metadata = newConfig.metadata
              }
            }

            if (
              updateMode === 'mergeAndRemoveExcessFields' ||
              updateMode === 'overwriteAll'
            ) {
              for (const [id] of objectTypedEntries(draft.fields)) {
                if (!fields[id]) {
                  formConfig.fieldsMap.delete(id)
                  delete draft.fields[id]
                }
              }
            }
          })
        }

        if (formMetadata !== undefined) {
          formStore.produceState((draft) => {
            draft.formMetadata = formMetadata
            formConfig.formMetadata = formMetadata
          })
        }

        forceFormUpdate(true)
      })
    },
    [forceFormUpdate, formConfig, formStore],
  )

  const untouchAll = useCallback(() => {
    const mergeCfg: UpdateFormConfig<T> = {}

    for (const id of Object.keys(formStore.state.fields)) {
      mergeCfg[id as keyof T] = {
        isTouched: false,
      }
    }

    updateConfig({
      fields: mergeCfg,
    })
  }, [formStore.state.fields, updateConfig])

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
    /** @deprecated use the exported hook `useFormState(formTypedCtx)` instead */
    useFormState: useFormStateDeprecated,
    handleChange,
    formStore,
    touchField,
    updateConfig,
    forceFormValidation,
    forceFormUpdate,
    arrayFields,
    setTemporaryError,
    untouchAll,
    formTypedCtx,
    /** @internal */
    formConfig,
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
    value: config.advancedCustomValue ?? config.initialValue,
    initialValue: config.initialValue,
    required: config.required ?? false,
    errors: null,
    isValid: false,
    isEmpty: true,
    isTouched: false,
    isDiffFromInitial: false,
    metadata: config._metadata,
    valueIsLoading: false,
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
    if (fieldState.valueIsLoading) {
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
  fieldId: string,
  errorWasReset: Set<string> | null,
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
    !isInitialState &&
    draftField.value === normalizedValue &&
    deepEqual(validationResults, {
      errors: draftField.errors,
      isValid: draftField.isValid,
      isEmpty: draftField.isEmpty,
    })
  ) {
    errorWasReset?.add(fieldId)
    return
  }

  draftField.isDiffFromInitial = !deepEqual(
    normalizedValue,
    draftField.initialValue,
  )
  draftField.value = normalizedValue
  draftField.errors = draftField.isTouched
    ? keepPrevIfUnchanged(validationResults.errors, draftField.errors)
    : null
  errorWasReset?.add(fieldId)
  draftField.isValid = validationResults.isValid
  draftField.isEmpty = validationResults.isEmpty
  draftField.valueIsLoading = false
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
        fieldConfig.requiredErrorMsg ||
          (typeof globalConfig.defaultRequiredMsg === 'string'
            ? globalConfig.defaultRequiredMsg
            : globalConfig.defaultRequiredMsg()),
      )
    }
  }

  return {
    errors: errors.length !== 0 ? errors : null,
    isValid,
    isEmpty,
  }
}

function updateDerivedConfig(
  errorWasReset: Set<string> | null,
  fieldsConfig: Map<string, FieldConfig>,
  formState: FormStoreState<any>,
): void {
  for (const [id, fieldConfig] of fieldsConfig) {
    if (fieldConfig.derived?.required) {
      const fieldState = formState.fields[id]

      if (!fieldState) {
        globalConfig.handleFormError(
          new Error(`Field with id "${String(id)}" not found`),
        )
        return
      }

      const newRequired = fieldConfig.derived.required({
        fields: formState.fields,
        formMetadata: formState.formMetadata,
      })

      if (fieldConfig.derived.resetIfDerivedRequiredChangeToFalse) {
        if (newRequired !== fieldState.required && !newRequired) {
          fieldState.value =
            fieldConfig.derived.resetIfDerivedRequiredChangeToFalse.value
        }
      }

      fieldState.required = newRequired

      const validationResults = basicFieldValidation(
        { ...fieldConfig, required: newRequired },
        fieldState.value,
      )

      if (
        !deepEqual(validationResults.errors, fieldState.errors) &&
        fieldState.isTouched
      ) {
        fieldState.errors = validationResults.errors
      }

      errorWasReset?.add(id)

      fieldState.isValid = validationResults.isValid
      fieldState.isEmpty = validationResults.isEmpty
    }
  }
}

function performFormValidation(
  errorWasReset: Set<string> | null,
  fieldsConfig: Map<string, FieldConfig>,
  formState: FormStoreState<any>,
  tempErrors: Map<string, string[]>,
): void {
  if (errorWasReset) {
    for (const [id, fieldConfig] of fieldsConfig) {
      const fieldState = formState.fields[id]

      if (!fieldState) {
        globalConfig.handleFormError(new Error(fieldNotFoundMessage(id)))
        continue
      }

      if (!errorWasReset.has(id)) {
        fieldState.errors = fieldState.errors
          ? keepPrevIfUnchanged(
              basicFieldValidation(fieldConfig, fieldState.value).errors,
              fieldState.errors,
            )
          : null
        fieldState.isValid = fieldState.required ? !fieldState.isEmpty : true
      }
    }
  }

  for (const [id, fieldConfig] of fieldsConfig) {
    const fieldState = formState.fields[id]

    if (!fieldState) {
      globalConfig.handleFormError(new Error(fieldNotFoundMessage(id)))
      continue
    }

    const validations = [
      ...singleOrMultipleToArray(fieldConfig.validations),
      ...singleOrMultipleToArray(fieldConfig.simpleValidations),
    ]

    const tempError = tempErrors.get(id)

    if (tempError) {
      fieldState.errors = tempError
      fieldState.isValid = false
    }

    if (fieldConfig.derived?.isLoading) {
      const isLoading = fieldConfig.derived.isLoading(fieldState.value)
      fieldState.valueIsLoading = isLoading
      if (isLoading) {
        fieldState.isValid = false
      }
    }

    if (fieldState.isEmpty) {
      continue
    }

    for (const validation of validations) {
      const result = validation({
        value: fieldState.value,
        fieldMetadata: fieldState.metadata,
        formMetadata: formState.formMetadata,
        fields: formState.fields,
        fieldId: id,
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
        } else if ('silentIfNotTouched' in result) {
          if (fieldState.isTouched) {
            if (!fieldState.errors) {
              fieldState.errors = []
            }

            fieldState.errors.push(
              ...singleOrMultipleToArray(result.silentIfNotTouched),
            )
          }
        }
      }
    }
  }
}

export type DynamicFormConfig<V, M = undefined, FM = undefined> = Record<
  string,
  UpdateFieldConfig<DynamicFormInitialConfig<V, M>, string, FM>
>

export type DynamicFormStore<
  Value,
  FieldMetadata = undefined,
  FormMetadata = undefined,
> = FormStore<DynamicFormInitialConfig<Value, FieldMetadata>, FormMetadata>

export function useDynamicForm<V, M = undefined, FM = undefined>({
  getInitialConfig,
  advancedFormValidation,
}: {
  getInitialConfig: () => DynamicFormConfig<V, M, FM>
  advancedFormValidation?: AdvancedFormValidation<
    DynamicFormInitialConfig<V, M>
  >
}) {
  const config = useConst(() => {
    const initialConfig = getInitialConfig()

    const config: DynamicFormInitialConfig<V, M> = {}
    const derivedConfig: FieldsDerivedConfig<
      DynamicFormInitialConfig<V, M>,
      FM
    > = {}
    const fieldIsValid: FieldsValidation<
      DynamicFormInitialConfig<V, M>,
      FM
    > = {}

    for (const [id, fieldConfig] of objectTypedEntries(initialConfig)) {
      if (!Object.hasOwn(fieldConfig, 'initialValue')) {
        globalConfig.handleFormError(
          new Error(`Missing "initialValue" for field "${String(id)}"`),
        )
        continue
      }

      config[id] = {
        initialValue: fieldConfig.initialValue as V,
        required: fieldConfig.required ?? false,
        requiredErrorMsg: fieldConfig.requiredErrorMsg,
        metadata: fieldConfig.metadata,
      }

      derivedConfig[id] = {
        checkIfIsEmpty: fieldConfig.checkIfIsEmpty,
        required: fieldConfig.derivedRequired,
        isLoading: fieldConfig.isLoading,
      }

      fieldIsValid[id] = fieldConfig.fieldIsValid
    }

    return {
      initialConfig: config,
      derivedConfig,
      fieldIsValid,
      advancedFormValidation,
      formMetadata: initialConfig.formMetadata,
    }
  })

  return useForm(config)
}

export type GetFieldInitialConfig<V, M> = {
  initialValue: V
  required?: boolean
  requiredErrorMsg?: string | false
  metadata?: M
  isValid?: FieldSimplifiedValidation<V, M>
  checkIfIsEmpty?: (value: V) => boolean
  untouchable?: boolean
  isLoading?: (value: V) => boolean
}

export function getFieldConfig<V, M = undefined>({
  initialValue,
  required,
  requiredErrorMsg,
  metadata,
  isValid,
  checkIfIsEmpty,
  isLoading,
  untouchable,
}: GetFieldInitialConfig<V, M>): FieldInitialConfig<V, M> {
  return {
    initialValue,
    required,
    requiredErrorMsg,
    metadata,
    _validation: isValid,
    _isEmpty: checkIfIsEmpty,
    untouchable,
    _isLoading: isLoading,
  }
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

type FormConfigFromValues<T extends Record<string, any>> = {
  [K in keyof T]: FieldInitialConfig<T[K]>
}

type FieldDerivedConfigFromValues<
  T extends Record<string, any>,
  FM,
> = FieldDerivedConfig<T[keyof T], FieldsState<FormConfigFromValues<T>>, FM>

type PreTypedValuesFieldConfig<
  T extends Record<string, any>,
  K extends keyof T,
  FM = undefined,
> = {
  initialValue: T[K]
  required?: boolean | FieldDerivedConfigFromValues<T, FM>['required']
  requiredErrorMsg?: string | false
  checkIfIsEmpty?: (
    value: FormConfigFromValues<T>[K]['initialValue'],
  ) => boolean
  resetIfDerivedRequiredChangeToFalse?: FieldDerivedConfigFromValues<
    T,
    FM
  >['resetIfDerivedRequiredChangeToFalse']
  isValid?: FieldsValidation<FormConfigFromValues<T>, FM>[K]
}

export function useFormWithPreTypedValues<
  T extends Record<string, any>,
  FM = undefined,
>({
  initialConfig,
  advancedFormValidation,
  initialFormMetadata,
}: {
  initialConfig: NoInfer<
    GetterOrValue<{
      [K in keyof T]: PreTypedValuesFieldConfig<T, K, FM>
    }>
  >
  advancedFormValidation?: AdvancedFormValidation<T>
  initialFormMetadata?: FM | (() => FM)
}) {
  type Config = FormConfigFromValues<T>

  const config = useConst(() => {
    const fieldsConfig = unwrapGetterOrValue(initialConfig)

    const config: Config = {} as any
    const derivedConfig: FieldsDerivedConfig<Config, FM> = {}
    const fieldIsValid: FieldsValidation<Config, FM> = {}

    for (const [id, fieldConfig] of objectTypedEntries(fieldsConfig)) {
      config[id as keyof Config] = {
        initialValue: fieldConfig.initialValue,
        required: isFunction(fieldConfig.required)
          ? undefined
          : fieldConfig.required,
        requiredErrorMsg: fieldConfig.requiredErrorMsg,
      }

      derivedConfig[id as keyof Config] = {
        checkIfIsEmpty: fieldConfig.checkIfIsEmpty,
        required: isFunction(fieldConfig.required)
          ? fieldConfig.required
          : undefined,
        resetIfDerivedRequiredChangeToFalse:
          fieldConfig.resetIfDerivedRequiredChangeToFalse,
      }

      fieldIsValid[id as keyof Config] = fieldConfig.isValid
    }

    return {
      initialConfig: config,
      derivedConfig,
      fieldIsValid,
    }
  })

  return useForm<Config, FM>({
    ...config,
    initialFormMetadata,
    advancedFormValidation,
  })
}
