import { renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'
import { useForm } from '../src/main'
import { useFormState } from '../src/useFormState'
import { emulateAction } from './utils/emulateAction'
import { createRenderStore } from './utils/rendersStore'
import { simplifyFieldsState } from './utils/simplifyFieldsState'

test('should not clean errors from derivated config', () => {
  const renders = createRenderStore()

  const setCompany = emulateAction<'pf' | 'pj' | null>()
  const forceValidation = emulateAction()

  renderHook(() => {
    const { formTypedCtx, handleChange, forceFormValidation } = useForm({
      initialConfig: {
        brCompanyType: {
          initialValue: null as 'pf' | 'pj' | null,
          required: true,
        },
        brCnpj: { initialValue: null },
      },
      derivedConfig: {
        brCnpj: {
          required({ fields }) {
            return fields.brCompanyType.value !== 'pf'
          },
        },
      },
    })

    const { formFields } = useFormState(formTypedCtx)

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

test('resetIfDerivedRequiredChangeToFalse', () => {
  const renders = createRenderStore()

  const setCompany = emulateAction<'pf' | 'pj' | null>()
  const setCnpj = emulateAction<string>()

  renderHook(() => {
    const { formTypedCtx, handleChange } = useForm({
      initialConfig: {
        brCompanyType: {
          initialValue: null as 'pf' | 'pj' | null,
          required: true,
        },
        brCnpj: { initialValue: null as string | null },
      },
      derivedConfig: {
        brCnpj: {
          required({ fields }) {
            return fields.brCompanyType.value !== 'pf'
          },
          resetIfDerivedRequiredChangeToFalse: { value: null },
        },
      },
      fieldIsValid: {
        brCnpj: ({ value }) => {
          return value === '123' ? 'Invalid' : true
        },
      },
    })

    const { formFields } = useFormState(formTypedCtx)

    renders.add(simplifyFieldsState(formFields))

    setCompany.useOnAction((value) => {
      handleChange('brCompanyType', value)
    })

    setCnpj.useOnAction((value) => {
      handleChange('brCnpj', value)
    })
  })

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⎢ brCompanyType: {val:null, initV:null, req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    ⎢ brCnpj: {val:null, initV:null, req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    └─
    "
  `)

  setCnpj.call('123')

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ---
    ┌─
    ⎢ brCompanyType: {val:null, initV:null, req:Y, errors:null, isValid:N, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    ⎢ brCnpj: {val:123, initV:null, req:Y, errors:[Invalid], isValid:N, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    └─
    "
  `)

  setCompany.call('pf')

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ---
    ┌─
    ⎢ brCompanyType: {val:pf, initV:null, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    ⎢ brCnpj: {val:null, initV:null, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:Y, isDiff:Y, isL:N}
    └─
    "
  `)
})

test('derivated config based on field own value', () => {
  const renders = createRenderStore()

  const setArrayOrNull = emulateAction<string[] | null>()

  renderHook(() => {
    const { formTypedCtx, handleChange } = useForm({
      initialConfig: {
        arrayOrNull: { initialValue: null as string[] | null, required: true },
      },
      derivedConfig: {
        arrayOrNull: {
          required({ fields }) {
            return fields.arrayOrNull.value !== null
          },
        },
      },
    })

    const { formFields } = useFormState(formTypedCtx)

    renders.add(simplifyFieldsState(formFields))

    setArrayOrNull.useOnAction((value) => {
      handleChange('arrayOrNull', value)
    })
  })

  setArrayOrNull.call([])
  setArrayOrNull.call(['ok'])

  setArrayOrNull.call(null)

  expect(renders.snapshot).toMatchInlineSnapshot(`
    "
    arrayOrNull: {val:null, initV:null, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:N, isDiff:N, isL:N}
    arrayOrNull: {val:[], initV:null, req:Y, errors:[This field is required], isValid:N, isEmpty:Y, isTouched:Y, isDiff:N, isL:N}
    arrayOrNull: {val:[ok], initV:null, req:Y, errors:null, isValid:Y, isEmpty:N, isTouched:Y, isDiff:Y, isL:N}
    arrayOrNull: {val:null, initV:null, req:N, errors:null, isValid:Y, isEmpty:Y, isTouched:Y, isDiff:N, isL:N}
    "
  `)
})
