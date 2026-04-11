import { defineStore } from 'pinia'
import { navigateTo } from '#app'
import jwt_decode from 'jwt-decode'
import { authAdminApi } from '~/features/admin/auth/services/auth.api.js'
import {
  clearAdminSession,
  getAdminToken,
  getAdminUserFromStorage,
  setAdminSession
} from '~/features/admin/services/adminClient'

export const useAdminAuthStore = defineStore('adminAuth', {
  state: () => ({
    user: null,
    isLoggedIn: false
  }),
  actions: {
    hydrateFromStorage() {
      if (import.meta.server) {
        return
      }
      const token = getAdminToken()
      const stored = getAdminUserFromStorage()
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
      if (!token) {
        return
      }
      clearAdminSession()
    },

    async login(email, password) {
      const { data } = await authAdminApi.login({ email, password })
      const token = data.token
      const user = data.user
      setAdminSession(token, user)
      this.user = user
      this.isLoggedIn = true
      return data
    },

    async logout() {
      try {
        const token = getAdminToken()
        if (token) {
          await authAdminApi.logout()
        }
      } catch {
        /* still clear client */
      } finally {
        clearAdminSession()
        this.user = null
        this.isLoggedIn = false
        await navigateTo('/admin/login')
      }
    }
  }
})
