import { act, render } from '@testing-library/react'
import React from 'react'
import { expect, test } from 'vitest'
import { useForm } from '../src/main'
import { useFormState } from '../src/useFormState'

test('useFormState', () => {
  type FieldProps = {
    value: string
    onChange: (value: string) => void
    errors: string[] | null
  }

  let fieldARerenders = 0
  let fieldBRerenders = 0
  let setAFieldValue: (value: string) => void = () => {}
  let setBFieldValue: (value: string) => void = () => {}

  const AField = ({ value, onChange }: FieldProps) => {
    fieldARerenders++
    setAFieldValue = onChange
    return <div>{value}</div>
  }

  const BField = ({ value, onChange }: FieldProps) => {
    fieldBRerenders++
    setBFieldValue = onChange
    return <div>{value}</div>
  }

  let setFieldValue: (id: 'fieldA' | 'fieldB', value: string) => void = () => {}

  const Component = () => {
    const { formTypedCtx, handleChange } = useForm({
      initialConfig: {
        fieldA: { initialValue: 'John' },
        fieldB: { initialValue: 'Jane' },
      },
    })

    const { fieldProps } = useFormState(formTypedCtx)

    setFieldValue = handleChange

    const aFieldMemoized = React.useMemo(
      () => <AField {...fieldProps.fieldA} />,
      [fieldProps.fieldA],
    )

    const bFieldMemoized = React.useMemo(
      () => <BField {...fieldProps.fieldB} />,
      [fieldProps.fieldB],
    )

    return (
      <div>
        {aFieldMemoized}
        {bFieldMemoized}
      </div>
    )
  }

  const { rerender, container } = render(
    <React.StrictMode>
      <Component />
    </React.StrictMode>,
  )

  expect(fieldARerenders).toBe(2)
  expect(fieldBRerenders).toBe(2)

  rerender(
    <React.StrictMode>
      <Component />
    </React.StrictMode>,
  )

  expect(fieldARerenders).toBe(2)
  expect(fieldBRerenders).toBe(2)

  expect(container.innerHTML).toMatchInlineSnapshot(
    `"<div><div>John</div><div>Jane</div></div>"`,
  )

  act(() => {
    setFieldValue('fieldA', 'John Doe')
  })

  expect(fieldARerenders).toBe(4)
  expect(fieldBRerenders).toBe(2)

  expect(container.innerHTML).toMatchInlineSnapshot(
    `"<div><div>John Doe</div><div>Jane</div></div>"`,
  )

  act(() => {
    setFieldValue('fieldB', 'Jane Doe')
  })

  expect(fieldARerenders).toBe(4)
  expect(fieldBRerenders).toBe(4)

  expect(container.innerHTML).toMatchInlineSnapshot(
    `"<div><div>John Doe</div><div>Jane Doe</div></div>"`,
  )

  act(() => {
    setAFieldValue('A Field onChange')
  })

  expect(fieldARerenders).toBe(6)
  expect(fieldBRerenders).toBe(4)

  expect(container.innerHTML).toMatchInlineSnapshot(
    `"<div><div>A Field onChange</div><div>Jane Doe</div></div>"`,
  )

  act(() => {
    setBFieldValue('B Field onChange')
  })

  expect(fieldARerenders).toBe(6)
  expect(fieldBRerenders).toBe(6)

  expect(container.innerHTML).toMatchInlineSnapshot(
    `"<div><div>A Field onChange</div><div>B Field onChange</div></div>"`,
  )
})
