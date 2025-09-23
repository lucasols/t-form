import { act, renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'
import { useForm } from '../src/main'
import { useFormState } from '../src/useFormState'

test('controlled input basic behavior', () => {
  const { result } = renderHook(() => {
    const { formTypedCtx, handleChange } = useForm({
      initialConfig: { input: { initialValue: '' } },
    })

    const { formFields } = useFormState(formTypedCtx)

    return { handleChange, formFields }
  })

  act(() => {
    result.current.handleChange('input', 'test')
  })
  expect(result.current.formFields.input.value).toBe('test')

  act(() => {
    result.current.handleChange('input', 'test ')
  })
  expect(result.current.formFields.input.value).toBe('test ')

  act(() => {
    result.current.handleChange('input', 'test  ')
  })
  expect(result.current.formFields.input.value).toBe('test  ')
})
