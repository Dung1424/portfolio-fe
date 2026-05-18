import { defineStore } from 'pinia'
import { navigateTo } from '#app'
import jwt_decode from 'jwt-decode'
import { authEditorApi } from '~/features/editor/services/auth.api.js'
import {
  clearEditorSession,
  getEditorToken,
  getEditorUserFromStorage,
  setEditorSession
} from '~/features/editor/services/editorClient'

export const useEditorAuthStore = defineStore('editorAuth', {
  state: () => ({
    user: null,
    isLoggedIn: false
  }),
  actions: {
    hydrateFromStorage() {
      if (import.meta.server) {
        return
      }
      const token = getEditorToken()
      const stored = getEditorUserFromStorage()
      if (token && stored) {
        try {
          const decoded = jwt_decode(token)
          const exp = decoded.exp
          const now = Date.now() / 1000
          if (exp && exp > now) {
            this.user = stored
            this.isLoggedIn = true
            return
          }
        } catch {
          /* fall through */
        }
      }
      this.user = null
      this.isLoggedIn = false
      if (token) {
        clearEditorSession()
      }
    },

    async login(email, password) {
      const { data } = await authEditorApi.login({ email, password })
      setEditorSession(data.token, data.user)
      this.user = data.user
      this.isLoggedIn = true
      return data
    },

    async logout() {
      try {
        if (getEditorToken()) {
          await authEditorApi.logout()
        }
      } catch {
        /* still clear */
      } finally {
        clearEditorSession()
        this.user = null
        this.isLoggedIn = false
        await navigateTo('/editor/login')
      }
    }
  }
})
