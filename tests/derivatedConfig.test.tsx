import { renderHook } from '@testing-library/react'
import { useForm } from '../src/main'
import { createRenderStore } from './utils/rendersStore'
import { emulateAction } from './utils/emulateAction'
import { simplifyFieldsState } from './utils/simplifyFieldsState'
import { expect, test } from 'vitest'

test('should not clean errors from derivated config', () => {
  const renders = createRenderStore()

  const setCompany = emulateAction<'pf' | 'pj' | null>()
  const forceValidation = emulateAction()

  renderHook(() => {
    const { useFormState, handleChange, forceFormValidation } = useForm({
      initialConfig: {
        brCompanyType: {
          initialValue: null as 'pf' | 'pj' | null,
          required: true,
        },
        brCnpj: {
          initialValue: null,
        },
      },
      derivatedConfig: {
        brCnpj: {
          required({ fields }) {
            return fields.brCompanyType.value !== 'pf'
          },
        },
      },
    })

    const { formFields } = useFormState()

    renders.add(simplifyFieldsState(formFields))

    setCompany.useOnAction((value) => {
      handleChange('brCompanyType', value)
    })

    forceValidation.useOnAction(() => {
      forceFormValidation()
    })
  })

  forceValidation.call()

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⎢ brCompanyType: {val:null, initV:null, req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    ⎢ brCnpj: {val:null, initV:null, req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    ┌─
    ⎢ brCompanyType: {val:null, initV:null, req:Y, errors:[This field is required], isValid:N, isEmpty:Y, isTouched:Y, isDiff:N, isL:N}
    ⎢ brCnpj: {val:null, initV:null, req:Y, errors:[This field is required], isValid:N, isEmpty:Y, isTouched:Y, isDiff:N, isL:N}
    └─
    "
  `)

  setCompany.call('pj')

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ---
    ┌─
    ⎢ brCompanyType: {val:pj, initV:null, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    ⎢ brCnpj: {val:null, initV:null, req:Y, errors:[This field is required], isValid:N, isEmpty:Y, isTouched:Y, isDiff:N, isL:N}
    └─
    "
  `)

  setCompany.call('pf')

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ---
    ┌─
    ⎢ brCompanyType: {val:pf, initV:null, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    ⎢ brCnpj: {val:null, initV:null, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:Y, isDiff:N, isL:N}
    └─
    "
  `)
})
