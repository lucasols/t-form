import { typingTest } from '@ls-stack/utils/typingTestUtils'
import { useForm, useFormState } from '../src/main'
import { asType } from '../src/utils/typing'

const { test, expectTypesAre } = typingTest

test('inference of initial config works correctly', () => {
  type File = {
    uuid: string
    name: string
    mimeType: string
    size: number
    createdAt: string
    createdBy: string
  }

  const MB_IN_BYTES = 1024 * 1024

  type Agent = {
    name: string
    description: string | null
    active: boolean
    attachments: File[]
  }
  const agentToEdit = asType<Agent | undefined>({
    name: 'John Doe',
    description: 'John Doe',
    active: true,
    attachments: [],
  })

  const formConfig = {
    name: { initialValue: agentToEdit?.name ?? null, required: true },
    attachments: {
      initialValue: agentToEdit?.attachments ?? [],
      required: true,
    },
  }

  const { formTypedCtx } = useForm({
    initialConfig: formConfig,
    fieldIsValid: {
      attachments: ({ value }) => {
        const combinedSize = value.reduce((acc, file) => acc + file.size, 0)

        if (combinedSize > MB_IN_BYTES * 20) {
          return `The total size of the files cannot exceed 20MB`
        }

        return true
      },
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { formFields } = useFormState(formTypedCtx, {
    mustBeDiffFromInitial: true,
  })

  expectTypesAre<typeof formFields.name.value, string | null>('equal')
  expectTypesAre<typeof formFields.attachments.value, File[]>('equal')
})
