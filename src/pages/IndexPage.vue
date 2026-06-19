<template>
  <q-page padding class="home">
    <!-- Cabecera: amanecer cálido + saludo + UNA acción dorada -->
    <section class="hero v-rise">
      <div class="hero-copy">
        <p class="v-eyebrow">Tu espacio</p>
        <h1 class="page-title">Hola, {{ displayName }}</h1>
        <p class="hero-goal">{{ goalMessage }}</p>

        <div class="hero-actions">
          <q-btn class="btn-sol" unelevated no-caps icon="search" label="Buscar recetas" to="/app/search" />
          <q-btn flat no-caps class="hero-ghost" icon="event_note" label="Ver mi plan" to="/app/plan" />
        </div>

        <div class="hero-stats">
          <div class="hero-stat">
            <span class="hero-stat__num">{{ wellnessStore.recipesTotal || 0 }}</span>
            <span class="hero-stat__label">recetas para explorar</span>
          </div>
          <div class="hero-stat">
            <span class="hero-stat__num">{{ favoritesCount }}</span>
            <span class="hero-stat__label">{{ favoritesCount === 1 ? 'favorita guardada' : 'favoritas guardadas' }}</span>
          </div>
          <div class="hero-stat">
            <span class="hero-stat__num">{{ categories?.length || 0 }}</span>
            <span class="hero-stat__label">categorías</span>
          </div>
        </div>
      </div>
      <div class="hero-sun" aria-hidden="true"></div>
    </section>

    <!-- Recomendado: abrir con lo más característico = comida real -->
    <section class="block">
      <div class="section-bar">
        <div>
          <p class="v-eyebrow">Para empezar hoy</p>
          <h2 class="section-title">Recetas frescas para ti</h2>
        </div>
        <q-btn flat no-caps color="primary" icon-right="arrow_forward" label="Ver todas" to="/app/search" />
      </div>

      <!-- Móvil: descubre deslizando (autoplay + me gusta), estilo "stories" -->
      <RecipeSwiper
        v-if="$q.screen.lt.md && discoveryRecipes.length"
        :recipes="discoveryRecipes"
        :favorite-ids="favoriteIds"
        @view="openRecipe"
        @toggle-favorite="wellnessStore.toggleFavorite"
      />

      <!-- Escritorio: rejilla de tarjetas -->
      <template v-else>
        <div v-if="loadingRecipes && !recommended.length" class="rec-grid">
          <q-skeleton v-for="n in 4" :key="n" height="240px" class="rec-skeleton" />
        </div>
        <div v-else-if="recommended.length" class="rec-grid">
          <RecipeCard
            v-for="recipe in recommended"
            :key="recipe.id"
            :recipe="recipe"
            :favorite="favoriteIds.has(recipe.id)"
            @view="openRecipe"
            @toggle-favorite="wellnessStore.toggleFavorite"
          />
        </div>
        <div v-else class="empty-state">
          <q-icon name="restaurant_menu" size="42px" class="empty-state__icon" />
          <div class="empty-state__title">Aún estamos cargando recetas</div>
          <p class="empty-state__hint">Vuelve en un momento o abre el buscador.</p>
        </div>
      </template>
    </section>

    <!-- Accesos rápidos -->
    <section class="block">
      <div class="section-bar">
        <div>
          <p class="v-eyebrow">Atajos</p>
          <h2 class="section-title">¿Qué quieres hacer?</h2>
        </div>
      </div>
      <div class="quick-grid">
        <button class="quick-card" type="button" @click="$router.push('/app/search')">
          <span class="quick-ico"><q-icon name="search" size="22px" /></span>
          <span class="quick-title">Buscar recetas</span>
          <span class="quick-sub">Filtra por ingrediente, tiempo o tipo.</span>
        </button>
        <button class="quick-card" type="button" @click="$router.push('/app/assistant')">
          <span class="quick-ico"><q-icon name="forum" size="22px" /></span>
          <span class="quick-title">Pedir ideas al asistente</span>
          <span class="quick-sub">Cuéntale qué tienes y te sugiere platos.</span>
        </button>
        <button class="quick-card" type="button" @click="$router.push('/app/plan')">
          <span class="quick-ico"><q-icon name="event_note" size="22px" /></span>
          <span class="quick-title">Planear la semana</span>
          <span class="quick-sub">Organiza tus comidas de un vistazo.</span>
        </button>
      </div>
    </section>

    <!-- Categorías -->
    <section class="block">
      <div class="section-bar">
        <div>
          <p class="v-eyebrow">Explora</p>
          <h2 class="section-title">Categorías</h2>
        </div>
        <q-btn flat no-caps color="primary" icon-right="arrow_forward" label="Ver todo" to="/app/search" />
      </div>

      <div v-if="loadingCategories" class="cat-grid">
        <q-skeleton v-for="n in 8" :key="n" height="62px" class="rec-skeleton" />
      </div>
      <!-- Móvil: tira horizontal compacta (menos scroll); escritorio: rejilla -->
      <div v-else-if="categories?.length" :class="$q.screen.lt.md ? 'cat-rail' : 'cat-grid'">
        <button
          v-for="category in categories"
          :key="category.label"
          class="cat-card"
          type="button"
          @click="handleCategory(category.label)"
        >
          <span class="cat-ico"><q-icon :name="categoryIcon(category.label)" size="22px" /></span>
          <span class="cat-text">
            <span class="cat-title">{{ category.label }}</span>
            <span class="cat-count">{{ category.count }} {{ category.count === 1 ? 'receta' : 'recetas' }}</span>
          </span>
        </button>
      </div>
      <div v-else class="empty-state">
        <q-icon name="local_florist" size="42px" class="empty-state__icon" />
        <div class="empty-state__title">Todavía no hay categorías</div>
        <p class="empty-state__hint">Aparecerán cuando se carguen las recetas.</p>
      </div>
    </section>

    <RecipeDetailDialog
      v-model="detailOpen"
      :recipe="activeRecipe"
      :favorite="activeRecipe ? favoriteIds.has(activeRecipe.id) : false"
      :nutrition="activeNutrition"
      :loading="loadingDetail"
      @toggle-favorite="wellnessStore.toggleFavorite"
      @calculate="calculateNutrition"
      @register="calculateNutrition"
    />
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth-store'
import { useProfileStore } from 'stores/profile-store'
import { useWellnessStore } from 'stores/wellness-store'
import RecipeCard from 'components/RecipeCard.vue'
import RecipeSwiper from 'components/RecipeSwiper.vue'
import RecipeDetailDialog from 'components/RecipeDetailDialog.vue'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()
const profileStore = useProfileStore()
const wellnessStore = useWellnessStore()

const displayName = computed(() => auth.user?.name || auth.user?.full_name || 'chef')
const goalMessage = computed(
  () =>
    profileStore.profile?.goal_message ||
    profileStore.profile?.goal ||
    'Encuentra recetas saludables hechas para tu día. Empieza por una búsqueda o pide ideas al asistente.'
)

const categories = computed(() => wellnessStore.categoryBuckets)
const loadingCategories = computed(() => wellnessStore.loadingCategories)
const loadingRecipes = computed(() => wellnessStore.loadingRecipes)
const favoriteIds = computed(() => wellnessStore.favoriteIds)
const favoritesCount = computed(() => wellnessStore.favoriteIds?.size || 0)
const recommended = computed(() => wellnessStore.recipeCatalog.slice(0, 4))
// Pool más amplio para el descubrimiento estilo swipe en móvil.
const discoveryRecipes = computed(() => wellnessStore.recipeCatalog.slice(0, 12))

const detailOpen = ref(false)
const activeRecipe = ref(null)
const loadingDetail = ref(false)
const activeNutrition = computed(() => {
  const id = activeRecipe.value?.id
  return id ? wellnessStore.nutritionByRecipe[id] || null : null
})

async function openRecipe(recipe) {
  activeRecipe.value = recipe
  detailOpen.value = true
  wellnessStore.addRecent(recipe).catch(() => {})
  if (recipe?.slug) {
    loadingDetail.value = true
    try {
      const detail = await wellnessStore.fetchRecipeDetail(recipe.slug)
      if (detail) activeRecipe.value = detail
    } catch {
      // mostramos lo que tengamos
    } finally {
      loadingDetail.value = false
    }
  }
}

async function calculateNutrition(recipe) {
  try {
    await wellnessStore.calculateRecipeNutrition(recipe, { forceRecalculate: false })
  } catch {
    // sin bloquear la vista
  }
}

const categoryIcon = (label) => {
  const key = String(label || '').toLowerCase()
  const mapping = {
    vegetariana: 'spa',
    'sin lacteos': 'no_meals',
    'sin lácteos': 'no_meals',
    'sin gluten': 'grain',
    sopas: 'ramen_dining',
    'salsas y aderezos': 'soup_kitchen',
    bocadillos: 'tapas',
    ensaladas: 'emoji_food_beverage',
    pan: 'bakery_dining',
    acompañamientos: 'restaurant',
    acompanamientos: 'restaurant',
    'bajo en grasa': 'monitor_weight',
    'bajo en sodio': 'favorite',
    bebidas: 'local_cafe',
    desayuno: 'breakfast_dining',
    almuerzo: 'lunch_dining',
    cena: 'dinner_dining',
    postres: 'icecream',
  }
  return mapping[key] || 'restaurant_menu'
}

function handleCategory(label) {
  router.push({ path: '/app/search', query: { category: label } })
}

onMounted(async () => {
  if (!profileStore.status) {
    try {
      await profileStore.fetchStatus()
    } catch {
      // ignore
    }
  }
  if (profileStore.status?.has_profile && !profileStore.profile) {
    try {
      await profileStore.fetchProfile()
    } catch {
      // ignore
    }
  }
  if (!wellnessStore.recipeCategories.length) {
    await wellnessStore.fetchRecipeCategories()
  }
  if (!wellnessStore.recipeCatalog.length) {
    await wellnessStore.fetchRecipes({ reset: true, limit: 25 })
  }
  if (!wellnessStore.collectionsLoaded) {
    wellnessStore.refreshCollections().catch(() => {})
  }
})
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--sp-7);
  max-width: 1120px;
  margin: 0 auto;
}

/* ---------- Hero ---------- */
.hero {
  position: relative;
  overflow: hidden;
  border-radius: var(--r-xl);
  padding: clamp(24px, 4vw, 40px);
  background:
    radial-gradient(420px 280px at 92% -40px, var(--sol-glow) 0%, transparent 70%),
    linear-gradient(135deg, #ffffff 0%, var(--aire-0) 100%);
  border: 1px solid var(--line);
  box-shadow: var(--sh-2);
}

.hero-copy {
  position: relative;
  z-index: 1;
  max-width: 640px;
}

.hero-goal {
  margin: var(--sp-3) 0 0;
  font-size: var(--fs-lead);
  line-height: 1.5;
  color: var(--ink-2);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
  margin: var(--sp-5) 0;
}

.hero-ghost {
  color: var(--campo-hondo);
  font-weight: 700;
}

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-6);
  padding-top: var(--sp-4);
  border-top: 1px solid var(--line);
}

.hero-stat {
  display: flex;
  flex-direction: column;
}

.hero-stat__num {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 800;
  font-size: 1.9rem;
  line-height: 1;
  color: var(--bosque);
}

.hero-stat__label {
  margin-top: var(--sp-1);
  font-size: var(--fs-caption);
  color: var(--ink-2);
  font-weight: 600;
}

/* Sol decorativo */
.hero-sun {
  position: absolute;
  top: -60px;
  right: -40px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, var(--sol) 0%, var(--sol-glow) 55%, transparent 72%);
  opacity: 0.55;
  pointer-events: none;
}

/* ---------- Bloques ---------- */
.block {
  display: flex;
  flex-direction: column;
}

.section-bar {
  align-items: flex-end;
}

/* ---------- Recomendados ---------- */
.rec-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--sp-4);
}

.rec-skeleton {
  border-radius: var(--r-lg);
}

/* ---------- Atajos ---------- */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sp-4);
}

.quick-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-1);
  text-align: left;
  padding: var(--sp-5);
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: #fff;
  box-shadow: var(--sh-1);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.quick-card:hover,
.quick-card:focus-visible {
  transform: translateY(-3px);
  box-shadow: var(--sh-2);
  border-color: rgba(52, 179, 106, 0.5);
  outline: none;
}

.quick-ico {
  display: inline-flex;
  width: 44px;
  height: 44px;
  border-radius: var(--r-sm);
  background: rgba(52, 179, 106, 0.12);
  color: var(--campo-hondo);
  align-items: center;
  justify-content: center;
  margin-bottom: var(--sp-2);
}

.quick-title {
  font-weight: 800;
  color: var(--bosque);
  font-size: 1.02rem;
}

.quick-sub {
  font-size: var(--fs-caption);
  color: var(--ink-2);
  line-height: 1.4;
}

/* ---------- Categorías ---------- */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--sp-3);
}

.cat-card {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  text-align: left;
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-md);
  border: 1px solid var(--line);
  background: #fff;
  box-shadow: var(--sh-1);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.cat-card:hover,
.cat-card:focus-visible {
  transform: translateY(-3px);
  box-shadow: var(--sh-2);
  border-color: rgba(52, 179, 106, 0.5);
  outline: none;
}

/* Tira horizontal compacta en móvil (una fila que se desliza) */
.cat-rail {
  display: flex;
  gap: var(--sp-3);
  overflow-x: auto;
  padding: 2px 0 var(--sp-3);
  scrollbar-width: none;
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
}
.cat-rail::-webkit-scrollbar {
  display: none;
}
.cat-rail .cat-card {
  flex: 0 0 auto;
  width: 124px;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-3);
  scroll-snap-align: start;
}

.cat-ico {
  display: inline-flex;
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: var(--r-sm);
  background: rgba(52, 179, 106, 0.12);
  color: var(--campo-hondo);
  align-items: center;
  justify-content: center;
}

.cat-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cat-title {
  font-weight: 700;
  color: var(--bosque);
  font-size: 0.95rem;
}

.cat-count {
  font-size: var(--fs-caption);
  color: var(--ink-2);
}

@media (max-width: 599px) {
  .hero-stats {
    gap: var(--sp-5);
  }
  .hero-sun {
    opacity: 0.35;
  }
}
</style>
