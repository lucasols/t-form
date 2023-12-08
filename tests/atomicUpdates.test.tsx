import { render, fireEvent } from '@testing-library/react'
import { expect, test } from 'vitest'
import {
  DynamicFormConfig,
  DynamicFormStore,
  useDynamicForm,
} from '../src/main'
import { mapArrayToObject } from '../src/utils/object'
import { createRenderStore } from './utils/rendersStore'
import { sleep } from './utils/utils'
import React, { StrictMode } from 'react'
import { useOnChange } from '../src/utils/hooks'

test('useDynamicForm', async () => {
  const childRerenders: Record<string, string[]> = {}

  const Child = ({
    fieldId,
    formStore,
    handleChange,
  }: {
    fieldId: string
    formStore: DynamicFormStore<string>
    handleChange: (value: string) => void
  }) => {
    const { field } = formStore.useSelector((state) => ({
      field: state.fields[fieldId],
    }))

    if (!field) return null

    if (!childRerenders[fieldId]) {
      childRerenders[fieldId] = []
    }

    childRerenders[fieldId]!.push(field.value)

    return (
      <input
        value={field.value}
        aria-label={fieldId}
        onChange={(e) => {
          handleChange(e.target.value)
        }}
      />
    )
  }

  function getInitialConfig(fields: string[]): DynamicFormConfig<string> {
    return mapArrayToObject(fields, (field) => [
      field,
      {
        initialValue: '',
      },
    ])
  }

  const parentRenders = createRenderStore()

  const Parent = ({ fieldsId }: { fieldsId: string[] }) => {
    const { formStore, handleChange, updateConfig } = useDynamicForm({
      getInitialConfig: () => getInitialConfig(fieldsId),
    })

    useOnChange(fieldsId, () => {
      updateConfig({
        fields: getInitialConfig(fieldsId),
        fieldsUpdateMode: 'overwriteAll',
      })
    })

    const formFieldsId = formStore.useSelector((state) =>
      Object.keys(state.fields),
    )

    parentRenders.add({ formFieldsId })

    return (
      <div>
        {formFieldsId.map((fieldId) => (
          <Child
            key={fieldId}
            fieldId={fieldId}
            formStore={formStore}
            handleChange={(value) => handleChange(fieldId, value)}
          />
        ))}
      </div>
    )
  }

  const { rerender, getByLabelText } = render(
    <StrictMode>
      <Parent fieldsId={['a', 'b']} />
    </StrictMode>,
  )

  fireEvent.change(getByLabelText('a'), {
    target: { value: 'a' },
  })

  await sleep(50)

  expect(childRerenders).toMatchInlineSnapshot(`
    {
      "a": [
        "",
        "",
        "a",
        "a",
      ],
      "b": [
        "",
        "",
      ],
    }
  `)

  await sleep(50)

  rerender(
    <StrictMode>
      <Parent fieldsId={['c']} />
    </StrictMode>,
  )

  await sleep(50)

  expect(childRerenders).toMatchInlineSnapshot(`
    {
      "a": [
        "",
        "",
        "a",
        "a",
        "a",
        "a",
      ],
      "b": [
        "",
        "",
        "",
        "",
      ],
      "c": [
        "",
        "",
      ],
    }
  `)

  expect(parentRenders.snapshotFromLast).toMatchInlineSnapshot(`
    "
    formFieldsId: [a, b]
    formFieldsId: [a, b]
    formFieldsId: [a, b]
    formFieldsId: [a, b]
    formFieldsId: [c]
    formFieldsId: [c]
    "
  `)
})
