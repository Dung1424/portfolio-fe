import { notification } from 'ant-design-vue'
import { flattenErrorMessages, getErrorMessage } from '~/services/apiEnvelope.js'

/**
 * Show API errors (`{ success, message, errors }`) via `notification.error`, aligned with `notification.success`.
 * 401 is not handled here (admin `adminClient` redirects).
 */
export function useApiErrorMessage() {
  const showFromError = (err: unknown, fallback = 'Something went wrong.') => {
    const e = err as {
      apiMessage?: string
      apiErrors?: string[]
      response?: { status?: number, data?: Record<string, unknown> }
    }
    const status = e.response?.status
    const data = e.response?.data

    if (status === 403) {
      notification.error({
        message: 'Permission denied',
        description:
          typeof data?.error === 'string'
            ? data.error
            : 'You do not have permission for this action.'
      })
      return
    }
    if (status === 422) {
      const msg = typeof data?.message === 'string' ? data.message : e.apiMessage
      const errorsRaw = data?.errors ?? e.apiErrors
      const flat = flattenErrorMessages(errorsRaw as string[] | Record<string, string[]> | null)
      const fieldText = flat.length ? flat.join(' · ') : undefined

      if (msg) {
        notification.error({
          message: msg,
          description: fieldText
        })
        return
      }
      if (flat.length) {
        notification.error({
          message: flat[0] ?? 'Validation failed.',
          description: flat.length > 1 ? flat.slice(1).join(' · ') : undefined
        })
        return
      }
      if (typeof data?.error === 'string') {
        notification.error({ message: data.error })
        return
      }
      notification.error({ message: 'Validation failed.' })
      return
    }
    if (status === 500) {
      notification.error({
        message: 'Server error',
        description: 'Please try again later.'
      })
      return
    }
    notification.error({
      message: 'Error',
      description: getErrorMessage(e as Error & { response?: unknown, apiMessage?: string }, fallback)
    })
  }

  return { showFromError }
}
