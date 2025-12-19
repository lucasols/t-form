import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { useForm } from '../src/main'
import { useFormState } from '../src/useFormState'
import { emulateActions } from './utils/emulateAction'
import { createRenderStore } from './utils/rendersStore'
import { simplifyFieldsState } from './utils/simplifyFieldsState'

afterEach(() => cleanup())

test('array fields methods', () => {
  const renders = createRenderStore()

  const actions = emulateActions<{
    add: undefined
    remove: undefined
    toggle: undefined
    update: undefined
  }>()

  renderHook(() => {
    const { formTypedCtx, arrayFields } = useForm({
      initialConfig: {
        array: { initialValue: [] as string[] },
        nonArray: { initialValue: '' },
      },
      arrayFieldsConfig: { array: { getItemId: (index) => index } },
    })

    const { formFields } = useFormState(formTypedCtx)

    renders.add(simplifyFieldsState(formFields))

    actions.useOnActions({
      add: () => {
        arrayFields.addItem('array', '1')
      },
      remove: () => {
        arrayFields.removeItem('array', '1')
      },
      toggle: () => {
        arrayFields.toggleItem('array', '2', '2')
      },
      update: () => {
        arrayFields.updateItem('array', '2', '3')
      },
    })
  })

  actions.call('add')
  actions.call('remove')
  actions.call('toggle')
  actions.call('update')

  expect(renders.snapshot).toMatchInlineSnapshot(`
    "
    ┌─
    ⎢ array: {val:[], initV:[], req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    ⎢ nonArray: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    ┌─
    ⎢ array: {val:[1], initV:[], req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    ⎢ nonArray: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    ┌─
    ⎢ array: {val:[], initV:[], req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:Y, isDiff:N, isL:N}
    ⎢ nonArray: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    ┌─
    ⎢ array: {val:[2], initV:[], req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    ⎢ nonArray: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    ┌─
    ⎢ array: {val:[3], initV:[], req:N, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    ⎢ nonArray: {val:, initV:, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    "
  `)
})
