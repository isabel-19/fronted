<template>
  <q-page class="search-page">
    <!-- Hero -->
    <header class="search-hero v-rise">
      <div class="hero-copy">
        <p class="v-eyebrow">Descubre algo nuevo</p>
        <h1 class="v-title">Buscador saludable</h1>
        <p class="v-sub">Filtra por ingrediente, tipo de dieta o tiempo y encuentra opciones frescas.</p>
      </div>
      <span class="hero-sun" aria-hidden="true"></span>
    </header>

    <!-- Filtros -->
    <section class="filters-card v-card v-rise">
      <q-input
        v-model="recipeSearch.text"
        outlined
        label="¿Qué se te antoja?"
        placeholder="Ej. avena, pollo, smoothie"
        @keyup.enter="onSearch"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
        <template #append>
          <q-btn unelevated no-caps class="btn-campo search-go" label="Buscar" @click="onSearch" />
        </template>
      </q-input>

      <div class="filter-grid">
        <q-select
          v-model="recipeSearch.category"
          :options="categoryOptions"
          outlined
          label="Categoría"
          emit-value
          map-options
          clearable
          @update:model-value="onSearch"
        />
        <q-select
          v-model="recipeSearch.diet"
          :options="dietOptions"
          outlined
          label="Tipo de dieta"
          emit-value
          map-options
          clearable
          @update:model-value="onSearch"
        />
        <q-select
          v-model="recipeSearch.time"
          :options="timeOptions"
          outlined
          label="Tiempo máximo"
          emit-value
          map-options
          clearable
          @update:model-value="onSearch"
        />
      </div>

      <div class="tag-cloud">
        <span class="tag-label">Sugerencias:</span>
        <q-chip
          v-for="tag in suggestedTags"
          :key="tag"
          clickable
          class="chip-soft"
          @click="selectTag(tag)"
        >
          {{ tag }}
        </q-chip>
      </div>
    </section>

    <!-- Resultados -->
    <section class="results-section">
      <div class="results-head">
        <div>
          <h2 class="v-section-title">Resultados</h2>
          <p class="results-count">{{ resultsLabel }}</p>
        </div>
        <q-btn flat round icon="restart_alt" color="primary" @click="onSearch">
          <q-tooltip>Refrescar resultados</q-tooltip>
        </q-btn>
      </div>

      <div v-if="loadingRecipes && !filteredResults.length" class="skeleton-grid">
        <div v-for="n in 6" :key="n" class="skeleton-card">
          <q-skeleton height="150px" square />
          <q-skeleton type="text" class="q-mt-sm" />
          <q-skeleton type="text" width="60%" />
        </div>
      </div>

      <template v-else-if="filteredResults.length">
        <div class="results-grid">
          <RecipeCard
            v-for="meal in pagedResults"
            :key="meal.id"
            :recipe="meal"
            :favorite="isFavorite(meal.id)"
            @view="openRecipeDetail"
            @toggle-favorite="toggleFavorite"
          />
        </div>

        <div v-if="hasMoreToShow" class="results-more">
          <q-btn class="results-more__btn" outline no-caps color="primary" icon="expand_more" label="Ver más recetas" @click="showMore" />
          <span class="results-more__hint">Mostrando {{ pagedResults.length }} de {{ filteredResults.length }}</span>
        </div>
      </template>

      <div v-else class="empty-state v-card">
        <q-icon name="travel_explore" size="46px" color="primary" />
        <h3>Sin coincidencias</h3>
        <p>Prueba con otro ingrediente o quita algún filtro.</p>
      </div>
    </section>

    <RecipeDetailDialog
      v-model="recipeDialogOpen"
      :recipe="selectedRecipe"
      :nutrition="selectedNutrition"
      :loading="detailLoading"
      :favorite="selectedRecipe ? isFavorite(selectedRecipe.id) : false"
      @calculate="calculateNutrition"
      @register="registerConsumption"
      @toggle-favorite="toggleFavorite"
    />
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { useWellnessStore } from 'stores/wellness-store'
import RecipeCard from 'components/RecipeCard.vue'
import RecipeDetailDialog from 'components/RecipeDetailDialog.vue'

const wellnessStore = useWellnessStore()
const $q = useQuasar()
const route = useRoute()

const recipeDialogOpen = ref(false)
const detailLoading = ref(false)
const selectedRecipe = ref(null)

const recipeSearch = ref({ text: '', category: null, diet: null, time: null })

const dietOptions = [
  { label: 'Balanceada', value: 'balanceada' },
  { label: 'Vegetariana', value: 'vegetariana' },
  { label: 'Vegana', value: 'vegana' },
  { label: 'Keto ligera', value: 'keto' },
  { label: 'Sin gluten', value: 'sin_gluten' },
]

const timeOptions = [
  { label: '-15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
]

const suggestedTags = ['sin lactosa', 'alto en proteína', 'snack', 'smoothie verde']

const loadingRecipes = computed(() => wellnessStore.loadingRecipes)
const favoriteIds = computed(() => wellnessStore.favoriteIds)
const selectedNutrition = computed(() => {
  const id = Number(selectedRecipe.value?.id || 0)
  if (!id) return null
  return wellnessStore.nutritionByRecipe?.[id] || null
})

const categoryOptions = computed(() => {
  const buckets = wellnessStore.categoryBuckets || []
  return buckets.map((b) => ({ label: `${b.label} (${b.count})`, value: b.label }))
})

const filteredResults = computed(() => {
  let results = wellnessStore.recipeCatalog
  if (recipeSearch.value.text) {
    const text = recipeSearch.value.text.toLowerCase()
    results = results.filter((meal) => {
      const title = (meal.title || '').toLowerCase()
      const desc = (meal.description || '').toLowerCase()
      const category = (meal.category || meal.tag || '').toLowerCase()
      const diets = Array.isArray(meal.dietTags)
        ? meal.dietTags.map((tag) => String(tag || '').toLowerCase())
        : []
      return title.includes(text) || desc.includes(text) || category.includes(text) || diets.some((tag) => tag.includes(text))
    })
  }

  if (recipeSearch.value.category) {
    const selected = String(recipeSearch.value.category).toLowerCase()
    results = results.filter((meal) => {
      const primary = (meal.category || meal.tag || '').toLowerCase()
      if (primary === selected) return true
      if (Array.isArray(meal.dietTags)) {
        return meal.dietTags.some((tag) => String(tag || '').toLowerCase() === selected)
      }
      return false
    })
  }

  if (recipeSearch.value.time) {
    results = results.filter((meal) => {
      const minutes = parseInt(meal.time)
      if (Number.isNaN(minutes)) return true
      return minutes <= recipeSearch.value.time
    })
  }
  return results
})

// Paginación: mostramos un puñado y dejamos cargar más (Krug: no scroll de 100)
const PAGE_SIZE = 12
const visibleCount = ref(PAGE_SIZE)
const pagedResults = computed(() => filteredResults.value.slice(0, visibleCount.value))
const hasMoreToShow = computed(() => filteredResults.value.length > pagedResults.value.length)
function showMore() {
  visibleCount.value += PAGE_SIZE
}
// Al cambiar los filtros (texto/categoría/tiempo) volvemos al primer bloque.
watch(
  () => [recipeSearch.value.text, recipeSearch.value.category, recipeSearch.value.diet, recipeSearch.value.time],
  () => {
    visibleCount.value = PAGE_SIZE
  }
)

const resultsLabel = computed(() => {
  if (!filteredResults.value.length) {
    return 'No encontramos coincidencias, prueba con otro ingrediente.'
  }
  return `${filteredResults.value.length} recetas listas para ti`
})

function isFavorite(id) {
  return favoriteIds.value.has(id)
}

function toggleFavorite(meal) {
  wellnessStore.toggleFavorite(meal)
  $q.notify({
    type: 'positive',
    message: isFavorite(meal.id) ? 'Receta guardada en favoritos' : 'Receta eliminada',
    icon: isFavorite(meal.id) ? 'favorite' : 'favorite_border',
  })
}

async function openRecipeDetail(meal) {
  selectedRecipe.value = meal
  recipeDialogOpen.value = true
  detailLoading.value = false

  wellnessStore.addRecent(meal)

  if (!meal?.slug) return

  const hasDetail = Array.isArray(meal.ingredients) && meal.ingredients.length && Array.isArray(meal.steps) && meal.steps.length
  if (hasDetail) return

  detailLoading.value = true
  try {
    const detail = await wellnessStore.fetchRecipeDetail(meal.slug)
    if (detail) {
      selectedRecipe.value = detail
    }
    await calculateNutrition(detail || meal)
  } catch {
    $q.notify({ type: 'warning', message: 'No se pudieron cargar todos los detalles.' })
  } finally {
    detailLoading.value = false
  }
}

async function calculateNutrition(meal) {
  if (!meal?.id && !meal?.slug) return
  try {
    await wellnessStore.calculateRecipeNutrition(meal)
    $q.notify({ type: 'positive', message: 'Nutrición calculada.' })
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo calcular la nutrición.' })
  }
}

async function registerConsumption(meal) {
  if (!meal?.id && !meal?.slug) return
  try {
    await wellnessStore.registerConsumption(meal, { portion: 1, baseline: false })
    await wellnessStore.refreshNutritionDashboard(90)
    $q.notify({ type: 'positive', message: 'Consumo registrado.' })
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo registrar el consumo.' })
  }
}

function selectTag(tag) {
  recipeSearch.value.text = tag
  onSearch()
}

async function onSearch() {
  const search = recipeSearch.value.text ? String(recipeSearch.value.text).trim() : null
  const category = recipeSearch.value.category ? String(recipeSearch.value.category).trim() : null
  try {
    await fetchAllResults({ search, category })
    if (!wellnessStore.recipeCatalog.length && (search || category)) {
      $q.notify({ type: 'warning', message: 'No encontramos coincidencias, prueba con otro texto.' })
    }
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo buscar en este momento.' })
  }
}

async function fetchAllResults({ search, category }) {
  await wellnessStore.fetchRecipes({ reset: true, search, category, limit: 100 })
  let guard = 0
  while (wellnessStore.hasMoreRecipes && guard < 50) {
    const done = await wellnessStore.loadMoreFromApi()
    if (done) break
    guard += 1
  }
}

async function applyCategoryFromRoute(value) {
  const category = value ? String(value).trim() : null
  if (category && recipeSearch.value.category !== category) {
    recipeSearch.value.category = category
  }
  await onSearch()
}

async function applySearchFromRoute(value) {
  const text = value ? String(value).trim() : ''
  recipeSearch.value.text = text
  await onSearch()
}

onMounted(async () => {
  wellnessStore.fetchRecipeCategories?.().catch(() => {})
  const searchFromRoute = route.query?.q
  const categoryFromRoute = route.query?.category
  if (searchFromRoute) {
    await applySearchFromRoute(searchFromRoute)
    return
  }
  if (categoryFromRoute) {
    await applyCategoryFromRoute(categoryFromRoute)
    return
  }
  wellnessStore.fetchRecipes({ reset: true, limit: 100 }).catch(() => {})
})

watch(
  () => route.query?.category,
  (value) => {
    if (value) applyCategoryFromRoute(value)
  },
)

watch(
  () => route.query?.q,
  (value) => {
    applySearchFromRoute(value)
  },
)
</script>

<style scoped lang="scss">
.search-page {
  min-height: 100%;
  padding: clamp(14px, 2.5vw, 26px);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Hero */
.search-hero {
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  padding: clamp(20px, 3vw, 30px);
  background: linear-gradient(125deg, #e7f6ee 0%, #f3faf4 55%, #fdf3e2 100%);
  border: 1px solid rgba(31, 139, 87, 0.12);
}

.hero-copy {
  position: relative;
  z-index: 2;
  max-width: 560px;
}

.hero-sun {
  position: absolute;
  top: -40px;
  right: -10px;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, #ffe08a 0%, #f8b62d 70%);
  box-shadow: 0 0 60px 18px rgba(248, 182, 45, 0.28);
  opacity: 0.9;
}

/* Filtros */
.filters-card {
  padding: clamp(16px, 2.4vw, 22px);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.search-go {
  min-height: 36px;
  padding: 0 16px;
  margin-right: -6px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.tag-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(23, 58, 39, 0.55);
}

/* Resultados */
.results-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.results-count {
  margin: 4px 0 0;
  color: rgba(23, 58, 39, 0.6);
  font-weight: 600;
  font-size: 0.9rem;
}

.results-grid,
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 18px;
  margin-top: 14px;
}

.results-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
}
.results-more__btn {
  border-radius: var(--r-md);
  font-weight: 800;
  padding: 6px 22px;
}
.results-more__hint {
  font-size: 0.82rem;
  color: rgba(23, 58, 39, 0.5);
  font-weight: 600;
}

.skeleton-card {
  border-radius: 20px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(23, 58, 39, 0.08);
  padding-bottom: 12px;
}

.skeleton-card :deep(.q-skeleton--type-text) {
  margin: 8px 12px 0;
}

.empty-state {
  margin-top: 14px;
  padding: 40px 20px;
  text-align: center;
  color: rgba(23, 58, 39, 0.6);
}

.empty-state h3 {
  margin: 12px 0 4px;
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  color: var(--bosque);
}

.empty-state p {
  margin: 0;
}

/* En móvil mantenemos 2 columnas para más densidad (menos scroll). */
@media (max-width: 600px) {
  .results-grid,
  .skeleton-grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}

@media (max-width: 330px) {
  .results-grid,
  .skeleton-grid {
    grid-template-columns: 1fr;
  }
}
</style>
