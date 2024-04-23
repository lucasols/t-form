import { renderHook } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { useForm } from '../src/main'
import { emulateAction } from './utils/emulateAction'
import { createRenderStore } from './utils/rendersStore'
import {
  simplifyFieldState,
  simplifyFieldsState,
} from './utils/simplifyFieldsState'

describe('validate field', () => {
  test('simple field validation', () => {
    const renders = createRenderStore()

    const setPassword = emulateAction<string>()

    renderHook(() => {
      const { useFormState, handleChange } = useForm({
        initialConfig: {
          password: { initialValue: 'a' },
        },
        fieldIsValid: {
          password: ({ value }) =>
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
      password: {value:a, errors:[Password must have at least 8 characters], isValid:false}
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
          password: { initialValue: 'a' },
        },
        fieldIsValid: {
          password: [
            ({ value }) =>
              value.length < 8
                ? 'Password must have at least 8 characters'
                : true,
            ({ value }) =>
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
      password: {value:a, errors:[Password must have at least 8 characters, Password must have at least one number], isValid:false}
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
          confirmPassword: ({ value, fields: { password } }) =>
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
    setConfirmPassword.call('123456789')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ┌─
      ⎢ password: {value:, errors:null, isValid:false}
      ⎢ confirmPassword: {value:, errors:null, isValid:false}
      └─
      ┌─
      ⎢ password: {value:12345678, errors:null, isValid:true}
      ⎢ confirmPassword: {value:, errors:null, isValid:false}
      └─
      ┌─
      ⎢ password: {value:12345678, errors:null, isValid:true}
      ⎢ confirmPassword: {value:123456789, errors:[Passwords must match], isValid:false}
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

  test('validate field based on other field 2', () => {
    const renders = createRenderStore()

    const field1 = emulateAction<string>()
    const field2 = emulateAction<string>()
    const field3 = emulateAction<string>()

    renderHook(() => {
      const { useFormState, handleChange } = useForm({
        initialConfig: {
          field1: { initialValue: '', required: true },
          field2: { initialValue: '', required: true },
          field3: { initialValue: '', required: true },
        },
        fieldIsValid: {
          field2: ({ value, fields }) => {
            if (
              value === fields.field1.value ||
              value === fields.field3.value
            ) {
              return 'Field 2 cannot be equal to field 1 or field 3'
            }

            return true
          },
        },
      })

      const { formFields } = useFormState()

      renders.add(
        simplifyFieldsState(formFields, ['value', 'errors', 'isValid']),
      )

      field1.useOnAction((value) => {
        handleChange('field1', value)
      })

      field2.useOnAction((value) => {
        handleChange('field2', value)
      })

      field3.useOnAction((value) => {
        handleChange('field3', value)
      })
    })

    field3.call('1')
    field2.call('1')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ┌─
      ⎢ field1: {value:, errors:null, isValid:false}
      ⎢ field2: {value:, errors:null, isValid:false}
      ⎢ field3: {value:, errors:null, isValid:false}
      └─
      ┌─
      ⎢ field1: {value:, errors:null, isValid:false}
      ⎢ field2: {value:, errors:null, isValid:false}
      ⎢ field3: {value:1, errors:null, isValid:true}
      └─
      ┌─
      ⎢ field1: {value:, errors:null, isValid:false}
      ⎢ field2: {value:1, errors:[Field 2 cannot be equal to field 1 or field 3], isValid:false}
      ⎢ field3: {value:1, errors:null, isValid:true}
      └─
      "
    `)
  })

  test('validate field based on other field should not produce duplicated errors', () => {
    const renders = createRenderStore()

    const field1 = emulateAction<string>()
    const field2 = emulateAction<string>()
    const field3 = emulateAction<string>()

    renderHook(() => {
      const { useFormState, handleChange } = useForm({
        initialConfig: {
          field1: { initialValue: '', required: true },
          field2: { initialValue: '', required: true },
          field3: { initialValue: '', required: true },
        },
        fieldIsValid: {
          field2: ({ value, fields }) => {
            if (
              value === fields.field1.value ||
              value === fields.field3.value
            ) {
              return 'Field 2 cannot be equal to field 1 or field 3'
            }

            return true
          },
        },
      })

      const { formFields } = useFormState()

      renders.add(
        simplifyFieldsState(formFields, ['value', 'errors', 'isValid']),
      )

      field1.useOnAction((value) => {
        handleChange('field1', value)
      })

      field2.useOnAction((value) => {
        handleChange('field2', value)
      })

      field3.useOnAction((value) => {
        handleChange('field3', value)
      })
    })

    field1.call('1')
    field2.call('1')
    field3.call('2')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ┌─
      ⎢ field1: {value:, errors:null, isValid:false}
      ⎢ field2: {value:, errors:null, isValid:false}
      ⎢ field3: {value:, errors:null, isValid:false}
      └─
      ┌─
      ⎢ field1: {value:1, errors:null, isValid:true}
      ⎢ field2: {value:, errors:null, isValid:false}
      ⎢ field3: {value:, errors:null, isValid:false}
      └─
      ┌─
      ⎢ field1: {value:1, errors:null, isValid:true}
      ⎢ field2: {value:1, errors:[Field 2 cannot be equal to field 1 or field 3], isValid:false}
      ⎢ field3: {value:, errors:null, isValid:false}
      └─
      ┌─
      ⎢ field1: {value:1, errors:null, isValid:true}
      ⎢ field2: {value:1, errors:[Field 2 cannot be equal to field 1 or field 3], isValid:false}
      ⎢ field3: {value:2, errors:null, isValid:true}
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
          age: ({ value, fieldMetadata }) =>
            value < fieldMetadata.minAge
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
          fileUrl: ({ value }) => {
            return value === 'uploading' ? { valueIsLoading: true } : true
          },
        },
      })

      const { formFields, someFieldIsLoading } = useFormState()

      renders.add({
        someFieldIsLoading,
        value: formFields.fileUrl.value,
        errors: formFields.fileUrl.errors,
        isValid: formFields.fileUrl.isValid,
        isLoading: formFields.fileUrl.valueIsLoading,
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
          field: ({ value }) =>
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
        name: simplifyFieldState(formFields.name),
        age: simplifyFieldState(formFields.age),
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
      ⎢ name: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
      ⎢ age: {val:0, initV:0, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
      └─
      ┌─
      ⎢ formIsValid: true
      ⎢ formError: false
      ⎢ name: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
      ⎢ age: {val:17, initV:0, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
      └─
      ┌─
      ⎢ formIsValid: false
      ⎢ formError: You must be at least 18 years old
      ⎢ name: {val:Adult, initV:, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
      ⎢ age: {val:17, initV:0, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
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
      age: simplifyFieldState(formFields.age),
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
    ⎢ validationWasForced: 0
    ⎢ formIsValid: false
    ⎢ age: {val:null, initV:null, req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    ┌─
    ⎢ validationWasForced: 1
    ⎢ formIsValid: false
    ⎢ age: {val:null, initV:null, req:Y, errors:[This field is required], isValid:N, isEmpty:Y, isTouched:Y, isDiff:N, isL:N}
    └─
    "
  `)

  setAge.call(17)

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ---
    ┌─
    ⎢ validationWasForced: 1
    ⎢ formIsValid: true
    ⎢ age: {val:17, initV:null, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    └─
    "
  `)
})

test('silentIfNotTouched error', () => {
  const renders = createRenderStore()

  const setAge = emulateAction<number>()

  renderHook(() => {
    const { useFormState, handleChange } = useForm({
      initialConfig: {
        age: { initialValue: 16 as number, required: true },
      },
      fieldIsValid: {
        age: ({ value }) => {
          if (!value) return true

          return value < 18
            ? { silentIfNotTouched: 'You must be at least 18 years old' }
            : true
        },
      },
    })

    const { formFields } = useFormState()

    renders.add({
      age: simplifyFieldState(formFields.age),
    })

    setAge.useOnAction((age) => {
      handleChange('age', age)
    })
  })

  setAge.call(17)

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    age: {val:16, initV:16, req:Y, errors:null, isValid:N, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    age: {val:17, initV:16, req:Y, errors:[You must be at least 18 years old], isValid:N, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    "
  `)
})

test('add temp error', () => {
  const renders = createRenderStore()

  const addTempError = emulateAction<string>()
  const setAge = emulateAction<number>()
  const setName = emulateAction<string>()

  renderHook(() => {
    const { useFormState, handleChange, setTemporaryError } = useForm({
      initialConfig: {
        age: { initialValue: 16 as number, required: true },
        name: { initialValue: '' },
      },
    })

    const { formFields, formIsValid } = useFormState()

    renders.add({
      age: simplifyFieldState(formFields.age),
      name: simplifyFieldState(formFields.name),
      formIsValid,
    })

    addTempError.useOnAction((error) => {
      setTemporaryError({
        age: error,
      })
    })

    setAge.useOnAction((age) => {
      handleChange('age', age)
    })

    setName.useOnAction((name) => {
      handleChange('name', name)
    })
  })

  addTempError.call('You must be at least 18 years old')

  setName.call('Adult')

  setAge.call(17)

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⎢ age: {val:16, initV:16, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    ⎢ name: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    ⎢ formIsValid: true
    └─
    ┌─
    ⎢ age: {val:16, initV:16, req:Y, errors:[You must be at least 18 years old], isValid:N, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    ⎢ name: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    ⎢ formIsValid: false
    └─
    ┌─
    ⎢ age: {val:16, initV:16, req:Y, errors:[You must be at least 18 years old], isValid:N, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    ⎢ name: {val:Adult, initV:, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    ⎢ formIsValid: false
    └─
    ┌─
    ⎢ age: {val:17, initV:16, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    ⎢ name: {val:Adult, initV:, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    ⎢ formIsValid: true
    └─
    "
  `)
})

test('do not show validation errors if field is empty', () => {
  const renders = createRenderStore()

  const setEmail = emulateAction<string>()

  renderHook(() => {
    const { useFormState, handleChange } = useForm({
      initialConfig: {
        email: { initialValue: '' },
      },
      fieldIsValid: {
        email: ({ value }) => {
          return value.includes('@') ? true : 'Invalid email'
        },
      },
    })

    const { formFields } = useFormState()

    renders.add({
      email: simplifyFieldState(formFields.email),
    })

    setEmail.useOnAction((email) => {
      handleChange('email', email)
    })
  })

  setEmail.call('test@email.com')

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    email: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    email: {val:test@email.com, initV:, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    "
  `)
})

test('reproduce bug with formIsValid not updating', () => {
  const renders = createRenderStore()

  const setShouldNotBeMoreThan5 = emulateAction<boolean>()

  renderHook(() => {
    const { useFormState, handleChange } = useForm({
      initialConfig: {
        items: { initialValue: 8 },
        shouldNotBeMoreThan5: { initialValue: false },
      },
      fieldIsValid: {
        items: ({ value, fields }) => {
          if (fields.shouldNotBeMoreThan5.value && value > 5) {
            return 'Should not be more than 5'
          }

          return true
        },
      },
    })

    const { formFields, formIsValid } = useFormState()

    renders.add({
      items: simplifyFieldState(formFields.items),
      shouldNotBeMoreThan5: simplifyFieldState(formFields.shouldNotBeMoreThan5),
      formIsValid,
    })

    setShouldNotBeMoreThan5.useOnAction((value) => {
      handleChange('shouldNotBeMoreThan5', value)
    })
  })

  setShouldNotBeMoreThan5.call(true)

  setShouldNotBeMoreThan5.call(false)

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⎢ items: {val:8, initV:8, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    ⎢ shouldNotBeMoreThan5: {val:false, initV:false, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    ⎢ formIsValid: true
    └─
    ┌─
    ⎢ items: {val:8, initV:8, req:N, errors:[Should not be more than 5], isValid:N, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    ⎢ shouldNotBeMoreThan5: {val:true, initV:false, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    ⎢ formIsValid: false
    └─
    ┌─
    ⎢ items: {val:8, initV:8, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    ⎢ shouldNotBeMoreThan5: {val:false, initV:false, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:N, isL:N}
    ⎢ formIsValid: true
    └─
    "
  `)
})

test('reproduce bug: forceFormValidation when called second time hides errors', () => {
  const renders = createRenderStore()

  const forceValidation = emulateAction()

  renderHook(() => {
    const { useFormState, forceFormValidation } = useForm({
      initialConfig: {
        name: { initialValue: '', required: true },
      },
    })

    const { formFields, formIsValid } = useFormState()

    renders.add({
      formIsValid,
      name: {
        errors: formFields.name.errors,
        isTouched: formFields.name.isTouched,
        isValid: formFields.name.isValid,
      },
    })

    forceValidation.useOnAction(() => {
      forceFormValidation()
    })
  })

  forceValidation.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    formIsValid: false -- name: {errors:null, isTouched:false, isValid:false}
    ┌─
    ⎢ formIsValid: false
    ⎢ name: {errors:[This field is required], isTouched:true, isValid:false}
    └─
    "
  `)

  forceValidation.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ---
    ┌─
    ⎢ formIsValid: false
    ⎢ name: {errors:[This field is required], isTouched:true, isValid:false}
    └─
    "
  `)
})
