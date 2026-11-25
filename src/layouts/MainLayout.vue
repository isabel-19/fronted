<template>
  <q-layout view="lHh Lpr lFf" class="green-layout">
    <q-header elevated class="header-blur text-white">
      <q-toolbar class="q-px-md q-py-sm" inset>
        <div class="row items-center no-wrap brand-row">
          <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" color="white" />
          <span class="header-brand font-fraunces">Vimel</span>
        </div>

        <q-space />

        <div class="row items-center q-gutter-sm actions">
          <q-btn flat round dense color="white" icon="notifications_none" class="rel notification-pill" @click="loadReminderSettings">
            <q-badge v-if="notifications > 0" color="negative" floating rounded :label="notifications" />
            <q-menu anchor="bottom right" self="top right" class="notification-menu">
              <q-card class="notification-menu-card">
                <q-card-section>
                  <div class="text-subtitle2 text-weight-bold">Recordatorios por correo</div>
                  <div class="text-caption text-grey-7">Te avisamos si olvidas registrar tus alimentos.</div>
                </q-card-section>
                <q-separator />
                <q-card-section>
                  <q-toggle v-model="reminderSettings.enabled" label="Activar recordatorios" color="positive" />
                  <q-input
                    v-model.number="reminderSettings.hours_without_log"
                    outlined
                    dense
                    type="number"
                    min="6"
                    max="168"
                    label="Horas sin registro para avisar"
                    class="q-mt-sm"
                  />
                  <q-input
                    v-model="reminderSettings.email"
                    outlined
                    dense
                    type="email"
                    label="Correo destino"
                    class="q-mt-sm"
                  />
                  <div class="text-caption q-mt-xs" :class="reminderSettings.can_send_email ? 'text-positive' : 'text-warning'">
                    {{ reminderSettings.can_send_email ? 'SMTP listo para enviar correos' : 'Falta configurar SMTP en backend' }}
                  </div>

                  <div class="row q-col-gutter-sm q-mt-md">
                    <div class="col-6">
                      <q-btn
                        unelevated
                        color="primary"
                        class="full-width"
                        icon="save"
                        label="Guardar"
                        :loading="reminderLoading"
                        @click="saveReminderSettings"
                      />
                    </div>
                    <div class="col-6">
                      <q-btn
                        outline
                        color="secondary"
                        class="full-width"
                        icon="mail"
                        label="Probar"
                        :loading="reminderLoading"
                        @click="checkReminder(true)"
                      />
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </q-menu>
          </q-btn>

          <q-btn flat round dense color="white" class="avatar-pill">
            <q-avatar size="34px" class="header-avatar">
              <img v-if="headerAvatar" :src="headerAvatar" alt="avatar" />
              <q-icon v-else name="person" color="white" />
            </q-avatar>
            <q-menu anchor="bottom right" self="top right" class="profile-menu">
              <q-card class="profile-menu-card">
                <q-card-section class="profile-menu-head">
                  <q-avatar size="50px" class="menu-avatar">
                    <img v-if="headerAvatar" :src="headerAvatar" alt="avatar" />
                    <q-icon v-else name="person" color="white" />
                  </q-avatar>
                  <div>
                    <div class="text-weight-bold">{{ displayName }}</div>
                    <div class="text-caption text-grey-7">{{ auth.user?.email || 'sin correo' }}</div>
                  </div>
                </q-card-section>
                <q-separator />
                <q-list dense>
                  <q-item clickable v-close-popup @click="openProfilePanel">
                    <q-item-section avatar>
                      <q-icon name="tune" color="primary" />
                    </q-item-section>
                    <q-item-section>Editar perfil</q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="handleLogout">
                    <q-item-section avatar>
                      <q-icon name="logout" />
                    </q-item-section>
                    <q-item-section>Cerrar sesión</q-item-section>
                  </q-item>
                </q-list>
              </q-card>
            </q-menu>
          </q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <q-dialog
      v-model="profileDialogOpen"
      :maximized="$q.screen.lt.md"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="profile-dialog">
        <q-bar class="profile-dialog-bar">
          <div class="text-weight-bold">Perfil</div>
          <q-space />
          <q-btn flat dense icon="close" v-close-popup />
        </q-bar>

        <q-card-section class="profile-dialog-body">
          <div class="profile-cover q-pa-md">
            <div class="profile-cover-left">
              <q-avatar size="84px" class="profile-avatar-xl">
                <img v-if="headerAvatar" :src="headerAvatar" alt="avatar" />
                <q-icon v-else name="person" color="white" size="42px" />
              </q-avatar>
              <div>
                <div class="text-subtitle1 text-weight-bold">{{ displayName }}</div>
                <div class="text-caption text-grey-7">{{ auth.user?.email || 'sin correo' }}</div>
              </div>
            </div>

            <div class="profile-cover-actions">
              <q-btn unelevated color="primary" icon="photo_camera" label="Subir foto" @click="triggerAvatarPicker" />
              <q-btn flat color="grey-7" icon="delete_outline" label="Quitar" @click="removeCustomAvatar" />
              <input ref="avatarInputRef" type="file" accept="image/*" class="avatar-input-hidden" @change="onAvatarPicked" />
            </div>
          </div>

          <q-form class="profile-form q-mt-md" @submit.prevent="saveHeaderProfile">
            <div class="profile-grid">
              <q-input v-model="profileForm.goal" outlined dense label="Meta principal" class="profile-field" />
              <q-select
                v-model="profileForm.activity_level"
                outlined
                dense
                emit-value
                map-options
                :options="activityOptions"
                label="Nivel de actividad"
                class="profile-field"
              />
              <q-select
                v-model="profileForm.health_goal"
                outlined
                dense
                emit-value
                map-options
                :options="goalOptions"
                label="Objetivo de salud"
                class="profile-field"
              />
              <q-input v-model="profileForm.motto" outlined dense label="Frase motivacional" class="profile-field" />
            </div>

            <q-input
              v-model="profileForm.goal_message"
              outlined
              autogrow
              label="Mensaje de objetivo"
              class="profile-field q-mt-sm"
            />

            <div class="row q-col-gutter-sm q-mt-md">
              <div class="col-12 col-sm-6">
                <q-input v-model="profileForm.birth_date" outlined dense type="date" label="Fecha de nacimiento" class="profile-field" />
              </div>
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="profileForm.sex"
                  outlined
                  dense
                  emit-value
                  map-options
                  :options="sexOptions"
                  label="Sexo"
                  class="profile-field"
                />
              </div>
            </div>

            <div class="row q-col-gutter-sm q-mt-xs">
              <div class="col-12 col-sm-6">
                <q-input v-model.number="profileForm.height_cm" outlined dense type="number" label="Altura (cm)" class="profile-field" />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model.number="profileForm.weight_kg" outlined dense type="number" label="Peso (kg)" class="profile-field" />
              </div>
            </div>

            <div class="row q-col-gutter-sm q-mt-xs">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="profileForm.target_weight_kg"
                  outlined
                  dense
                  type="number"
                  step="0.1"
                  label="Peso meta (kg)"
                  class="profile-field"
                />
              </div>
              <div class="col-12 col-sm-6">
                <q-input v-model="profileForm.target_date" outlined dense type="date" label="Fecha objetivo" class="profile-field" />
              </div>
            </div>

            <q-card v-if="goalProgress" flat bordered class="profile-goal-card q-mt-md">
              <q-card-section>
                <div class="profile-goal-card__head">
                  <div>
                    <div class="text-caption text-grey-6">Estado de tu objetivo</div>
                    <div class="text-subtitle1 text-weight-bold">{{ goalProgress.label }}</div>
                  </div>
                  <q-chip :color="goalStatusColor" text-color="white" dense>
                    {{ goalStatusText }}
                  </q-chip>
                </div>

                <q-linear-progress
                  class="q-mt-sm"
                  rounded
                  size="10px"
                  :value="goalProgressValue"
                  :color="goalStatusColor"
                  track-color="grey-3"
                />

                <div class="profile-goal-card__stats q-mt-md">
                  <div>
                    <span>Inicio</span>
                    <strong>{{ formatWeight(goalProgress.initial_weight_kg) }}</strong>
                  </div>
                  <div>
                    <span>Actual</span>
                    <strong>{{ formatWeight(goalProgress.current_weight_kg) }}</strong>
                  </div>
                  <div>
                    <span>Meta</span>
                    <strong>{{ formatWeight(goalProgress.target_weight_kg) }}</strong>
                  </div>
                </div>

                <div class="text-body2 q-mt-sm">{{ goalProgress.message }}</div>
              </q-card-section>
            </q-card>

            <div class="profile-actions q-mt-lg">
              <q-btn flat color="grey-7" label="Cancelar" v-close-popup />
              <q-btn flat color="primary" label="Ver perfil completo" to="/app/profile" v-close-popup />
              <q-btn unelevated color="primary" icon="save" label="Guardar cambios" :loading="profileStore.loading" type="submit" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :mini="miniState"
      :width="240"
      :mini-width="72"
      class="green-drawer"
    >
      <q-scroll-area class="fit">
        <q-list padding>
          <q-item class="drawer-brand q-gutter-sm" clickable @click="miniState = !miniState">
            <div class="brand-stack">
              <q-avatar size="40px" class="drawer-logo">
                <img src="/icons/vimel-logo.png" alt="Vimel" />
              </q-avatar>
              <div v-if="!miniState" class="brand-text">
                <div class="drawer-title">Vimel</div>
                <div class="text-caption text-forest">Bienestar al instante</div>
              </div>
            </div>
            <q-tooltip v-if="miniState" anchor="center right" self="center left">Vimel</q-tooltip>
          </q-item>

          <q-separator spaced />

          <q-item
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            clickable
            v-ripple
            active-class="drawer-active"
            exact
          >
            <q-item-section avatar>
              <q-icon :name="link.icon" />
            </q-item-section>
            <q-item-section>{{ link.label }}</q-item-section>
            <q-tooltip v-if="miniState" anchor="center right" self="center left">{{ link.label }}</q-tooltip>
          </q-item>

          <q-separator spaced />

          <q-item clickable v-ripple @click="handleLogout">
            <q-item-section avatar>
              <q-icon name="logout" />
            </q-item-section>
            <q-item-section>Cerrar sesión</q-item-section>
            <q-tooltip v-if="miniState" anchor="center right" self="center left">Cerrar sesión</q-tooltip>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from 'boot/axios'
import { useAuthStore } from 'src/stores/auth-store'
import { useProfileStore } from 'src/stores/profile-store'

const router = useRouter()
const $q = useQuasar()
const auth = useAuthStore()
const profileStore = useProfileStore()

// En escritorio el drawer se muestra siempre (show-if-above); en móvil arranca
// cerrado para no tapar el contenido al entrar.
const leftDrawerOpen = ref(false)
const miniState = ref(false)
const notifications = ref(0)
const profileDialogOpen = ref(false)
const avatarInputRef = ref(null)
const customAvatar = ref('')
const reminderLoading = ref(false)
const reminderSettings = ref({
  enabled: false,
  hours_without_log: 24,
  email: '',
  can_send_email: false,
})

const profileForm = ref({
  birth_date: '',
  sex: null,
  height_cm: null,
  weight_kg: null,
  target_weight_kg: null,
  target_date: '',
  activity_level: null,
  health_goal: null,
  goal: '',
  goal_message: '',
  motto: '',
})

const sexOptions = [
  { label: 'Masculino', value: 'masculino' },
  { label: 'Femenino', value: 'femenino' },
  { label: 'Otro', value: 'otro' },
  { label: 'Prefiero no decir', value: 'prefiero_no_decir' },
]

const activityOptions = [
  { label: 'Sedentario', value: 'sedentario' },
  { label: 'Moderado', value: 'moderado' },
  { label: 'Activo', value: 'activo' },
]

const goalOptions = [
  { label: 'Bajar de peso', value: 'bajar_peso' },
  { label: 'Ganar masa muscular', value: 'ganar_musculo' },
  { label: 'Mantener peso', value: 'mantener' },
  { label: 'Mejorar alimentacion', value: 'mejorar_alimentacion' },
  { label: 'Otro', value: 'otro' },
]

const displayName = computed(() => auth.user?.name || 'Mi perfil')
const headerAvatar = computed(() => customAvatar.value || auth.user?.picture || '')
const goalProgress = computed(() => profileStore.profile?.goal_progress || null)
const goalProgressValue = computed(() => Math.max(0, Math.min(Number(goalProgress.value?.progress_pct || 0), 1)))
const goalStatusText = computed(() => {
  const status = goalProgress.value?.status
  if (status === 'achieved') return 'Cumplido'
  if (status === 'needs_more_data') return 'Sin datos'
  if (status === 'not_configured') return 'Configurar'
  return 'En progreso'
})
const goalStatusColor = computed(() => {
  const status = goalProgress.value?.status
  if (status === 'achieved') return 'positive'
  if (status === 'needs_more_data') return 'orange'
  if (status === 'not_configured') return 'grey-7'
  return 'primary'
})

const links = [
  { to: '/app', label: 'Inicio', icon: 'dashboard' },
  { to: '/app/assistant', label: 'Asistente', icon: 'forum' },
  { to: '/app/search', label: 'Buscar', icon: 'search' },
  { to: '/app/plan', label: 'Plan', icon: 'event_note' },
  { to: '/app/favorites', label: 'Favoritos', icon: 'favorite_border' },
  { to: '/app/profile', label: 'Perfil', icon: 'person_outline' },
]

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

async function loadReminderSettings() {
  try {
    const { data } = await api.get('/notifications/reminder-settings')
    reminderSettings.value = {
      enabled: Boolean(data?.enabled),
      hours_without_log: Number(data?.hours_without_log || 24),
      email: data?.email || auth.user?.email || '',
      can_send_email: Boolean(data?.can_send_email),
    }
  } catch {
    // keep local defaults
  }
}

async function saveReminderSettings() {
  reminderLoading.value = true
  try {
    const { data } = await api.put('/notifications/reminder-settings', {
      enabled: Boolean(reminderSettings.value.enabled),
      hours_without_log: Number(reminderSettings.value.hours_without_log || 24),
      email_override: reminderSettings.value.email || null,
    })
    reminderSettings.value = {
      enabled: Boolean(data?.enabled),
      hours_without_log: Number(data?.hours_without_log || 24),
      email: data?.email || auth.user?.email || '',
      can_send_email: Boolean(data?.can_send_email),
    }
    notifications.value = reminderSettings.value.enabled ? 1 : 0
    $q.notify({ type: 'positive', message: 'Recordatorios actualizados.' })
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo guardar la configuracion de recordatorios.' })
  } finally {
    reminderLoading.value = false
  }
}

async function checkReminder(forceSend = false) {
  reminderLoading.value = true
  try {
    const { data } = await api.post('/notifications/check-reminder', null, {
      params: { force_send: forceSend ? 'true' : 'false' },
    })
    notifications.value = data?.should_remind ? 1 : 0
    if (data?.email_sent) {
      $q.notify({ type: 'positive', message: 'Correo de recordatorio enviado.' })
    } else {
      $q.notify({ type: data?.should_remind ? 'warning' : 'info', message: data?.message || 'Sin novedades.' })
    }
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo validar recordatorio.' })
  } finally {
    reminderLoading.value = false
  }
}

function avatarStorageKey() {
  const email = auth.user?.email || 'guest'
  return `vimel_custom_avatar_${email}`
}

function loadCustomAvatar() {
  if (typeof window === 'undefined') return
  customAvatar.value = window.localStorage.getItem(avatarStorageKey()) || ''
}

function persistCustomAvatar(value) {
  if (typeof window === 'undefined') return
  if (value) {
    window.localStorage.setItem(avatarStorageKey(), value)
  } else {
    window.localStorage.removeItem(avatarStorageKey())
  }
}

function populateProfileForm(profile) {
  profileForm.value = {
    birth_date: profile?.birth_date || '',
    sex: profile?.sex || null,
    height_cm: profile?.height_cm || null,
    weight_kg: profile?.weight_kg || null,
    target_weight_kg: profile?.target_weight_kg || null,
    target_date: profile?.target_date || '',
    activity_level: profile?.activity_level || null,
    health_goal: profile?.health_goal || null,
    goal: profile?.goal || '',
    goal_message: profile?.goal_message || '',
    motto: profile?.motto || '',
  }
}

function triggerAvatarPicker() {
  avatarInputRef.value?.click?.()
}

function onAvatarPicked(event) {
  const file = event?.target?.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    $q.notify({ type: 'warning', message: 'Selecciona una imagen valida.' })
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    const result = String(reader.result || '')
    customAvatar.value = result
    persistCustomAvatar(result)

    if (auth.user) {
      auth.user = { ...auth.user, picture: result }
    }
    $q.notify({ type: 'positive', message: 'Foto de perfil actualizada.' })
  }
  reader.readAsDataURL(file)
}

function removeCustomAvatar() {
  customAvatar.value = ''
  persistCustomAvatar('')
  if (auth.user?.picture?.startsWith?.('data:image/')) {
    auth.user = { ...auth.user, picture: '' }
  }
}

function openProfilePanel() {
  profileDialogOpen.value = true
}

async function saveHeaderProfile() {
  const payload = {
    birth_date: profileForm.value.birth_date || null,
    sex: profileForm.value.sex,
    height_cm: profileForm.value.height_cm,
    weight_kg: profileForm.value.weight_kg,
    target_weight_kg: profileForm.value.target_weight_kg,
    target_date: profileForm.value.target_date || null,
    activity_level: profileForm.value.activity_level,
    health_goal: profileForm.value.health_goal,
    goal: profileForm.value.goal || null,
    goal_message: profileForm.value.goal_message || null,
    motto: profileForm.value.motto || null,
    food_restrictions: profileStore.profile?.food_restrictions || { type: 'ninguna', items: [], other_text: null },
  }

  try {
    if (profileStore.profile) {
      await profileStore.updateProfile(payload)
    } else {
      await profileStore.createProfile(payload)
    }
    $q.notify({ type: 'positive', message: 'Perfil guardado correctamente.' })
    profileDialogOpen.value = false
  } catch {
    $q.notify({ type: 'negative', message: profileStore.error || 'No se pudo guardar el perfil.' })
  }
}

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}

function formatWeight(value) {
  return value == null ? 'N/D' : `${Number(value).toFixed(1)} kg`
}

watch(
  () => auth.user?.email,
  () => {
    loadCustomAvatar()
  },
  { immediate: true }
)

watch(
  () => profileStore.profile,
  (profile) => {
    populateProfileForm(profile)
  },
  { immediate: true }
)

onMounted(async () => {
  await loadReminderSettings()
  if (!profileStore.profile) {
    try {
      await profileStore.fetchProfile()
    } catch {
      // Sin perfil aun, se crea al guardar.
    }
  }

  // Revisa periodicamente si hay olvido de registro y dispara correo si corresponde.
  if (typeof window !== 'undefined') {
    window.setInterval(() => {
      checkReminder(false).catch(() => {})
    }, 10 * 60 * 1000)
  }
})
</script>

<style scoped>
.green-layout {
  background: var(--aire-1);
}

.header-blur {
  background: linear-gradient(118deg, var(--campo-hondo) 0%, var(--campo) 100%);
  box-shadow: 0 8px 24px rgba(23, 58, 39, 0.18);
  min-height: 62px;
  /* Hilo de "sol" que ata el header al amanecer del login */
  border-bottom: 3px solid var(--sol);
}

.brand-row {
  gap: 6px;
}

.header-brand {
  font-size: 1.55rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.01em;
  margin-left: 2px;
}

.btn-ghost {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 12px;
}

.btn-soft {
  background: linear-gradient(120deg, #ffffff, #e9f8ef);
  border-radius: 12px;
  box-shadow: 0 8px 18px rgba(39, 174, 96, 0.2);
}

.btn-outline {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.notification-menu-card {
  min-width: 320px;
  max-width: 360px;
  border-radius: 14px;
}

.avatar-pill {
  border-radius: 12px;
}

.header-avatar {
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.profile-menu-card {
  min-width: 260px;
  border-radius: 14px;
}

.profile-menu-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-avatar {
  background: linear-gradient(135deg, var(--campo), var(--campo-hondo));
}

.actions .q-btn {
  min-height: 38px;
}

.rel {
  position: relative;
}

.drawer-brand {
  display: flex;
  justify-content: center;
  padding: 1rem 0 0.5rem;
}

.drawer-logo {
  background: rgba(46, 204, 113, 0.15);
}

.brand-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
}

.brand-text {
  text-align: center;
  line-height: 1.2;
}

.drawer-title {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 800;
  font-size: 1.3rem;
  color: var(--bosque);
}

.green-drawer {
  background: var(--aire-0);
  border-right: 1px solid rgba(31, 139, 87, 0.14);
}

.green-drawer .q-item {
  border-radius: 12px;
  margin-bottom: 6px;
  color: rgba(23, 58, 39, 0.72);
  font-weight: 600;
}

.green-drawer .q-item--active,
.green-drawer .drawer-active {
  background: linear-gradient(135deg, var(--campo) 0%, var(--campo-hondo) 100%);
  color: #fff;
  box-shadow: 0 8px 18px rgba(31, 139, 87, 0.28);
}

.text-forest {
  color: #1f3b2c;
}

.profile-dialog {
  width: min(760px, 96vw);
  max-height: 95vh;
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.profile-dialog-bar {
  background: linear-gradient(120deg, var(--aire-1), var(--aire-0));
  border-bottom: 1px solid rgba(31, 139, 87, 0.18);
  color: var(--bosque);
}

.profile-dialog-body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.profile-cover {
  border-radius: 16px;
  border: 1px solid rgba(39, 174, 96, 0.18);
  background: linear-gradient(135deg, #f4fff8 0%, #ffffff 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.profile-cover-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-avatar-xl {
  background: linear-gradient(135deg, var(--campo), var(--campo-hondo));
  box-shadow: 0 10px 20px rgba(31, 139, 87, 0.25);
}

.profile-cover-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.avatar-input-hidden {
  display: none;
}

.profile-form {
  border: 1px solid rgba(39, 174, 96, 0.14);
  border-radius: 16px;
  padding: 14px;
  background: #ffffff;
  padding-bottom: 18px;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.profile-field :deep(.q-field__control) {
  border-radius: 12px;
  background: #fbfffc;
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  position: sticky;
  bottom: 0;
  z-index: 2;
  padding-top: 12px;
  padding-bottom: 4px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #ffffff 24%);
  border-top: 1px solid rgba(39, 174, 96, 0.12);
}

@media (max-width: 799px) {
  .actions .notification-pill {
    display: none;
  }

  .profile-dialog {
    width: 100vw;
    max-height: 100vh;
    height: 100vh;
    border-radius: 0;
  }

  .profile-dialog-body {
    padding-bottom: max(18px, env(safe-area-inset-bottom));
  }

  .profile-form {
    padding: 12px;
  }

  .profile-actions {
    justify-content: stretch;
    flex-wrap: wrap;
  }

  .profile-actions .q-btn {
    flex: 1;
    min-width: 100%;
  }
}
</style>
