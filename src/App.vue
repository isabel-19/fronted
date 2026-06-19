<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useAuthStore } from 'stores/auth-store'
import { clearStoredAccessToken, getAccessTokenFromUrl, storeAccessToken, stripAccessTokenFromUrl } from 'boot/axios'

const router = useRouter()
const authStore = useAuthStore()

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
  if (!isMobileAuthUrl(url)) return

  const params = new URL(url).searchParams
  const redirect = params.get('redirect') || '/app'
  const token = params.get('token') || ''

  if (token) {
    storeAccessToken(token)
  }

  await authStore.fetchMe().catch(() => {})

  if (authStore.isAuthenticated) {
    await router.replace(redirect)
    return
  }

  clearStoredAccessToken()
  await router.replace('/login')
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
  if (launchUrl?.url) {
    await handleMobileAuth(launchUrl.url)
  }

  CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    void handleMobileAuth(url)
  })
})
</script>
