import { defineStore, acceptHMRUpdate } from 'pinia'
import { api, getAccessTokenFromUrl, getStoredAccessToken, previewToken, storeAccessToken } from 'boot/axios'

function requireAuthToken() {
  const storedToken = getStoredAccessToken()
  const token = storedToken || getAccessTokenFromUrl()

  if (!storedToken && token) {
    storeAccessToken(token)
  }

  console.debug('[auth] token recuperado en profile-store', previewToken(token))
  if (!token) {
    throw new Error('No hay token de autenticacion almacenado')
  }
  return token
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

export const useProfileStore = defineStore('profile', {
  state: () => ({
    profile: null,
    status: null, // { has_profile, wizard_completed }
    loading: false,
    error: null,
  }),

  getters: {
    hasProfile: (state) => state.status?.has_profile ?? false,
    wizardCompleted: (state) => state.status?.wizard_completed ?? false,
    needsWizard: (state) => {
      if (!state.status) return true

      // Si aun no existe perfil, siempre forzar wizard aunque no sea el primer login.
      if (state.status.has_profile === false) return true

      if (typeof state.status.should_show_wizard === 'boolean') {
        return state.status.should_show_wizard || !state.status.wizard_completed
      }

      return !state.status.wizard_completed
    },
  },

  actions: {
    async fetchStatus() {
      try {
        const token = requireAuthToken()
        this.loading = true
        this.error = null
        const { data } = await api.get('/profile/status', { headers: authHeaders(token) })
        this.status = data
        return data
      } catch (error) {
        this.error = error.response?.data?.detail || error.message || 'Error al verificar perfil'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchProfile() {
      try {
        const token = requireAuthToken()
        this.loading = true
        this.error = null
        const { data } = await api.get('/profile', { headers: authHeaders(token) })
        this.profile = data
        return data
      } catch (error) {
        if (error.response?.status !== 404) {
          this.error = error.response?.data?.detail || error.message || 'Error al cargar perfil'
        }
        throw error
      } finally {
        this.loading = false
      }
    },

    async createProfile(profileData) {
      try {
        const token = requireAuthToken()
        this.loading = true
        this.error = null
        const { data } = await api.post('/profile', profileData, { headers: authHeaders(token) })
        this.profile = data
        this.status = {
          has_profile: true,
          wizard_completed: true,
          first_login: false,
          login_count: this.status?.login_count ?? 1,
          should_show_wizard: false,
        }
        return data
      } catch (error) {
        this.error = error.response?.data?.detail || error.message || 'Error al crear perfil'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateProfile(profileData) {
      try {
        const token = requireAuthToken()
        this.loading = true
        this.error = null
        const { data } = await api.put('/profile', profileData, { headers: authHeaders(token) })
        this.profile = data
        return data
      } catch (error) {
        this.error = error.response?.data?.detail || error.message || 'Error al actualizar perfil'
        throw error
      } finally {
        this.loading = false
      }
    },

    clearError() {
      this.error = null
    },

    reset() {
      this.profile = null
      this.status = null
      this.loading = false
      this.error = null
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useProfileStore, import.meta.hot))
}
