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
