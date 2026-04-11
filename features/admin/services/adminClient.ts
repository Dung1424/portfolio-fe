import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { navigateTo } from '#app'
import { getAdminPaths } from '~/services/getUrlList.js'
import { enrichAxiosError, installApiEnvelopeInterceptors } from '~/services/apiEnvelope.js'

export const ADMIN_TOKEN_KEY = 'admin_token'
export const ADMIN_USER_KEY = 'admin_user'

export function getAdminToken(): string | null {
  if (import.meta.server) {
    return null
  }
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminSession(token: string, user?: unknown) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
  if (user !== undefined && user !== null) {
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user))
  }
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  localStorage.removeItem(ADMIN_USER_KEY)
}

export function getAdminUserFromStorage(): unknown | null {
  if (import.meta.server) {
    return null
  }
  const raw = localStorage.getItem(ADMIN_USER_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

const p = getAdminPaths()

/** Axios instance for `/api/v1/admin/*` with Bearer `admin_token`. Base URL từ `getAdminPaths().root`. */
export const adminHttp = axios.create({
  baseURL: p.root
})

installApiEnvelopeInterceptors(adminHttp)

adminHttp.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAdminToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

adminHttp.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    enrichAxiosError(error)
    const status = error.response?.status
    const reqUrl = error.config?.url || ''
    const isLoginPost = /\/login/i.test(reqUrl) && String(error.config?.method || '').toLowerCase() === 'post'
    if (status === 401 && import.meta.client) {
      if (isLoginPost) {
        return Promise.reject(error)
      }
      clearAdminSession()
      const path = window.location.pathname || ''
      if (!path.startsWith('/admin/login')) {
        await navigateTo('/admin/login')
      }
    }
    return Promise.reject(error)
  }
)

export default adminHttp
