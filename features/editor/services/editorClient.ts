import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { navigateTo } from '#app'
import { getEditorPaths } from '~/services/getUrlList.js'
import { enrichAxiosError, installApiEnvelopeInterceptors } from '~/services/apiEnvelope.js'

export const EDITOR_TOKEN_KEY = 'editor_token'
export const EDITOR_USER_KEY = 'editor_user'

export function getEditorToken(): string | null {
  if (import.meta.server) {
    return null
  }
  return localStorage.getItem(EDITOR_TOKEN_KEY)
}

export function setEditorSession(token: string, user?: unknown) {
  localStorage.setItem(EDITOR_TOKEN_KEY, token)
  if (user !== undefined && user !== null) {
    localStorage.setItem(EDITOR_USER_KEY, JSON.stringify(user))
  }
}

export function clearEditorSession() {
  localStorage.removeItem(EDITOR_TOKEN_KEY)
  localStorage.removeItem(EDITOR_USER_KEY)
}

export function getEditorUserFromStorage(): unknown | null {
  if (import.meta.server) {
    return null
  }
  const raw = localStorage.getItem(EDITOR_USER_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

const p = getEditorPaths()

export const editorHttp = axios.create({
  baseURL: p.root
})

installApiEnvelopeInterceptors(editorHttp)

editorHttp.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getEditorToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

editorHttp.interceptors.response.use(
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
      clearEditorSession()
      const path = window.location.pathname || ''
      if (!path.startsWith('/editor/login')) {
        await navigateTo('/editor/login')
      }
    }
    return Promise.reject(error)
  }
)

export default editorHttp
