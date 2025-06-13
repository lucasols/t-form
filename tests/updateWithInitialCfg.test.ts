import { createLoggerStore } from '@ls-stack/utils/testUtils'
import { act, renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'
import { useForm, useFormState, type FieldsState } from '../src/main'
import { simplifyFieldsState } from './utils/simplifyFieldsState'

function getRenderSnapshot({
  isDiffFromInitial,
  formIsValid,
  formFields,
}: {
  isDiffFromInitial: boolean
  formIsValid: boolean
  formFields: FieldsState<any>
}) {
  return {
    isDiffFromInitial,
    formIsValid,
    ...simplifyFieldsState(formFields, ['value', 'initialValue', 'isTouched']),
  }
}

test('should update untouched fields when initialConfig changes and autoUpdate is true', () => {
  const renders = createLoggerStore()

  const { rerender } = renderHook(
    ({ name, email }) => {
      const { formTypedCtx } = useForm({
        initialConfig: {
          name: { initialValue: name },
          email: { initialValue: email },
        },
        autoUpdate: true,
      })

      const formState = useFormState(formTypedCtx)
      renders.add(getRenderSnapshot(formState))
    },
    { initialProps: { name: 'John', email: 'john@example.com' } },
  )

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
      "
      ┌─
      ⋅ isDiffFromInitial: ❌
      ⋅ formIsValid: ✅
      ⋅ name: {value:John, initialValue:John, isTouched:❌}
      ⋅ email: {value:john@example.com, initialValue:john@example.com, isTouched:❌}
      └─
      "
    `)

  renders.addMark('Change name prop to "Jane"')
  rerender({ name: 'Jane', email: 'jane@example.com' })

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    >>> Change name prop to "Jane"

    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ name: {value:John, initialValue:John, isTouched:❌}
    ⋅ email: {value:john@example.com, initialValue:john@example.com, isTouched:❌}
    └─
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ name: {value:Jane, initialValue:Jane, isTouched:❌}
    ⋅ email: {value:jane@example.com, initialValue:jane@example.com, isTouched:❌}
    └─
    "
  `)

  renders.addMark('Rerender with same props')
  rerender({ name: 'Jane', email: 'jane@example.com' })

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    >>> Rerender with same props

    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ name: {value:Jane, initialValue:Jane, isTouched:❌}
    ⋅ email: {value:jane@example.com, initialValue:jane@example.com, isTouched:❌}
    └─
    "
  `)
})

test('should NOT update touched fields even when autoUpdate is true', () => {
  const renders = createLoggerStore()

  const { rerender, result } = renderHook(
    ({ name, email }) => {
      const { formTypedCtx, handleChange } = useForm({
        initialConfig: {
          name: { initialValue: name },
          email: { initialValue: email },
        },
        autoUpdate: true,
      })

      const formState = useFormState(formTypedCtx)
      renders.add(getRenderSnapshot(formState))
      return handleChange
    },
    { initialProps: { name: 'John', email: 'john@example.com' } },
  )

  renders.addMark('Change name to "Modified John" via handleChange')
  act(() => result.current('name', 'Modified John'))

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ name: {value:John, initialValue:John, isTouched:❌}
    ⋅ email: {value:john@example.com, initialValue:john@example.com, isTouched:❌}
    └─

    >>> Change name to "Modified John" via handleChange

    ┌─
    ⋅ isDiffFromInitial: ✅
    ⋅ formIsValid: ✅
    ⋅ name: {value:Modified John, initialValue:John, isTouched:✅}
    ⋅ email: {value:john@example.com, initialValue:john@example.com, isTouched:❌}
    └─
    "
  `)

  rerender({ name: 'Jane', email: 'jane@example.com' })

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    ┌─
    ⋅ isDiffFromInitial: ✅
    ⋅ formIsValid: ✅
    ⋅ name: {value:Modified John, initialValue:John, isTouched:✅}
    ⋅ email: {value:john@example.com, initialValue:john@example.com, isTouched:❌}
    └─
    ┌─
    ⋅ isDiffFromInitial: ✅
    ⋅ formIsValid: ✅
    ⋅ name: {value:Modified John, initialValue:Jane, isTouched:✅}
    ⋅ email: {value:jane@example.com, initialValue:jane@example.com, isTouched:❌}
    └─
    "
  `)
})

test('should update field configurations and preserve validation state', () => {
  const renders = createLoggerStore()

  const { rerender } = renderHook(
    ({
      emailValue,
      required,
      label,
    }: {
      emailValue: string
      required: boolean
      label: string
    }) => {
      const { formTypedCtx } = useForm({
        initialConfig: {
          email: { initialValue: emailValue, required, metadata: { label } },
        },
        autoUpdate: true,
        fieldIsValid: {
          email: ({ value }) => (value.includes('@') ? true : 'Invalid email'),
        },
      })

      const { formFields, isDiffFromInitial, formIsValid } =
        useFormState(formTypedCtx)

      renders.add({
        isDiffFromInitial,
        formIsValid,
        ...simplifyFieldsState(formFields, [
          'value',
          'initialValue',
          'required',
          'metadata',
          'errors',
          'isValid',
        ]),
      })
    },
    {
      initialProps: {
        emailValue: 'invalid-email',
        required: false,
        label: 'Email',
      },
    },
  )

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ❌
    ⋅ email: {value:invalid-email, initialValue:invalid-email, required:❌, metadata:{label:Email}, errors:[Invalid email], isValid:❌}
    └─
    "
  `)

  rerender({
    emailValue: 'valid@example.com',
    required: true,
    label: 'Email Address',
  })

  expect(renders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    ⋅⋅⋅
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ❌
    ⋅ email: {value:invalid-email, initialValue:invalid-email, required:❌, metadata:{label:Email}, errors:[Invalid email], isValid:❌}
    └─
    ┌─
    ⋅ isDiffFromInitial: ❌
    ⋅ formIsValid: ✅
    ⋅ email: {value:valid@example.com, initialValue:valid@example.com, required:✅, metadata:{label:Email Address}, errors:null, isValid:✅}
    └─
    "
  `)
})
