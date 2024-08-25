import { act, renderHook } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { useFormWithPreTypedValues } from '../src/main'
import { pick } from '../src/utils/object'

describe('basic method works', () => {
  const { result } = renderHook(() => {
    type FormValues = {
      name: string
      age: number
      derivedRequired: boolean | null
      withCustomEmptyValue: string
      withCustomValidation: string
      withCustomDerivedValidation: string
    }

    const { useFormState, handleChange } =
      useFormWithPreTypedValues<FormValues>({
        initialConfig: {
          name: { initialValue: 'John' },
          age: { initialValue: 10 },
          derivedRequired: {
            initialValue: null,
            required: ({ fields }) => fields.age.value > 10,
          },
          withCustomEmptyValue: {
            initialValue: '',
            required: true,
            checkIfIsEmpty: (value) => value === 'empty',
          },
          withCustomValidation: {
            initialValue: '',
            isValid: ({ value }) => (value.length > 10 ? 'Too long' : true),
          },
          withCustomDerivedValidation: {
            initialValue: '20',
            isValid: ({ value, fields }) =>
              fields.age.value.toString() !== value
                ? `Value must be equal to ${fields.age.value}`
                : true,
          },
        },
      })

    useFormWithPreTypedValues<{
      wrongValue: string
    }>({
      // @ts-expect-error - should return an error
      initialConfig: {
        wrongValue: {
          initialValue: 8,
          required: true,
        },
      },
    })

    const { formFields, formIsValid } = useFormState()

    return {
      formFields,
      formIsValid,
      handleChange,
    }
  })

  function getFormFields() {
    return result.current.formFields
  }

  const handleChange: typeof result.current.handleChange = (...args: any[]) => {
    // @ts-expect-error - we are testing the type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return result.current.handleChange(...args)
  }

  test('initial value is ok', () => {
    expect({
      name: getFormFields().name.value,
      age: getFormFields().age.value,
    }).toMatchInlineSnapshot(`
      {
        "age": 10,
        "name": "John",
      }
    `)
  })

  test('derived required works', () => {
    expect(pick(getFormFields().derivedRequired, ['required', 'errors']))
      .toMatchInlineSnapshot(`
      {
        "errors": null,
        "required": false,
      }
    `)

    act(() => {
      handleChange('age', 20)
    })

    expect(getFormFields().age.value).toBe(20)
    expect(pick(getFormFields().derivedRequired, ['isValid', 'required']))
      .toMatchInlineSnapshot(`
      {
        "isValid": false,
        "required": true,
      }
    `)
  })

  test('checkIfIsEmpty works', () => {
    expect(
      pick(getFormFields().withCustomEmptyValue, [
        'value',
        'isEmpty',
        'isValid',
      ]),
    ).toMatchInlineSnapshot(`
      {
        "isEmpty": false,
        "isValid": true,
        "value": "",
      }
    `)

    act(() => {
      handleChange('withCustomEmptyValue', 'empty')
    })

    expect(
      pick(getFormFields().withCustomEmptyValue, [
        'value',
        'isEmpty',
        'isValid',
      ]),
    ).toMatchInlineSnapshot(`
      {
        "isEmpty": true,
        "isValid": false,
        "value": "empty",
      }
    `)
  })

  test('isValid works', () => {
    expect(pick(getFormFields().withCustomValidation, ['value', 'isValid']))
      .toMatchInlineSnapshot(`
      {
        "isValid": true,
        "value": "",
      }
    `)

    act(() => {
      handleChange('withCustomValidation', '12345678910')
    })

    expect(pick(getFormFields().withCustomValidation, ['value', 'isValid']))
      .toMatchInlineSnapshot(`
      {
        "isValid": false,
        "value": "12345678910",
      }
    `)
  })

  test('derived validation works', () => {
    expect(getFormFields().age.value).toBe(20)
    expect(
      pick(getFormFields().withCustomDerivedValidation, ['value', 'isValid']),
    ).toMatchInlineSnapshot(`
      {
        "isValid": true,
        "value": "20",
      }
    `)

    act(() => {
      handleChange('age', 10)
    })

    expect(
      pick(getFormFields().withCustomDerivedValidation, [
        'value',
        'isValid',
        'errors',
      ]),
    ).toMatchInlineSnapshot(`
      {
        "errors": [
          "Value must be equal to 10",
        ],
        "isValid": false,
        "value": "20",
      }
    `)

    act(() => {
      handleChange('withCustomDerivedValidation', '10')
    })

    expect(
      pick(getFormFields().withCustomDerivedValidation, ['value', 'isValid']),
    ).toMatchInlineSnapshot(`
      {
        "isValid": true,
        "value": "10",
      }
    `)
  })
})
