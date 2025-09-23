import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { useForm, useFormState } from '../src/main'
import { emulateAction } from './utils/emulateAction'
import { createRenderStore } from './utils/rendersStore'
import { simplifyFieldsState } from './utils/simplifyFieldsState'

afterEach(() => cleanup())

test('read initial value', () => {
  const renders = createRenderStore()

  renderHook(() => {
    const { formTypedCtx: formTypedProps } = useForm({
      initialConfig: { name: { initialValue: 'John' } },
    })

    const { formFields } = useFormState(formTypedProps)

    renders.add(simplifyFieldsState(formFields))
  })

  expect(renders.snapshot).toMatchInlineSnapshot(`
    "
    name: {val:John, initV:John, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    "
  `)
})

test('lazy initial value', () => {
  const renders = createRenderStore()

  renderHook(() => {
    const { formTypedCtx: formTypedProps } = useForm({
      initialConfig: () => ({ name: { initialValue: 'John' } }),
    })

    const { formFields } = useFormState(formTypedProps)

    renders.add(simplifyFieldsState(formFields))
  })

  expect(renders.snapshot).toMatchInlineSnapshot(`
    "
    name: {val:John, initV:John, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    "
  `)
})

test('is diff from initial', () => {
  const renders = createRenderStore()

  const setName = emulateAction<string>()

  renderHook(() => {
    const { formTypedCtx: formTypedProps, handleChange } = useForm({
      initialConfig: { name: { initialValue: 'John' } },
    })

    const { formFields } = useFormState(formTypedProps)

    renders.add(simplifyFieldsState(formFields))

    setName.useOnAction((name) => {
      handleChange('name', name)
    })
  })

  setName.call('Jack')

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    name: {val:John, initV:John, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    name: {val:Jack, initV:John, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    "
  `)

  setName.call('John')

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ---
    name: {val:John, initV:John, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:N, isL:N}
    "
  `)
})

describe('required fields', () => {
  test('required field should return error if empty', () => {
    const renders = createRenderStore()

    const setName = emulateAction<string>()

    renderHook(() => {
      const { formTypedCtx: formTypedProps, handleChange } = useForm({
        initialConfig: { name: { initialValue: '', required: true } },
      })

      const { formFields } = useFormState(formTypedProps)

      renders.add(simplifyFieldsState(formFields))

      setName.useOnAction((name) => {
        handleChange('name', name)
      })
    })

    setName.call('Jack')

    expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      name: {val:, initV:, req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
      name: {val:Jack, initV:, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
      "
    `)

    setName.call('')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      name: {val:, initV:, req:Y, errors:[This field is required], isValid:N, isEmpty:Y, isTouched:Y, isDiff:N, isL:N}
      "
    `)
  })

  test('custom field required error message', () => {
    const renders = createRenderStore()

    const setName = emulateAction<string>()

    renderHook(() => {
      const { formTypedCtx: formTypedProps, handleChange } = useForm({
        initialConfig: {
          name: {
            initialValue: 'Ok',
            required: true,
            requiredErrorMsg: 'Name is required',
          },
        },
      })

      const { formFields } = useFormState(formTypedProps)

      renders.add(simplifyFieldsState(formFields))

      setName.useOnAction((name) => {
        handleChange('name', name)
      })
    })

    setName.call('')

    expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      name: {val:Ok, initV:Ok, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
      name: {val:, initV:Ok, req:Y, errors:[Name is required], isValid:N, isEmpty:Y, isTouched:Y, isDiff:Y, isL:N}
      "
    `)
  })

  test('disable error message', () => {
    const renders = createRenderStore()

    const setName = emulateAction<string>()

    renderHook(() => {
      const { formTypedCtx: formTypedProps, handleChange } = useForm({
        initialConfig: {
          name: { initialValue: 'Ok', required: true, requiredErrorMsg: false },
        },
      })

      const { formFields } = useFormState(formTypedProps)

      renders.add(simplifyFieldsState(formFields))

      setName.useOnAction((name) => {
        handleChange('name', name)
      })
    })

    setName.call('')

    expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      name: {val:Ok, initV:Ok, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
      name: {val:, initV:Ok, req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:Y, isDiff:Y, isL:N}
      "
    `)
  })

  test('derivate required from other fields', () => {
    const renders = createRenderStore()

    const setAge = emulateAction<number | null>()

    renderHook(() => {
      const { formTypedCtx: formTypedProps, handleChange } = useForm({
        initialConfig: {
          age: { initialValue: null as null | number },
          birthDate: { initialValue: null as null | Date },
        },
        derivedConfig: {
          birthDate: { required: ({ fields: { age } }) => !age.isEmpty },
        },
      })

      const { formFields } = useFormState(formTypedProps)

      renders.add(
        simplifyFieldsState(formFields, [
          'value',
          'required',
          'errors',
          'isValid',
        ]),
      )

      setAge.useOnAction((age) => {
        handleChange('age', age)
      })
    })

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ┌─
      ⎢ age: {value:null, required:false, errors:null, isValid:true}
      ⎢ birthDate: {value:null, required:false, errors:null, isValid:true}
      └─
      "
    `)

    setAge.call(20)

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      ┌─
      ⎢ age: {value:20, required:false, errors:null, isValid:true}
      ⎢ birthDate: {value:null, required:true, errors:null, isValid:false}
      └─
      "
    `)

    setAge.call(null)

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      ┌─
      ⎢ age: {value:null, required:false, errors:null, isValid:true}
      ⎢ birthDate: {value:null, required:false, errors:null, isValid:true}
      └─
      "
    `)
  })

  test('touch field', () => {
    const renders = createRenderStore()

    const touchName = emulateAction()

    renderHook(() => {
      const { formTypedCtx: formTypedProps, touchField } = useForm({
        initialConfig: { name: { initialValue: '', required: true } },
      })

      const { formFields } = useFormState(formTypedProps)

      renders.add(simplifyFieldsState(formFields))

      touchName.useOnAction(() => {
        touchField('name')
      })
    })

    touchName.call()

    expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      name: {val:, initV:, req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
      name: {val:, initV:, req:Y, errors:[This field is required], isValid:N, isEmpty:Y, isTouched:Y, isDiff:N, isL:N}
      "
    `)
  })
})

describe('check if is empty', () => {
  test('default check if field is empty', () => {
    const renders = createRenderStore()

    renderHook(() => {
      const { formTypedCtx: formTypedProps } = useForm({
        initialConfig: {
          string: { initialValue: '' },
          string2: { initialValue: '  ' },
          number: { initialValue: 0 },
          boolean: { initialValue: false },
          array: { initialValue: [] },
          arrayWithUndefined: { initialValue: [undefined] },
          arrayWithNull: { initialValue: [null] },
        },
      })

      const { formFields } = useFormState(formTypedProps)

      renders.add(simplifyFieldsState(formFields, ['value', 'isEmpty']))
    })

    expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      ┌─
      ⎢ string: {value:, isEmpty:true}
      ⎢ string2: {value:  , isEmpty:true}
      ⎢ number: {value:0, isEmpty:false}
      ⎢ boolean: {value:false, isEmpty:false}
      ⎢ array: {value:[], isEmpty:true}
      ⎢ arrayWithUndefined: {value:[null], isEmpty:false}
      ⎢ arrayWithNull: {value:[null], isEmpty:false}
      └─
      "
    `)
  })

  test('custom check if field is empty', () => {
    const renders = createRenderStore()

    const setName = emulateAction<string>()

    renderHook(() => {
      const { formTypedCtx: formTypedProps, handleChange } = useForm({
        initialConfig: { name: { initialValue: '' } },
        derivedConfig: {
          name: { checkIfIsEmpty: (value) => value === 'not empty' },
        },
      })

      const { formFields } = useFormState(formTypedProps)

      setName.useOnAction((name) => {
        handleChange('name', name)
      })

      renders.add(simplifyFieldsState(formFields, ['value', 'isEmpty']))
    })

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      name: {value:, isEmpty:false}
      "
    `)

    setName.call('not empty')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      name: {value:not empty, isEmpty:true}
      "
    `)
  })

  test('empty fields should not be considered changed if value keep being empty', () => {
    const { result } = renderHook(() => {
      const { formTypedCtx: formTypedProps, handleChange } = useForm({
        initialConfig: {
          name: { initialValue: '' as string | null | unknown[] },
        },
      })

      const { formFields } = useFormState(formTypedProps)

      return { formFields, handleChange }
    })

    expect(result.current.formFields.name.isDiffFromInitial).toBe(false)
    expect(result.current.formFields.name.value).toBe('')

    act(() => {
      result.current.handleChange('name', null)
    })

    expect(result.current.formFields.name.value).toBe(null)
    expect(result.current.formFields.name.isDiffFromInitial).toBe(false)

    act(() => {
      result.current.handleChange('name', [])
    })

    expect(result.current.formFields.name.value).toBe([])
    expect(result.current.formFields.name.isDiffFromInitial).toBe(false)
  })
})

test('isDiffFromInitial', () => {
  const renders = createRenderStore()

  const setName = emulateAction<string>()
  const setAge = emulateAction<number>()

  renderHook(() => {
    const { formTypedCtx: formTypedProps, handleChange } = useForm({
      initialConfig: {
        name: { initialValue: 'John' },
        age: { initialValue: 10 },
      },
    })

    const { formFields, isDiffFromInitial, formIsValid } = useFormState(
      formTypedProps,
      { mustBeDiffFromInitial: true },
    )

    renders.add({
      isDiffFromInitial,
      formIsValid,
      ...simplifyFieldsState(formFields, ['value', 'isDiffFromInitial']),
    })

    setName.useOnAction((name) => {
      handleChange('name', name)
    })

    setAge.useOnAction((age) => {
      handleChange('age', age)
    })
  })

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⎢ isDiffFromInitial: false
    ⎢ formIsValid: false
    ⎢ name: {value:John, isDiffFromInitial:false}
    ⎢ age: {value:10, isDiffFromInitial:false}
    └─
    "
  `)

  setName.call('Jack')

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ---
    ┌─
    ⎢ isDiffFromInitial: true
    ⎢ formIsValid: true
    ⎢ name: {value:Jack, isDiffFromInitial:true}
    ⎢ age: {value:10, isDiffFromInitial:false}
    └─
    "
  `)

  setName.call('John')

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ---
    ┌─
    ⎢ isDiffFromInitial: false
    ⎢ formIsValid: false
    ⎢ name: {value:John, isDiffFromInitial:false}
    ⎢ age: {value:10, isDiffFromInitial:false}
    └─
    "
  `)

  setAge.call(20)

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ---
    ┌─
    ⎢ isDiffFromInitial: true
    ⎢ formIsValid: true
    ⎢ name: {value:John, isDiffFromInitial:false}
    ⎢ age: {value:20, isDiffFromInitial:true}
    └─
    "
  `)
})

test('touch not found field', () => {
  const touchName = emulateAction<true>()

  const consoleError = vi.spyOn(console, 'error')

  renderHook(() => {
    const { formTypedCtx: formTypedProps, touchField } = useForm({
      initialConfig: { name: { initialValue: 'John' } },
    })

    const { formFields } = useFormState(formTypedProps)

    touchName.useOnAction(() => {
      touchField('notFound' as 'name')
    })

    return formFields
  })

  touchName.call(true)

  expect(consoleError).toHaveBeenCalledWith(
    'Field with id "notFound" not found',
  )
})
