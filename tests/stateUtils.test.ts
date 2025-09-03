import { compactSnapshot } from '@ls-stack/utils/testUtils'
import { typingTest } from '@ls-stack/utils/typingTestUtils'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import {
  getChangedFormValuesObj,
  getFormValuesObj,
  useForm,
  useFormState,
} from '../src/main'

afterEach(() => cleanup())

describe('getFormValuesObj - Integration tests', () => {
  test('extracts current form values', () => {
    const { result } = renderHook(() => {
      const { formTypedCtx, handleChange } = useForm({
        initialConfig: {
          name: { initialValue: 'John' },
          age: { initialValue: 25 },
        },
      })

      const { formFields } = useFormState(formTypedCtx)

      const values = getFormValuesObj(formFields)

      typingTest.expectTypesAre<typeof values, { name: string; age: number }>(
        'equal',
      )

      return { values, handleChange }
    })

    act(() => {
      result.current.handleChange('name', 'John Doe')
      result.current.handleChange('age', 30)
    })

    expect(compactSnapshot(result.current.values)).toMatchInlineSnapshot(`
      "
      name: 'John Doe'
      age: 30
      "
    `)
  })
})

describe('getChangedFormValuesObj - Integration tests', () => {
  test('returns only changed fields', () => {
    const { result } = renderHook(() => {
      const { formTypedCtx, handleChange } = useForm({
        initialConfig: {
          name: { initialValue: 'John' },
          age: { initialValue: 25 },
          email: { initialValue: 'john@example.com' },
        },
      })

      const { formFields } = useFormState(formTypedCtx)

      const changedValues = getChangedFormValuesObj(formFields)

      typingTest.expectTypesAre<
        typeof changedValues,
        Partial<{ name: string; age: number; email: string }>
      >('equal')

      return { changedValues, handleChange }
    })

    act(() => {
      result.current.handleChange('name', 'Jane')
      result.current.handleChange('age', 30)
    })

    expect(compactSnapshot(result.current.changedValues))
      .toMatchInlineSnapshot(`
      "
      name: 'Jane'
      age: 30
      "
    `)
  })

  test('returns empty object when no fields changed', () => {
    const { result } = renderHook(() => {
      const { formTypedCtx } = useForm({
        initialConfig: {
          name: { initialValue: 'John' },
          age: { initialValue: 25 },
        },
      })

      const { formFields } = useFormState(formTypedCtx)

      return getChangedFormValuesObj(formFields)
    })

    expect(result.current).toEqual({})
  })

  test('excludes unchanged fields', () => {
    const { result } = renderHook(() => {
      const { formTypedCtx, handleChange } = useForm({
        initialConfig: {
          name: { initialValue: 'John' },
          age: { initialValue: 25 },
          email: { initialValue: 'john@example.com' },
        },
      })

      const { formFields } = useFormState(formTypedCtx)

      const changedValues = getChangedFormValuesObj(formFields)

      return { changedValues, handleChange }
    })

    act(() => {
      result.current.handleChange('name', 'Jane')
    })

    expect(compactSnapshot(result.current.changedValues))
      .toMatchInlineSnapshot(`
      "
      name: 'Jane'
      "
    `)
  })
})
