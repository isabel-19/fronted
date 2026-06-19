<template>
  <q-page class="plan-page">
    <q-inner-loading :showing="pageLoading" class="page-loader">
      <div class="loader-card">
        <img src="/icons/vimel-logo.png" alt="Vimel" class="loader-logo" />
        <div class="text-subtitle1 text-weight-bold">Preparando tu plan</div>
        <div class="text-caption text-grey-6">Sincronizando recetas y metas</div>
        <q-spinner color="primary" size="40px" class="q-mt-md" />
      </div>
    </q-inner-loading>

    <div class="page-head plan-head">
      <div>
        <p class="v-eyebrow">Tu semana</p>
        <h1 class="page-title">Plan de comidas</h1>
        <p class="page-sub">Desayunos, almuerzos y cenas pensados para tu meta.</p>
      </div>
      <q-btn flat no-caps color="primary" icon="auto_awesome" label="Dame un consejo" @click="randomTip" />
    </div>

    <section class="section-card q-pa-md q-mt-md">
      <div class="section-header">
        <div>
          <div class="section-title">Tu semana saludable</div>
          <div class="section-subtitle">Primero revisa el plan y luego ajústalo a tu gusto.</div>
        </div>
        <q-btn
          flat
          dense
          round
          icon="refresh"
          color="primary"
          :loading="wellnessStore.loadingWeeklyPlan"
          @click="generatePlan"
        />
      </div>

      <!-- Móvil: un día a la vez para evitar scroll largo (hoy por defecto) -->
      <div v-if="$q.screen.lt.md && weeklyPlan.length" class="day-picker q-mt-md" role="tablist" aria-label="Elige un día">
        <button
          v-for="(day, i) in weeklyPlan"
          :key="day.day"
          type="button"
          role="tab"
          :aria-selected="i === selectedDayIndex"
          class="day-pill"
          :class="{ 'day-pill--active': i === selectedDayIndex, 'day-pill--today': i === todayIndex }"
          @click="selectedDayIndex = i"
        >
          <span class="day-pill__name">{{ dayAbbr(day.day) }}</span>
          <span v-if="i === todayIndex" class="day-pill__today">hoy</span>
        </button>
      </div>

      <div class="weekly-grid q-mt-md">
        <div
          v-for="day in displayedDays"
          :key="day.day"
          class="day-card"
        >
          <div class="day-header">
            <div class="day-badge">{{ day.day }}</div>
            <span class="day-theme">{{ day.theme || 'Equilibrado' }}</span>
          </div>
          <div class="day-schedule">
            <button
              class="schedule-slot slot-breakfast"
              type="button"
              @click="openMealModal(day.day, 'Desayuno', day.meals?.breakfast)"
            >
              <div class="slot-time">
                <q-icon name="breakfast_dining" />
                Desayuno
              </div>
              <div class="slot-title">
                {{ day.meals?.breakfast?.title || day.meals?.breakfast || 'Por definir' }}
              </div>
              <div v-if="hasMealStats(day.meals?.breakfast)" class="slot-stats">
                <div v-if="mealCaloriesValue(day.meals?.breakfast)" class="slot-stat-card">
                  <span>Calorías</span>
                  <strong>{{ mealCaloriesValue(day.meals?.breakfast) }}</strong>
                </div>
                <div v-if="mealTimeValue(day.meals?.breakfast)" class="slot-stat-card">
                  <span>Tiempo</span>
                  <strong>{{ mealTimeValue(day.meals?.breakfast) }}</strong>
                </div>
              </div>
              <div class="slot-hint">🍓 Frutas + granos</div>
            </button>
            <button
              class="schedule-slot slot-lunch"
              type="button"
              @click="openMealModal(day.day, 'Almuerzo', day.meals?.lunch)"
            >
              <div class="slot-time">
                <q-icon name="lunch_dining" />
                Almuerzo
              </div>
              <div class="slot-title">
                {{ day.meals?.lunch?.title || day.meals?.lunch || 'Por definir' }}
              </div>
              <div v-if="hasMealStats(day.meals?.lunch)" class="slot-stats">
                <div v-if="mealCaloriesValue(day.meals?.lunch)" class="slot-stat-card">
                  <span>Calorías</span>
                  <strong>{{ mealCaloriesValue(day.meals?.lunch) }}</strong>
                </div>
                <div v-if="mealTimeValue(day.meals?.lunch)" class="slot-stat-card">
                  <span>Tiempo</span>
                  <strong>{{ mealTimeValue(day.meals?.lunch) }}</strong>
                </div>
              </div>
              <div class="slot-hint">🥗 Verde + proteína</div>
            </button>
            <button
              class="schedule-slot slot-dinner"
              type="button"
              @click="openMealModal(day.day, 'Cena', day.meals?.dinner)"
            >
              <div class="slot-time">
                <q-icon name="dinner_dining" />
                Cena
              </div>
              <div class="slot-title">
                {{ day.meals?.dinner?.title || day.meals?.dinner || 'Por definir' }}
              </div>
              <div v-if="hasMealStats(day.meals?.dinner)" class="slot-stats">
                <div v-if="mealCaloriesValue(day.meals?.dinner)" class="slot-stat-card">
                  <span>Calorías</span>
                  <strong>{{ mealCaloriesValue(day.meals?.dinner) }}</strong>
                </div>
                <div v-if="mealTimeValue(day.meals?.dinner)" class="slot-stat-card">
                  <span>Tiempo</span>
                  <strong>{{ mealTimeValue(day.meals?.dinner) }}</strong>
                </div>
              </div>
              <div class="slot-hint">🥕 Vegetales + fibras</div>
            </button>
          </div>
        </div>
      </div>

      <div class="plan-actions q-mt-md">
        <q-btn
          class="full-width btn-ghost-campo"
          flat
          no-caps
          icon="tune"
          :label="editMode ? 'Cerrar ajuste de recetas' : 'Ajustar recetas a tu gusto'"
          @click="toggleEditMode"
        />
      </div>

      <div v-if="editMode" class="planner-board q-mt-md">
        <div class="planner-pool">
          <div class="text-caption text-grey-7">Recetas disponibles</div>
          <div class="pool-list">
            <div
              v-for="meal in availableRecipes"
              :key="meal.id || meal.title"
              class="pool-card"
              draggable="true"
              @dragstart="onDragStart(meal)"
            >
              <div class="text-subtitle2 text-weight-bold">{{ meal.title }}</div>
              <div class="text-caption text-grey-6">{{ meal.category || meal.tag || 'Sin categoría' }}</div>
            </div>
          </div>
        </div>

        <div class="planner-canvas">
          <div v-for="(day, dayIndex) in localPlan" :key="day.day" class="canvas-day">
            <div class="text-subtitle2 text-weight-bold">{{ day.day }}</div>
            <div class="text-caption text-grey-6">{{ day.theme || 'Auto' }}</div>
            <div class="canvas-slots">
              <div
                v-for="slot in mealSlots"
                :key="slot.key"
                class="slot-card"
                @dragover.prevent
                @drop="onDrop(dayIndex, slot.key)"
              >
                <div class="slot-label">{{ slot.label }}</div>
                <div
                  v-if="day.meals?.[slot.key]"
                  class="slot-meal"
                  draggable="true"
                  @dragstart="onDragStart(day.meals?.[slot.key], { type: 'slot', dayIndex, slot: slot.key })"
                  @click="openMealModal(day.day, slot.label, day.meals?.[slot.key])"
                >
                  <div class="text-body2 text-weight-bold">{{ day.meals?.[slot.key]?.title || day.meals?.[slot.key] }}</div>
                  <div class="text-caption text-grey-6">
                    {{ day.meals?.[slot.key]?.category || day.meals?.[slot.key]?.tag || 'Sin categoría' }}
                  </div>
                  <div v-if="hasMealStats(day.meals?.[slot.key])" class="slot-stats slot-stats--compact q-mt-xs">
                    <div v-if="mealCaloriesValue(day.meals?.[slot.key])" class="slot-stat-card">
                      <span>Calorías</span>
                      <strong>{{ mealCaloriesValue(day.meals?.[slot.key]) }}</strong>
                    </div>
                    <div v-if="mealTimeValue(day.meals?.[slot.key])" class="slot-stat-card">
                      <span>Tiempo</span>
                      <strong>{{ mealTimeValue(day.meals?.[slot.key]) }}</strong>
                    </div>
                  </div>
                </div>
                <div v-else class="slot-empty">Suelta aquí</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="plan-actions q-mt-lg">
        <q-btn
          class="full-width btn-sol"
          unelevated
          no-caps
          icon="auto_awesome"
          label="Generar plan"
          :loading="wellnessStore.loadingWeeklyPlan"
          @click="generatePlan"
        />
        <q-btn
          class="full-width btn-ghost-campo"
          flat
          no-caps
          icon="shopping_cart"
          label="Ver lista de compra"
          :loading="wellnessStore.loadingShoppingList"
          @click="openShoppingList"
        />
      </div>
    </section>

    <!-- Progresivo: las herramientas de seguimiento se muestran solo si se piden -->
    <div class="tools-toggle q-mt-lg">
      <q-btn
        flat
        no-caps
        color="primary"
        :icon="showTools ? 'expand_less' : 'expand_more'"
        :label="showTools ? 'Ocultar herramientas de seguimiento' : 'Mostrar herramientas de seguimiento'"
        @click="showTools = !showTools"
      />
      <span class="tools-hint">Registro diario, presupuesto, sustituciones y hábitos</span>
    </div>

    <div v-show="showTools" class="plan-tools">
    <section class="section-card q-pa-md q-mt-md">
      <div class="section-header">
        <div>
          <div class="section-title">Registro y monitoreo diario</div>
          <div class="section-subtitle">Registra tus alimentos y observa patrones reales de consumo.</div>
        </div>
      </div>

      <div class="monitor-grid q-mt-md">
        <q-input v-model="dailyFoodForm.food_name" outlined dense label="Alimento" />
        <q-select
          v-model="dailyFoodForm.meal_type"
          outlined
          dense
          :options="mealTypeOptions"
          emit-value
          map-options
          label="Tipo de comida"
        />
        <q-input v-model="dailyFoodForm.quantity" outlined dense label="Cantidad" />
        <q-input v-model.number="dailyFoodForm.estimated_cost" outlined dense type="number" label="Costo estimado" />
        <q-input v-model.number="dailyFoodForm.calories_estimate" outlined dense type="number" label="Calorias" />
        <q-toggle v-model="dailyFoodForm.is_healthy" label="Es saludable" color="positive" />
      </div>

      <div class="plan-actions q-mt-sm">
        <q-btn class="btn-campo" unelevated no-caps icon="add_task" label="Registrar consumo" :loading="dailyLoading" @click="submitDailyLog" />
      </div>

      <div class="metrics-grid q-mt-md">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Registros (30 dias)</div>
            <div class="text-h6 text-weight-bold">{{ dailyPatterns.total_logs || 0 }}</div>
          </q-card-section>
        </q-card>
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Ratio saludable</div>
            <div class="text-h6 text-weight-bold">{{ formatPct(dailyPatterns.healthy_ratio) }}</div>
          </q-card-section>
        </q-card>
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Promedio diario</div>
            <div class="text-h6 text-weight-bold">{{ dailyPatterns.avg_daily_logs || 0 }}</div>
          </q-card-section>
        </q-card>
      </div>
    </section>

    <section class="section-card q-pa-md q-mt-md">
      <div class="section-header">
        <div>
          <div class="section-title">Planificacion con presupuesto</div>
          <div class="section-subtitle">Genera tu semana con objetivo de salud y limite de gasto.</div>
        </div>
      </div>

      <div class="monitor-grid q-mt-md">
        <q-input v-model.number="smartPlanForm.weekly_budget" outlined dense type="number" label="Presupuesto semanal" />
        <q-input v-model="smartPlanForm.health_focus" outlined dense label="Objetivo de salud" />
      </div>

      <div class="plan-actions q-mt-sm">
        <q-btn
          class="btn-campo"
          unelevated
          no-caps
          icon="auto_awesome"
          label="Generar plan inteligente"
          :loading="smartPlanLoading"
          @click="generateSmartPlan"
        />
      </div>

      <div v-if="smartBudget" class="metrics-grid q-mt-md">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Costo estimado</div>
            <div class="text-h6 text-weight-bold">{{ smartBudget.estimated_total_cost }}</div>
          </q-card-section>
        </q-card>
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Presupuesto</div>
            <div class="text-h6 text-weight-bold">{{ smartBudget.weekly_budget ?? 'N/D' }}</div>
          </q-card-section>
        </q-card>
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Estado</div>
            <div class="text-h6 text-weight-bold" :class="smartBudget.within_budget ? 'text-positive' : 'text-negative'">
              {{ smartBudget.within_budget ? 'Dentro del presupuesto' : 'Sobre presupuesto' }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </section>

    <section class="section-card q-pa-md q-mt-md">
      <div class="section-header">
        <div>
          <div class="section-title">Sustitucion de alimentos</div>
          <div class="section-subtitle">Cambia opciones no saludables por alternativas equilibradas.</div>
        </div>
      </div>

      <div class="monitor-grid q-mt-md">
        <q-input
          v-model="swapQuery"
          outlined
          dense
          label="Ingrediente o plato (ej: gaseosa, papas fritas)"
        />
      </div>

      <div class="plan-actions q-mt-sm">
        <q-btn class="btn-campo" unelevated no-caps icon="swap_horiz" label="Buscar sustituciones" :loading="swapLoading" @click="suggestSwaps" />
      </div>

      <div class="metrics-grid q-mt-sm">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Indicador de sustitucion</div>
            <div class="text-h6 text-weight-bold">{{ formatPct(swapIndicator.substitution_rate) }}</div>
          </q-card-section>
        </q-card>
      </div>

      <q-list v-if="swapSuggestions.length" bordered separator class="q-mt-md">
        <q-item v-for="item in swapSuggestions" :key="`${item.original}-${item.replacement}`">
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ item.original }} -> {{ item.replacement }}</q-item-label>
            <q-item-label caption>{{ item.reason }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn flat dense color="positive" icon="thumb_up" @click="acceptSwap(item)" />
          </q-item-section>
        </q-item>
      </q-list>
    </section>

    <section class="section-card q-pa-md q-mt-md">
      <div class="section-header">
        <div>
          <div class="section-title">Frecuencia de consumo saludable</div>
          <div class="section-subtitle">Reporte semanal para medir continuidad de habitos.</div>
        </div>
      </div>

      <div class="metrics-grid q-mt-md">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Periodo</div>
            <div class="text-h6 text-weight-bold">{{ frequencyReport.days || 0 }} dias</div>
          </q-card-section>
        </q-card>
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Saludables</div>
            <div class="text-h6 text-weight-bold">{{ frequencyReport.total_healthy || 0 }}</div>
          </q-card-section>
        </q-card>
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Ratio global</div>
            <div class="text-h6 text-weight-bold">{{ formatPct(frequencyReport.overall_healthy_ratio) }}</div>
          </q-card-section>
        </q-card>
      </div>

      <q-list v-if="frequencyReport.trend?.length" bordered separator class="q-mt-md">
        <q-item v-for="point in frequencyReport.trend.slice(-8)" :key="point.period_start">
          <q-item-section>
            <q-item-label class="text-weight-medium">Semana {{ point.period_start }}</q-item-label>
            <q-item-label caption>
              Saludables: {{ point.healthy_count }} | No saludables: {{ point.unhealthy_count }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>{{ formatPct(point.healthy_ratio) }}</q-item-section>
        </q-item>
      </q-list>
    </section>

    <section class="section-card q-pa-md q-mt-md">
      <div class="section-header">
        <div>
          <div class="section-title">Hábitos que suman</div>
          <div class="section-subtitle">Integra pequeños rituales diarios.</div>
        </div>
      </div>
      <div class="habit-grid q-mt-md">
        <div v-for="habit in habits" :key="habit.id" class="habit-card">
          <q-icon :name="habit.icon" color="primary" size="26px" />
          <div class="text-subtitle2 text-weight-bold">{{ habit.title }}</div>
          <div class="text-caption text-grey-6">{{ habit.detail }}</div>
        </div>
      </div>
    </section>
    </div>

    <q-dialog v-model="shoppingDialogOpen" maximized>
      <q-card class="shopping-dialog">
        <q-bar class="shopping-dialog__bar">
          <div class="text-weight-bold">Lista de compra</div>
          <q-space />
          <q-btn dense flat icon="close" v-close-popup />
        </q-bar>

        <q-inner-loading :showing="wellnessStore.loadingShoppingList">
          <q-spinner color="primary" size="32px" />
        </q-inner-loading>

        <div class="q-pa-md sl-body">
          <template v-if="shoppingList.length">
            <!-- Progreso: qué tan completa va la compra -->
            <div class="sl-top">
              <div class="sl-progress">
                <div class="sl-progress__track"><span :style="{ width: progressPct + '%' }" /></div>
                <span class="sl-progress__label">{{ checkedCount }} de {{ totalCount }} listos</span>
              </div>
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                class="sl-hide"
                :icon="hideChecked ? 'visibility' : 'visibility_off'"
                :label="hideChecked ? 'Mostrar comprados' : 'Ocultar comprados'"
                @click="hideChecked = !hideChecked"
              />
            </div>

            <!-- Secciones por pasillo, colapsables -->
            <section v-for="group in shoppingGroups" v-show="visibleItems(group).length" :key="group.category" class="sl-group">
              <button type="button" class="sl-group__head" @click="toggleGroup(group.category)">
                <q-icon :name="collapsed.has(group.category) ? 'chevron_right' : 'expand_more'" size="20px" />
                <span class="sl-group__title">{{ group.category }}</span>
                <span class="sl-group__count">{{ group.checked }}/{{ group.items.length }}</span>
              </button>
              <div v-show="!collapsed.has(group.category)" class="sl-items">
                <button
                  v-for="item in visibleItems(group)"
                  :key="item.name"
                  type="button"
                  class="sl-item"
                  :class="{ 'is-checked': isChecked(item) }"
                  @click="toggleItem(item)"
                >
                  <q-icon class="sl-item__check" :name="isChecked(item) ? 'check_circle' : 'radio_button_unchecked'" size="22px" />
                  <span class="sl-item__text">
                    <span class="sl-item__name">{{ item.name }}</span>
                    <span v-if="item.quantities?.length" class="sl-item__qty">{{ item.quantities.slice(0, 3).join(' · ') }}</span>
                  </span>
                </button>
              </div>
            </section>
          </template>

          <div v-else class="empty-state q-mt-md">
            <q-icon name="shopping_cart" size="36px" color="grey-5" />
            <div class="text-subtitle2 text-weight-bold">Aún no hay lista</div>
            <div class="text-caption text-grey-6">Genera el plan y vuelve a intentar.</div>
          </div>
        </div>
      </q-card>
    </q-dialog>

    <RecipeDetailDialog
      v-model="mealDialogOpen"
      :recipe="selectedMeal"
      :nutrition="selectedMealNutrition"
      :loading="mealDetailLoading"
      :favorite="selectedMealFavorite"
      @calculate="calculateMealNutrition"
      @register="registerMealConsumption"
      @toggle-favorite="toggleMealFavorite"
    />
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import RecipeDetailDialog from 'components/RecipeDetailDialog.vue'
import { useWellnessStore } from 'stores/wellness-store'

const wellnessStore = useWellnessStore()
const $q = useQuasar()

const shoppingDialogOpen = ref(false)
const mealDialogOpen = ref(false)
const selectedMeal = ref(null)
const mealDetailLoading = ref(false)
const editMode = ref(false)
const showTools = ref(false)

const weeklyPlan = computed(() => wellnessStore.weeklyPlan || [])
const pageLoading = computed(() => wellnessStore.loadingWeeklyPlan)

// Selector de día (móvil): 0 = Lunes ... 6 = Domingo. Hoy por defecto.
const todayIndex = (new Date().getDay() + 6) % 7
const selectedDayIndex = ref(todayIndex)

// En móvil mostramos solo el día elegido; en escritorio, la semana completa.
const displayedDays = computed(() => {
  const days = weeklyPlan.value || []
  if ($q.screen.lt.md) {
    const day = days[selectedDayIndex.value]
    return day ? [day] : days.slice(0, 1)
  }
  return days
})

function dayAbbr(label) {
  const map = {
    lunes: 'Lun', martes: 'Mar', miércoles: 'Mié', miercoles: 'Mié',
    jueves: 'Jue', viernes: 'Vie', sábado: 'Sáb', sabado: 'Sáb', domingo: 'Dom',
  }
  const key = String(label || '').toLowerCase()
  return map[key] || String(label || '').slice(0, 3)
}
const localPlan = ref([])
const dragState = ref(null)
const dailyLoading = ref(false)
const smartPlanLoading = ref(false)
const swapLoading = ref(false)

const dailyFoodForm = ref({
  meal_type: 'snack',
  food_name: '',
  quantity: '',
  estimated_cost: null,
  calories_estimate: null,
  is_healthy: true,
})

const smartPlanForm = ref({
  weekly_budget: 60,
  health_focus: 'equilibrio',
})

const dailyPatterns = ref({
  total_logs: 0,
  healthy_ratio: 0,
  avg_daily_logs: 0,
})

const smartBudget = ref(null)
const swapQuery = ref('')
const swapSuggestions = ref([])
const swapIndicator = ref({ substitution_rate: 0 })
const frequencyReport = ref({
  days: 0,
  total_healthy: 0,
  overall_healthy_ratio: 0,
  trend: [],
})

const mealTypeOptions = [
  { label: 'Desayuno', value: 'breakfast' },
  { label: 'Refrigerio', value: 'snack' },
  { label: 'Almuerzo', value: 'lunch' },
  { label: 'Cena', value: 'dinner' },
]

const mealSlots = [
  { key: 'breakfast', label: 'Desayuno' },
  { key: 'lunch', label: 'Almuerzo' },
  { key: 'dinner', label: 'Cena' },
]
const shoppingList = computed(() => wellnessStore.shoppingList || [])
const selectedMealNutrition = computed(() => {
  const recipeId = selectedMeal.value?.id
  return recipeId ? wellnessStore.nutritionByRecipe[recipeId] || null : null
})
const selectedMealFavorite = computed(() => {
  const recipeId = selectedMeal.value?.id
  return recipeId ? wellnessStore.favoriteIds.has(recipeId) : false
})

// --- Lista de compra: agrupada por pasillo + marcar lo comprado ---
const checkedItems = ref(new Set())
const collapsed = ref(new Set())
const hideChecked = ref(false)
const SHOPPING_KEY = 'vimel_shopping_checked'

const shoppingGroups = computed(() => {
  const order = []
  const map = new Map()
  for (const item of shoppingList.value) {
    const cat = item.category || 'Otros'
    if (!map.has(cat)) {
      map.set(cat, [])
      order.push(cat)
    }
    map.get(cat).push(item)
  }
  return order.map((cat) => {
    const items = map.get(cat)
    const checked = items.filter((it) => checkedItems.value.has(it.name)).length
    return { category: cat, items, checked }
  })
})

const totalCount = computed(() => shoppingList.value.length)
const checkedCount = computed(() => shoppingList.value.filter((it) => checkedItems.value.has(it.name)).length)
const progressPct = computed(() => (totalCount.value ? Math.round((checkedCount.value / totalCount.value) * 100) : 0))

function isChecked(item) {
  return checkedItems.value.has(item.name)
}
function toggleItem(item) {
  const next = new Set(checkedItems.value)
  if (next.has(item.name)) next.delete(item.name)
  else next.add(item.name)
  checkedItems.value = next
  try {
    window.localStorage.setItem(SHOPPING_KEY, JSON.stringify([...next]))
  } catch {
    // sin persistencia si localStorage no está disponible
  }
}
function toggleGroup(cat) {
  const next = new Set(collapsed.value)
  if (next.has(cat)) next.delete(cat)
  else next.add(cat)
  collapsed.value = next
}
function visibleItems(group) {
  if (!hideChecked.value) return group.items
  return group.items.filter((it) => !checkedItems.value.has(it.name))
}
function loadCheckedItems() {
  try {
    const raw = window.localStorage.getItem(SHOPPING_KEY)
    if (raw) checkedItems.value = new Set(JSON.parse(raw))
  } catch {
    // ignorar
  }
}

const availableRecipes = computed(() => {
  const catalog = wellnessStore.recipeCatalog || []
  if (catalog.length) {
    return catalog.slice(0, 18)
  }
  const fromPlan = localPlan.value.flatMap((day) =>
    ['breakfast', 'lunch', 'dinner']
      .map((slot) => day.meals?.[slot])
      .filter(Boolean)
  )
  return fromPlan
})

const habits = [
  { id: 1, icon: 'opacity', title: 'Hydrate & glow', detail: '1 vaso de agua al despertar y otros 6 durante el día.' },
  { id: 2, icon: 'self_improvement', title: 'Respira', detail: '3 minutos de respiración profunda antes de cada comida.' },
  { id: 3, icon: 'directions_walk', title: 'Camina', detail: 'Pequeñas caminatas después de almorzar para activar digestión.' },
]

async function generatePlan() {
  try {
    await wellnessStore.generateWeeklyPlan()
    $q.notify({ type: 'positive', message: 'Plan semanal actualizado', position: 'top' })
  } catch {
    $q.notify({ type: 'warning', message: 'No se pudo generar el plan.' })
  }
}

function formatPct(value) {
  const parsed = Number(value || 0)
  return `${(parsed * 100).toFixed(1)}%`
}

async function submitDailyLog() {
  if (!dailyFoodForm.value.food_name?.trim()) {
    $q.notify({ type: 'warning', message: 'Escribe un alimento para registrar.' })
    return
  }

  dailyLoading.value = true
  try {
    await api.post('/consumption/daily-log', {
      meal_type: dailyFoodForm.value.meal_type,
      food_name: dailyFoodForm.value.food_name,
      quantity: dailyFoodForm.value.quantity || null,
      estimated_cost: dailyFoodForm.value.estimated_cost,
      calories_estimate: dailyFoodForm.value.calories_estimate,
      is_healthy: dailyFoodForm.value.is_healthy,
    })
    dailyFoodForm.value.food_name = ''
    dailyFoodForm.value.quantity = ''
    dailyFoodForm.value.estimated_cost = null
    dailyFoodForm.value.calories_estimate = null
    await loadDailyPatterns()
    await loadHealthyFrequency()
    $q.notify({ type: 'positive', message: 'Consumo diario registrado.' })
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo registrar el consumo.' })
  } finally {
    dailyLoading.value = false
  }
}

async function loadDailyPatterns() {
  try {
    const { data } = await api.get('/consumption/patterns', { params: { days: 30 } })
    dailyPatterns.value = {
      total_logs: Number(data?.total_logs || 0),
      healthy_ratio: Number(data?.healthy_ratio || 0),
      avg_daily_logs: Number(data?.avg_daily_logs || 0),
    }
  } catch {
    dailyPatterns.value = { total_logs: 0, healthy_ratio: 0, avg_daily_logs: 0 }
  }
}

async function generateSmartPlan() {
  smartPlanLoading.value = true
  try {
    const { data } = await api.post('/weekly-plan/generate-smart', {
      include_snacks: true,
      weekly_budget: smartPlanForm.value.weekly_budget,
      health_focus: smartPlanForm.value.health_focus,
    })

    smartBudget.value = data?.budget || null
    if (data?.plan?.days) {
      wellnessStore.weeklyPlan = data.plan.days
      wellnessStore.weeklyPlanWeekStart = data.plan.week_start_date || null
    }

    $q.notify({ type: 'positive', message: 'Plan inteligente generado.' })
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo generar el plan inteligente.' })
  } finally {
    smartPlanLoading.value = false
  }
}

async function suggestSwaps() {
  if (!swapQuery.value?.trim()) {
    $q.notify({ type: 'warning', message: 'Escribe un ingrediente o plato para sugerir cambios.' })
    return
  }
  swapLoading.value = true
  try {
    const { data } = await api.post('/food-swaps/suggest', {
      query: swapQuery.value,
      max_suggestions: 6,
    })
    swapSuggestions.value = Array.isArray(data?.suggestions) ? data.suggestions : []
    if (!swapSuggestions.value.length) {
      $q.notify({ type: 'info', message: 'No se encontraron sustituciones directas.' })
    }
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo consultar sustituciones.' })
  } finally {
    swapLoading.value = false
  }
}

async function loadSwapIndicator() {
  try {
    const { data } = await api.get('/food-swaps/indicator', { params: { days: 90 } })
    swapIndicator.value = data || { substitution_rate: 0 }
  } catch {
    swapIndicator.value = { substitution_rate: 0 }
  }
}

async function acceptSwap(item) {
  try {
    await api.post('/food-swaps/register', {
      original_food: item.original,
      suggested_food: item.replacement,
      accepted: true,
    })
    await loadSwapIndicator()
    $q.notify({ type: 'positive', message: 'Sustitucion registrada.' })
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo guardar la sustitucion.' })
  }
}

async function loadHealthyFrequency() {
  try {
    const { data } = await api.get('/consumption/healthy-frequency', { params: { days: 90 } })
    frequencyReport.value = data || {
      days: 0,
      total_healthy: 0,
      overall_healthy_ratio: 0,
      trend: [],
    }
  } catch {
    frequencyReport.value = {
      days: 0,
      total_healthy: 0,
      overall_healthy_ratio: 0,
      trend: [],
    }
  }
}

function normalizeMeal(meal) {
  if (!meal) return null
  if (typeof meal === 'string') {
    return { title: meal, id: meal, category: null, tag: null, calories: null, time: null, description: null, ingredients: [], steps: [] }
  }
  return {
    id: meal.id ?? meal.slug ?? meal.title,
    title: meal.title || 'Receta',
    category: meal.category ?? meal.tag ?? null,
    tag: meal.tag ?? null,
    slug: meal.slug ?? null,
    calories: meal.calories ?? null,
    time: meal.time ?? meal.time_minutes ?? null,
    description: meal.description ?? null,
    image: meal.image ?? meal.image_url ?? null,
    ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
    steps: Array.isArray(meal.steps) ? meal.steps : [],
  }
}

function mealCaloriesValue(meal) {
  const calories = meal?.calories
  if (calories === null || calories === undefined || calories === '') return null
  return `${calories} kcal`
}

function mealTimeValue(meal) {
  return meal?.time ?? meal?.time_minutes ?? null
}

function hasMealStats(meal) {
  return Boolean(mealCaloriesValue(meal) || mealTimeValue(meal))
}

function buildLocalPlan(source) {
  return source.map((day) => ({
    day: day.day,
    theme: day.theme || 'Auto',
    meals: {
      breakfast: normalizeMeal(day.meals?.breakfast),
      lunch: normalizeMeal(day.meals?.lunch),
      dinner: normalizeMeal(day.meals?.dinner),
    },
  }))
}

function updateLocalPlan(dayIndex, slotKey, meal) {
  localPlan.value = localPlan.value.map((day, idx) => {
    if (idx !== dayIndex) return day
    return {
      ...day,
      meals: {
        ...day.meals,
        [slotKey]: meal,
      },
    }
  })
}

function onDragStart(meal, source = null) {
  dragState.value = { meal: normalizeMeal(meal), source }
}

function onDrop(dayIndex, slotKey) {
  const state = dragState.value
  if (!state?.meal) return

  updateLocalPlan(dayIndex, slotKey, state.meal)

  if (state.source?.type === 'slot') {
    const { dayIndex: fromDay, slot } = state.source
    if (!(fromDay === dayIndex && slot === slotKey)) {
      updateLocalPlan(fromDay, slot, null)
    }
  }

  dragState.value = null
}

async function openMealModal(dayLabel, slotLabel, meal) {
  const normalized = normalizeMeal(meal)
  if (!normalized) return

  selectedMeal.value = {
    ...normalized,
    day: dayLabel,
    slot: slotLabel,
  }
  mealDialogOpen.value = true

  if (!normalized.slug || (normalized.ingredients?.length && normalized.steps?.length)) return

  mealDetailLoading.value = true
  try {
    const detail = await wellnessStore.fetchRecipeDetail(normalized.slug)
    if (detail && selectedMeal.value?.slug === normalized.slug) {
      selectedMeal.value = {
        ...selectedMeal.value,
        ...detail,
        day: dayLabel,
        slot: slotLabel,
      }
    }
  } catch {
    $q.notify({ type: 'warning', message: 'No se pudo cargar el detalle completo de la receta.' })
  } finally {
    mealDetailLoading.value = false
  }
}

async function calculateMealNutrition(recipe) {
  try {
    await wellnessStore.calculateRecipeNutrition(recipe)
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo calcular el valor nutricional.' })
  }
}

async function registerMealConsumption(recipe) {
  try {
    await wellnessStore.registerConsumption(recipe, { portion: 1, baseline: false })
    $q.notify({ type: 'positive', message: 'Consumo registrado correctamente.' })
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo registrar el consumo.' })
  }
}

async function toggleMealFavorite(recipe) {
  try {
    await wellnessStore.toggleFavorite(recipe)
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo actualizar favoritos.' })
  }
}

async function openShoppingList() {
  shoppingDialogOpen.value = true
  loadCheckedItems()
  try {
    await wellnessStore.fetchShoppingList()
  } catch {
    $q.notify({ type: 'warning', message: 'No se pudo cargar la lista de compra.' })
  }
}

function randomTip() {
  $q.notify({
    type: 'info',
    message: 'Incluye grasas saludables (aguacate, semillas) para mejorar la saciedad.',
  })
}

function toggleEditMode() {
  editMode.value = !editMode.value
}

onMounted(() => {
  wellnessStore.fetchWeeklyPlan().catch(() => {})
  loadDailyPatterns().catch(() => {})
  loadSwapIndicator().catch(() => {})
  loadHealthyFrequency().catch(() => {})
})

watch(
  weeklyPlan,
  (value) => {
    if (!value?.length) {
      localPlan.value = []
      return
    }
    localPlan.value = buildLocalPlan(value)
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
/* ============================================================
   PlanPage — sistema "Amanecer en el campo"
   Texto bosque · Fraunces en títulos · paleta disciplinada.
   Las tres comidas se anclan al amanecer: desayuno = sol,
   almuerzo = campo (mediodía), cena = río (atardecer).
   ============================================================ */
.plan-page {
  padding: clamp(16px, 2.5vw, 26px);
  position: relative;
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.plan-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sp-4);
  flex-wrap: wrap;
  margin-bottom: 0;
}

.page-loader {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(245, 251, 248, 0.86);
  backdrop-filter: blur(6px);
}

.loader-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--sp-5) var(--sp-6);
  border-radius: var(--r-xl);
  background: #fff;
  box-shadow: var(--sh-3);
}

.loader-logo {
  width: 64px;
  height: 64px;
  border-radius: var(--r-lg);
  background: var(--aire-1);
  padding: 8px;
}

/* --- Tarjetas de sección (= superficie del sistema) --- */
.section-card {
  border-radius: var(--r-xl);
  background: #fff;
  box-shadow: var(--sh-2);
  border: 1px solid var(--line);
}

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sp-3);
}

.section-title {
  font-family: 'Fraunces', Georgia, serif;
  font-size: var(--fs-h3);
  font-weight: 700;
  color: var(--bosque);
  line-height: 1.15;
}

.section-subtitle {
  font-size: var(--fs-caption);
  color: var(--ink-2);
  font-weight: 600;
  margin-top: 2px;
}

/* --- Selector de día (móvil) --- */
.day-picker {
  display: flex;
  gap: var(--sp-2);
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.day-picker::-webkit-scrollbar {
  display: none;
}

.day-pill {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 54px;
  min-height: 48px;
  padding: 6px 10px;
  border-radius: var(--r-md);
  border: 1px solid var(--line-strong);
  background: #fff;
  color: var(--ink-2);
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  font-size: var(--fs-body);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}
.day-pill:focus-visible {
  outline: 2px solid var(--rio);
  outline-offset: 2px;
}
.day-pill--today {
  border-color: rgba(242, 167, 52, 0.55);
}
.day-pill--active {
  background: linear-gradient(180deg, var(--campo) 0%, var(--campo-hondo) 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 8px 18px rgba(31, 139, 87, 0.26);
}
.day-pill__today {
  font-family: 'Nunito Sans', sans-serif;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cta-gold-strong);
}
.day-pill--active .day-pill__today {
  color: var(--sol-glow);
}

/* --- Semana --- */
.weekly-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--sp-4);
}

.day-card {
  border-radius: var(--r-lg);
  padding: var(--sp-3);
  border: 1px solid var(--line);
  background: #fff;
  box-shadow: var(--sh-1);
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}

.day-badge {
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(52, 179, 106, 0.12);
  color: var(--campo-hondo);
  font-weight: 800;
  font-size: var(--fs-caption);
}

.day-theme {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--ink-3);
  text-transform: lowercase;
}

.day-schedule {
  display: grid;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
}

/* Slot: tarjeta blanca con barra de acento del amanecer a la izquierda */
.schedule-slot {
  border: 1px solid var(--line);
  border-left: 4px solid var(--line);
  border-radius: var(--r-md);
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 2px;
  background: #fff;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.schedule-slot:hover,
.schedule-slot:focus-visible {
  transform: translateY(-2px);
  box-shadow: var(--sh-1);
  outline: none;
}

.slot-time {
  font-size: var(--fs-eyebrow);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.slot-title {
  font-size: var(--fs-body);
  font-weight: 700;
  color: var(--bosque);
  line-height: 1.25;
}

.slot-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.slot-stats--compact {
  margin-top: 8px;
}

.slot-stat-card {
  min-height: 56px;
  padding: 8px 10px;
  border-radius: 14px;
  border: 1px solid rgba(52, 179, 106, 0.14);
  background: linear-gradient(180deg, #ffffff 0%, #f7fcf8 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  box-shadow: 0 4px 10px rgba(23, 58, 39, 0.05);
}

.slot-stat-card span {
  font-size: 0.72rem;
  font-weight: 800;
  color: #7a8f82;
}

.slot-stat-card strong {
  font-size: 0.92rem;
  line-height: 1.2;
  color: var(--bosque);
}

.slot-hint {
  font-size: 0.72rem;
  color: var(--ink-3);
}

.slot-breakfast {
  border-left-color: var(--sol);
}
.slot-breakfast .slot-time {
  color: var(--cta-gold-strong);
}
.slot-lunch {
  border-left-color: var(--campo);
}
.slot-lunch .slot-time {
  color: var(--campo-hondo);
}
.slot-dinner {
  border-left-color: var(--rio);
}
.slot-dinner .slot-time {
  color: var(--rio);
}

/* --- Botón fantasma verde (acciones secundarias) --- */
.btn-ghost-campo {
  color: var(--campo-hondo) !important;
  font-weight: 700;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-md);
}
.btn-ghost-campo:hover {
  background: rgba(52, 179, 106, 0.08);
}

/* --- Tablero de ajuste (drag & drop) --- */
.planner-board {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 3fr;
  gap: var(--sp-4);
}

.planner-pool {
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-lg);
  padding: var(--sp-4);
  background: var(--aire-0);
}

.pool-list {
  display: grid;
  gap: var(--sp-3);
  margin-top: var(--sp-3);
}

.pool-card {
  padding: var(--sp-3);
  border-radius: var(--r-md);
  background: #fff;
  border: 1px solid var(--line);
  box-shadow: var(--sh-1);
  cursor: grab;
}

.planner-canvas {
  display: grid;
  gap: var(--sp-3);
}

.canvas-day {
  border-radius: var(--r-lg);
  padding: var(--sp-4);
  border: 1px solid var(--line);
  background: var(--aire-0);
}

.canvas-slots {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--sp-3);
  margin-top: var(--sp-2);
}

.slot-card {
  border-radius: var(--r-md);
  padding: var(--sp-3);
  background: #fff;
  border: 1px dashed var(--line-strong);
  min-height: 90px;
}

.slot-label {
  font-size: var(--fs-eyebrow);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-3);
  margin-bottom: var(--sp-1);
}

.slot-meal {
  padding: var(--sp-3);
  border-radius: var(--r-sm);
  background: rgba(52, 179, 106, 0.1);
  border: 1px solid rgba(52, 179, 106, 0.22);
  cursor: grab;
}

.slot-empty {
  font-size: var(--fs-caption);
  color: var(--ink-3);
}

.plan-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--sp-3);
}

@media (max-width: 640px) {
  .slot-stats {
    grid-template-columns: 1fr;
  }
}

/* --- Herramientas avanzadas (progresivo) --- */
.tools-toggle {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.tools-hint {
  font-size: var(--fs-caption);
  color: var(--ink-3);
}

.plan-tools {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.monitor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--sp-3);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--sp-3);
}

/* Tarjetas de métrica con el aspecto "stat" del sistema */
.metrics-grid :deep(.q-card) {
  border-radius: var(--r-md);
  border: 1px solid rgba(52, 179, 106, 0.16);
  background: rgba(52, 179, 106, 0.06);
  box-shadow: none;
}
.metrics-grid :deep(.text-h6) {
  font-family: 'Fraunces', Georgia, serif;
  color: var(--bosque);
}

/* --- Hábitos --- */
.habit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--sp-4);
}

.habit-card {
  border-radius: var(--r-lg);
  padding: var(--sp-5);
  background: var(--aire-0);
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  box-shadow: var(--sh-1);
}
.habit-card .text-subtitle2 {
  color: var(--bosque);
}

/* --- Diálogos --- */
.shopping-dialog {
  background: var(--aire-0);
}

.shopping-dialog__bar {
  background: linear-gradient(120deg, var(--aire-1), var(--aire-0));
  color: var(--bosque);
  border-bottom: 1px solid var(--line);
}

/* --- Lista de compra --- */
.sl-body {
  max-width: 640px;
  margin: 0 auto;
}
.sl-top {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: var(--sp-4);
}
.sl-progress {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex: 1;
  min-width: 180px;
}
.sl-progress__track {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: rgba(23, 58, 39, 0.1);
  overflow: hidden;
}
.sl-progress__track span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--campo) 0%, var(--campo-hondo) 100%);
  transition: width 0.3s ease;
}
.sl-progress__label {
  font-size: var(--fs-caption);
  font-weight: 700;
  color: var(--ink-2);
  white-space: nowrap;
}
.sl-hide {
  color: var(--rio) !important;
}

.sl-group {
  margin-bottom: var(--sp-3);
}
.sl-group__head {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
  padding: var(--sp-2) var(--sp-1);
  background: none;
  border: none;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  color: var(--campo-hondo);
}
.sl-group__title {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  font-size: 1.02rem;
  color: var(--bosque);
}
.sl-group__count {
  margin-left: auto;
  font-size: var(--fs-caption);
  font-weight: 800;
  color: var(--ink-3);
}

.sl-items {
  display: flex;
  flex-direction: column;
  padding-top: var(--sp-1);
}
.sl-item {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  text-align: left;
  padding: var(--sp-3) var(--sp-2);
  background: none;
  border: none;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.sl-item__check {
  flex: none;
  color: var(--line-strong);
  transition: color 0.15s ease;
}
.sl-item__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.sl-item__name {
  font-weight: 700;
  color: var(--bosque);
  font-size: var(--fs-body);
  transition:
    color 0.15s ease,
    text-decoration-color 0.15s ease;
}
.sl-item__qty {
  font-size: var(--fs-caption);
  color: var(--ink-2);
}
.sl-item.is-checked .sl-item__check {
  color: var(--campo);
}
.sl-item.is-checked .sl-item__name {
  text-decoration: line-through;
  color: var(--ink-3);
}
.sl-item.is-checked .sl-item__qty {
  color: var(--ink-3);
}
.sl-item.is-checked {
  opacity: 0.7;
}

.meal-dialog {
  min-width: 320px;
  max-width: 440px;
  border-radius: var(--r-xl);
}

.meal-meta {
  display: flex;
  gap: var(--sp-5);
  align-items: center;
  color: var(--ink-2);
  font-weight: 600;
}

@media (max-width: 720px) {
  .planner-board {
    grid-template-columns: 1fr;
  }
}
</style>
