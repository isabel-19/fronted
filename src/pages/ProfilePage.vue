<template>
  <q-page padding>
    <div class="profile-wrap">
      <!-- Cabecera de página -->
      <div class="page-head profile-head">
        <q-avatar v-if="auth.user?.picture" size="64px" class="profile-pic">
          <img :src="auth.user.picture" alt="avatar" />
        </q-avatar>
        <q-avatar v-else size="64px" class="profile-pic profile-pic--empty">
          <q-icon name="person" size="34px" color="white" />
        </q-avatar>
        <div class="profile-head-text">
          <p class="v-eyebrow">Tu cuenta</p>
          <h1 class="page-title">Mi perfil</h1>
          <p class="page-sub">{{ auth.user?.email }}</p>
        </div>
      </div>

      <q-card v-if="profileStore.profile" class="surface surface--pad">
        <q-form @submit.prevent="saveProfile" class="q-gutter-md">
          <!-- Datos básicos -->
          <h2 class="form-section"><q-icon name="person" />Datos básicos</h2>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input v-model="editForm.birth_date" label="Fecha de nacimiento" type="date" outlined />
            </div>
            <div class="col-12 col-sm-6">
              <q-select v-model="editForm.sex" label="Sexo" :options="sexOptions" emit-value map-options outlined />
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- Medidas -->
          <h2 class="form-section"><q-icon name="straighten" />Medidas corporales</h2>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input v-model.number="editForm.height_cm" label="Altura (cm)" type="number" outlined />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model.number="editForm.weight_kg" label="Peso (kg)" type="number" outlined step="0.1" />
            </div>
          </div>

          <div class="row q-col-gutter-md q-mt-sm">
            <div class="col-12 col-sm-6">
              <q-input v-model.number="editForm.target_weight_kg" label="Peso meta (kg)" type="number" outlined step="0.1" />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="editForm.target_date" label="Fecha objetivo" type="date" outlined />
            </div>
          </div>

          <!-- IMC -->
          <q-banner v-if="bmi" class="bmi-banner q-mt-sm" rounded>
            <template v-slot:avatar>
              <q-icon name="monitoring" color="white" />
            </template>
            Tu IMC aproximado es <strong>{{ bmi }}</strong> ({{ bmiCategory }})
          </q-banner>

          <q-card v-if="goalProgress" flat bordered class="goal-progress-card q-mt-md">
            <q-card-section>
              <div class="goal-progress-card__head">
                <div>
                  <div class="text-overline text-grey-6">Estado de tu objetivo</div>
                  <div class="text-h6 text-weight-bold">{{ goalProgress.label }}</div>
                </div>
                <q-chip :color="goalStatusColor" text-color="white" dense>
                  {{ goalStatusText }}
                </q-chip>
              </div>

              <q-linear-progress
                size="12px"
                rounded
                :value="goalProgressValue"
                :color="goalStatusColor"
                track-color="grey-3"
                class="q-mt-md"
              />

              <div class="goal-progress-card__metrics q-mt-md">
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

              <div class="text-body2 q-mt-md">{{ goalProgress.message }}</div>
              <div class="text-caption text-grey-6 q-mt-xs">
                Avance: {{ goalProgressPercent }}
                <span v-if="goalProgress.target_date"> · Fecha objetivo: {{ printableDate(goalProgress.target_date) }}</span>
                <span v-if="goalProgress.last_recorded_at"> · Último registro: {{ printableDate(goalProgress.last_recorded_at) }}</span>
              </div>
            </q-card-section>
          </q-card>

          <q-separator class="q-my-md" />

          <!-- Restricciones -->
          <h2 class="form-section"><q-icon name="restaurant" />Restricciones alimentarias</h2>

          <q-select
            v-model="editForm.restriction_type"
            label="Tipo de restricción"
            :options="restrictionTypeOptions"
            emit-value
            map-options
            outlined
          />

          <q-select
            v-if="editForm.restriction_type && editForm.restriction_type !== 'ninguna'"
            v-model="editForm.restriction_items"
            label="Alimentos"
            :options="restrictionItemOptions"
            multiple
            use-chips
            outlined
            emit-value
            map-options
          />

          <q-input
            v-if="editForm.restriction_type === 'otro'"
            v-model="editForm.restriction_other"
            label="Especifica tu restricción"
            outlined
            autogrow
          />

          <q-separator class="q-my-md" />

          <!-- Actividad y objetivos -->
          <h2 class="form-section"><q-icon name="fitness_center" />Actividad y objetivos</h2>

          <q-select
            v-model="editForm.activity_level"
            label="Nivel de actividad"
            :options="activityOptions"
            emit-value
            map-options
            outlined
          />

          <q-select
            v-model="editForm.health_goal"
            label="Objetivo de salud"
            :options="goalOptions"
            emit-value
            map-options
            outlined
          />

          <q-input
            v-if="editForm.health_goal === 'otro'"
            v-model="editForm.health_goal_other"
            label="Describe tu objetivo"
            outlined
            autogrow
          />

          <!-- Acciones: guardar = acción principal (sol) -->
          <div class="profile-actions q-mt-lg">
            <q-btn
              type="submit"
              class="btn-sol full-width"
              unelevated
              no-caps
              icon="check"
              label="Guardar cambios"
              :loading="profileStore.loading"
            />
            <q-btn
              flat
              no-caps
              color="primary"
              icon="print"
              label="Imprimir reporte de consumo"
              :loading="reportLoading"
              class="full-width q-mt-sm"
              @click="printConsumptionReport"
            />
          </div>
        </q-form>
      </q-card>

      <div v-else-if="!profileStore.loading" class="empty-state">
        <q-icon name="person_off" size="48px" class="empty-state__icon" />
        <div class="empty-state__title">Aún no tienes un perfil</div>
        <p class="empty-state__hint">Crea tu perfil para recibir recomendaciones a tu medida.</p>
        <q-btn class="btn-sol q-mt-md" unelevated no-caps label="Completar mi perfil" to="/wizard" />
      </div>

      <div v-if="profileStore.loading && !profileStore.profile" class="text-center q-pa-xl">
        <q-spinner-dots size="50px" color="primary" />
        <div class="q-mt-md text-ink-2">Cargando tu perfil…</div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth-store'
import { useProfileStore } from 'stores/profile-store'
import { api } from 'boot/axios'

const $q = useQuasar()
const auth = useAuthStore()
const profileStore = useProfileStore()
const reportLoading = ref(false)

const editForm = ref({
  birth_date: '',
  sex: null,
  height_cm: null,
  weight_kg: null,
  target_weight_kg: null,
  target_date: '',
  restriction_type: 'ninguna',
  restriction_items: [],
  restriction_other: '',
  activity_level: null,
  health_goal: null,
  health_goal_other: '',
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
  { label: 'Lácteos', value: 'lacteos' },
  { label: 'Gluten', value: 'gluten' },
  { label: 'Huevo', value: 'huevo' },
  { label: 'Soya', value: 'soya' },
  { label: 'Lactosa', value: 'lactosa' },
  { label: 'Fructosa', value: 'fructosa' },
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
  { label: 'Mejorar alimentación', value: 'mejorar_alimentacion' },
  { label: 'Otro', value: 'otro' },
]

// BMI calculation
const bmi = computed(() => {
  if (editForm.value.height_cm && editForm.value.weight_kg) {
    const heightM = editForm.value.height_cm / 100
    return (editForm.value.weight_kg / (heightM * heightM)).toFixed(1)
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

const goalProgress = computed(() => profileStore.profile?.goal_progress || null)
const goalProgressValue = computed(() => Math.max(0, Math.min(Number(goalProgress.value?.progress_pct || 0), 1)))
const goalProgressPercent = computed(() => `${Math.round(goalProgressValue.value * 100)}%`)
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

function populateForm(profile) {
  if (!profile) return
  editForm.value = {
    birth_date: profile.birth_date || '',
    sex: profile.sex,
    height_cm: profile.height_cm,
    weight_kg: profile.weight_kg,
    target_weight_kg: profile.target_weight_kg,
    target_date: profile.target_date || '',
    restriction_type: profile.food_restrictions?.type || 'ninguna',
    restriction_items: profile.food_restrictions?.items || [],
    restriction_other: profile.food_restrictions?.other_text || '',
    activity_level: profile.activity_level,
    health_goal: profile.health_goal,
    health_goal_other: profile.health_goal_other || '',
  }
}

watch(() => profileStore.profile, populateForm, { immediate: true })

onMounted(async () => {
  if (!profileStore.profile) {
    try {
      await profileStore.fetchProfile()
    } catch {
      // Profile not found is handled in template
    }
  }
})

async function saveProfile() {
  const payload = {
    birth_date: editForm.value.birth_date || null,
    sex: editForm.value.sex,
    height_cm: editForm.value.height_cm,
    weight_kg: editForm.value.weight_kg,
    target_weight_kg: editForm.value.target_weight_kg,
    target_date: editForm.value.target_date || null,
    food_restrictions: {
      type: editForm.value.restriction_type,
      items: editForm.value.restriction_items,
      other_text: editForm.value.restriction_other || null,
    },
    activity_level: editForm.value.activity_level,
    health_goal: editForm.value.health_goal,
    health_goal_other: editForm.value.health_goal_other || null,
  }

  try {
    await profileStore.updateProfile(payload)
    $q.notify({
      type: 'positive',
      message: 'Perfil actualizado',
      position: 'top',
    })
  } catch {
    $q.notify({
      type: 'negative',
      message: profileStore.error || 'Error al guardar',
      position: 'top',
    })
  }
}

function formatWeight(value) {
  return value == null ? 'N/D' : `${Number(value).toFixed(1)} kg`
}

function formatPct(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`
}

function printableDate(value) {
  if (!value) return 'N/D'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('es-ES')
}

function buildReportHtml({ userEmail, profile, summary, comparison, patterns, frequency }) {
  const trendRows = Array.isArray(frequency?.trend)
    ? frequency.trend
        .slice(-10)
        .map(
          (item) => `
          <tr>
            <td>${printableDate(item.period_start)}</td>
            <td>${item.healthy_count ?? 0}</td>
            <td>${item.unhealthy_count ?? 0}</td>
            <td>${formatPct(item.healthy_ratio)}</td>
          </tr>`
        )
        .join('')
    : ''

  const nowText = new Date().toLocaleString('es-ES')
  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Reporte de consumo</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; margin: 24px; }
          h1 { margin: 0 0 4px; color: #0f766e; }
          h2 { margin: 22px 0 8px; color: #155e75; font-size: 18px; }
          .meta { color: #475569; font-size: 13px; margin-bottom: 12px; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap: 10px; }
          .kpi { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
          .kpi strong { display: block; font-size: 20px; color: #0f172a; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 13px; }
          th { background: #f0fdf4; }
          .footer { margin-top: 18px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <h1>Reporte de consumo alimentario</h1>
        <div class="meta">Usuario: ${userEmail || 'N/D'} · Generado: ${nowText}</div>

        <h2>Perfil y objetivo</h2>
        <div class="grid">
          <div class="kpi">Meta de salud<strong>${profile?.health_goal || 'N/D'}</strong></div>
          <div class="kpi">Nivel de actividad<strong>${profile?.activity_level || 'N/D'}</strong></div>
        </div>

        <h2>Resumen nutricional</h2>
        <div class="grid">
          <div class="kpi">Registros nutricionales<strong>${summary?.records ?? 0}</strong></div>
          <div class="kpi">Promedio calorias<strong>${summary?.avg_calories ?? 0}</strong></div>
          <div class="kpi">Promedio proteinas<strong>${summary?.avg_proteins ?? 0}</strong></div>
          <div class="kpi">Score nutricional promedio<strong>${summary?.avg_nutritional_score ?? 0}</strong></div>
        </div>

        <h2>Comparativo antes vs despues</h2>
        <div class="grid">
          <div class="kpi">Delta calorias<strong>${comparison?.delta_avg_calories ?? 0}</strong></div>
          <div class="kpi">Delta proteinas<strong>${comparison?.delta_avg_proteins ?? 0}</strong></div>
          <div class="kpi">Delta score nutricional<strong>${comparison?.delta_avg_nutritional_score ?? 0}</strong></div>
        </div>

        <h2>Patrones de consumo (30 dias)</h2>
        <div class="grid">
          <div class="kpi">Total de registros<strong>${patterns?.total_logs ?? 0}</strong></div>
          <div class="kpi">Ratio saludable<strong>${formatPct(patterns?.healthy_ratio)}</strong></div>
          <div class="kpi">Promedio diario<strong>${patterns?.avg_daily_logs ?? 0}</strong></div>
        </div>

        <h2>Frecuencia saludable semanal</h2>
        <table>
          <thead>
            <tr>
              <th>Semana</th>
              <th>Saludables</th>
              <th>No saludables</th>
              <th>Ratio</th>
            </tr>
          </thead>
          <tbody>
            ${trendRows || '<tr><td colspan="4">Sin datos suficientes</td></tr>'}
          </tbody>
        </table>

        <div class="footer">Reporte generado automaticamente desde Vimel.</div>
      </body>
    </html>
  `
}

async function printConsumptionReport() {
  if (!profileStore.profile) {
    $q.notify({ type: 'warning', message: 'Primero completa tu perfil para generar el reporte.' })
    return
  }

  reportLoading.value = true
  try {
    const [summaryRes, comparisonRes, patternsRes, frequencyRes] = await Promise.all([
      api.get('/user/nutrition/summary', { params: { days: 90 } }),
      api.get('/user/nutrition/comparison'),
      api.get('/consumption/patterns', { params: { days: 30 } }),
      api.get('/consumption/healthy-frequency', { params: { days: 90 } }),
    ])

    const html = buildReportHtml({
      userEmail: auth.user?.email,
      profile: profileStore.profile,
      summary: summaryRes?.data,
      comparison: comparisonRes?.data,
      patterns: patternsRes?.data,
      frequency: frequencyRes?.data,
    })

    const printWindow = window.open('', '_blank', 'width=980,height=780')
    if (!printWindow) {
      $q.notify({ type: 'warning', message: 'El navegador bloqueo la ventana de impresion.' })
      return
    }

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  } catch {
    $q.notify({
      type: 'negative',
      message: 'No se pudo generar el reporte. Registra consumos para obtener resultados.',
      position: 'top',
    })
  } finally {
    reportLoading.value = false
  }
}
</script>

<style scoped>
.profile-wrap {
  max-width: 720px;
  margin: 0 auto;
}

.profile-head {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}

.profile-pic {
  flex: none;
  box-shadow: var(--sh-1);
}

.profile-pic--empty {
  background: linear-gradient(135deg, var(--campo), var(--campo-hondo));
}

.profile-head-text .page-sub {
  word-break: break-all;
}

.form-section {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin: 0;
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--bosque);
}

.form-section .q-icon {
  color: var(--campo-hondo);
}

.bmi-banner {
  background: linear-gradient(135deg, var(--campo) 0%, var(--campo-hondo) 100%);
  color: #fff;
  border-radius: var(--r-md);
}

.profile-actions .q-btn {
  min-height: 50px;
}

.goal-progress-card {
  border-radius: var(--r-lg);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 249, 244, 0.96) 100%);
}

.goal-progress-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.goal-progress-card__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.goal-progress-card__metrics span {
  display: block;
  font-size: 0.78rem;
  color: #64748b;
  margin-bottom: 4px;
}

.goal-progress-card__metrics strong {
  display: block;
  font-size: 1rem;
  color: #0f172a;
}

@media (max-width: 640px) {
  .goal-progress-card__head {
    flex-direction: column;
  }

  .goal-progress-card__metrics {
    grid-template-columns: 1fr;
  }
}
</style>
