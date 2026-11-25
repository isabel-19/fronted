<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { clearMobileOAuthPending, hasPendingMobileOAuth, useAuthStore } from 'stores/auth-store'
import { clearStoredAccessToken, getAccessTokenFromUrl, storeAccessToken, stripAccessTokenFromUrl } from 'boot/axios'

const router = useRouter()
const authStore = useAuthStore()
let lastHandledMobileAuthUrl = ''

function mobileAuthDebug(message, payload) {
  if (payload === undefined) {
    console.debug(`[mobile-auth] ${message}`)
    return
  }
  console.debug(`[mobile-auth] ${message}`, payload)
}

function isMobileAuthUrl(url) {
  if (!url) return false

  try {
    const parsed = new URL(url)
    return parsed.protocol === 'com.recetas.saludables:' && parsed.hostname === 'auth' && parsed.pathname === '/callback'
  } catch {
    return false
  }
}

async function handleMobileAuth(url) {
  mobileAuthDebug('handleMobileAuth recibido', { url, pending: hasPendingMobileOAuth() })
  if (!isMobileAuthUrl(url)) {
    mobileAuthDebug('ignorado porque no coincide con el esquema esperado', url)
    return
  }
  if (!hasPendingMobileOAuth()) {
    mobileAuthDebug('ignorado porque no hay OAuth pendiente')
    return
  }
  if (url === lastHandledMobileAuthUrl) {
    mobileAuthDebug('ignorado porque ya se proceso esta URL')
    return
  }

  lastHandledMobileAuthUrl = url

  try {
    await Browser.close()
  } catch {
    // Ignorar si el navegador del sistema ya estaba cerrado.
  }

  const params = new URL(url).searchParams
  const redirect = params.get('redirect') || '/app'
  const token = params.get('token') || ''
  const oauthError = params.get('error') || ''
  mobileAuthDebug('callback parseado', {
    redirect,
    hasToken: !!token,
    oauthError,
  })

  if (!token) {
    clearMobileOAuthPending()
    if (oauthError) {
      mobileAuthDebug('callback sin token y con error, volver a login', oauthError)
      clearStoredAccessToken()
      await router.replace('/login')
    }
    if (!oauthError) {
      mobileAuthDebug('callback sin token ni error; esperando nueva senal o cierre manual')
    }
    return
  }

  storeAccessToken(token)
  mobileAuthDebug('token almacenado, consultando /auth/me')

  await authStore.fetchMe().catch(() => {})
  clearMobileOAuthPending()
  mobileAuthDebug('resultado despues de /auth/me', {
    isAuthenticated: authStore.isAuthenticated,
    redirect,
  })

  if (authStore.isAuthenticated) {
    await router.replace(redirect)
    return
  }

  await router.replace(redirect)
}

async function handleWebAuthFromUrl() {
  const token = getAccessTokenFromUrl()
  if (!token) return

  const currentUrl = new URL(window.location.href)
  const redirect = currentUrl.searchParams.get('redirect') || '/app'

  storeAccessToken(token)
  await authStore.fetchMe().catch(() => {})

  stripAccessTokenFromUrl()

  if (!authStore.isAuthenticated) {
    clearStoredAccessToken()
    await router.replace('/login')
    return
  }

  await router.replace(redirect)
}

onMounted(async () => {
  await handleWebAuthFromUrl()

  if (!Capacitor.isNativePlatform()) {
    stripAccessTokenFromUrl()
    return
  }

  const launchUrl = await CapacitorApp.getLaunchUrl()
  mobileAuthDebug('launchUrl al iniciar', launchUrl?.url || '(sin launchUrl)')
  if (launchUrl?.url) {
    await handleMobileAuth(launchUrl.url)
  }

  Browser.addListener('browserFinished', () => {
    mobileAuthDebug('browserFinished recibido')
  })

  CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    mobileAuthDebug('appUrlOpen recibido', url)
    void handleMobileAuth(url)
  })
})
</script>
