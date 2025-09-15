import { createLoggerStore } from '@ls-stack/utils/testUtils'
import { typingTest } from '@ls-stack/utils/typingTestUtils'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import {
  useDynamicForm,
  useForm,
  useFormState,
  type DynamicFormConfig,
  type DynamicFormInitialConfig,
} from '../src/main'
import {
  simplifyFieldsState,
  simplifyFieldState,
} from './utils/simplifyFieldsState'

afterEach(() => cleanup())

test('with field metadata', () => {
  type UserMetadata = { minNameLength: number }

  const renders = createLoggerStore()

  const initialUsers = [
    { id: '1', name: 'john_doe', minNameLength: 3 },
    { id: '2', name: 'jane_doe', minNameLength: 8 },
  ]

  const { result } = renderHook(() => {
    // typing test only
    useDynamicForm<string, true>({
      // @ts-expect-error - undefined should not be allowed when metadata generic is defined
      getInitialConfig: () => {
        return {
          test: { initialValue: 'test', required: true, metadata: undefined },
        }
      },
    })

    const { formTypedCtx, handleChange, updateConfig } = useDynamicForm<
      string,
      UserMetadata
    >({
      getInitialConfig: () => {
        const config: DynamicFormConfig<string, UserMetadata> = {}

        for (const user of initialUsers) {
          config[user.id] = {
            initialValue: user.name,
            required: true,
            metadata: { minNameLength: user.minNameLength },
            fieldIsValid: ({ value, fieldMetadata }) =>
              value.length < fieldMetadata.minNameLength ?
                'Name must be at least 3 characters'
              : true,
          }
        }
        return config
      },
    })

    const { formFields } = useFormState(formTypedCtx)

    renders.add({
      '#1': simplifyFieldState(formFields['1'], [
        'value',
        'metadata',
        'isValid',
        'errors',
      ]),
      '#2': simplifyFieldState(formFields['2'], [
        'value',
        'metadata',
        'isValid',
        'errors',
      ]),
    })

    return { handleChange, formFields, updateConfig }
  })

  typingTest.test('metadata type is ok', () => {
    const field1 = result.current.formFields['1']

    if (field1) {
      typingTest.expectTypesAre<typeof field1.metadata, UserMetadata>('equal')
    }
  })

  // Initial state - should show field metadata and form metadata
  expect(renders.snapshot).toMatchInlineSnapshot(`
    "
    ┌─
    ⋅ #1: {value:john_doe, metadata:{minNameLength:3}, isValid:✅, errors:null}
    ⋅ #2: {value:jane_doe, metadata:{minNameLength:8}, isValid:✅, errors:null}
    └─
    "
  `)

  // validation should use metadata values
  act(() => {
    result.current.handleChange('1', 'jo')
    result.current.handleChange('2', 'jane')
  })

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    ┌─
    ⋅ #1: {value:jo, metadata:{minNameLength:3}, isValid:❌, errors:[Name must be at least 3 characters]}
    ⋅ #2: {value:jane, metadata:{minNameLength:8}, isValid:❌, errors:[Name must be at least 3 characters]}
    └─
    "
  `)

  // changing fields metadata should reflect in the state
  act(() => {
    result.current.updateConfig({
      fields: { '1': { metadata: { minNameLength: 1 } } },
    })
  })

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    ┌─
    ⋅ #1: {value:jo, metadata:{minNameLength:1}, isValid:✅, errors:null}
    ⋅ #2: {value:jane, metadata:{minNameLength:8}, isValid:❌, errors:[Name must be at least 3 characters]}
    └─
    "
  `)
})

test('merge and remove excess fields should handle added fields', () => {
  const renders = createLoggerStore()

  const { result } = renderHook(() => {
    const { formTypedCtx, updateConfig } = useForm<
      DynamicFormInitialConfig<string>
    >({ initialConfig: { test: { initialValue: '' } } })

    const { formFields, formIsValid } = useFormState(formTypedCtx)

    renders.add({
      ...simplifyFieldsState(formFields, ['value', 'isValid']),
      formIsValid,
    })

    return { updateConfig }
  })

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    -> test: {value:'', isValid:✅} ⋅ formIsValid: ✅
    "
  `)

  act(() => {
    result.current.updateConfig({
      updateMode: 'mergeAndRemoveExcessFields',
      fields: {
        test: { initialValue: 'test' },
        newField: { initialValue: '', required: true },
      },
    })
  })

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    -> test: {value:'', isValid:✅} ⋅ newField: {value:'', isValid:❌} ⋅ formIsValid: ❌
    "
  `)
})
