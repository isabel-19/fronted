import { defineStore, acceptHMRUpdate } from 'pinia'
import {
  api,
  clearStoredAccessToken,
  getAccessTokenFromUrl,
  getStoredAccessToken,
  previewToken,
  storeAccessToken,
} from 'boot/axios'
import { Browser } from '@capacitor/browser'
import { useProfileStore } from 'stores/profile-store'

const MOBILE_OAUTH_PENDING_KEY = 'vimel_mobile_oauth_pending'

function isNativeCapacitorRuntime() {
  if (typeof window === 'undefined') return false
  const capacitor = window.Capacitor
  if (!capacitor) return false
  if (typeof capacitor.isNativePlatform === 'function') {
    return capacitor.isNativePlatform()
  }
  const platform = typeof capacitor.getPlatform === 'function' ? capacitor.getPlatform() : ''
  return platform === 'ios' || platform === 'android'
}

function getLocalStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function markMobileOAuthPending() {
  getLocalStorage()?.setItem(MOBILE_OAUTH_PENDING_KEY, String(Date.now()))
}

export function clearMobileOAuthPending() {
  getLocalStorage()?.removeItem(MOBILE_OAUTH_PENDING_KEY)
}

export function hasPendingMobileOAuth() {
  const rawValue = getLocalStorage()?.getItem(MOBILE_OAUTH_PENDING_KEY) || ''
  const startedAt = Number(rawValue)
  if (!startedAt) return false
  return Date.now() - startedAt < 10 * 60 * 1000
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function ensureStoredToken() {
  const stored = getStoredAccessToken()
  if (stored) {
    return stored
  }

  const tokenFromUrl = getAccessTokenFromUrl()
  if (tokenFromUrl) {
    console.debug('[auth] token recuperado desde URL para hidratar sesion', previewToken(tokenFromUrl))
    storeAccessToken(tokenFromUrl)
    return tokenFromUrl
  }

  return ''
}

function resetAuthState(store) {
  clearStoredAccessToken()
  useProfileStore().reset()
  store.user = null
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    checked: false,
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
  },

  actions: {
    async checkSession() {
      const token = ensureStoredToken()
      console.debug('[auth] checkSession token previo a /auth/me', previewToken(token))

      if (!token) {
        resetAuthState(this)
        this.checked = true
        this.loading = false
        this.error = null
        return null
      }

      try {
        this.loading = true
        this.error = null
        const { data } = await api.get('/auth/me', { headers: authHeaders(token) })
        this.user = data
        if (!this.user) {
          useProfileStore().reset()
        }
        return this.user
      } catch (error) {
        resetAuthState(this)
        this.error = error.response?.data?.detail || 'Error al verificar sesion'
        return null
      } finally {
        this.checked = true
        this.loading = false
      }
    },

    async fetchMe() {
      const token = ensureStoredToken()
      console.debug('[auth] fetchMe token previo a /auth/me', previewToken(token))

      if (!token) {
        resetAuthState(this)
        this.checked = true
        this.loading = false
        this.error = null
        return null
      }

      try {
        this.loading = true
        this.error = null
        const { data } = await api.get('/auth/me', { headers: authHeaders(token) })
        this.user = data
        return data
      } catch (error) {
        resetAuthState(this)
        if (error.response?.status === 401) {
          console.debug('[auth] /auth/me devolvio 401 con token', previewToken(token))
        }
        if (error.response?.status !== 401) {
          this.error = error.response?.data?.detail || 'Error al obtener usuario'
        }
      } finally {
        this.checked = true
        this.loading = false
      }
    },

    async loginWithGoogle() {
      const hasWindow = typeof window !== 'undefined'
      const protocol = (hasWindow && window.location.protocol) || ''
      const host = (hasWindow && window.location.hostname) || ''
      const isMobileShell =
        protocol === 'capacitor:' ||
        protocol === 'ionic:' ||
        (hasWindow && isNativeCapacitorRuntime()) ||
        (/android/i.test((hasWindow && window.navigator.userAgent) || '') && host === 'localhost')

      let loginUrl = `${api.defaults.baseURL}/auth/google/login`
      if (isMobileShell) {
        loginUrl += '?mobile=1'
        markMobileOAuthPending()
        await Browser.open({ url: loginUrl })
        return
      }

      window.location.href = loginUrl
    },

    async registerWithPassword({ email, password, full_name }) {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.post('/auth/register', { email, password, full_name })
        const { token = '', ...user } = data || {}
        console.debug('[auth] token recibido despues de register', previewToken(token))
        storeAccessToken(token)
        this.user = user
        this.checked = true
        return user
      } catch (error) {
        this.error = error.response?.data?.detail || 'No se pudo registrar la cuenta'
        throw error
      } finally {
        this.loading = false
      }
    },

    async loginWithPassword({ email, password }) {
      this.loading = true
      this.error = null
      try {
        const { data } = await api.post('/auth/login', { email, password })
        const { token = '', ...user } = data || {}
        console.debug('[auth] token recibido despues de login', previewToken(token))
        storeAccessToken(token)
        this.user = user
        this.checked = true
        return user
      } catch (error) {
        this.error = error.response?.data?.detail || 'No se pudo iniciar sesion'
        throw error
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        await api.post('/auth/logout')
      } catch {
        // Ignorar errores de logout
      } finally {
        resetAuthState(this)
        this.checked = false
      }
    },

    reset() {
      resetAuthState(this)
      this.checked = false
      this.loading = false
      this.error = null
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
