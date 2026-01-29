import { renderHook } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { getFieldConfig, useForm } from '../src/main'
import { useFormState } from '../src/useFormState'
import { emulateAction } from './utils/emulateAction'
import { createRenderStore } from './utils/rendersStore'
import { simplifyFieldsState } from './utils/simplifyFieldsState'

describe('with getFieldInitialConfig', () => {
  test('simple field validation', () => {
    const renders = createRenderStore()

    const setPassword = emulateAction<string>()

    renderHook(() => {
      const { formTypedCtx, handleChange } = useForm({
        initialConfig: {
          password: getFieldConfig({
            initialValue: '',
            isValid: ({ value }) =>
              value.length < 8 ?
                'Password must have at least 8 characters'
              : true,
          }),
        },
      })

      const { formFields } = useFormState(formTypedCtx)

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
      password: {value:, errors:null, isValid:true}
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
})

describe('populatedValue', () => {
  test('populatedValue via getFieldConfig sets initial display value', () => {
    const renders = createRenderStore()

    renderHook(() => {
      const { formTypedCtx } = useForm({
        initialConfig: {
          name: getFieldConfig({
            initialValue: '',
            populatedValue: 'John',
          }),
        },
      })

      const { formFields } = useFormState(formTypedCtx)

      renders.add(simplifyFieldsState(formFields))
    })

    expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      name: {val:John, initV:, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:Y, isL:N}
      "
    `)
  })

  test('isDiffFromInitial compares against initialValue, not populatedValue', () => {
    const renders = createRenderStore()

    const setName = emulateAction<string>()

    renderHook(() => {
      const { formTypedCtx, handleChange } = useForm({
        initialConfig: {
          name: getFieldConfig({
            initialValue: '',
            populatedValue: 'John',
          }),
        },
      })

      const { formFields } = useFormState(formTypedCtx)

      renders.add(simplifyFieldsState(formFields, ['value', 'initialValue', 'isDiffFromInitial']))

      setName.useOnAction((name) => {
        handleChange('name', name)
      })
    })

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      name: {value:John, initialValue:, isDiffFromInitial:true}
      "
    `)

    setName.call('')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      name: {value:, initialValue:, isDiffFromInitial:false}
      "
    `)

    setName.call('Jack')

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      name: {value:Jack, initialValue:, isDiffFromInitial:true}
      "
    `)
  })

  test('backwards compatibility: advancedCustomValue still works', () => {
    const renders = createRenderStore()

    renderHook(() => {
      const { formTypedCtx } = useForm({
        initialConfig: {
          name: {
            initialValue: '',
            advancedCustomValue: 'John',
          },
        },
      })

      const { formFields } = useFormState(formTypedCtx)

      renders.add(simplifyFieldsState(formFields))
    })

    expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      name: {val:John, initV:, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:Y, isL:N}
      "
    `)
  })

  test('populatedValue takes precedence over advancedCustomValue', () => {
    const renders = createRenderStore()

    renderHook(() => {
      const { formTypedCtx } = useForm({
        initialConfig: {
          name: getFieldConfig({
            initialValue: '',
            populatedValue: 'FromPopulated',
          }),
        },
      })

      const { formFields } = useFormState(formTypedCtx)

      renders.add(simplifyFieldsState(formFields, ['value', 'initialValue']))
    })

    expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      name: {value:FromPopulated, initialValue:}
      "
    `)
  })
})

describe('update field initial config validation', () => {
  test('update a field config', () => {
    const renders = createRenderStore()

    const updateConfigAction =
      emulateAction<
        Parameters<
          ReturnType<
            typeof useForm<{ password: { initialValue: string } }>
          >['updateConfig']
        >
      >()

    const setPassword = emulateAction<string>()

    renderHook(() => {
      const { formTypedCtx, updateConfig, handleChange } = useForm({
        initialConfig: {
          password: getFieldConfig({
            initialValue: '1234567',
            isValid: ({ value }) =>
              value.length < 8 ?
                'Password must have at least 8 characters'
              : true,
          }),
        },
      })

      const { formFields, isDiffFromInitial, formIsValid } =
        useFormState(formTypedCtx)

      renders.add({
        isDiffFromInitial,
        formIsValid,
        ...simplifyFieldsState(formFields),
      })

      updateConfigAction.useOnAction((newConfig) => {
        updateConfig(...newConfig)
      })

      setPassword.useOnAction((password) => {
        handleChange('password', password)
      })
    })

    updateConfigAction.call([
      { fields: { password: { simpleFieldIsValid: [] } } },
    ])

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ┌─
      ⎢ isDiffFromInitial: false
      ⎢ formIsValid: false
      ⎢ password: {val:1234567, initV:1234567, req:N, errors:[Password must have at least 8 characters], isValid:N, isEmpty:N, isTouched:N, isDiff:N, isL:N}
      └─
      ┌─
      ⎢ isDiffFromInitial: false
      ⎢ formIsValid: true
      ⎢ password: {val:1234567, initV:1234567, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
      └─
      "
    `)
  })
})
