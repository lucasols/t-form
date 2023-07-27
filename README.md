# T-State Form

A form library based on [t-state](../t-state/README.md) for creating controlled forms.

# Installation

```bash
pnpm install t-state-form
```

# Basic usage

Using the `useForm` hook, you can create a strong typed form.

```tsx
import { useForm } from 't-state-form'

const LoginComponet = () => {
  const { useFormState, handleChange, forceValidation } = useForm({
    initialConfig: {
      email: {
        initialValue: '', // types will be inferred! :D
        required: true,
      },
      password: {
        initialValue: null as string | null, // use type casting to have more control over the types
        required: true,
      },
    },
    // add custom validation for each field
    fieldIsValid: {
      email: ({ value }) => (value.includes('@') ? true : 'Invalid email'),
      password: [
        ({ value }) =>
          value.length >= 6 ? true : 'Password must be at least 6 characters',
        ({ value }) =>
          value.length <= 20 ? true : 'Password must be at most 20 characters',
      ],
    },
  })

  const { formFields, formIsValid } = useFormState()

  function login() {
    if (!formIsValid) {
      forceValidation() // force showing validation errors
      return
    }

    // perform login
  }

  return (
    <div>
      <input
        type="text"
        value={formFields.email.value}
        onChange={(e) => handleChange('email', e.target.value)}
      />
      {formFields.password.errors && (
        <InputErrors>{formFields.email.errors}</InputErrors>
      )}

      <input
        type="number"
        value={formFields.password.value}
        onChange={(e) => handleChange('password', e.target.value)}
      />
      {formFields.password.errors && (
        <InputErrors>{formFields.password.errors}</InputErrors>
      )}

      <button type="button" onClick={() => login()} disabled={!formIsValid}>
        Login
      </button>
    </div>
  )
}
```
