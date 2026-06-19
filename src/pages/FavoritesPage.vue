<template>
  <q-page class="favorites-page">
    <div class="favorites-hero q-pa-md">
      <div>
        <p class="v-eyebrow">Tu colección</p>
        <h1 class="page-title">Favoritos & recientes</h1>
        <p class="page-sub">Guarda platos que te inspiran y revisa lo último que exploraste.</p>
      </div>
      <div class="hero-actions-row">
        <q-btn flat round icon="query_stats" size="sm" color="primary" @click="loadNutritionDashboard" />
        <q-btn flat round icon="delete_sweep" size="sm" color="primary" @click="clearRecent" />
      </div>
    </div>

    <section class="section-card q-pa-md q-mb-md">
      <div class="section-header">
        <div>
          <div class="text-subtitle1 text-weight-bold">Progreso nutricional</div>
          <div class="text-caption text-grey-6">Evolución basada en tus consumos registrados.</div>
        </div>
        <q-btn flat dense round icon="monitoring" color="primary" @click="loadNutritionDashboard" />
      </div>
      <div class="nutrition-kpis q-mt-md">
        <div class="kpi-card">
          <div class="kpi-label">Prom. calorías</div>
          <div class="kpi-value">{{ fmt(summary?.avg_calories) }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Prom. proteínas</div>
          <div class="kpi-value">{{ fmt(summary?.avg_proteins) }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Prom. score</div>
          <div class="kpi-value">{{ fmt(summary?.avg_nutritional_score) }}</div>
        </div>
      </div>
      <div v-if="comparison" class="comparison-row q-mt-md text-caption text-grey-7">
        Antes vs después:
        Δ calorías {{ signed(comparison.delta_avg_calories) }} |
        Δ proteínas {{ signed(comparison.delta_avg_proteins) }} |
        Δ score {{ signed(comparison.delta_avg_nutritional_score) }}
      </div>
    </section>

    <section class="section-card q-pa-md">
      <div class="section-header">
        <div>
          <div class="text-subtitle1 text-weight-bold">Recetas favoritas</div>
          <div class="text-caption text-grey-6">Organiza tus básicos saludables.</div>
        </div>
        <q-btn flat dense round icon="bookmark_add" color="primary" @click="showTip" />
      </div>
      <div v-if="favorites.length" class="favorites-grid q-mt-md">
        <RecipeCard
          v-for="recipe in favorites"
          :key="recipe.id"
          :recipe="recipe"
          :favorite="true"
          @view="viewRecipe"
          @toggle-favorite="toggleFavorite"
        />
      </div>
      <div v-else class="empty-state q-mt-md">
        <q-icon name="favorite_border" size="36px" color="grey-5" />
        <div class="text-subtitle2 text-weight-bold">Aún no guardas recetas</div>
        <div class="text-caption text-grey-6">Explora el buscador y añade tus platos preferidos.</div>
      </div>
    </section>

    <section class="section-card q-pa-md q-mt-md">
      <div class="section-header">
        <div>
          <div class="text-subtitle1 text-weight-bold">Visto recientemente</div>
          <div class="text-caption text-grey-6">Lo último que exploraste.</div>
        </div>
        <q-btn flat dense round icon="refresh" color="primary" @click="replayRecent" />
      </div>
      <div v-if="recent.length" class="recent-list q-mt-md">
        <q-card v-for="item in recent" :key="item.id" class="recent-card">
          <q-img :src="item.image || recipeImageFallback" :ratio="4/3" class="recent-img" />
          <div class="recent-detail">
            <div class="text-subtitle2 text-weight-bold">{{ item.title }}</div>
            <div class="text-caption text-grey-6">{{ item.description }}</div>
            <div class="recent-meta">
              {{ item.category || item.tag || 'Sin categoría' }} · {{ item.time || 'N/D' }} · {{ item.calories ?? 'N/D' }} kcal
            </div>
            <div class="recent-actions q-mt-sm">
              <q-btn flat dense no-caps color="primary" icon="visibility" label="Ver receta" @click="viewRecipe(item)" />
              <q-btn
                v-if="!isFavorite(item.id)"
                flat
                dense
                no-caps
                color="primary"
                icon="favorite_border"
                label="Guardar"
                @click="toggleFavorite(item)"
              />
            </div>
          </div>
        </q-card>
      </div>
      <div v-else class="empty-state q-mt-md">
        <q-icon name="history" size="36px" color="grey-5" />
        <div class="text-subtitle2 text-weight-bold">Tu historial está limpio</div>
        <div class="text-caption text-grey-6">Empieza explorando nuevas combinaciones.</div>
      </div>
    </section>
    <q-dialog
      v-model="recipeDialogOpen"
      :maximized="$q.screen.lt.md"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="recipe-dialog">
        <q-bar class="recipe-dialog__bar">
          <div class="text-weight-bold">Detalle de receta</div>
          <q-space />
          <q-btn dense flat icon="close" v-close-popup />
        </q-bar>

        <q-inner-loading :showing="detailLoading">
          <q-spinner color="primary" size="32px" />
        </q-inner-loading>

        <div v-if="selectedRecipe" class="recipe-dialog__body">
          <q-img
            class="recipe-dialog__image"
            :src="selectedRecipe.image || recipeImageFallback"
            :ratio="16/9"
          />

          <div class="detail-header q-mt-md">
            <div class="recipe-title">{{ selectedRecipe.title }}</div>
            <div class="text-caption text-grey-7 q-mt-xs">
              Categoría:
              <span class="text-weight-medium">{{ selectedRecipe.category || selectedRecipe.tag || 'Sin categoría' }}</span>
            </div>
            <div v-if="selectedRecipe.description" class="text-body2 text-grey-7 q-mt-sm">
              {{ selectedRecipe.description }}
            </div>
          </div>

          <q-separator class="q-my-md" />

          <div class="detail-panel q-mb-md">
            <div class="text-subtitle1 text-weight-bold q-mb-sm">Valor nutricional</div>
            <div v-if="selectedNutrition" class="nutrition-grid">
              <div>Calorías: <strong>{{ fmt(selectedNutrition.calories) }} kcal</strong></div>
              <div>Proteínas: <strong>{{ fmt(selectedNutrition.proteins) }} g</strong></div>
              <div>Grasas: <strong>{{ fmt(selectedNutrition.fats) }} g</strong></div>
              <div>Carbohidratos: <strong>{{ fmt(selectedNutrition.carbohydrates) }} g</strong></div>
              <div>Azúcares: <strong>{{ fmt(selectedNutrition.sugars) }} g</strong></div>
              <div>Sodio: <strong>{{ fmt(selectedNutrition.sodium_mg) }} mg</strong></div>
              <div>Score: <strong>{{ fmt(selectedNutrition.nutritional_score) }}</strong></div>
            </div>
            <div v-else class="text-caption text-grey-6">Aún no calculada para esta receta.</div>
            <div class="q-mt-sm row q-gutter-sm">
              <q-btn dense color="secondary" icon="query_stats" label="Calcular" @click="calculateNutrition(selectedRecipe)" />
              <q-btn dense color="positive" icon="restaurant" label="Registrar consumo" @click="registerConsumption(selectedRecipe)" />
              <q-btn dense flat color="orange" icon="flag" label="Marcar baseline" @click="registerConsumption(selectedRecipe, true)" />
            </div>
          </div>

          <div class="detail-grid">
            <div class="detail-panel">
              <div class="text-subtitle1 text-weight-bold q-mb-sm">Ingredientes</div>
              <ul v-if="normalizedIngredients.length" class="ingredient-list">
                <li v-for="(ing, idx) in normalizedIngredients" :key="`ing-${idx}`" class="ingredient-item">
                  <div class="item-row">
                    <q-icon name="eco" color="primary" size="18px" class="item-icon" />
                    <div class="text-body2 text-grey-9">{{ formatIngredient(ing) || 'Ingrediente disponible' }}</div>
                  </div>
                  <div v-if="ingredientSwap(ing)" class="text-caption text-grey-6">Sugerencia: {{ ingredientSwap(ing) }}</div>
                </li>
              </ul>
              <div v-else class="text-caption text-grey-6">No hay ingredientes disponibles.</div>
            </div>

            <div class="detail-panel">
              <div class="text-subtitle1 text-weight-bold q-mb-sm">Preparación</div>
              <ol v-if="normalizedSteps.length" class="prep-steps">
                <li v-for="(step, idx) in normalizedSteps" :key="`step-${idx}`" class="prep-step">
                  <div class="item-row">
                    <q-icon name="check_circle" color="primary" size="18px" class="item-icon" />
                    <span class="text-body2">{{ formatStep(step) || 'Paso de preparación disponible' }}</span>
                  </div>
                </li>
              </ol>
              <div v-else class="text-caption text-grey-6">No hay pasos disponibles.</div>
            </div>
          </div>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useWellnessStore } from 'stores/wellness-store'
import RecipeCard from 'components/RecipeCard.vue'

const wellnessStore = useWellnessStore()
const $q = useQuasar()

const recipeImageFallback = '/icons/vimel-logo.png'
const recipeDialogOpen = ref(false)
const detailLoading = ref(false)
const selectedRecipe = ref(null)

const favorites = computed(() => mergeWithCatalog(wellnessStore.favoriteRecipes))
const recent = computed(() => mergeWithCatalog(wellnessStore.recentRecipes))
const normalizedIngredients = computed(() => normalizeToArray(resolveIngredientsSource(selectedRecipe.value)))
const normalizedSteps = computed(() => normalizeToArray(resolveStepsSource(selectedRecipe.value)))
const summary = computed(() => wellnessStore.nutritionSummary)
const comparison = computed(() => wellnessStore.nutritionComparison)
const selectedNutrition = computed(() => {
  const id = Number(selectedRecipe.value?.id || 0)
  if (!id) return null
  return wellnessStore.nutritionByRecipe?.[id] || null
})

function mergeWithCatalog(items) {
  const catalog = wellnessStore.recipeCatalog || []
  if (!Array.isArray(items) || !items.length) return []
  return items.map((entry) => {
    const match = catalog.find((r) => r.id === entry.id) || null
    return match ? { ...entry, ...match } : entry
  })
}

function toggleFavorite(recipe) {
  wellnessStore.toggleFavorite(recipe)
  $q.notify({ type: 'info', message: 'Actualizamos tus favoritos' })
}

function isFavorite(id) {
  return wellnessStore.favoriteIds.has(id)
}

function clearRecent() {
  wellnessStore.clearRecent()
  $q.notify({ type: 'info', message: 'Historial limpiado' })
}

function replayRecent() {
  $q.notify({ type: 'positive', message: 'Revisa estas recetas, perfectas para hoy.' })
}

async function viewRecipe(recipe) {
  wellnessStore.addRecent(recipe)
  selectedRecipe.value = recipe
  recipeDialogOpen.value = true

  if (!recipe?.slug) return
  const hasDetail = Array.isArray(recipe.ingredients) && recipe.ingredients.length && Array.isArray(recipe.steps) && recipe.steps.length
  if (hasDetail) return

  detailLoading.value = true
  try {
    const detail = await wellnessStore.fetchRecipeDetail(recipe.slug)
    if (detail) selectedRecipe.value = detail
    await calculateNutrition(detail || recipe)
  } catch {
    $q.notify({ type: 'warning', message: 'No se pudieron cargar todos los detalles.' })
  } finally {
    detailLoading.value = false
  }
}

async function calculateNutrition(recipe) {
  if (!recipe?.id && !recipe?.slug) return
  try {
    await wellnessStore.calculateRecipeNutrition(recipe)
    $q.notify({ type: 'positive', message: 'Cálculo nutricional actualizado.' })
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo calcular la nutrición.' })
  }
}

async function registerConsumption(recipe, baseline = false) {
  if (!recipe?.id && !recipe?.slug) return
  try {
    await wellnessStore.registerConsumption(recipe, { portion: 1, baseline })
    await loadNutritionDashboard()
    $q.notify({
      type: 'positive',
      message: baseline ? 'Consumo marcado como baseline.' : 'Consumo registrado correctamente.',
    })
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo registrar el consumo.' })
  }
}

async function loadNutritionDashboard() {
  try {
    await wellnessStore.refreshNutritionDashboard(90)
  } catch {
    $q.notify({ type: 'warning', message: 'No se pudo actualizar el panel nutricional.' })
  }
}

function fmt(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0.0'
  return num.toFixed(1)
}

function signed(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0.0'
  const abs = Math.abs(num).toFixed(1)
  return num >= 0 ? `+${abs}` : `-${abs}`
}

function showTip() {
  $q.notify({ type: 'info', message: 'Agrupa tus favoritos por momento del día para planear mejor.' })
}

function normalizeToArray(value) {
  if (Array.isArray(value)) return value
  if (value == null) return []
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|\.\s+|;\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
  }
  if (typeof value === 'object') {
    if (Array.isArray(value.items)) return value.items
    return [value]
  }
  return []
}

function resolveIngredientsSource(recipe) {
  if (!recipe || typeof recipe !== 'object') return null
  return (
    recipe.ingredients ??
    recipe.ingredient_list ??
    recipe.ingredients_list ??
    recipe.ingredientsText ??
    recipe.ingredients_text ??
    recipe.rawIngredients ??
    recipe.raw_ingredients ??
    null
  )
}

function resolveStepsSource(recipe) {
  if (!recipe || typeof recipe !== 'object') return null
  return (
    recipe.steps ??
    recipe.instructions ??
    recipe.preparation ??
    recipe.method ??
    recipe.directions ??
    recipe.instructions_text ??
    recipe.preparation_text ??
    null
  )
}

function formatIngredient(ingredient) {
  if (typeof ingredient === 'string') return ingredient
  if (!ingredient || typeof ingredient !== 'object') return ''

  const quantity = ingredient.quantity || ingredient.qty || ingredient.amount || ''
  const unit = ingredient.unit || ''
  const name = ingredient.name || ingredient.ingredient || ingredient.item || ingredient.text || ''

  const formatted = [quantity, unit, name].filter(Boolean).join(' ').trim()
  if (formatted) return formatted

  const firstValue = Object.values(ingredient).find((value) => typeof value === 'string' && value.trim())
  return firstValue ? String(firstValue).trim() : ''
}

function ingredientSwap(ingredient) {
  if (!ingredient || typeof ingredient !== 'object') return ''
  return ingredient.swap || ingredient.substitute || ingredient.alternative || ''
}

function formatStep(step) {
  if (typeof step === 'string') return step
  if (!step || typeof step !== 'object') return ''
  const formatted = step.text || step.description || step.step || step.instruction || step.title || ''
  if (formatted) return String(formatted).trim()

  const firstValue = Object.values(step).find((value) => typeof value === 'string' && value.trim())
  return firstValue ? String(firstValue).trim() : ''
}

onMounted(() => {
  wellnessStore.ensureInitialRecipes().catch(() => {})
  loadNutritionDashboard().catch(() => {})
})
</script>

<style scoped lang="scss">
.favorites-page {
  --accent-green: #1f8f63;
  --mint-soft: #effaf4;
  min-height: 100vh;
  padding: 16px;
  background: linear-gradient(180deg, #f6fffb 0%, #ffffff 60%);
  font-family: 'Nunito Sans', 'Segoe UI', sans-serif;
}

.favorites-hero {
  border-radius: 20px;
  background: linear-gradient(135deg, #def8e9 0%, #eaf6ff 100%);
  display: flex;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 16px 26px rgba(25, 134, 102, 0.12);
}

.hero-actions-row {
  display: flex;
  gap: 4px;
}

.nutrition-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.kpi-card {
  border: 1px solid rgba(31, 143, 99, 0.15);
  background: #f8fffb;
  border-radius: 12px;
  padding: 10px;
}

.kpi-label {
  font-size: 12px;
  color: #4f6b5d;
}

.kpi-value {
  font-size: 1.2rem;
  font-weight: 800;
  color: #1b5f43;
}

.comparison-row {
  border-top: 1px dashed rgba(31, 143, 99, 0.2);
  padding-top: 10px;
}

.nutrition-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.section-card {
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(31, 143, 99, 0.12);
  box-shadow: 0 10px 20px rgba(12, 104, 72, 0.08);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.favorite-card {
  border-radius: 16px;
  padding: 12px;
  border: 1px solid rgba(31, 143, 99, 0.12);
  box-shadow: 0 8px 16px rgba(11, 85, 60, 0.08);
}

.favorite-title {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
}

.favorite-meta {
  margin-top: 4px;
}

.favorite-img {
  border-radius: 12px;
  overflow: hidden;
}

.favorite-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-card {
  display: flex;
  gap: 12px;
  border-radius: 16px;
  overflow: hidden;
}

.recent-img {
  width: 130px;
}

.recent-detail {
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.recent-meta {
  margin-top: 4px;
  font-size: 13px;
  color: #64727c;
}

.empty-state {
  border: 1px dashed rgba(12, 104, 72, 0.2);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
}

.recipe-dialog {
  width: min(980px, 96vw);
  max-height: 96vh;
  border-radius: 20px;
  overflow: hidden;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

.recipe-dialog__bar {
  background: var(--mint-soft);
  border-bottom: 1px solid rgba(31, 143, 99, 0.12);
  position: sticky;
  top: 0;
  z-index: 2;
}

.recipe-dialog__body {
  padding: 16px 16px 22px;
  overflow-y: auto;
  flex: 1;
  overscroll-behavior: contain;
}

.recipe-dialog__image {
  border-radius: 14px;
  overflow: hidden;
}

.detail-header {
  padding: 4px 4px 0;
}

.recipe-title {
  font-size: 1.42rem;
  line-height: 1.3;
  font-weight: 800;
  color: #184531;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.detail-panel {
  background: #fbfffc;
  border: 1px solid rgba(31, 143, 99, 0.14);
  border-radius: 14px;
  padding: 12px;
}

.ingredient-list,
.prep-steps {
  margin: 0;
  padding-left: 1.1rem;
  list-style-position: inside;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ingredient-list {
  list-style: disc;
}

.prep-steps {
  list-style: decimal;
}

.ingredient-item,
.prep-step {
  color: #2a4135;
  line-height: 1.5;
  background: #ffffff;
  border-radius: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(31, 143, 99, 0.12);
  box-shadow: 0 6px 12px rgba(11, 85, 60, 0.08);
}

.ingredient-item::marker,
.prep-step::marker {
  color: #1f8f63;
  font-weight: 700;
}

.item-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.item-icon {
  margin-top: 2px;
}

@media (max-width: 480px) {
  .recent-card {
    flex-direction: column;
  }

  .recent-img {
    width: 100%;
  }

  .recipe-dialog {
    width: 100vw;
    max-height: 100vh;
    border-radius: 0;
  }

  .recipe-title {
    font-size: 1.2rem;
  }

  .recipe-dialog__body {
    padding: 14px 12px 18px;
  }
}
</style>
