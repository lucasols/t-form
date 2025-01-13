import { createLoggerStore } from '@ls-stack/utils/testUtils'
import { act, renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'
import {
  getFieldConfig,
  useDynamicForm,
  useForm,
  useFormState,
} from '../src/main'

test('set invalid loading state', () => {
  const renders = createLoggerStore()

  const { result } = renderHook(() => {
    const { handleChange, formTypedCtx } = useForm({
      initialConfig: {
        fileUrl: { initialValue: '', required: true },
      },
      derivedConfig: {
        fileUrl: {
          isLoading: (value) => value === 'uploading',
        },
      },
    })

    const { formFields, someFieldIsLoading } = useFormState(formTypedCtx)

    renders.add({
      someFieldIsLoading,
      value: formFields.fileUrl.value,
      errors: formFields.fileUrl.errors,
      isValid: formFields.fileUrl.isValid,
      isLoading: formFields.fileUrl.valueIsLoading,
    })

    return { handleChange }
  })

  act(() => {
    result.current.handleChange('fileUrl', 'uploading')
  })

  act(() => {
    result.current.handleChange('fileUrl', 'https://example.com/file')
  })

  expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      -> someFieldIsLoading: ❌ ⋅ value: '' ⋅ errors: null ⋅ isValid: ❌ ⋅ isLoading: ❌
      ┌─
      ⋅ someFieldIsLoading: ✅
      ⋅ value: uploading
      ⋅ errors: null
      ⋅ isValid: ❌
      ⋅ isLoading: ✅
      └─
      ┌─
      ⋅ someFieldIsLoading: ❌
      ⋅ value: https://example.com/file
      ⋅ errors: null
      ⋅ isValid: ✅
      ⋅ isLoading: ❌
      └─
      "
    `)
})

test('set invalid loading state with empty value', () => {
  const renders = createLoggerStore()

  const { result } = renderHook(() => {
    const { handleChange, formTypedCtx } = useForm({
      initialConfig: {
        fileUrl: getFieldConfig<{
          value: string
          isLoading: boolean
        }>({
          initialValue: { value: '', isLoading: false },
          isLoading: (value) => value.isLoading,
          checkIfIsEmpty: (value) => value.value === '',
        }),
      },
    })

    const { formFields, someFieldIsLoading } = useFormState(formTypedCtx)

    renders.add({
      someFieldIsLoading,
      value: formFields.fileUrl.value,
      errors: formFields.fileUrl.errors,
      isValid: formFields.fileUrl.isValid,
      isLoading: formFields.fileUrl.valueIsLoading,
    })

    return { handleChange }
  })

  act(() => {
    result.current.handleChange('fileUrl', { value: '', isLoading: true })
  })

  act(() => {
    result.current.handleChange('fileUrl', {
      value: 'https://example.com/file',
      isLoading: false,
    })
  })

  expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      ┌─
      ⋅ someFieldIsLoading: ❌
      ⋅ value: {value:'', isLoading:❌}
      ⋅ errors: null
      ⋅ isValid: ✅
      ⋅ isLoading: ❌
      └─
      ┌─
      ⋅ someFieldIsLoading: ✅
      ⋅ value: {value:'', isLoading:✅}
      ⋅ errors: null
      ⋅ isValid: ❌
      ⋅ isLoading: ✅
      └─
      ┌─
      ⋅ someFieldIsLoading: ❌
      ⋅ value: {value:https://example.com/file, isLoading:❌}
      ⋅ errors: null
      ⋅ isValid: ✅
      ⋅ isLoading: ❌
      └─
      "
    `)
})

test('usage in dynamic form', () => {
  const renders = createLoggerStore()

  const { result } = renderHook(() => {
    const { handleChange, formTypedCtx } = useDynamicForm<string>({
      getInitialConfig: () => ({
        fileUrl: {
          initialValue: '',
          required: false,
          isLoading: (value) => value === 'uploading',
        },
      }),
    })

    const { formFields, someFieldIsLoading } = useFormState(formTypedCtx)

    renders.add({
      someFieldIsLoading,
      value: formFields.fileUrl!.value,
      errors: formFields.fileUrl!.errors,
      isValid: formFields.fileUrl!.isValid,
      isLoading: formFields.fileUrl!.valueIsLoading,
    })

    return { handleChange }
  })

  act(() => {
    result.current.handleChange('fileUrl', 'uploading')
  })

  act(() => {
    result.current.handleChange('fileUrl', 'https://example.com/file')
  })

  expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      -> someFieldIsLoading: ❌ ⋅ value: '' ⋅ errors: null ⋅ isValid: ✅ ⋅ isLoading: ❌
      ┌─
      ⋅ someFieldIsLoading: ✅
      ⋅ value: uploading
      ⋅ errors: null
      ⋅ isValid: ❌
      ⋅ isLoading: ✅
      └─
      ┌─
      ⋅ someFieldIsLoading: ❌
      ⋅ value: https://example.com/file
      ⋅ errors: null
      ⋅ isValid: ✅
      ⋅ isLoading: ❌
      └─
      "
    `)
})

test('update isLoading function', () => {
  const renders = createLoggerStore()

  const { result } = renderHook(() => {
    const { handleChange, formTypedCtx, updateConfig } = useForm({
      initialConfig: {
        fileUrl: { initialValue: '', required: true },
      },
      derivedConfig: {
        fileUrl: {
          isLoading: (value) => value === 'uploading',
        },
      },
    })

    const { formFields, someFieldIsLoading } = useFormState(formTypedCtx)

    renders.add({
      someFieldIsLoading,
      value: formFields.fileUrl.value,
      errors: formFields.fileUrl.errors,
      isValid: formFields.fileUrl.isValid,
      isLoading: formFields.fileUrl.valueIsLoading,
    })

    return { handleChange, updateConfig }
  })

  act(() => {
    result.current.handleChange('fileUrl', 'uploading')
  })

  renders.addMark('update isLoading function')

  act(() => {
    result.current.updateConfig({
      fields: {
        fileUrl: {
          isLoading: (value) => value === 'processing',
        },
      },
    })
  })

  renders.addMark('update to new loading value')

  act(() => {
    result.current.handleChange('fileUrl', 'processing')
  })

  expect(renders.snapshot).toMatchInlineSnapshot(`
    "
    -> someFieldIsLoading: ❌ ⋅ value: '' ⋅ errors: null ⋅ isValid: ❌ ⋅ isLoading: ❌
    ┌─
    ⋅ someFieldIsLoading: ✅
    ⋅ value: uploading
    ⋅ errors: null
    ⋅ isValid: ❌
    ⋅ isLoading: ✅
    └─

    >>> update isLoading function

    ┌─
    ⋅ someFieldIsLoading: ❌
    ⋅ value: uploading
    ⋅ errors: null
    ⋅ isValid: ✅
    ⋅ isLoading: ❌
    └─

    >>> update to new loading value

    ┌─
    ⋅ someFieldIsLoading: ✅
    ⋅ value: processing
    ⋅ errors: null
    ⋅ isValid: ❌
    ⋅ isLoading: ✅
    └─
    "
  `)
})
