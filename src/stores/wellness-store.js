import { defineStore, acceptHMRUpdate } from 'pinia'
import { api } from 'boot/axios'

const sampleWeeklyPlan = [
  {
    day: 'Lunes',
    theme: 'Arranque ligero',
    meals: {
      breakfast: 'Avena overnight con semillas',
      lunch: 'Bowl de quinoa mediterranea',
      dinner: 'Crema de calabaza + tofu',
    },
  },
  {
    day: 'Martes',
    theme: 'Foco proteínas',
    meals: {
      breakfast: 'Smoothie verde detox',
      lunch: 'Tacos de lechuga con pollo',
      dinner: 'Pescado al horno y espárragos',
    },
  },
  {
    day: 'Miércoles',
    theme: 'Colores vivos',
    meals: {
      breakfast: 'Tostadas integrales + hummus',
      lunch: 'Poke bowl vegetal',
      dinner: 'Pasta integral con pesto de kale',
    },
  },
  {
    day: 'Jueves',
    theme: 'Frescura cítrica',
    meals: {
      breakfast: 'Parfait cítrico de chía',
      lunch: 'Wrap de falafel al horno',
      dinner: 'Sopa de miso con tofu',
    },
  },
  {
    day: 'Viernes',
    theme: 'Recarga consciente',
    meals: {
      breakfast: 'Pancakes de avena y plátano',
      lunch: 'Arroz integral con verduras salteadas',
      dinner: 'Bowl de garbanzos especiados',
    },
  },
]

const STORAGE_KEYS = {
  favorites: 'vimel_favorite_recipes',
  recent: 'vimel_recent_recipes',
}

function loadFromStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage failures
  }
}

function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined) return null
  const parsed = Number(minutes)
  if (!Number.isFinite(parsed)) return null
  return `${Math.round(parsed)} min`
}

function normalizeImageUrl(url) {
  if (!url) return null
  const trimmed = String(url).trim()
  if (!trimmed) return null

  // Dataset sometimes ships with a generic flag placeholder.
  if (trimmed.includes('/uswds/img/us_flag_small.png')) return null

  // Avoid mixed-content issues and normalize scheme.
  let normalized = trimmed
  if (normalized.startsWith('//')) normalized = `https:${normalized}`
  if (normalized.startsWith('http://')) normalized = `https://${normalized.slice('http://'.length)}`

  // Basic encoding for spaces.
  normalized = normalized.replaceAll(' ', '%20')
  return normalized
}

function normalizeRecipeSummary(dto) {
  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    description: dto.description ?? null,
    tag: dto.tag ?? null,
    category: dto.category ?? dto.tag ?? null,
    calories: dto.calories ?? null,
    time: formatMinutes(dto.time_minutes),
    image: normalizeImageUrl(dto.image_url),
    dietTags: Array.isArray(dto.diet_tags) ? dto.diet_tags : [],
    seenAt: dto.seen_at ?? null,
  }
}

function normalizeRecipeDetail(dto) {
  const summary = normalizeRecipeSummary(dto)
  const ingredients = Array.isArray(dto.ingredients)
    ? dto.ingredients.map((item) => ({
        name: item.name,
        quantity: item.quantity ?? null,
        swap: item.swap ?? null,
        optional: Boolean(item.optional),
      }))
    : []

  const steps = Array.isArray(dto.steps)
    ? [...dto.steps]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((step) => step.instruction)
        .filter(Boolean)
    : []

  return {
    ...summary,
    ingredients,
    steps,
  }
}

export const useWellnessStore = defineStore('wellness', {
  state: () => ({
    recipeCatalog: [],
    recipeCategories: [],
    loadingCategories: false,
    recommendedMeals: [],
    loadingRecipes: false,
    recipesTotal: 0,
    catalogSkip: 0,
    catalogLimit: 25,
    activeCategory: null,
    activeSearch: null,
    weeklyPlan: [],
    weeklyPlanWeekStart: null,
    loadingWeeklyPlan: false,
    shoppingList: [],
    loadingShoppingList: false,
    favoriteRecipes: loadFromStorage(STORAGE_KEYS.favorites, []),
    recentRecipes: loadFromStorage(STORAGE_KEYS.recent, []),
    collectionsLoaded: false,
    missingPantry: [],
    nutritionByRecipe: {},
    nutritionSummary: null,
    nutritionComparison: null,
    loadingNutrition: false,
    loadingNutritionDashboard: false,
  }),

  getters: {
    favoriteIds(state) {
      return new Set(state.favoriteRecipes.map((item) => item.id))
    },

    categoryBuckets(state) {
      if (Array.isArray(state.recipeCategories) && state.recipeCategories.length) {
        return state.recipeCategories
      }

      const buckets = new Map()
      state.recipeCatalog.forEach((recipe) => {
        const key = recipe.category || recipe.tag || 'Sin categoría'
        buckets.set(key, (buckets.get(key) || 0) + 1)
      })

      return Array.from(buckets.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    },

    ingredientUniverse(state) {
      const set = new Set()
      state.recommendedMeals.forEach((meal) => {
        meal.ingredients?.forEach((ingredient) => {
          set.add(ingredient.name)
        })
      })
      return Array.from(set)
    },

    hasMoreRecipes(state) {
      return state.catalogSkip < state.recipesTotal
    },
  },

  actions: {
    hydrateCollectionsFromStorage() {
      this.favoriteRecipes = loadFromStorage(STORAGE_KEYS.favorites, [])
      this.recentRecipes = loadFromStorage(STORAGE_KEYS.recent, [])
      this.collectionsLoaded = true
    },

    async refreshCollections() {
      // Intenta leer de backend; si no hay sesión (401), usa localStorage.
      try {
        const [favRes, recRes] = await Promise.all([
          api.get('/favorites'),
          api.get('/recents', { params: { limit: 12 } }),
        ])

        const favorites = Array.isArray(favRes?.data?.items) ? favRes.data.items.map(normalizeRecipeSummary) : []
        const recents = Array.isArray(recRes?.data?.items) ? recRes.data.items.map(normalizeRecipeSummary) : []

        this.favoriteRecipes = favorites
        this.recentRecipes = recents
        saveToStorage(STORAGE_KEYS.favorites, favorites)
        saveToStorage(STORAGE_KEYS.recent, recents)
        this.collectionsLoaded = true
      } catch (err) {
        const status = err?.response?.status
        if (status === 401 || status === 403) {
          this.hydrateCollectionsFromStorage()
          return
        }
        // Error de red/servidor: no tumbar la UI, mantener lo local.
        this.hydrateCollectionsFromStorage()
      }
    },

    async ensureInitialRecipes() {
      if (this.loadingRecipes) return
      if (!this.recipeCategories.length) {
        this.fetchRecipeCategories().catch(() => {})
      }

      if (!this.collectionsLoaded) {
        this.refreshCollections().catch(() => {})
      }

      if (this.recipeCatalog.length) return
      await this.fetchRecipes({ reset: true })
    },

    async fetchWeeklyPlan() {
      if (this.loadingWeeklyPlan) return
      this.loadingWeeklyPlan = true
      try {
        const { data } = await api.get('/weekly-plan')
        const days = Array.isArray(data?.days) ? data.days : []
        this.weeklyPlanWeekStart = data?.week_start_date ?? null
        this.weeklyPlan = days
      } catch (err) {
        const status = err?.response?.status
        if (status === 401 || status === 403) {
          // Fallback si no hay sesión.
          this.weeklyPlan = sampleWeeklyPlan
          return
        }
        // Fallback suave.
        this.weeklyPlan = this.weeklyPlan?.length ? this.weeklyPlan : sampleWeeklyPlan
      } finally {
        this.loadingWeeklyPlan = false
      }
    },

    async generateWeeklyPlan() {
      if (this.loadingWeeklyPlan) return
      this.loadingWeeklyPlan = true
      try {
        const { data } = await api.post('/weekly-plan/generate')
        const days = Array.isArray(data?.days) ? data.days : []
        this.weeklyPlanWeekStart = data?.week_start_date ?? null
        this.weeklyPlan = days
      } catch (err) {
        const status = err?.response?.status
        if (status === 401 || status === 403) {
          this.weeklyPlan = sampleWeeklyPlan
        }
      } finally {
        this.loadingWeeklyPlan = false
      }
    },

    async fetchShoppingList() {
      if (this.loadingShoppingList) return
      this.loadingShoppingList = true
      try {
        const params = this.weeklyPlanWeekStart ? { week_start: this.weeklyPlanWeekStart } : undefined
        const { data } = await api.get('/weekly-plan/shopping-list', { params })
        this.shoppingList = Array.isArray(data?.items) ? data.items : []
      } catch (err) {
        const status = err?.response?.status
        if (status === 401 || status === 403) {
          this.shoppingList = []
          return
        }
        this.shoppingList = this.shoppingList || []
      } finally {
        this.loadingShoppingList = false
      }
    },

    async fetchRecipeCategories() {
      if (this.loadingCategories) return
      this.loadingCategories = true
      try {
        const { data } = await api.get('/recipe-categories')
        this.recipeCategories = Array.isArray(data)
          ? data
              .filter((item) => item && typeof item.label === 'string')
              .map((item) => ({ label: item.label, count: Number(item.count) || 0 }))
          : []
      } finally {
        this.loadingCategories = false
      }
    },

    async fetchRecipes({ reset = false, search = null, category = null, limit = null } = {}) {
      if (this.loadingRecipes) return
      this.loadingRecipes = true
      try {
        const effectiveCategory = reset ? category : this.activeCategory
        const effectiveSearch = reset ? search : this.activeSearch

        const skip = reset ? 0 : this.catalogSkip
        const pageSize = Number.isFinite(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 100) : this.catalogLimit
        const params = { skip, limit: pageSize }

        if (effectiveCategory && String(effectiveCategory).trim()) {
          params.category = String(effectiveCategory).trim()
        }

        if (effectiveSearch && String(effectiveSearch).trim()) {
          params.search = String(effectiveSearch).trim()
        }

        const { data } = await api.get('/recipes', { params })
        const items = Array.isArray(data?.items) ? data.items.map(normalizeRecipeSummary) : []
        const total = Number.isFinite(Number(data?.total)) ? Number(data.total) : items.length

        if (reset) {
          this.activeCategory = effectiveCategory && String(effectiveCategory).trim() ? String(effectiveCategory).trim() : null
          this.activeSearch = effectiveSearch && String(effectiveSearch).trim() ? String(effectiveSearch).trim() : null
          this.recipeCatalog = items
        } else {
          const seen = new Set(this.recipeCatalog.map((r) => r.slug || r.id))
          const merged = [...this.recipeCatalog]
          items.forEach((r) => {
            const key = r.slug || r.id
            if (!seen.has(key)) {
              merged.push(r)
              seen.add(key)
            }
          })
          this.recipeCatalog = merged
        }

        this.recipesTotal = total
        this.catalogSkip = Math.min(skip + items.length, total)
        this.recommendedMeals = this.recipeCatalog.slice(0, 4)
      } finally {
        this.loadingRecipes = false
      }
    },

    async loadMoreFromApi() {
      if (this.loadingRecipes) return false
      if (!this.hasMoreRecipes) return true
      const before = this.recipeCatalog.length
      await this.fetchRecipes({ reset: false })
      const after = this.recipeCatalog.length
      const noNewItems = after <= before
      return noNewItems || !this.hasMoreRecipes
    },

    async fetchRecipeDetail(slug) {
      if (!slug) return null
      const { data } = await api.get(`/recipes/${slug}`)
      const detail = normalizeRecipeDetail(data)

      const idx = this.recipeCatalog.findIndex((r) => r.slug === detail.slug)
      if (idx !== -1) {
        const updated = [...this.recipeCatalog]
        updated[idx] = { ...updated[idx], ...detail }
        this.recipeCatalog = updated
      }
      return detail
    },

    shuffleRecommendations() {
      this.recipeCatalog = [...this.recipeCatalog].sort(() => Math.random() - 0.5)
      this.recommendedMeals = this.recipeCatalog.slice(0, 4)
    },

    async toggleFavorite(meal) {
      const exists = this.favoriteRecipes.find((item) => item.id === meal.id)
      if (exists) {
        this.favoriteRecipes = this.favoriteRecipes.filter((item) => item.id !== meal.id)
        saveToStorage(STORAGE_KEYS.favorites, this.favoriteRecipes)

        // Sync backend si hay sesión.
        if (meal?.slug) {
          try {
            await api.delete(`/favorites/${meal.slug}`)
            await this.refreshCollections()
          } catch (err) {
            const status = err?.response?.status
            if (status !== 401 && status !== 403) {
              // Mantener el cambio local aunque falle el servidor.
              // (evitamos bloquear la UX)
            }
          }
        }
        return
      }
      const entry = {
        id: meal.id,
        slug: meal.slug ?? null,
        title: meal.title,
        description: meal.description ?? null,
        category: meal.category ?? meal.tag ?? null,
        tag: meal.tag ?? null,
        calories: meal.calories,
        time: meal.time,
        image: meal.image,
      }
      this.favoriteRecipes = [entry, ...this.favoriteRecipes]
      saveToStorage(STORAGE_KEYS.favorites, this.favoriteRecipes)

      if (meal?.slug) {
        try {
          await api.post(`/favorites/${meal.slug}`)
          await this.refreshCollections()
        } catch (err) {
          const status = err?.response?.status
          if (status !== 401 && status !== 403) {
            // Mantener el cambio local si hay error de red/servidor.
          }
        }
      }
    },

    async clearRecent() {
      this.recentRecipes = []
      saveToStorage(STORAGE_KEYS.recent, this.recentRecipes)

      try {
        await api.delete('/recents')
      } catch (err) {
        const status = err?.response?.status
        if (status === 401 || status === 403) return
      }
    },

    async addRecent(item) {
      const filtered = this.recentRecipes.filter((entry) => entry.id !== item.id)
      const entry = {
        id: item.id,
        slug: item.slug ?? null,
        title: item.title,
        description: item.description ?? null,
        category: item.category ?? item.tag ?? null,
        tag: item.tag ?? null,
        calories: item.calories ?? null,
        time: item.time ?? null,
        image: item.image ?? null,
      }
      this.recentRecipes = [entry, ...filtered].slice(0, 12)
      saveToStorage(STORAGE_KEYS.recent, this.recentRecipes)

      if (!item?.slug) return

      try {
        await api.post(`/recents/${item.slug}`)
        await this.refreshCollections()
      } catch (err) {
        const status = err?.response?.status
        if (status === 401 || status === 403) return
      }
    },

    setMissingPantry(items) {
      this.missingPantry = Array.from(new Set(items))
    },

    toggleMissingPantry(item) {
      const set = new Set(this.missingPantry)
      if (set.has(item)) {
        set.delete(item)
      } else {
        set.add(item)
      }
      this.missingPantry = Array.from(set)
    },

    registerMissing(items) {
      const merged = new Set([...this.missingPantry, ...items])
      this.missingPantry = Array.from(merged)
    },

    async calculateRecipeNutrition(recipe, { forceRecalculate = false } = {}) {
      const recipeId = recipe?.id ?? null
      const recipeSlug = recipe?.slug ?? null
      if (!recipeId && !recipeSlug) return null

      this.loadingNutrition = true
      try {
        const { data } = await api.post('/nutrition/calculate', {
          recipe_id: recipeId,
          recipe_slug: recipeSlug,
          force_recalculate: Boolean(forceRecalculate),
        })

        const idKey = Number(data?.recipe?.id || recipeId || 0)
        if (idKey > 0 && data?.nutrition) {
          this.nutritionByRecipe = {
            ...this.nutritionByRecipe,
            [idKey]: data.nutrition,
          }
        }

        return data
      } finally {
        this.loadingNutrition = false
      }
    },

    async registerConsumption(recipe, { portion = 1, baseline = false } = {}) {
      const recipeId = recipe?.id ?? null
      const recipeSlug = recipe?.slug ?? null
      if (!recipeId && !recipeSlug) return null

      this.loadingNutrition = true
      try {
        const { data } = await api.post('/consumption/register', {
          recipe_id: recipeId,
          recipe_slug: recipeSlug,
          porcion: Number(portion) > 0 ? Number(portion) : 1,
          baseline: Boolean(baseline),
        })

        const idKey = Number(data?.recipe_id || recipeId || 0)
        if (idKey > 0 && data?.nutrition) {
          this.nutritionByRecipe = {
            ...this.nutritionByRecipe,
            [idKey]: data.nutrition,
          }
        }

        return data
      } finally {
        this.loadingNutrition = false
      }
    },

    async fetchNutritionSummary(days = 90) {
      this.loadingNutritionDashboard = true
      try {
        const safeDays = Math.min(Math.max(Number(days) || 90, 7), 365)
        const { data } = await api.get('/user/nutrition/summary', { params: { days: safeDays } })
        this.nutritionSummary = data || null
        return data
      } catch (err) {
        const status = err?.response?.status
        if (status === 401 || status === 403) {
          this.nutritionSummary = null
          return null
        }
        throw err
      } finally {
        this.loadingNutritionDashboard = false
      }
    },

    async fetchNutritionComparison() {
      this.loadingNutritionDashboard = true
      try {
        const { data } = await api.get('/user/nutrition/comparison')
        this.nutritionComparison = data || null
        return data
      } catch (err) {
        const status = err?.response?.status
        if (status === 401 || status === 403) {
          this.nutritionComparison = null
          return null
        }
        throw err
      } finally {
        this.loadingNutritionDashboard = false
      }
    },

    async refreshNutritionDashboard(days = 90) {
      this.loadingNutritionDashboard = true
      try {
        const [summary, comparison] = await Promise.all([
          this.fetchNutritionSummary(days),
          this.fetchNutritionComparison(),
        ])
        return { summary, comparison }
      } finally {
        this.loadingNutritionDashboard = false
      }
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useWellnessStore, import.meta.hot))
}
