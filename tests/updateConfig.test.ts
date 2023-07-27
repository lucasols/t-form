import { renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'
import { DynamicFormInitialConfig, useForm } from '../src/main'
import { emulateAction } from './utils/emulateAction'
import { createRenderStore } from './utils/rendersStore'
import { simplifyFieldsState } from './utils/simplifyFieldsState'

test('update a field config', () => {
  const renders = createRenderStore()

  const updateConfigAction = emulateAction<
    Parameters<
      ReturnType<
        typeof useForm<{
          password: {
            initialValue: string
          }
        }>
      >['updateConfig']
    >
  >()

  const setPassword = emulateAction<string>()

  renderHook(() => {
    const { useFormState, updateConfig, handleChange } = useForm({
      initialConfig: {
        password: { initialValue: '' },
      },
      fieldIsValid: {
        password: (value) => (value === 'wrong' ? 'Wrong password' : true),
      },
    })

    const { formFields, isDiffFromInitial, formIsValid } = useFormState()

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

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ┌─
      ⎢ isDiffFromInitial: false
      ⎢ formIsValid: true
      ⎢ password: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
      └─
      "
    `)

  updateConfigAction.call([{ password: { required: true } }])

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      ┌─
      ⎢ isDiffFromInitial: false
      ⎢ formIsValid: false
      ⎢ password: {val:, initV:, req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
      └─
      "
    `)

  updateConfigAction.call([{ password: { initialValue: 'initial value' } }])

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      ┌─
      ⎢ isDiffFromInitial: true
      ⎢ formIsValid: false
      ⎢ password: {val:, initV:initial value, req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:Y, isL:N}
      └─
      "
    `)

  setPassword.call('12345')
  updateConfigAction.call([{ password: { isTouched: false } }])

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      ┌─
      ⎢ isDiffFromInitial: true
      ⎢ formIsValid: true
      ⎢ password: {val:12345, initV:initial value, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
      └─
      ┌─
      ⎢ isDiffFromInitial: true
      ⎢ formIsValid: true
      ⎢ password: {val:12345, initV:initial value, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:Y, isL:N}
      └─
      "
    `)

  updateConfigAction.call([
    {
      password: {
        fieldIsValid: (value) => (value === '12345' ? 'Invalid' : true),
        isTouched: true,
      },
    },
  ])

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      ┌─
      ⎢ isDiffFromInitial: true
      ⎢ formIsValid: false
      ⎢ password: {val:12345, initV:initial value, req:Y, errors:[Invalid], isValid:N, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
      └─
      "
    `)

  updateConfigAction.call([
    {
      password: {
        checkIfIsEmpty: (value) => value === '12345',
      },
    },
  ])

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      ┌─
      ⎢ isDiffFromInitial: true
      ⎢ formIsValid: false
      ⎢ password: {val:12345, initV:initial value, req:Y, errors:[This field is required, Invalid], isValid:N, isEmpty:Y, isTouched:Y, isDiff:Y, isL:N}
      └─
      "
    `)

  updateConfigAction.call([
    {
      password: {
        derivedRequired: (fields) => fields.password.value !== '12345',
      },
    },
  ])

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      ┌─
      ⎢ isDiffFromInitial: true
      ⎢ formIsValid: false
      ⎢ password: {val:12345, initV:initial value, req:N, errors:[Invalid], isValid:N, isEmpty:Y, isTouched:Y, isDiff:Y, isL:N}
      └─
      "
    `)

  updateConfigAction.call([{ password: { metadata: { foo: 'bar' } } }])

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      ┌─
      ⎢ isDiffFromInitial: true
      ⎢ formIsValid: false
      ⎢ password: {val:12345, initV:initial value, req:N, errors:[This field is required, Invalid], isValid:N, isEmpty:Y, isTouched:Y, isDiff:Y, m:{foo:bar}, isL:N}
      └─
      "
    `)
})

test('remove field', () => {
  const renders = createRenderStore()

  const removeField = emulateAction()

  renderHook(() => {
    const { useFormState, updateConfig } = useForm<DynamicFormInitialConfig<string>>({
      initialConfig: {
        password: { initialValue: '' },
        name: { initialValue: '' },
      },
    })

    const { formFields, isDiffFromInitial, formIsValid } = useFormState()

    renders.add({
      isDiffFromInitial,
      formIsValid,
      ...simplifyFieldsState(formFields, ['value', 'errors', 'isValid']),
    })

    removeField.useOnAction(() => {
      updateConfig({ password: 'remove' })
    })
  })

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ┌─
      ⎢ isDiffFromInitial: false
      ⎢ formIsValid: true
      ⎢ password: {value:, errors:null, isValid:true}
      ⎢ name: {value:, errors:null, isValid:true}
      └─
      "
    `)

  removeField.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ---
      ┌─
      ⎢ isDiffFromInitial: false
      ⎢ formIsValid: true
      ⎢ name: {value:, errors:null, isValid:true}
      └─
      "
    `)
})

test('add field', () => {
  const renders = createRenderStore()

  const addField = emulateAction()

  renderHook(() => {
    const { useFormState, updateConfig } = useForm<DynamicFormInitialConfig<string>>({
      initialConfig: {
        password: { initialValue: '' },
      },
    })

    const { formFields, isDiffFromInitial, formIsValid } = useFormState()

    renders.add({
      isDiffFromInitial,
      formIsValid,
      ...simplifyFieldsState(formFields),
    })

    addField.useOnAction(() => {
      updateConfig({ name: { initialValue: '' } })
    })
  })

  addField.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ┌─
      ⎢ isDiffFromInitial: false
      ⎢ formIsValid: true
      ⎢ password: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
      └─
      ┌─
      ⎢ isDiffFromInitial: false
      ⎢ formIsValid: true
      ⎢ password: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
      ⎢ name: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
      └─
      "
    `)
})

test('merge and removeExcess', () => {
  const renders = createRenderStore()

  const mergeAndRemoveExcess = emulateAction()

  renderHook(() => {
    const { useFormState, updateConfig } = useForm<DynamicFormInitialConfig<string>>({
      initialConfig: {
        password: { initialValue: '' },
        name: { initialValue: '' },
      },
    })

    const { formFields, isDiffFromInitial, formIsValid } = useFormState()

    renders.add({
      isDiffFromInitial,
      formIsValid,
      ...simplifyFieldsState(formFields, ['value', 'initialValue']),
    })

    mergeAndRemoveExcess.useOnAction(() => {
      updateConfig(
        {
          password: { initialValue: '12345' },
        },
        'mergeAndRemoveExcessFields',
      )
    })
  })
  mergeAndRemoveExcess.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ┌─
      ⎢ isDiffFromInitial: false
      ⎢ formIsValid: true
      ⎢ password: {value:, initialValue:}
      ⎢ name: {value:, initialValue:}
      └─
      ┌─
      ⎢ isDiffFromInitial: false
      ⎢ formIsValid: true
      ⎢ password: {value:, initialValue:12345}
      └─
      "
    `)
})

test('override some fields', () => {
  const renders = createRenderStore()

  const overrideSomeFields = emulateAction()

  renderHook(() => {
    const { useFormState, updateConfig } = useForm<DynamicFormInitialConfig<string>>({
      initialConfig: {
        password: {
          initialValue: '',
          metadata: { foo: 'bar' },
          required: true,
        },
        name: { initialValue: '' },
      },
    })

    const { formFields, isDiffFromInitial, formIsValid } = useFormState()

    renders.add({
      isDiffFromInitial,
      formIsValid,
      ...simplifyFieldsState(formFields),
    })

    overrideSomeFields.useOnAction(() => {
      updateConfig({
        password: { initialValue: '12345', replace: true },
      })
    })
  })

  overrideSomeFields.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ┌─
      ⎢ isDiffFromInitial: false
      ⎢ formIsValid: false
      ⎢ password: {val:, initV:, req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:N, m:{foo:bar}, isL:N}
      ⎢ name: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
      └─
      ┌─
      ⎢ isDiffFromInitial: false
      ⎢ formIsValid: true
      ⎢ password: {val:12345, initV:12345, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
      ⎢ name: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
      └─
      "
    `)
})

test('override all', () => {
  const renders = createRenderStore()

  const overrideAll = emulateAction()

  renderHook(() => {
    const { useFormState, updateConfig } = useForm<DynamicFormInitialConfig<string>>({
      initialConfig: {
        password: {
          initialValue: '',
          metadata: { foo: 'bar' },
          required: true,
        },
        name: { initialValue: '' },
      },
    })

    const { formFields, isDiffFromInitial, formIsValid } = useFormState()

    renders.add({
      isDiffFromInitial,
      formIsValid,
      ...simplifyFieldsState(formFields),
    })

    overrideAll.useOnAction(() => {
      updateConfig(
        {
          password: { initialValue: '12345' },
          newField: { initialValue: 'new field', required: true },
        },
        'overrideAll',
      )
    })
  })

  overrideAll.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⎢ isDiffFromInitial: false
    ⎢ formIsValid: false
    ⎢ password: {val:, initV:, req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:N, m:{foo:bar}, isL:N}
    ⎢ name: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    ┌─
    ⎢ isDiffFromInitial: false
    ⎢ formIsValid: true
    ⎢ password: {val:12345, initV:12345, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    ⎢ newField: {val:new field, initV:new field, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    └─
    "
  `)
})
