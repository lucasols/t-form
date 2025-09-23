import { createLoggerStore, getResultFn } from '@ls-stack/utils/testUtils'
import { act, renderHook } from '@testing-library/react'
import { describe } from 'node:test'
import { expect, test } from 'vitest'
import { DynamicFormInitialConfig, useForm } from '../src/main'
import { emulateAction } from './utils/emulateAction'
import { simplifyFieldsState } from './utils/simplifyFieldsState'

test('update a field config', () => {
  const renders = createLoggerStore()

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
    const { useFormState, updateConfig, handleChange } = useForm({
      initialConfig: { password: { initialValue: '' } },
      fieldIsValid: {
        password: ({ value }) => (value === 'wrong' ? 'Wrong password' : true),
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
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ password: {val:'', initV:'', req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    "
  `)

  updateConfigAction.call([{ fields: { password: { required: true } } }])

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ❌
    ⋅ password: {val:'', initV:'', req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    "
  `)

  updateConfigAction.call([
    { fields: { password: { initialValue: 'initial value' } } },
  ])

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    ┌─
    ⋅ isDiffFromInitial: ✅
    ⋅ formIsValid: ❌
    ⋅ password: {val:'', initV:initial value, req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:Y, isL:N}
    └─
    "
  `)

  setPassword.call('12345')
  updateConfigAction.call([{ fields: { password: { isTouched: false } } }])

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    ┌─
    ⋅ isDiffFromInitial: ✅
    ⋅ formIsValid: ✅
    ⋅ password: {val:12345, initV:initial value, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    └─
    ┌─
    ⋅ isDiffFromInitial: ✅
    ⋅ formIsValid: ✅
    ⋅ password: {val:12345, initV:initial value, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:Y, isL:N}
    └─
    "
  `)

  updateConfigAction.call([
    {
      fields: {
        password: {
          fieldIsValid: ({ value }) => (value === '12345' ? 'Invalid' : true),
          isTouched: true,
        },
      },
    },
  ])

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    ┌─
    ⋅ isDiffFromInitial: ✅
    ⋅ formIsValid: ❌
    ⋅ password: {val:12345, initV:initial value, req:Y, errors:[Invalid], isValid:N, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    └─
    "
  `)

  updateConfigAction.call([
    { fields: { password: { checkIfIsEmpty: (value) => value === '12345' } } },
  ])

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    ┌─
    ⋅ isDiffFromInitial: ✅
    ⋅ formIsValid: ❌
    ⋅ password: {val:12345, initV:initial value, req:Y, errors:[This field is required], isValid:N, isEmpty:Y, isTouched:Y, isDiff:Y, isL:N}
    └─
    "
  `)

  updateConfigAction.call([
    {
      fields: {
        password: {
          derivedRequired: ({ fields }) => fields.password.value !== '12345',
        },
      },
    },
  ])

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    ┌─
    ⋅ isDiffFromInitial: ✅
    ⋅ formIsValid: ✅
    ⋅ password: {val:12345, initV:initial value, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:Y, isDiff:Y, isL:N}
    └─
    "
  `)

  updateConfigAction.call([
    { fields: { password: { metadata: { foo: 'bar' } } } },
  ])

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    ┌─
    ⋅ isDiffFromInitial: ✅
    ⋅ formIsValid: ✅
    ⋅ password: {val:12345, initV:initial value, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:Y, isDiff:Y, m:{foo:bar}, isL:N}
    └─
    "
  `)
})

test('remove field', () => {
  const renders = createLoggerStore()

  const removeField = emulateAction()

  renderHook(() => {
    const { useFormState, updateConfig } = useForm<
      DynamicFormInitialConfig<string>
    >({
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
      updateConfig({ fields: { password: 'remove' } })
    })
  })

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ password: {value:'', errors:null, isValid:✅}
    ⋅ name: {value:'', errors:null, isValid:✅}
    └─
    "
  `)

  removeField.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    -> isDiffFromInitial: ❌ ⋅ formIsValid: ✅ ⋅ name: {value:'', errors:null, isValid:✅}
    "
  `)
})

test('replace config applies simpleFieldIsValid', () => {
  const { result } = renderHook(() =>
    useForm({
      initialConfig: {
        password: { initialValue: '' },
      },
    }),
  )

  act(() => {
    result.current.updateConfig({
      fields: {
        password: {
          replace: true,
          initialValue: '',
          simpleFieldIsValid: ({ value }) =>
            value === 'secret' ? true : 'Invalid password',
        },
      },
    })
  })

  act(() => {
    result.current.handleChange('password', 'wrong')
  })

  expect(result.current.formStore.state.fields.password.errors).toEqual([
    'Invalid password',
  ])
  expect(result.current.formStore.state.fields.password.isValid).toBe(false)
})

test('replace config applies untouchable flag', () => {
  const { result } = renderHook(() =>
    useForm({
      initialConfig: {
        status: { initialValue: '' },
      },
    }),
  )

  act(() => {
    result.current.updateConfig({
      fields: {
        status: {
          replace: true,
          initialValue: '',
          untouchable: true,
        },
      },
    })
  })

  act(() => {
    result.current.handleChange('status', 'updated')
  })

  expect(result.current.formStore.state.fields.status.isTouched).toBe(false)
})

test('replace config applies isLoading derived check', () => {
  const { result } = renderHook(() =>
    useForm({
      initialConfig: {
        status: { initialValue: '' },
      },
    }),
  )

  act(() => {
    result.current.updateConfig({
      fields: {
        status: {
          replace: true,
          initialValue: '',
          isLoading: (value) => value === 'loading',
        },
      },
    })
  })

  act(() => {
    result.current.handleChange('status', 'loading')
  })

  expect(result.current.formStore.state.fields.status.valueIsLoading).toBe(true)
  expect(result.current.formStore.state.fields.status.isValid).toBe(false)
})

test('add field', () => {
  const renders = createLoggerStore()

  const addField = emulateAction()

  renderHook(() => {
    const { useFormState, updateConfig } = useForm<
      DynamicFormInitialConfig<string>
    >({ initialConfig: { password: { initialValue: '' } } })

    const { formFields, isDiffFromInitial, formIsValid } = useFormState()

    renders.add({
      isDiffFromInitial,
      formIsValid,
      ...simplifyFieldsState(formFields),
    })

    addField.useOnAction(() => {
      updateConfig({ fields: { name: { initialValue: '' } } })
    })
  })

  addField.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ password: {val:'', initV:'', req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ password: {val:'', initV:'', req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    ⋅ name: {val:'', initV:'', req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    "
  `)
})

test('merge and removeExcess', () => {
  const renders = createLoggerStore()

  const mergeAndRemoveExcess = emulateAction()

  renderHook(() => {
    const { useFormState, updateConfig } = useForm<
      DynamicFormInitialConfig<string>
    >({
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
      updateConfig({
        fields: { password: { initialValue: '12345' } },
        updateMode: 'mergeAndRemoveExcessFields',
      })
    })
  })
  mergeAndRemoveExcess.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ password: {value:'', initialValue:''}
    ⋅ name: {value:'', initialValue:''}
    └─
    -> isDiffFromInitial: ✅ ⋅ formIsValid: ✅ ⋅ password: {value:'', initialValue:12345}
    "
  `)
})

test('override some fields', () => {
  const renders = createLoggerStore()

  const overrideSomeFields = emulateAction()

  renderHook(() => {
    const { useFormState, updateConfig } = useForm<
      DynamicFormInitialConfig<string, { foo: string } | undefined>
    >({
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
        fields: { password: { initialValue: '12345', replace: true } },
      })
    })
  })

  overrideSomeFields.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ❌
    ⋅ password: {val:'', initV:'', req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:N, m:{foo:bar}, isL:N}
    ⋅ name: {val:'', initV:'', req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ password: {val:12345, initV:12345, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    ⋅ name: {val:'', initV:'', req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    "
  `)
})

test('override all', () => {
  const renders = createLoggerStore()

  const overrideAll = emulateAction()

  renderHook(() => {
    const { useFormState, updateConfig } = useForm<
      DynamicFormInitialConfig<string, { foo: string } | undefined>
    >({
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
      updateConfig({
        fields: {
          password: { initialValue: '12345' },
          newField: { initialValue: 'new field', required: true },
        },
        updateMode: 'overwriteAll',
      })
    })
  })

  overrideAll.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ❌
    ⋅ password: {val:'', initV:'', req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:N, m:{foo:bar}, isL:N}
    ⋅ name: {val:'', initV:'', req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ password: {val:12345, initV:12345, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    ⋅ newField: {val:new field, initV:new field, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:N, isDiff:N, isL:N}
    └─
    "
  `)
})

test('update form metadata', () => {
  const renders = createLoggerStore()

  type Metadata = 'invalid' | 'required' | null

  const updateFormMetadata = emulateAction<Metadata>()

  renderHook(() => {
    const { useFormState, formStore, updateConfig } = useForm({
      initialFormMetadata: 'invalid' as Metadata,
      initialConfig: { password: { initialValue: '' } },
      fieldIsValid: {
        password: ({ formMetadata }) => {
          if (formMetadata === 'invalid') {
            return 'Invalid'
          }

          return true
        },
      },
      derivedConfig: {
        password: {
          required: ({ formMetadata }) => {
            return formMetadata === 'required'
          },
        },
      },
    })

    const { formFields, isDiffFromInitial, formIsValid } = useFormState()
    const formMetadata = formStore.useSelector((state) => state.formMetadata)

    renders.add({
      isDiffFromInitial,
      formIsValid,
      metadata: formMetadata,
      ...simplifyFieldsState(formFields),
    })

    updateFormMetadata.useOnAction((metadata) => {
      updateConfig({ formMetadata: metadata })
    })
  })

  updateFormMetadata.call('required')

  updateFormMetadata.call(null)

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ metadata: invalid
    ⋅ password: {val:'', initV:'', req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ❌
    ⋅ metadata: required
    ⋅ password: {val:'', initV:'', req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ metadata: null
    ⋅ password: {val:'', initV:'', req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    "
  `)
})

test('update initialValue should update isDiffFromInitial', () => {
  const renders = createLoggerStore()

  const updateInitialValue = emulateAction()
  const setPassword = emulateAction<string>()

  renderHook(() => {
    const { useFormState, updateConfig, handleChange } = useForm({
      initialConfig: { password: { initialValue: '' } },
    })

    const { formFields, isDiffFromInitial, formIsValid } = useFormState({
      mustBeDiffFromInitial: true,
    })

    renders.add({
      isDiffFromInitial,
      formIsValid,
      ...simplifyFieldsState(formFields),
    })

    updateInitialValue.useOnAction(() => {
      updateConfig({ fields: { password: { initialValue: '12345' } } })
    })

    setPassword.useOnAction((password) => {
      handleChange('password', password)
    })
  })

  setPassword.call('12345')

  updateInitialValue.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ❌
    ⋅ password: {val:'', initV:'', req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    ┌─
    ⋅ isDiffFromInitial: ✅
    ⋅ formIsValid: ✅
    ⋅ password: {val:12345, initV:'', req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    └─
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ❌
    ⋅ password: {val:12345, initV:12345, req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:N, isL:N}
    └─
    "
  `)
})

describe('updateUntouchedWithInitial', () => {
  const renders = createLoggerStore()

  const { result } = renderHook(() => {
    const { useFormState, updateConfig, handleChange, untouchAll } = useForm({
      initialConfig: {
        password: { initialValue: '' },
        name: { initialValue: '' },
      },
    })

    const { formFields, isDiffFromInitial, formIsValid } = useFormState()

    renders.add({
      isDiffFromInitial,
      formIsValid,
      ...simplifyFieldsState(formFields, [
        'value',
        'initialValue',
        'isTouched',
      ]),
    })

    return { updateConfig, handleChange, untouchAll, formFields }
  })

  const updateConfig = getResultFn(() => result.current.updateConfig)
  const handleChange = getResultFn(() => result.current.handleChange)
  const untouchAll = getResultFn(() => result.current.untouchAll)
  function getFormFields() {
    return result.current.formFields
  }

  test('update untouched fields with the initial value', () => {
    act(() => {
      renders.addMark('touch password')
      handleChange('password', '12345')
    })

    expect(renders.snapshot).toMatchInlineSnapshot(`
    "
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ password: {value:'', initialValue:'', isTouched:❌}
    ⋅ name: {value:'', initialValue:'', isTouched:❌}
    └─

    >>> touch password

    ┌─
    ⋅ isDiffFromInitial: ✅
    ⋅ formIsValid: ✅
    ⋅ password: {value:12345, initialValue:'', isTouched:✅}
    ⋅ name: {value:'', initialValue:'', isTouched:❌}
    └─
    "
  `)

    act(() => {
      updateConfig({
        updateUntouchedWithInitial: true,
        fields: {
          password: { initialValue: '6789' },
          name: { initialValue: 'John' },
        },
      })
    })

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    ┌─
    ⋅ isDiffFromInitial: ✅
    ⋅ formIsValid: ✅
    ⋅ password: {value:12345, initialValue:6789, isTouched:✅}
    ⋅ name: {value:John, initialValue:John, isTouched:❌}
    └─
    "
  `)

    act(() => {
      renders.addMark('untouchAll')
      untouchAll()
    })

    act(() => {
      renders.addMark('update password and name initial values')
      updateConfig({
        updateUntouchedWithInitial: true,
        fields: {
          password: { initialValue: 'abc' },
          name: { initialValue: 'Hi' },
        },
      })
    })

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    >>> untouchAll

    ┌─
    ⋅ isDiffFromInitial: ✅
    ⋅ formIsValid: ✅
    ⋅ password: {value:12345, initialValue:6789, isTouched:❌}
    ⋅ name: {value:John, initialValue:John, isTouched:❌}
    └─

    >>> update password and name initial values

    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ password: {value:abc, initialValue:abc, isTouched:❌}
    ⋅ name: {value:Hi, initialValue:Hi, isTouched:❌}
    └─
    "
  `)
  })

  test('if the value is set in config don use initial value', () => {
    act(() => {
      renders.addMark('update config')
      updateConfig({
        updateUntouchedWithInitial: true,
        fields: {
          password: { value: 'new_value', initialValue: 'abc' },
          name: { initialValue: 'lucas' },
        },
      })
    })

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ⋅⋅⋅
      >>> update config

      ┌─
      ⋅ isDiffFromInitial: ✅
      ⋅ formIsValid: ✅
      ⋅ password: {value:new_value, initialValue:abc, isTouched:❌}
      ⋅ name: {value:lucas, initialValue:lucas, isTouched:❌}
      └─
      "
    `)
    expect(getFormFields().password.value).toBe('new_value')
    expect(getFormFields().name.value).toBe('lucas')
    expect(getFormFields().name.initialValue).toBe('lucas')
  })

  test('update configs other than value or initialValue should not change the field values', () => {
    act(() => {
      renders.addMark('touch password via updateConfig')
      updateConfig({
        updateUntouchedWithInitial: true,
        fields: { password: { isTouched: true } },
      })
    })

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ⋅⋅⋅
      >>> touch password via updateConfig

      ┌─
      ⋅ isDiffFromInitial: ✅
      ⋅ formIsValid: ✅
      ⋅ password: {value:new_value, initialValue:abc, isTouched:✅}
      ⋅ name: {value:lucas, initialValue:lucas, isTouched:❌}
      └─
      "
    `)

    expect(getFormFields().password.value).toBe('new_value')
    expect(getFormFields().password.initialValue).toBe('abc')
  })
})
