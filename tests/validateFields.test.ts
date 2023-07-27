import { renderHook } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { useForm } from '../src/main'
import { emulateAction } from './utils/emulateAction'
import { createRenderStore } from './utils/rendersStore'
import { simplifyFieldsState } from './utils/simplifyFieldsState'

describe('validate field', () => {
  test('simple field validation', () => {
    const renders = createRenderStore()

    const setPassword = emulateAction<string>()

    renderHook(() => {
      const { useFormState, handleChange } = useForm({
        initialConfig: {
          password: { initialValue: '' },
        },
        fieldIsValid: {
          password: (value) =>
            value.length < 8
              ? 'Password must have at least 8 characters'
              : true,
        },
      })

      const { formFields } = useFormState()

      renders.add(
        simplifyFieldsState(formFields, ['value', 'errors', 'isValid']),
      )

      setPassword.useOnAction((password) => {
        handleChange('password', password)
      })
    })

    setPassword.call('12345678')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      password: {value:, errors:[Password must have at least 8 characters], isValid:false}
      password: {value:12345678, errors:null, isValid:true}
      "
    `)

    setPassword.call('1234567')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      password: {value:1234567, errors:[Password must have at least 8 characters], isValid:false}
      "
    `)
  })

  test('multiple field validations', () => {
    const renders = createRenderStore()

    const setPassword = emulateAction<string>()

    renderHook(() => {
      const { useFormState, handleChange } = useForm({
        initialConfig: {
          password: { initialValue: '' },
        },
        fieldIsValid: {
          password: [
            (value) =>
              value.length < 8
                ? 'Password must have at least 8 characters'
                : true,
            (value) =>
              !value.match(/[0-9]/)
                ? 'Password must have at least one number'
                : true,
          ],
        },
      })

      const { formFields } = useFormState()

      renders.add(
        simplifyFieldsState(formFields, ['value', 'errors', 'isValid']),
      )

      setPassword.useOnAction((password) => {
        handleChange('password', password)
      })
    })

    setPassword.call('abcdefghij')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      password: {value:, errors:[Password must have at least 8 characters, Password must have at least one number], isValid:false}
      password: {value:abcdefghij, errors:[Password must have at least one number], isValid:false}
      "
    `)

    setPassword.call('12345678')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      password: {value:12345678, errors:null, isValid:true}
      "
    `)
  })

  test('validate based on other fields', () => {
    const renders = createRenderStore()

    const setPassword = emulateAction<string>()
    const setConfirmPassword = emulateAction<string>()

    renderHook(() => {
      const { useFormState, handleChange } = useForm({
        initialConfig: {
          password: { initialValue: '', required: true },
          confirmPassword: { initialValue: '', required: true },
        },
        fieldIsValid: {
          confirmPassword: (value, { formState: { password } }) =>
            value !== password.value ? 'Passwords must match' : true,
        },
      })

      const { formFields } = useFormState()

      renders.add(
        simplifyFieldsState(formFields, ['value', 'errors', 'isValid']),
      )

      setPassword.useOnAction((password) => {
        handleChange('password', password)
      })

      setConfirmPassword.useOnAction((confirmPassword) => {
        handleChange('confirmPassword', confirmPassword)
      })
    })

    setPassword.call('12345678')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ┌─
      ⎢ password: {value:, errors:null, isValid:false}
      ⎢ confirmPassword: {value:, errors:null, isValid:false}
      └─
      ┌─
      ⎢ password: {value:12345678, errors:null, isValid:true}
      ⎢ confirmPassword: {value:, errors:[Passwords must match], isValid:false}
      └─
      "
    `)

    setConfirmPassword.call('12345678')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      ┌─
      ⎢ password: {value:12345678, errors:null, isValid:true}
      ⎢ confirmPassword: {value:12345678, errors:null, isValid:true}
      └─
      "
    `)
  })

  test('validate based on metadata', () => {
    const renders = createRenderStore()

    const setAge = emulateAction<number>()

    renderHook(() => {
      const { useFormState, handleChange } = useForm({
        initialConfig: {
          age: { initialValue: 0, metadata: { minAge: 18 } },
        },
        fieldIsValid: {
          age: (value, { metadata }) =>
            value < metadata.minAge
              ? 'You must be at least 18 years old'
              : true,
        },
      })

      const { formFields } = useFormState()

      renders.add(
        simplifyFieldsState(formFields, ['value', 'errors', 'isValid']),
      )

      setAge.useOnAction((age) => {
        handleChange('age', age)
      })
    })

    setAge.call(17)

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      age: {value:0, errors:[You must be at least 18 years old], isValid:false}
      age: {value:17, errors:[You must be at least 18 years old], isValid:false}
      "
    `)

    setAge.call(18)

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      age: {value:18, errors:null, isValid:true}
      "
    `)
  })

  test('set invalid loading state', () => {
    const renders = createRenderStore()

    const setFileUrl = emulateAction<string>()

    renderHook(() => {
      const { useFormState, handleChange } = useForm({
        initialConfig: {
          fileUrl: { initialValue: '', required: true },
        },
        fieldIsValid: {
          fileUrl: (value) => {
            return value === 'uploading' ? { isLoading: true } : true
          },
        },
      })

      const { formFields, someFieldIsLoading } = useFormState()

      renders.add({
        someFieldIsLoading,
        value: formFields.fileUrl.value,
        errors: formFields.fileUrl.errors,
        isValid: formFields.fileUrl.isValid,
        isLoading: formFields.fileUrl.isLoading,
      })

      setFileUrl.useOnAction((age) => {
        handleChange('fileUrl', age)
      })
    })

    setFileUrl.call('uploading')

    setFileUrl.call('https://example.com/file')

    expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      ┌─
      ⎢ someFieldIsLoading: false
      ⎢ value: ''
      ⎢ errors: null
      ⎢ isValid: false
      ⎢ isLoading: false
      └─
      ┌─
      ⎢ someFieldIsLoading: true
      ⎢ value: uploading
      ⎢ errors: null
      ⎢ isValid: false
      ⎢ isLoading: true
      └─
      ┌─
      ⎢ someFieldIsLoading: false
      ⎢ value: https://example.com/file
      ⎢ errors: null
      ⎢ isValid: true
      ⎢ isLoading: false
      └─
      "
    `)
  })
  test('silent validation', () => {
    const renders = createRenderStore()

    const setField = emulateAction<string>()

    renderHook(() => {
      const { useFormState, handleChange } = useForm({
        initialConfig: {
          field: { initialValue: '' },
        },
        fieldIsValid: {
          field: (value) =>
            value === 'invalid' ? { silentInvalid: true } : true,
        },
      })

      const { formFields } = useFormState()

      renders.add(simplifyFieldsState(formFields))

      setField.useOnAction((field) => {
        handleChange('field', field)
      })
    })

    setField.call('invalid')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      field: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
      field: {val:invalid, initV:, req:N, errors:null, isValid:N, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
      "
    `)
  })
})

describe('validate form', () => {
  test('set form error', () => {
    const renders = createRenderStore()

    const setAge = emulateAction<number>()
    const setName = emulateAction<string>()

    renderHook(() => {
      const { useFormState, handleChange } = useForm({
        initialConfig: {
          name: { initialValue: '' },
          age: { initialValue: 0 },
        },
        advancedFormValidation({ fieldsState, setFormError }) {
          if (
            fieldsState.age.value < 18 &&
            fieldsState.name.value === 'Adult'
          ) {
            setFormError('You must be at least 18 years old')
          }
        },
      })

      const { formFields, formError, formIsValid } = useFormState()

      renders.add({
        formIsValid,
        formError,
        name: formFields.name,
        age: formFields.age,
      })

      setAge.useOnAction((age) => {
        handleChange('age', age)
      })

      setName.useOnAction((name) => {
        handleChange('name', name)
      })
    })

    setAge.call(17)
    setName.call('Adult')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ┌─
      ⎢ formIsValid: true
      ⎢ formError: false
      ⎢ name: {value:, initialValue:, required:false, errors:null, isValid:true, isEmpty:true, isTouched:false, isDiffFromInitial:false, isLoading:false}
      ⎢ age: {value:0, initialValue:0, required:false, errors:null, isValid:true, isEmpty:false, isTouched:false, isDiffFromInitial:false, isLoading:false}
      └─
      ┌─
      ⎢ formIsValid: true
      ⎢ formError: false
      ⎢ name: {value:, initialValue:, required:false, errors:null, isValid:true, isEmpty:true, isTouched:false, isDiffFromInitial:false, isLoading:false}
      ⎢ age: {value:17, initialValue:0, required:false, errors:null, isValid:true, isEmpty:false, isTouched:true, isDiffFromInitial:true, isLoading:false}
      └─
      ┌─
      ⎢ formIsValid: false
      ⎢ formError: You must be at least 18 years old
      ⎢ name: {value:Adult, initialValue:, required:false, errors:null, isValid:true, isEmpty:false, isTouched:true, isDiffFromInitial:true, isLoading:false}
      ⎢ age: {value:17, initialValue:0, required:false, errors:null, isValid:true, isEmpty:false, isTouched:true, isDiffFromInitial:true, isLoading:false}
      └─
      "
    `)
  })
})

test('force form validation', () => {
  const renders = createRenderStore()

  const setAge = emulateAction<number | null>()
  const forceValidation = emulateAction()

  renderHook(() => {
    const { useFormState, handleChange, forceFormValidation } = useForm({
      initialConfig: {
        age: { initialValue: null as null | number, required: true },
      },
    })

    const { formFields, formIsValid, validationWasForced } = useFormState()

    renders.add({
      validationWasForced,
      formIsValid,
      age: formFields.age,
    })

    setAge.useOnAction((age) => {
      handleChange('age', age)
    })

    forceValidation.useOnAction(() => {
      forceFormValidation()
    })
  })

  forceValidation.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⎢ validationWasForced: false
    ⎢ formIsValid: false
    ⎢ age: {value:null, initialValue:null, required:true, errors:null, isValid:false, isEmpty:true, isTouched:false, isDiffFromInitial:false, isLoading:false}
    └─
    ┌─
    ⎢ validationWasForced: true
    ⎢ formIsValid: false
    ⎢ age: {value:null, initialValue:null, required:true, errors:[This field is required], isValid:false, isEmpty:true, isTouched:true, isDiffFromInitial:false, isLoading:false}
    └─
    "
  `)

  setAge.call(17)

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ---
    ┌─
    ⎢ validationWasForced: true
    ⎢ formIsValid: true
    ⎢ age: {value:17, initialValue:null, required:true, errors:null, isValid:true, isEmpty:false, isTouched:true, isDiffFromInitial:true, isLoading:false}
    └─
    "
  `)
})
