const routes = [
  {
    path: '/',
    redirect: '/login',
  },

  {
    path: '/app',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/IndexPage.vue'),
        meta: { requiresAuth: true, requiresProfile: true },
      },
      {
        path: 'search',
        component: () => import('pages/SearchPage.vue'),
        meta: { requiresAuth: true, requiresProfile: true },
      },
      {
        path: 'plan',
        component: () => import('pages/PlanPage.vue'),
        meta: { requiresAuth: true, requiresProfile: true },
      },
      {
        path: 'favorites',
        component: () => import('pages/FavoritesPage.vue'),
        meta: { requiresAuth: true, requiresProfile: true },
      },
      {
        path: 'assistant',
        component: () => import('pages/AssistantPage.vue'),
        meta: { requiresAuth: true, requiresProfile: true },
      },
      {
        path: 'profile',
        component: () => import('pages/ProfilePage.vue'),
        meta: { requiresAuth: true, requiresProfile: true },
      },
    ],
  },

  {
    path: '/login',
    component: () => import('layouts/AuthLayout.vue'),
    children: [{ path: '', component: () => import('pages/LoginPage.vue') }],
  },

  {
    path: '/wizard',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/ProfileWizardPage.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
