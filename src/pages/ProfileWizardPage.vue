<template>
  <q-page class="wizard-page">
    <DawnScene />

    <div class="wizard-container">
      <!-- Header -->
      <header class="wizard-header">
        <div class="avatar-ring">
          <q-avatar size="58px">
            <img v-if="auth.user?.picture" :src="auth.user.picture" alt="Tu foto de perfil" />
            <q-icon v-else name="person" size="30px" color="white" />
          </q-avatar>
        </div>
        <h1 class="greeting">Bienvenido, {{ firstName }}</h1>
        <p class="greeting-sub">Personaliza tu experiencia de recetas</p>
      </header>

      <!-- Tarjeta del stepper -->
      <section class="card">
        <q-stepper
          v-model="step"
          ref="stepperRef"
          color="primary"
          animated
          vertical
          header-nav
          class="wizard-stepper"
        >
          <!-- Paso 1: Datos Basicos -->
          <q-step :name="1" title="Datos básicos" icon="person" :done="step > 1">
            <p class="step-hint">Cuéntanos lo esencial para empezar a personalizar tus recetas.</p>

            <div class="fields">
              <q-input
                v-model="form.birth_date"
                outlined
                label="Fecha de nacimiento"
                placeholder="DD-MM-AAAA"
                mask="##-##-####"
                fill-mask
                hint="Escríbela (DD-MM-AAAA) o ábrela en el calendario"
                :rules="[(val) => !!val || 'Campo requerido']"
              >
                <template #prepend>
                  <q-icon name="cake" />
                </template>
                <template #append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="form.birth_date" mask="DD-MM-YYYY" first-day-of-week="1" />
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>

              <q-select
                v-model="form.sex"
                outlined
                label="Sexo"
                :options="sexOptions"
                emit-value
                map-options
                :rules="[(val) => !!val || 'Campo requerido']"
              >
                <template #prepend>
                  <q-icon name="wc" />
                </template>
              </q-select>
            </div>

            <q-stepper-navigation class="nav">
              <q-btn class="cta" no-caps unelevated @click="nextStep(1)" label="Continuar" :disable="!isStep1Valid" />
            </q-stepper-navigation>
          </q-step>

          <!-- Paso 2: Medidas Corporales -->
          <q-step :name="2" title="Medidas corporales" icon="straighten" :done="step > 2">
            <p class="step-hint">Con esto calculamos tu IMC y ajustamos las porciones.</p>

            <div class="fields">
              <q-input
                v-model.number="form.height_cm"
                outlined
                label="Altura (cm)"
                type="number"
                :rules="[(val) => (val >= 50 && val <= 300) || 'Ingresa un valor válido (50-300)']"
              >
                <template #prepend>
                  <q-icon name="height" />
                </template>
                <template #append>
                  <span class="unit">cm</span>
                </template>
              </q-input>

              <q-input
                v-model.number="form.weight_kg"
                outlined
                label="Peso (kg)"
                type="number"
                step="0.1"
                :rules="[(val) => (val >= 20 && val <= 500) || 'Ingresa un valor válido (20-500)']"
              >
                <template #prepend>
                  <q-icon name="monitor_weight" />
                </template>
                <template #append>
                  <span class="unit">kg</span>
                </template>
              </q-input>

              <!-- IMC calculado -->
              <div v-if="bmi" class="bmi-banner">
                <q-icon name="analytics" size="22px" />
                <span>Tu IMC aproximado es <strong>{{ bmi }}</strong> ({{ bmiCategory }})</span>
              </div>
            </div>

            <q-stepper-navigation class="nav">
              <q-btn class="cta" no-caps unelevated @click="nextStep(2)" label="Continuar" :disable="!isStep2Valid" />
              <q-btn class="back-btn" flat no-caps @click="step = 1" label="Atrás" />
            </q-stepper-navigation>
          </q-step>

          <!-- Paso 3: Restricciones Alimentarias -->
          <q-step :name="3" title="Restricciones alimentarias" icon="restaurant" :done="step > 3">
            <p class="step-hint">Para evitar ingredientes que no te caen bien. Si no tienes, deja «Ninguna».</p>

            <div class="fields">
              <q-select
                v-model="form.restriction_type"
                outlined
                label="Tipo de restricción"
                :options="restrictionTypeOptions"
                emit-value
                map-options
              >
                <template #prepend>
                  <q-icon name="no_food" />
                </template>
              </q-select>

              <q-select
                v-if="form.restriction_type && form.restriction_type !== 'ninguna'"
                v-model="form.restriction_items"
                outlined
                label="Especifica los alimentos"
                :options="restrictionItemOptions"
                multiple
                use-chips
                emit-value
                map-options
              />

              <q-input
                v-if="form.restriction_type === 'otro'"
                v-model="form.restriction_other"
                outlined
                label="Especifica tu restricción"
                autogrow
              />
            </div>

            <q-stepper-navigation class="nav">
              <q-btn class="cta" no-caps unelevated @click="nextStep(3)" label="Continuar" />
              <q-btn class="back-btn" flat no-caps @click="step = 2" label="Atrás" />
            </q-stepper-navigation>
          </q-step>

          <!-- Paso 4: Actividad y Objetivos -->
          <q-step :name="4" title="Actividad y objetivos" icon="fitness_center">
            <p class="step-hint">El último paso: ajustamos las recetas a tu ritmo y tu meta.</p>

            <div class="fields">
              <q-select
                v-model="form.activity_level"
                outlined
                label="Nivel de actividad física"
                :options="activityOptions"
                emit-value
                map-options
                :rules="[(val) => !!val || 'Campo requerido']"
              >
                <template #prepend>
                  <q-icon name="directions_run" />
                </template>
              </q-select>

              <q-select
                v-model="form.health_goal"
                outlined
                label="Objetivo de salud"
                :options="goalOptions"
                emit-value
                map-options
                :rules="[(val) => !!val || 'Campo requerido']"
              >
                <template #prepend>
                  <q-icon name="flag" />
                </template>
              </q-select>

              <q-input
                v-if="form.health_goal === 'otro'"
                v-model="form.health_goal_other"
                outlined
                label="Describe tu objetivo"
                autogrow
                :rules="[(val) => !!val || 'Campo requerido si seleccionas Otro']"
              />
            </div>

            <q-stepper-navigation class="nav">
              <q-btn
                class="cta"
                no-caps
                unelevated
                @click="submitWizard"
                label="Finalizar"
                :loading="profileStore.loading"
                :disable="!isStep4Valid"
              />
              <q-btn class="back-btn" flat no-caps @click="step = 3" label="Atrás" />
            </q-stepper-navigation>
          </q-step>
        </q-stepper>
      </section>

      <!-- Progreso -->
      <div class="progress">
        <q-linear-progress :value="step / 4" rounded class="progress-bar" />
        <div class="progress-label">Paso {{ step }} de 4</div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth-store'
import { useProfileStore } from 'stores/profile-store'
import DawnScene from 'components/DawnScene.vue'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()
const profileStore = useProfileStore()

const step = ref(1)
const stepperRef = ref(null)

// Form data
const form = ref({
  birth_date: '',
  sex: null,
  height_cm: null,
  weight_kg: null,
  restriction_type: 'ninguna',
  restriction_items: [],
  restriction_other: '',
  activity_level: null,
  health_goal: null,
  health_goal_other: '',
})

// Computed
const firstName = computed(() => {
  const name = auth.user?.name || ''
  return name.split(' ')[0] || 'Usuario'
})

// Options
const sexOptions = [
  { label: 'Masculino', value: 'masculino' },
  { label: 'Femenino', value: 'femenino' },
  { label: 'Otro', value: 'otro' },
  { label: 'Prefiero no decir', value: 'prefiero_no_decir' },
]

const restrictionTypeOptions = [
  { label: 'Ninguna', value: 'ninguna' },
  { label: 'Alergia alimentaria', value: 'alergia' },
  { label: 'Intolerancia', value: 'intolerancia' },
  { label: 'Otro', value: 'otro' },
]

const restrictionItemOptions = [
  { label: 'Mariscos', value: 'mariscos' },
  { label: 'Frutos secos', value: 'frutos_secos' },
  { label: 'Lacteos', value: 'lacteos' },
  { label: 'Gluten', value: 'gluten' },
  { label: 'Huevo', value: 'huevo' },
  { label: 'Soya', value: 'soya' },
  { label: 'Lactosa', value: 'lactosa' },
  { label: 'Fructosa', value: 'fructosa' },
]

const activityOptions = [
  { label: 'Sedentario (poco o nada de ejercicio)', value: 'sedentario' },
  { label: 'Moderado (ejercicio 2-3 veces/semana)', value: 'moderado' },
  { label: 'Activo (ejercicio 4+ veces/semana)', value: 'activo' },
]

const goalOptions = [
  { label: 'Bajar de peso', value: 'bajar_peso' },
  { label: 'Ganar masa muscular', value: 'ganar_musculo' },
  { label: 'Mantener peso actual', value: 'mantener' },
  { label: 'Mejorar alimentacion', value: 'mejorar_alimentacion' },
  { label: 'Otro', value: 'otro' },
]

// Validation
const isStep1Valid = computed(() => form.value.birth_date && form.value.sex)
const isStep2Valid = computed(() => {
  const h = form.value.height_cm
  const w = form.value.weight_kg
  return h >= 50 && h <= 300 && w >= 20 && w <= 500
})
const isStep4Valid = computed(() => {
  const hasActivity = !!form.value.activity_level
  const hasGoal = !!form.value.health_goal
  const hasOtherGoal = form.value.health_goal !== 'otro' || !!form.value.health_goal_other
  return hasActivity && hasGoal && hasOtherGoal
})

// BMI calculation
const bmi = computed(() => {
  if (form.value.height_cm && form.value.weight_kg) {
    const heightM = form.value.height_cm / 100
    return (form.value.weight_kg / (heightM * heightM)).toFixed(1)
  }
  return null
})

const bmiCategory = computed(() => {
  const val = parseFloat(bmi.value)
  if (val < 18.5) return 'Bajo peso'
  if (val < 25) return 'Normal'
  if (val < 30) return 'Sobrepeso'
  return 'Obesidad'
})

function nextStep(currentStep) {
  step.value = currentStep + 1
}

async function submitWizard() {
  // Construir payload
  const payload = {
    birth_date: form.value.birth_date || null,
    sex: form.value.sex,
    height_cm: form.value.height_cm,
    weight_kg: form.value.weight_kg,
    food_restrictions: {
      type: form.value.restriction_type,
      items: form.value.restriction_items,
      other_text: form.value.restriction_other || null,
    },
    activity_level: form.value.activity_level,
    health_goal: form.value.health_goal,
    health_goal_other: form.value.health_goal_other || null,
  }

  try {
    await profileStore.createProfile(payload)
    $q.notify({
      type: 'positive',
      message: 'Perfil creado exitosamente',
      position: 'top',
    })
    router.push('/app/profile')
  } catch {
    $q.notify({
      type: 'negative',
      message: profileStore.error || 'Error al guardar perfil',
      position: 'top',
    })
  }
}
</script>

<style scoped lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,900&display=swap');

.wizard-page {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: clamp(28px, 6vh, 64px) 16px clamp(24px, 4vh, 44px);
  background: var(--aire-1);
}

.wizard-container {
  position: relative;
  z-index: 2;
  width: min(500px, 100%);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2.4vh, 20px);
}

/* ---------- Header ---------- */
.wizard-header {
  text-align: center;
  animation: rise 0.7s ease both;
  animation-delay: 0.1s;
}

.avatar-ring {
  display: inline-grid;
  place-items: center;
  padding: 4px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--campo) 0%, var(--campo-hondo) 100%);
  box-shadow: 0 8px 20px rgba(31, 139, 87, 0.28);
}

.avatar-ring :deep(.q-avatar) {
  background: var(--campo-hondo);
}

.greeting {
  margin: 12px 0 0;
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 800;
  font-size: clamp(1.7rem, 6vw, 2.3rem);
  line-height: 1.1;
  color: var(--bosque);
}

.greeting-sub {
  margin: 6px 0 0;
  color: rgba(23, 58, 39, 0.62);
  font-weight: 600;
  font-size: 0.95rem;
}

/* ---------- Tarjeta ---------- */
.card {
  background: rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 22px;
  padding: clamp(10px, 2vh, 18px);
  box-shadow: 0 20px 50px rgba(23, 58, 39, 0.16);
  animation: rise 0.7s ease both;
  animation-delay: 0.28s;
}

/* ---------- Stepper ---------- */
.wizard-stepper {
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}

:deep(.q-stepper__tab) {
  padding: 12px 8px;
}

:deep(.q-stepper__dot) {
  background: rgba(23, 58, 39, 0.12);
  color: var(--bosque);
  font-weight: 800;
}

/* paso activo / completado */
:deep(.q-stepper__tab--active .q-stepper__dot),
:deep(.q-stepper__tab--done .q-stepper__dot) {
  background: linear-gradient(135deg, var(--campo) 0%, var(--campo-hondo) 100%);
  color: #fff;
  box-shadow: 0 6px 14px rgba(31, 139, 87, 0.3);
}

:deep(.q-stepper__title) {
  color: var(--bosque);
  font-weight: 800;
}

:deep(.q-stepper__tab--inactive .q-stepper__title) {
  color: rgba(23, 58, 39, 0.45);
}

:deep(.q-stepper__line:before),
:deep(.q-stepper__line:after) {
  background: rgba(23, 58, 39, 0.12);
}

:deep(.q-stepper__dot:before),
:deep(.q-stepper__dot:after) {
  background: rgba(23, 58, 39, 0.12);
}

.step-hint {
  margin: 0 0 14px;
  color: rgba(23, 58, 39, 0.66);
  font-size: 0.9rem;
  line-height: 1.45;
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.unit {
  color: rgba(23, 58, 39, 0.5);
  font-weight: 700;
  font-size: 0.85rem;
}

/* ---------- Inputs (mismo lenguaje que login) ---------- */
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

:deep(.q-field__prepend .q-icon) {
  color: var(--campo-hondo);
}

/* ---------- Banner IMC ---------- */
.bmi-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(52, 179, 106, 0.16), rgba(37, 179, 194, 0.14));
  border: 1px solid rgba(52, 179, 106, 0.24);
  color: var(--bosque);
  font-size: 0.92rem;
}

.bmi-banner .q-icon {
  color: var(--campo-hondo);
}

/* ---------- Botones ---------- */
.nav {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 18px;
}

.cta {
  min-height: 50px;
  padding: 0 26px;
  border-radius: 14px;
  background: linear-gradient(180deg, var(--cta-gold) 0%, var(--cta-gold-strong) 100%);
  color: var(--bosque);
  font-weight: 800;
  font-size: 1.02rem;
  box-shadow: 0 10px 22px rgba(242, 167, 52, 0.34);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(242, 167, 52, 0.44);
}

.cta.disabled,
.cta[disabled] {
  box-shadow: none;
}

.back-btn {
  color: rgba(23, 58, 39, 0.6);
  font-weight: 700;
}

/* ---------- Progreso ---------- */
.progress {
  text-align: center;
  animation: rise 0.7s ease both;
  animation-delay: 0.42s;
}

.progress-bar {
  height: 8px;
  border-radius: 99px;
  color: var(--campo);
}

:deep(.progress-bar .q-linear-progress__track) {
  opacity: 1;
  color: rgba(23, 58, 39, 0.1);
}

.progress-label {
  margin-top: 8px;
  color: rgba(23, 58, 39, 0.6);
  font-weight: 700;
  font-size: 0.84rem;
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
  .wizard-header,
  .card,
  .progress {
    animation: none;
  }
}
</style>
