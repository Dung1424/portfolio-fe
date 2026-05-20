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
    },

    hasRole(role) {
      const roles = Array.isArray(this.user?.roles) ? this.user.roles : []
      return roles.includes(role)
    },

    hasPermission(code) {
      const permissions = Array.isArray(this.user?.permissions) ? this.user.permissions : []
      return permissions.includes(code)
    },

    hasAnyPermission(codes) {
      return codes.some(code => this.hasPermission(code))
    },

    permissionTitle(code) {
      return this.hasPermission(code) ? '' : 'Không có quyền'
    },

    defaultPath() {
      const candidates = [
        ['VIEW_DASHBOARD', '/admin'],
        ['VIEW_LIST_PHOTO', '/admin/photos'],
        ['VIEW_PENDING_PHOTO', '/admin/photos/pending'],
        ['VIEW_CATEGORY', '/admin/categories'],
        ['VIEW_QUEST', '/admin/quests'],
        ['MANAGE_STORE_ITEM', '/admin/store'],
        ['VIEW_REDEMPTION', '/admin/redemptions'],
        ['VIEW_PHOTO_REPORT', '/admin/reports/photos'],
        ['VIEW_ACTIVE_USER', '/admin/users'],
        ['MANAGE_STAFF_ACCOUNT', '/admin/staff'],
        ['VIEW_CONTACT', '/admin/contacts'],
        ['VIEW_BLOG', '/admin/blogs'],
        ['VIEW_ADMIN_PROFILE', '/admin/account/profile']
      ]
      return candidates.find(([code]) => this.hasPermission(code))?.[1] || '/admin/account/profile'
    }
  }
})
