/**
 * Chuẩn API Laravel: { success, message, data, errors }.
 * Dùng cho interceptor axios (unwrap success, gắn message/errors lên error).
 */

export function isApiEnvelope(body) {
  return (
    body !== null
    && typeof body === 'object'
    && !Array.isArray(body)
    && typeof body.success === 'boolean'
  )
}

/** errors: string[] | Record<string, string[]> | null */
export function flattenErrorMessages(errors) {
  if (errors == null) {
    return []
  }
  if (Array.isArray(errors)) {
    return errors.filter(e => typeof e === 'string')
  }
  if (typeof errors === 'object') {
    return Object.values(errors).flat().filter(e => typeof e === 'string')
  }
  return []
}

/**
 * Gắn apiMessage / apiErrors (string[]) lên axios error.
 */
export function enrichAxiosError(error) {
  const res = error.response
  if (!res || res.data == null) {
    return error
  }
  const body = res.data
  if (!isApiEnvelope(body)) {
    return error
  }
  error.apiMessage = typeof body.message === 'string' ? body.message : null
  error.apiErrors = flattenErrorMessages(body.errors)
  return error
}

function shouldSkipEnvelopeTransform(response) {
  const cfg = response.config || {}
  if (cfg.responseType === 'blob' || cfg.responseType === 'arraybuffer') {
    return true
  }
  const d = response.data
  if (d instanceof Blob) {
    return true
  }
  return false
}

function transformSuccessResponse(response) {
  if (shouldSkipEnvelopeTransform(response)) {
    return response
  }
  const body = response.data
  if (!isApiEnvelope(body) || body.success !== true) {
    return response
  }
  response.apiMessage = typeof body.message === 'string' ? body.message : undefined
  response.data = body.data
  return response
}

/** HTTP 2xx nhưng success: false → reject để vào catch như lỗi thường */
function rejectIfEnvelopeFailure(response) {
  if (shouldSkipEnvelopeTransform(response)) {
    return null
  }
  const body = response.data
  if (!isApiEnvelope(body) || body.success !== false) {
    return null
  }
  const err = new Error(typeof body.message === 'string' ? body.message : 'Request failed')
  err.response = response
  err.config = response.config
  err.request = response.request
  err.isAxiosError = true
  enrichAxiosError(err)
  return err
}

/** Thông báo lỗi hiển thị cho user (sau enrich hoặc body thô). */
export function getErrorMessage(error, fallback = 'Something went wrong.') {
  if (error?.apiMessage) {
    return error.apiMessage
  }
  const d = error?.response?.data
  if (d && typeof d.message === 'string' && d.message) {
    return d.message
  }
  if (typeof d?.error === 'string' && d.error) {
    return d.error
  }
  return fallback
}

export function installApiEnvelopeInterceptors(axiosInstance) {
  axiosInstance.interceptors.response.use(
    (response) => {
      const fail = rejectIfEnvelopeFailure(response)
      if (fail) {
        return Promise.reject(fail)
      }
      return transformSuccessResponse(response)
    },
    (error) => {
      enrichAxiosError(error)
      return Promise.reject(error)
    }
  )
}
