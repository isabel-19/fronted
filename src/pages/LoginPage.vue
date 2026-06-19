<template>
  <q-page class="login">
    <!-- ESCENA: amanecer sobre el campo (decorativa, compartida) -->
    <DawnScene />

    <!-- CONTENIDO -->
    <div class="content">
      <header class="brand-block">
        <h1 class="brand">Vimel</h1>
        <p class="eyebrow">COME BIEN · VIVE MEJOR</p>
        <h2 class="hero">Recetas saludables, hechas para ti</h2>
      </header>

      <section class="card">
        <div class="segmented" role="tablist" aria-label="Acceso">
          <button
            type="button"
            role="tab"
            class="seg-btn"
            :class="{ active: authMode === 'login' }"
            :aria-selected="authMode === 'login'"
            @click="authMode = 'login'"
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            class="seg-btn"
            :class="{ active: authMode === 'register' }"
            :aria-selected="authMode === 'register'"
            @click="authMode = 'register'"
          >
            Crear cuenta
          </button>
          <span class="seg-thumb" :class="{ right: authMode === 'register' }"></span>
        </div>

        <transition name="swap" mode="out-in">
          <form :key="authMode" class="panel" @submit.prevent="submitPasswordAuth">
            <template v-if="authMode === 'login'">
              <q-input
                v-model.trim="loginForm.email"
                outlined
                type="email"
                label="Correo"
                autocomplete="email"
              />
              <q-input
                v-model="loginForm.password"
                outlined
                :type="showLoginPassword ? 'text' : 'password'"
                label="Contraseña"
                autocomplete="current-password"
              >
                <template #append>
                  <q-icon
                    :name="showLoginPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer eye"
                    @click="showLoginPassword = !showLoginPassword"
                  />
                </template>
              </q-input>
            </template>

            <template v-else>
              <q-input
                v-model.trim="registerForm.full_name"
                outlined
                label="Nombre (opcional)"
                autocomplete="name"
              />
              <q-input
                v-model.trim="registerForm.email"
                outlined
                type="email"
                label="Correo"
                autocomplete="email"
              />
              <q-input
                v-model="registerForm.password"
                outlined
                :type="showRegisterPassword ? 'text' : 'password'"
                label="Contraseña"
                hint="Mínimo 8 caracteres"
                autocomplete="new-password"
              >
                <template #append>
                  <q-icon
                    :name="showRegisterPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer eye"
                    @click="showRegisterPassword = !showRegisterPassword"
                  />
                </template>
              </q-input>
              <q-input
                v-model="registerForm.confirmPassword"
                outlined
                :type="showRegisterPassword ? 'text' : 'password'"
                label="Confirmar contraseña"
                autocomplete="new-password"
              />
            </template>

            <q-btn
              class="cta"
              type="submit"
              no-caps
              unelevated
              :loading="submittingPassword"
              :disable="submittingPassword"
              :label="authMode === 'login' ? 'Entrar' : 'Crear cuenta'"
            />
          </form>
        </transition>

        <div class="divider"><span>o</span></div>

        <q-btn
          class="google-btn"
          no-caps
          unelevated
          :loading="redirectingToGoogle"
          :disable="redirectingToGoogle"
          icon="img:/icons/google-g.svg"
          label="Continuar con Google"
          @click="handleGoogleLogin"
        />
        <p v-if="redirectingToGoogle" class="redirect-note">Redirigiendo a Google…</p>

        <details class="sec-help">
          <summary>¿Google pide un código de seguridad?</summary>
          <div class="sec-help-body">
            <p>Eso lo solicita Google por seguridad de la cuenta, no la app.</p>
            <ol>
              <li>Toca «Más métodos de verificación».</li>
              <li>Elige confirmación desde tu teléfono o passkey.</li>
              <li>Si confías en este equipo, márcalo como seguro.</li>
            </ol>
          </div>
        </details>
      </section>

      <p class="terms">
        Al continuar aceptas los <span>Términos</span> y la <span>Política de Privacidad</span>
      </p>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth-store'
import DawnScene from 'components/DawnScene.vue'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const redirectingToGoogle = ref(false)
const submittingPassword = ref(false)
const authMode = ref('login')

const loginForm = ref({
  email: '',
  password: '',
})

const registerForm = ref({
  full_name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const showLoginPassword = ref(false)
const showRegisterPassword = ref(false)

function handleGoogleLogin() {
  if (redirectingToGoogle.value) return
  redirectingToGoogle.value = true

  // Si la redireccion falla por alguna razon del navegador, reactivar el boton.
  setTimeout(() => {
    redirectingToGoogle.value = false
  }, 10000)

  authStore.loginWithGoogle()
}

async function submitPasswordAuth() {
  if (submittingPassword.value) return

  try {
    submittingPassword.value = true
    if (authMode.value === 'login') {
      if (!loginForm.value.email || !loginForm.value.password) {
        throw new Error('Completa correo y contraseña')
      }

      await authStore.loginWithPassword({
        email: loginForm.value.email,
        password: loginForm.value.password,
      })
    } else {
      if (!registerForm.value.email || !registerForm.value.password) {
        throw new Error('Completa correo y contraseña')
      }
      if (registerForm.value.password.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres')
      }
      if (registerForm.value.password !== registerForm.value.confirmPassword) {
        throw new Error('Las contraseñas no coinciden')
      }

      await authStore.registerWithPassword({
        email: registerForm.value.email,
        password: registerForm.value.password,
        full_name: registerForm.value.full_name || null,
      })
    }

    await router.push('/app')
  } catch (error) {
    const message = error?.response?.data?.detail || error?.message || 'No se pudo completar la autenticación'
    $q.notify({
      type: 'negative',
      message,
      position: 'top',
    })
  } finally {
    submittingPassword.value = false
  }
}
</script>

<style scoped lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,900&display=swap');

.login {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: clamp(34px, 7vh, 84px) 16px clamp(20px, 4vh, 40px);
  overflow: hidden;
  background: var(--aire-1);
}

/* ---------- Contenido ---------- */
.content {
  position: relative;
  z-index: 2;
  width: min(440px, 100%);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2.6vh, 22px);
}

.brand-block {
  text-align: center;
  animation: rise 0.7s ease both;
  animation-delay: 0.15s;
}

.brand {
  margin: 0;
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 900;
  font-size: clamp(2.6rem, 8vw, 3.4rem);
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--bosque);
}

.eyebrow {
  margin: 8px 0 0;
  font-weight: 800;
  font-size: clamp(0.7rem, 2.2vw, 0.82rem);
  letter-spacing: 0.18em;
  color: var(--campo-hondo);
}

.hero {
  margin: 10px 0 0;
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 600;
  font-size: clamp(1.4rem, 5vw, 1.9rem);
  line-height: 1.15;
  color: var(--bosque);
}

/* ---------- Tarjeta ---------- */
.card {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 22px;
  padding: clamp(16px, 3vh, 22px);
  box-shadow: 0 20px 50px rgba(23, 58, 39, 0.16);
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: rise 0.7s ease both;
  animation-delay: 0.35s;
}

/* Segmentado */
.segmented {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  border-radius: 13px;
  background: rgba(23, 58, 39, 0.07);
}

.seg-btn {
  position: relative;
  z-index: 1;
  appearance: none;
  border: 0;
  background: transparent;
  padding: 11px 8px;
  border-radius: 10px;
  font-family: inherit;
  font-weight: 800;
  font-size: 0.98rem;
  color: rgba(23, 58, 39, 0.55);
  cursor: pointer;
  transition: color 0.2s ease;
}

.seg-btn.active {
  color: var(--bosque);
}

.seg-thumb {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 3px 10px rgba(23, 58, 39, 0.14);
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.seg-thumb.right {
  transform: translateX(100%);
}

/* Formulario */
.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

:deep(.q-field--outlined .q-field__control) {
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.85);
}

:deep(.q-field--outlined .q-field__control:before) {
  border-color: rgba(23, 58, 39, 0.16);
}

:deep(.q-field--outlined .q-field__control:hover:before) {
  border-color: rgba(23, 58, 39, 0.32);
}

:deep(.q-field--outlined.q-field--focused .q-field__control:after) {
  border-color: var(--rio);
  border-width: 2px;
}

:deep(.q-field--focused .q-field__control) {
  box-shadow: 0 0 0 4px rgba(37, 179, 194, 0.16);
}

:deep(.q-field__label) {
  color: rgba(23, 58, 39, 0.62);
  font-weight: 600;
}

:deep(.q-field--focused .q-field__label) {
  color: var(--rio);
}

:deep(.q-field__native),
:deep(.q-field__input) {
  color: var(--bosque);
  font-weight: 600;
}

:deep(.q-field__messages) {
  color: rgba(23, 58, 39, 0.55);
}

.eye {
  color: rgba(23, 58, 39, 0.5);
}

/* CTA dorado (sol) — el control mas prominente */
.cta {
  margin-top: 2px;
  min-height: 52px;
  border-radius: 14px;
  background: linear-gradient(180deg, var(--cta-gold) 0%, var(--cta-gold-strong) 100%);
  color: var(--bosque);
  font-weight: 800;
  font-size: 1.05rem;
  box-shadow: 0 10px 22px rgba(242, 167, 52, 0.34);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(242, 167, 52, 0.44);
}

/* Divisor */
.divider {
  position: relative;
  text-align: center;
  color: rgba(23, 58, 39, 0.5);
  font-weight: 700;
  font-size: 0.82rem;
}

.divider::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: rgba(23, 58, 39, 0.14);
}

.divider span {
  position: relative;
  padding: 0 12px;
  background: linear-gradient(180deg, #fbfdfb, #f2f8f4);
}

/* Google — secundario */
.google-btn {
  min-height: 50px;
  border-radius: 14px;
  background: #fff;
  color: #1f2937;
  font-weight: 700;
  font-size: 1rem;
  border: 1px solid rgba(23, 58, 39, 0.14);
  box-shadow: 0 4px 14px rgba(23, 58, 39, 0.06);
}

.google-btn :deep(.q-icon) {
  margin-right: 8px;
}

.redirect-note {
  margin: 0;
  text-align: center;
  color: var(--campo-hondo);
  font-weight: 700;
  font-size: 0.86rem;
}

/* Ayuda colapsada (ruido fuera de la vista) */
.sec-help {
  border-top: 1px solid rgba(23, 58, 39, 0.1);
  padding-top: 10px;
}

.sec-help summary {
  cursor: pointer;
  list-style: none;
  color: var(--rio);
  font-weight: 700;
  font-size: 0.86rem;
}

.sec-help summary::-webkit-details-marker {
  display: none;
}

.sec-help summary::before {
  content: '＋ ';
  font-weight: 700;
}

.sec-help[open] summary::before {
  content: '－ ';
}

.sec-help-body {
  padding: 8px 2px 0;
  color: rgba(23, 58, 39, 0.7);
  font-size: 0.82rem;
  line-height: 1.45;
}

.sec-help-body p {
  margin: 0 0 6px;
}

.sec-help-body ol {
  margin: 0;
  padding-left: 18px;
}

/* Terminos */
.terms {
  margin: 0;
  text-align: center;
  color: rgba(23, 58, 39, 0.66);
  font-size: 0.82rem;
  line-height: 1.5;
  animation: rise 0.7s ease both;
  animation-delay: 0.5s;
}

.terms span {
  color: var(--bosque);
  text-decoration: underline;
  cursor: pointer;
}

/* Transicion del swap de formulario */
.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.swap-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ---------- Animaciones ---------- */
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand-block,
  .card,
  .terms {
    animation: none;
  }
}

/* ---------- Responsive ---------- */
@media (max-width: 560px) {
  .content {
    width: 100%;
  }
}

@media (max-height: 720px) {
  .login {
    justify-content: flex-start;
  }

  .hero {
    display: none;
  }
}
</style>
