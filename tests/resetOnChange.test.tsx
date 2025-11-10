import { createLoggerStore } from '@ls-stack/utils/testUtils'
import { act, renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'
import { useForm, useFormState } from '../src/main'

test('resetFieldsOnChange: when country changes, reset state and city', () => {
  const renders = createLoggerStore()

  const { result } = renderHook(() => {
    const { handleChange, formTypedCtx } = useForm({
      initialConfig: {
        country: { initialValue: null as string | null },
        state: { initialValue: null as string | null },
        city: { initialValue: null as string | null },
      },
      derivedConfig: {
        country: { resetFieldsOnChange: { state: null, city: null } },
      },
    })

    const { formFields } = useFormState(formTypedCtx)

    renders.add({
      country: formFields.country.value,
      state: formFields.state.value,
      city: formFields.city.value,
      countryTouched: formFields.country.isTouched,
      stateTouched: formFields.state.isTouched,
      cityTouched: formFields.city.isTouched,
    })

    return { handleChange }
  })

  // Set initial values
  act(() => {
    result.current.handleChange('country', 'USA')
  })

  act(() => {
    result.current.handleChange('state', 'California')
  })

  act(() => {
    result.current.handleChange('city', 'Los Angeles')
  })

  // Change country - should reset state and city
  act(() => {
    renders.addMark('Should reset state and city')
    result.current.handleChange('country', 'Canada')
  })

  expect(renders.snapshot).toMatchInlineSnapshot(`
    "
    ┌─
    ⋅ country: null
    ⋅ state: null
    ⋅ city: null
    ⋅ countryTouched: ❌
    ⋅ stateTouched: ❌
    ⋅ cityTouched: ❌
    └─
    ┌─
    ⋅ country: USA
    ⋅ state: null
    ⋅ city: null
    ⋅ countryTouched: ✅
    ⋅ stateTouched: ❌
    ⋅ cityTouched: ❌
    └─
    ┌─
    ⋅ country: USA
    ⋅ state: California
    ⋅ city: null
    ⋅ countryTouched: ✅
    ⋅ stateTouched: ✅
    ⋅ cityTouched: ❌
    └─
    ┌─
    ⋅ country: USA
    ⋅ state: California
    ⋅ city: Los Angeles
    ⋅ countryTouched: ✅
    ⋅ stateTouched: ✅
    ⋅ cityTouched: ✅
    └─

    >>> Should reset state and city

    ┌─
    ⋅ country: Canada
    ⋅ state: null
    ⋅ city: null
    ⋅ countryTouched: ✅
    ⋅ stateTouched: ❌
    ⋅ cityTouched: ❌
    └─
    "
  `)
})

test('resetItselfOnChange: reset field when watched fields change', () => {
  const renders = createLoggerStore()

  const { result } = renderHook(() => {
    const { handleChange, formTypedCtx } = useForm({
      initialConfig: {
        firstName: { initialValue: '' },
        lastName: { initialValue: '' },
        fullName: { initialValue: '' },
      },
      derivedConfig: {
        fullName: {
          resetItselfOnChange: {
            value: '',
            watchFields: ['firstName', 'lastName'],
          },
        },
      },
    })

    const { formFields } = useFormState(formTypedCtx)

    renders.add({
      firstName: formFields.firstName.value,
      lastName: formFields.lastName.value,
      fullName: formFields.fullName.value,
      firstNameTouched: formFields.firstName.isTouched,
      lastNameTouched: formFields.lastName.isTouched,
      fullNameTouched: formFields.fullName.isTouched,
    })

    return { handleChange }
  })

  // Set fullName manually
  act(() => {
    result.current.handleChange('fullName', 'John Doe')
  })

  // Change firstName - should reset fullName
  act(() => {
    renders.addMark('firstName changed - should reset fullName')
    result.current.handleChange('firstName', 'Jane')
  })

  // Set fullName again
  act(() => {
    result.current.handleChange('fullName', 'Jane Smith')
  })

  // Change lastName - should reset fullName
  act(() => {
    renders.addMark('lastName changed - should reset fullName')
    result.current.handleChange('lastName', 'Williams')
  })

  expect(renders.snapshot).toMatchInlineSnapshot(`
    "
    ┌─
    ⋅ firstName: ''
    ⋅ lastName: ''
    ⋅ fullName: ''
    ⋅ firstNameTouched: ❌
    ⋅ lastNameTouched: ❌
    ⋅ fullNameTouched: ❌
    └─
    ┌─
    ⋅ firstName: ''
    ⋅ lastName: ''
    ⋅ fullName: John Doe
    ⋅ firstNameTouched: ❌
    ⋅ lastNameTouched: ❌
    ⋅ fullNameTouched: ✅
    └─

    >>> firstName changed - should reset fullName

    ┌─
    ⋅ firstName: Jane
    ⋅ lastName: ''
    ⋅ fullName: ''
    ⋅ firstNameTouched: ✅
    ⋅ lastNameTouched: ❌
    ⋅ fullNameTouched: ❌
    └─
    ┌─
    ⋅ firstName: Jane
    ⋅ lastName: ''
    ⋅ fullName: Jane Smith
    ⋅ firstNameTouched: ✅
    ⋅ lastNameTouched: ❌
    ⋅ fullNameTouched: ✅
    └─

    >>> lastName changed - should reset fullName

    ┌─
    ⋅ firstName: Jane
    ⋅ lastName: Williams
    ⋅ fullName: ''
    ⋅ firstNameTouched: ✅
    ⋅ lastNameTouched: ✅
    ⋅ fullNameTouched: ❌
    └─
    "
  `)
})

test('resetFieldsOnChange with updateConfig: runtime configuration', () => {
  const renders = createLoggerStore()

  const { result } = renderHook(() => {
    const { handleChange, formTypedCtx, updateConfig } = useForm({
      initialConfig: {
        option1: { initialValue: false },
        option2: { initialValue: false },
        details: { initialValue: '' },
      },
    })

    const { formFields } = useFormState(formTypedCtx)

    renders.add({
      option1: formFields.option1.value,
      option2: formFields.option2.value,
      details: formFields.details.value,
      detailsTouched: formFields.details.isTouched,
    })

    return { handleChange, updateConfig }
  })

  // Enable option1
  act(() => {
    result.current.handleChange('option1', true)
  })

  // Add details
  act(() => {
    result.current.handleChange('details', 'Some details')
  })

  // Add reset config via updateConfig
  act(() => {
    renders.addMark('Add resetFieldsOnChange config via updateConfig')
    result.current.updateConfig({
      fields: { option1: { resetFieldsOnChange: { details: '' } } },
    })
  })

  // Toggle option1 - should reset details
  act(() => {
    renders.addMark('Toggle option1 - should reset details')
    result.current.handleChange('option1', false)
  })

  expect(renders.snapshot).toMatchInlineSnapshot(`
    "
    -> option1: ❌ ⋅ option2: ❌ ⋅ details: '' ⋅ detailsTouched: ❌
    -> option1: ✅ ⋅ option2: ❌ ⋅ details: '' ⋅ detailsTouched: ❌
    -> option1: ✅ ⋅ option2: ❌ ⋅ details: Some details ⋅ detailsTouched: ✅

    >>> Add resetFieldsOnChange config via updateConfig

    >>> Toggle option1 - should reset details

    -> option1: ❌ ⋅ option2: ❌ ⋅ details: '' ⋅ detailsTouched: ❌
    "
  `)
})

test('resetItselfOnChange with updateConfig: runtime configuration', () => {
  const renders = createLoggerStore()

  const { result } = renderHook(() => {
    const { handleChange, formTypedCtx, updateConfig } = useForm({
      initialConfig: {
        dependency: { initialValue: 0 },
        derived: { initialValue: 0 },
      },
    })

    const { formFields } = useFormState(formTypedCtx)

    renders.add({
      dependency: formFields.dependency.value,
      derived: formFields.derived.value,
      derivedTouched: formFields.derived.isTouched,
    })

    return { handleChange, updateConfig }
  })

  // Set both values
  act(() => {
    result.current.handleChange('dependency', 1)
  })

  act(() => {
    result.current.handleChange('derived', 10)
  })

  // Add resetItselfOnChange config via updateConfig
  act(() => {
    renders.addMark('Add resetItselfOnChange config via updateConfig')
    result.current.updateConfig({
      fields: {
        derived: {
          resetItselfOnChange: { value: 0, watchFields: ['dependency'] },
        },
      },
    })
  })

  // Change dependency - should reset derived
  act(() => {
    renders.addMark('Change dependency - should reset derived')
    result.current.handleChange('dependency', 2)
  })

  expect(renders.snapshot).toMatchInlineSnapshot(`
    "
    -> dependency: 0 ⋅ derived: 0 ⋅ derivedTouched: ❌
    -> dependency: 1 ⋅ derived: 0 ⋅ derivedTouched: ❌
    -> dependency: 1 ⋅ derived: 10 ⋅ derivedTouched: ✅

    >>> Add resetItselfOnChange config via updateConfig

    >>> Change dependency - should reset derived

    -> dependency: 2 ⋅ derived: 0 ⋅ derivedTouched: ❌
    "
  `)
})

test('resetFieldsOnChange: partial reset (not all fields)', () => {
  const renders = createLoggerStore()

  const { result } = renderHook(() => {
    const { handleChange, formTypedCtx } = useForm({
      initialConfig: {
        type: { initialValue: 'A' },
        field1: { initialValue: '' },
        field2: { initialValue: '' },
        field3: { initialValue: '' },
      },
      derivedConfig: {
        type: {
          resetFieldsOnChange: {
            field1: '',
            field2: '',
            // field3 is intentionally not reset
          },
        },
      },
    })

    const { formFields } = useFormState(formTypedCtx)

    renders.add({
      type: formFields.type.value,
      field1: formFields.field1.value,
      field2: formFields.field2.value,
      field3: formFields.field3.value,
      field1Touched: formFields.field1.isTouched,
      field2Touched: formFields.field2.isTouched,
      field3Touched: formFields.field3.isTouched,
    })

    return { handleChange }
  })

  // Set all fields
  act(() => {
    result.current.handleChange('field1', 'value1')
  })

  act(() => {
    result.current.handleChange('field2', 'value2')
  })

  act(() => {
    result.current.handleChange('field3', 'value3')
  })

  // Change type - should reset field1 and field2, but not field3
  act(() => {
    renders.addMark('Change type - should reset field1 and field2, not field3')
    result.current.handleChange('type', 'B')
  })

  expect(renders.snapshot).toMatchInlineSnapshot(`
    "
    ┌─
    ⋅ type: A
    ⋅ field1: ''
    ⋅ field2: ''
    ⋅ field3: ''
    ⋅ field1Touched: ❌
    ⋅ field2Touched: ❌
    ⋅ field3Touched: ❌
    └─
    ┌─
    ⋅ type: A
    ⋅ field1: value1
    ⋅ field2: ''
    ⋅ field3: ''
    ⋅ field1Touched: ✅
    ⋅ field2Touched: ❌
    ⋅ field3Touched: ❌
    └─
    ┌─
    ⋅ type: A
    ⋅ field1: value1
    ⋅ field2: value2
    ⋅ field3: ''
    ⋅ field1Touched: ✅
    ⋅ field2Touched: ✅
    ⋅ field3Touched: ❌
    └─
    ┌─
    ⋅ type: A
    ⋅ field1: value1
    ⋅ field2: value2
    ⋅ field3: value3
    ⋅ field1Touched: ✅
    ⋅ field2Touched: ✅
    ⋅ field3Touched: ✅
    └─

    >>> Change type - should reset field1 and field2, not field3

    ┌─
    ⋅ type: B
    ⋅ field1: ''
    ⋅ field2: ''
    ⋅ field3: value3
    ⋅ field1Touched: ❌
    ⋅ field2Touched: ❌
    ⋅ field3Touched: ✅
    └─
    "
  `)
})

test('resetItselfOnChange: only reset when specific watched fields change', () => {
  const renders = createLoggerStore()

  const { result } = renderHook(() => {
    const { handleChange, formTypedCtx } = useForm({
      initialConfig: {
        fieldA: { initialValue: '' },
        fieldB: { initialValue: '' },
        fieldC: { initialValue: '' },
        derived: { initialValue: '' },
      },
      derivedConfig: {
        derived: {
          resetItselfOnChange: {
            value: '',
            watchFields: ['fieldA', 'fieldB'], // Only watch A and B, not C
          },
        },
      },
    })

    const { formFields } = useFormState(formTypedCtx)

    renders.add({
      fieldA: formFields.fieldA.value,
      fieldB: formFields.fieldB.value,
      fieldC: formFields.fieldC.value,
      derived: formFields.derived.value,
      derivedTouched: formFields.derived.isTouched,
    })

    return { handleChange }
  })

  // Set derived value
  act(() => {
    result.current.handleChange('derived', 'initial')
  })

  // Change fieldC - should NOT reset derived (not watched)
  act(() => {
    renders.addMark('Change fieldC - should NOT reset derived')
    result.current.handleChange('fieldC', 'C value')
  })

  // Change fieldA - should reset derived (watched)
  act(() => {
    renders.addMark('Change fieldA - should reset derived')
    result.current.handleChange('fieldA', 'A value')
  })

  // Set derived again
  act(() => {
    result.current.handleChange('derived', 'updated')
  })

  // Change fieldB - should reset derived (watched)
  act(() => {
    renders.addMark('Change fieldB - should reset derived')
    result.current.handleChange('fieldB', 'B value')
  })

  expect(renders.snapshot).toMatchInlineSnapshot(`
    "
    -> fieldA: '' ⋅ fieldB: '' ⋅ fieldC: '' ⋅ derived: '' ⋅ derivedTouched: ❌
    -> fieldA: '' ⋅ fieldB: '' ⋅ fieldC: '' ⋅ derived: initial ⋅ derivedTouched: ✅

    >>> Change fieldC - should NOT reset derived

    -> fieldA: '' ⋅ fieldB: '' ⋅ fieldC: C value ⋅ derived: initial ⋅ derivedTouched: ✅

    >>> Change fieldA - should reset derived

    -> fieldA: A value ⋅ fieldB: '' ⋅ fieldC: C value ⋅ derived: '' ⋅ derivedTouched: ❌
    ┌─
    ⋅ fieldA: A value
    ⋅ fieldB: ''
    ⋅ fieldC: C value
    ⋅ derived: updated
    ⋅ derivedTouched: ✅
    └─

    >>> Change fieldB - should reset derived

    ┌─
    ⋅ fieldA: A value
    ⋅ fieldB: B value
    ⋅ fieldC: C value
    ⋅ derived: ''
    ⋅ derivedTouched: ❌
    └─
    "
  `)
})

test('multiple fields with resetFieldsOnChange affecting the same target', () => {
  const renders = createLoggerStore()

  const { result } = renderHook(() => {
    const { handleChange, formTypedCtx, formStore } = useForm({
      initialConfig: {
        trigger1: { initialValue: false },
        trigger2: { initialValue: false },
        target: { initialValue: '' },
      },
      derivedConfig: {
        trigger1: { resetFieldsOnChange: { target: 'reset-by-trigger1' } },
        trigger2: { resetFieldsOnChange: { target: 'reset-by-trigger2' } },
      },
    })

    const { formFields } = useFormState(formTypedCtx)

    renders.add({
      trigger1: formFields.trigger1.value,
      trigger2: formFields.trigger2.value,
      target: formFields.target.value,
      targetTouched: formFields.target.isTouched,
    })

    return { handleChange, formStore }
  })

  // Set target
  act(() => {
    result.current.handleChange('target', 'initial-value')
  })

  // Change both triggers at once - first one wins
  act(() => {
    renders.addMark('Change both triggers - first one wins')
    result.current.handleChange({ trigger1: true, trigger2: true })
  })

  expect(renders.snapshot).toMatchInlineSnapshot(`
    "
    -> trigger1: ❌ ⋅ trigger2: ❌ ⋅ target: '' ⋅ targetTouched: ❌
    -> trigger1: ❌ ⋅ trigger2: ❌ ⋅ target: initial-value ⋅ targetTouched: ✅

    >>> Change both triggers - first one wins

    -> trigger1: ✅ ⋅ trigger2: ✅ ⋅ target: reset-by-trigger1 ⋅ targetTouched: ❌
    "
  `)
})
