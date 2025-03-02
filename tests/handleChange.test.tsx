import { act, renderHook } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { useForm } from '../src/main'
import { asType } from '../src/utils/typing'
import { emulateAction } from './utils/emulateAction'
import { createRenderStore } from './utils/rendersStore'
import { simplifyFieldsState } from './utils/simplifyFieldsState'
test('set value', () => {
  const renders = createRenderStore()

  const setName = emulateAction<string>()

  renderHook(() => {
    const { useFormState, handleChange } = useForm({
      initialConfig: {
        name: { initialValue: 'John' },
      },
    })

    const { formFields } = useFormState()

    renders.add(simplifyFieldsState(formFields))

    setName.useOnAction((name) => {
      handleChange('name', name)
    })
  })

  setName.call('Jack')

  expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      name: {val:John, initV:John, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
      name: {val:Jack, initV:John, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
      "
    `)
})

test('handle change with callback', () => {
  const renders = createRenderStore()

  const toggle = emulateAction()

  renderHook(() => {
    const { useFormState, handleChange } = useForm({
      initialConfig: {
        enabled: { initialValue: true },
      },
    })

    const { formFields } = useFormState()

    renders.add(simplifyFieldsState(formFields))

    toggle.useOnAction(() => {
      handleChange('enabled', (prev) => !prev)
    })
  })

  toggle.call()

  expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      enabled: {val:true, initV:true, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
      enabled: {val:false, initV:true, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
      "
    `)

  toggle.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      enabled: {val:true, initV:true, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:N, isL:N}
      "
    `)
})

test('handle change multiple fields', () => {
  const renders = createRenderStore()

  const setValues = emulateAction<[string, number]>()

  renderHook(() => {
    const { useFormState, handleChange } = useForm({
      initialConfig: {
        name: { initialValue: 'John' },
        age: { initialValue: 10 },
      },
    })

    const { formFields } = useFormState()

    renders.add(simplifyFieldsState(formFields))

    setValues.useOnAction(([name, age]) => {
      handleChange({ name, age: (old) => old + age })
    })
  })

  setValues.call(['Jack', 20])

  expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      ┌─
      ⎢ name: {val:John, initV:John, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
      ⎢ age: {val:10, initV:10, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
      └─
      ┌─
      ⎢ name: {val:Jack, initV:John, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
      ⎢ age: {val:30, initV:10, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
      └─
      "
    `)
})

test('handle change multiple fields should ignore undefined values', () => {
  const renders = createRenderStore()

  const setValues = emulateAction<{
    name: string | undefined
    age: number | undefined
  }>()

  renderHook(() => {
    const { useFormState, handleChange } = useForm({
      initialConfig: {
        name: { initialValue: 'John' },
        age: { initialValue: 10 },
      },
    })

    const { formFields } = useFormState()

    renders.add(simplifyFieldsState(formFields, ['value']))

    setValues.useOnAction((values) => {
      handleChange(values)
    })
  })

  setValues.call({ name: 'Jack', age: undefined })

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    name: {value:John} -- age: {value:10}
    name: {value:Jack} -- age: {value:10}
    "
  `)

  setValues.call({ name: undefined, age: 20 })

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ---
    name: {value:Jack} -- age: {value:20}
    "
  `)
})

describe('handle change with skip touch', () => {
  test('set value and skip touch', () => {
    const renders = createRenderStore()

    const setName = emulateAction<string>()

    renderHook(() => {
      const { useFormState, handleChange } = useForm({
        initialConfig: {
          name: { initialValue: 'John' },
        },
      })

      const { formFields } = useFormState()

      renders.add(simplifyFieldsState(formFields, ['value', 'isTouched']))

      setName.useOnAction((name) => {
        handleChange('name', name, { skipTouch: true })
      })
    })

    setName.call('Jack')

    setName.call('John')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      name: {value:John, isTouched:false}
      name: {value:Jack, isTouched:false}
      name: {value:John, isTouched:false}
      "
    `)
  })

  test('set value and skip touch of one field only', () => {
    const renders = createRenderStore()

    const setValues = emulateAction<{
      name: string
      age: number
    }>()

    renderHook(() => {
      const { useFormState, handleChange } = useForm({
        initialConfig: {
          name: { initialValue: 'John' },
          age: { initialValue: 10 },
        },
      })

      const { formFields } = useFormState()

      renders.add(simplifyFieldsState(formFields, ['value', 'isTouched']))

      setValues.useOnAction((values) => {
        handleChange(values, { skipTouch: ['age'] })
      })
    })

    setValues.call({ name: 'Jack', age: 20 })

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      name: {value:John, isTouched:false} -- age: {value:10, isTouched:false}
      name: {value:Jack, isTouched:true} -- age: {value:20, isTouched:false}
      "
    `)
  })

  test('set value and touch only one field', () => {
    const renders = createRenderStore()

    const setValues = emulateAction<{
      name: string
      age: number
    }>()

    renderHook(() => {
      const { useFormState, handleChange } = useForm({
        initialConfig: {
          name: { initialValue: 'John' },
          age: { initialValue: 10 },
        },
      })

      const { formFields } = useFormState()

      renders.add(simplifyFieldsState(formFields, ['value', 'isTouched']))

      setValues.useOnAction((values) => {
        handleChange(values, { touchOnly: ['age'] })
      })
    })

    setValues.call({ name: 'Jack', age: 20 })

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      name: {value:John, isTouched:false} -- age: {value:10, isTouched:false}
      name: {value:Jack, isTouched:false} -- age: {value:20, isTouched:true}
      "
    `)
  })
})

test('handle field not found in handleChange', () => {
  const setName = emulateAction<string>()

  const consoleError = vi.spyOn(console, 'error')

  renderHook(() => {
    const { useFormState, handleChange } = useForm({
      initialConfig: {
        name: { initialValue: 'John' },
      },
    })

    const { formFields } = useFormState()

    setName.useOnAction((name) => {
      handleChange('notFound' as any, name)
    })

    return formFields
  })

  setName.call('Jack')

  expect(consoleError).toHaveBeenCalledWith(
    'Field with id "notFound" not found',
  )
})

test('use handleChange with undefined should not be ignored', () => {
  const { result } = renderHook(() => {
    const { useFormState, handleChange } = useForm({
      initialConfig: {
        name: { initialValue: asType<string | undefined>('John') },
      },
    })

    const { formFields } = useFormState()

    return {
      name: formFields.name,
      handleChange,
    }
  })

  expect(result.current.name.value).toMatchInlineSnapshot(`"John"`)

  act(() => {
    result.current.handleChange('name', undefined)
  })

  expect(result.current.name.value).toMatchInlineSnapshot(`undefined`)
})
