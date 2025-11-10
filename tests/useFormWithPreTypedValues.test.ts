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

test('resetFieldsOnChange works with useFormWithPreTypedValues', () => {
  const { result } = renderHook(() => {
    type FormValues = {
      country: string | null
      state: string | null
      city: string | null
    }

    const { useFormState, handleChange } =
      useFormWithPreTypedValues<FormValues>({
        initialConfig: {
          country: {
            initialValue: null,
            resetFieldsOnChange: {
              state: null,
              city: null,
            },
          },
          state: { initialValue: null },
          city: { initialValue: null },
        },
      })

    const { formFields } = useFormState()

    return {
      formFields,
      handleChange,
    }
  })

  // Set values
  act(() => {
    result.current.handleChange('country', 'USA')
  })

  act(() => {
    result.current.handleChange('state', 'California')
  })

  act(() => {
    result.current.handleChange('city', 'Los Angeles')
  })

  expect({
    country: result.current.formFields.country.value,
    state: result.current.formFields.state.value,
    city: result.current.formFields.city.value,
    stateTouched: result.current.formFields.state.isTouched,
    cityTouched: result.current.formFields.city.isTouched,
  }).toMatchInlineSnapshot(`
    {
      "city": "Los Angeles",
      "cityTouched": true,
      "country": "USA",
      "state": "California",
      "stateTouched": true,
    }
  `)

  // Change country - should reset state and city
  act(() => {
    result.current.handleChange('country', 'Canada')
  })

  expect({
    country: result.current.formFields.country.value,
    state: result.current.formFields.state.value,
    city: result.current.formFields.city.value,
    stateTouched: result.current.formFields.state.isTouched,
    cityTouched: result.current.formFields.city.isTouched,
  }).toMatchInlineSnapshot(`
    {
      "city": null,
      "cityTouched": false,
      "country": "Canada",
      "state": null,
      "stateTouched": false,
    }
  `)
})

test('resetItselfOnChange works with useFormWithPreTypedValues', () => {
  const { result } = renderHook(() => {
    type FormValues = {
      firstName: string
      lastName: string
      fullName: string
    }

    const { useFormState, handleChange } =
      useFormWithPreTypedValues<FormValues>({
        initialConfig: {
          firstName: { initialValue: '' },
          lastName: { initialValue: '' },
          fullName: {
            initialValue: '',
            resetItselfOnChange: {
              value: '',
              watchFields: ['firstName', 'lastName'],
            },
          },
        },
      })

    const { formFields } = useFormState()

    return {
      formFields,
      handleChange,
    }
  })

  // Set fullName manually
  act(() => {
    result.current.handleChange('fullName', 'John Doe')
  })

  expect({
    fullName: result.current.formFields.fullName.value,
    fullNameTouched: result.current.formFields.fullName.isTouched,
  }).toMatchInlineSnapshot(`
    {
      "fullName": "John Doe",
      "fullNameTouched": true,
    }
  `)

  // Change firstName - should reset fullName
  act(() => {
    result.current.handleChange('firstName', 'Jane')
  })

  expect({
    firstName: result.current.formFields.firstName.value,
    fullName: result.current.formFields.fullName.value,
    fullNameTouched: result.current.formFields.fullName.isTouched,
  }).toMatchInlineSnapshot(`
    {
      "firstName": "Jane",
      "fullName": "",
      "fullNameTouched": false,
    }
  `)
})
