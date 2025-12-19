import { createLoggerStore, getResultFn } from '@ls-stack/utils/testUtils'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { useForm } from '../src/main'
import { useFormState } from '../src/useFormState'
import { simplifyFieldsState } from './utils/simplifyFieldsState'

describe('untouchable', () => {
  const renders = createLoggerStore()

  const { result } = renderHook(() => {
    const { formTypedCtx, updateConfig, handleChange, touchField } = useForm({
      initialConfig: {
        untouchable: { initialValue: '', untouchable: true },
        normal: { initialValue: '' },
      },
    })

    const { formFields } = useFormState(formTypedCtx)

    renders.add(
      simplifyFieldsState(formFields, ['value', 'initialValue', 'isTouched']),
    )

    return { updateConfig, handleChange, touchField }
  })

  const updateConfig = getResultFn(() => result.current.updateConfig)
  const handleChange = getResultFn(() => result.current.handleChange)
  const touchField = getResultFn(() => result.current.touchField)

  test('changing untouchable field should not touch it', () => {
    act(() => {
      renders.addMark('touch untouchable')
      handleChange('untouchable', '123')
    })

    expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      ┌─
      ⋅ untouchable: {value:'', initialValue:'', isTouched:❌}
      ⋅ normal: {value:'', initialValue:'', isTouched:❌}
      └─

      >>> touch untouchable

      ┌─
      ⋅ untouchable: {value:123, initialValue:'', isTouched:❌}
      ⋅ normal: {value:'', initialValue:'', isTouched:❌}
      └─
      "
    `)
  })

  test('force touch untouchable field should not touch it', () => {
    act(() => {
      touchField('untouchable')
    })

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`"⋅⋅⋅empty⋅⋅⋅"`)
  })

  test('force touch untouchable field with updateConfig should not touch it', () => {
    act(() => {
      updateConfig({
        fields: {
          untouchable: {
            isTouched: true,
          },
        },
      })
    })

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`"⋅⋅⋅empty⋅⋅⋅"`)
  })

  test('disable untouchable config', () => {
    act(() => {
      renders.addMark('disable untouchable config')
      updateConfig({
        fields: {
          untouchable: {
            isUntouchable: false,
          },
        },
      })
    })

    act(() => {
      renders.addMark('change value')
      handleChange('untouchable', '123')
    })

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ⋅⋅⋅
      >>> disable untouchable config

      >>> change value

      ┌─
      ⋅ untouchable: {value:123, initialValue:'', isTouched:✅}
      ⋅ normal: {value:'', initialValue:'', isTouched:❌}
      └─
      "
    `)
  })
})

describe('required untouchable', () => {
  const renders = createLoggerStore()

  const { result } = renderHook(() => {
    const { formTypedCtx, updateConfig, handleChange } = useForm({
      initialConfig: {
        untouchable: { initialValue: 'ok', required: true, untouchable: true },
      },
    })

    const { formFields } = useFormState(formTypedCtx)

    renders.add(
      simplifyFieldsState(formFields, [
        'value',
        'initialValue',
        'isTouched',
        'isValid',
        'errors',
      ]),
    )

    return { updateConfig, handleChange }
  })

  const updateConfig = getResultFn(() => result.current.updateConfig)
  const handleChange = getResultFn(() => result.current.handleChange)

  test('setting value to empty should not show error', () => {
    act(() => {
      renders.addMark('set value to empty')
      handleChange('untouchable', '')
    })

    expect(renders.snapshot).toMatchInlineSnapshot(`
      "
      -> untouchable: {value:ok, initialValue:ok, isTouched:❌, isValid:✅, errors:null}

      >>> set value to empty

      -> untouchable: {value:'', initialValue:ok, isTouched:❌, isValid:❌, errors:null}
      "
    `)
  })

  test('disabling untouchable config', () => {
    act(() => {
      renders.addMark('disable untouchable config')
      updateConfig({
        fields: {
          untouchable: {
            isUntouchable: false,
          },
        },
      })
    })

    act(() => {
      renders.addMark('change value')
      handleChange('untouchable', 'abc')
    })

    act(() => {
      renders.addMark('change value to empty')
      handleChange('untouchable', '')
    })

    expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ⋅⋅⋅
      >>> disable untouchable config

      >>> change value

      -> untouchable: {value:abc, initialValue:ok, isTouched:✅, isValid:✅, errors:null}

      >>> change value to empty

      untouchable: {value:'', initialValue:ok, isTouched:✅, isValid:❌, errors:[This field is required]}
      "
    `)
  })
})
