import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'stores/auth-store'
import { useProfileStore } from 'stores/profile-store'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function ({ store /*, ssrContext */ }) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach(async (to) => {
    const auth = useAuthStore(store)
    const profile = useProfileStore(store)

    const requiresAuth = to.matched.some((r) => r.meta?.requiresAuth)
    const isLoginRoute = to.path === '/login'

    // 1. En login esperar la sesión para no mostrar el formulario si ya hay cookie
    if (isLoginRoute && !auth.checked) {
      await auth.checkSession().catch(() => {})
    }

    // 2. Si NO requiere auth (ej: páginas públicas), no bloquear
    if (!requiresAuth && !isLoginRoute && !auth.checked) {
      auth.checkSession().catch(() => {})
    }

    // 3. Si requiere auth, verificar autenticacion antes de continuar
    if (requiresAuth && !auth.checked) {
      await auth.checkSession().catch(() => {})
    }

    // 4. Si va a login
    if (isLoginRoute) {
      // Mantener siempre visible la pantalla de login como punto de entrada.
      return true
    }

    // 4. Si la ruta requiere auth y no esta autenticado
    if (to.matched.some((r) => r.meta?.requiresAuth) && !auth.isAuthenticated) {
      return { path: '/login' }
    }

    // 5. Verificar perfil si esta autenticado y la ruta lo requiere
    if (auth.isAuthenticated && to.matched.some((r) => r.meta?.requiresProfile)) {
      if (!profile.status) {
        try {
          await profile.fetchStatus()
        } catch {
          // Ignorar error, status quedara null
        }
      }

      // Si no ha completado wizard, redirigir
      if (profile.needsWizard && to.path !== '/wizard') {
        return { path: '/wizard' }
      }
    }

    // 6. Si ya completo wizard y va a /wizard, redirigir a home
    if (to.path === '/wizard' && !profile.needsWizard) {
      return { path: '/app' }
    }

    return true
  })

  return Router
})
