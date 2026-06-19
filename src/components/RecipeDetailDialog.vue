<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="$q.screen.lt.md"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card class="recipe-dialog">
      <div class="rd-bar">
        <span class="rd-bar-title font-fraunces">Detalle de receta</span>
        <q-space />
        <q-btn dense flat round icon="close" v-close-popup />
      </div>

      <q-inner-loading :showing="loading">
        <q-spinner color="primary" size="34px" />
      </q-inner-loading>

      <div v-if="recipe" class="rd-body">
        <div class="rd-hero">
          <q-img v-if="recipe.image" :src="recipe.image" :ratio="16 / 9" class="rd-image" no-spinner>
            <template #error>
              <div class="rd-fallback"><q-icon name="restaurant_menu" size="56px" /></div>
            </template>
          </q-img>
          <div v-else class="rd-fallback rd-fallback--tall"><q-icon name="restaurant_menu" size="56px" /></div>
          <q-btn
            round
            unelevated
            class="rd-fav"
            :class="{ 'is-fav': favorite }"
            :icon="favorite ? 'favorite' : 'favorite_border'"
            @click="$emit('toggle-favorite', recipe)"
          />
        </div>

        <div class="rd-head">
          <span class="rd-cat">{{ recipe.category || recipe.tag || 'Receta' }}</span>
          <h2 class="rd-title font-fraunces">{{ recipe.title }}</h2>
          <p v-if="recipe.description" class="rd-desc">{{ recipe.description }}</p>
          <div class="rd-chips">
            <span class="rd-chip"><q-icon name="local_fire_department" size="16px" />{{ recipe.calories ?? 'N/D' }} kcal</span>
            <span class="rd-chip"><q-icon name="schedule" size="16px" />{{ recipe.time || 'Tiempo —' }}</span>
          </div>
        </div>

        <div class="rd-panel">
          <div class="rd-panel-head">
            <h3 class="rd-panel-title">Valor nutricional</h3>
            <div class="rd-panel-actions">
              <q-btn dense no-caps unelevated class="btn-soft-rio" icon="query_stats" label="Calcular" @click="$emit('calculate', recipe)" />
              <q-btn dense no-caps unelevated class="btn-campo" icon="restaurant" label="Registrar" @click="$emit('register', recipe)" />
            </div>
          </div>
          <div v-if="nutrition" class="nutri-grid">
            <div class="nutri-cell"><span>Calorías</span><strong>{{ fmt(nutrition.calories) }} kcal</strong></div>
            <div class="nutri-cell"><span>Proteínas</span><strong>{{ fmt(nutrition.proteins) }} g</strong></div>
            <div class="nutri-cell"><span>Grasas</span><strong>{{ fmt(nutrition.fats) }} g</strong></div>
            <div class="nutri-cell"><span>Carbohidratos</span><strong>{{ fmt(nutrition.carbohydrates) }} g</strong></div>
            <div class="nutri-cell"><span>Azúcares</span><strong>{{ fmt(nutrition.sugars) }} g</strong></div>
            <div class="nutri-cell"><span>Sodio</span><strong>{{ fmt(nutrition.sodium_mg) }} mg</strong></div>
            <div class="nutri-cell nutri-score"><span>Score</span><strong>{{ fmt(nutrition.nutritional_score) }}</strong></div>
          </div>
          <p v-else class="rd-empty">Aún no calculada. Toca «Calcular» para estimar sus macros.</p>
        </div>

        <div class="rd-grid">
          <div class="rd-panel">
            <h3 class="rd-panel-title"><q-icon name="eco" color="primary" /> Ingredientes</h3>
            <ul v-if="ingredients.length" class="rd-list">
              <li v-for="(ing, idx) in ingredients" :key="`ing-${idx}`" class="rd-item">
                <q-icon name="circle" size="7px" class="rd-bullet" />
                <div>
                  <div>{{ formatIngredient(ing) || 'Ingrediente disponible' }}</div>
                  <div v-if="ingredientSwap(ing)" class="rd-swap">Sugerencia: {{ ingredientSwap(ing) }}</div>
                </div>
              </li>
            </ul>
            <p v-else class="rd-empty">No hay ingredientes disponibles.</p>
          </div>

          <div class="rd-panel">
            <h3 class="rd-panel-title"><q-icon name="format_list_numbered" color="primary" /> Preparación</h3>
            <ol v-if="steps.length" class="rd-steps">
              <li v-for="(step, idx) in steps" :key="`step-${idx}`" class="rd-step">
                <span class="rd-step-num">{{ idx + 1 }}</span>
                <span>{{ formatStep(step) || 'Paso de preparación disponible' }}</span>
              </li>
            </ol>
            <p v-else class="rd-empty">No hay pasos disponibles.</p>
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  recipe: { type: Object, default: null },
  nutrition: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'calculate', 'register', 'toggle-favorite'])

const $q = useQuasar()

const ingredients = computed(() => normalizeToArray(resolveIngredientsSource(props.recipe)))
const steps = computed(() => normalizeToArray(resolveStepsSource(props.recipe)))

function fmt(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0.0'
  return num.toFixed(1)
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
</script>

<style scoped lang="scss">
.recipe-dialog {
  width: min(940px, 96vw);
  max-height: 96vh;
  border-radius: 22px;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.rd-bar {
  display: flex;
  align-items: center;
  padding: 10px 8px 10px 18px;
  background: linear-gradient(120deg, var(--aire-1), var(--aire-0));
  border-bottom: 1px solid rgba(31, 139, 87, 0.16);
  position: sticky;
  top: 0;
  z-index: 2;
}

.rd-bar-title {
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--bosque);
}

.rd-body {
  padding: 16px 18px 24px;
  overflow-y: auto;
  flex: 1;
  overscroll-behavior: contain;
}

.rd-hero {
  position: relative;
}

.rd-image {
  border-radius: 16px;
  overflow: hidden;
}

.rd-fallback {
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.9);
  background: linear-gradient(135deg, var(--campo) 0%, var(--campo-hondo) 100%);
  border-radius: 16px;
}

.rd-fallback--tall {
  aspect-ratio: 16 / 9;
}

.rd-fav {
  position: absolute;
  right: 12px;
  bottom: 12px;
  color: #fff;
  background: rgba(23, 58, 39, 0.42);
  backdrop-filter: blur(4px);
}

.rd-fav.is-fav {
  color: #ff6b6b;
  background: rgba(255, 255, 255, 0.92);
}

.rd-head {
  padding: 16px 4px 0;
}

.rd-cat {
  display: inline-block;
  background: rgba(52, 179, 106, 0.14);
  color: var(--campo-hondo);
  font-weight: 800;
  font-size: 0.74rem;
  padding: 3px 12px;
  border-radius: 999px;
  text-transform: capitalize;
}

.rd-title {
  margin: 8px 0 0;
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-weight: 800;
  line-height: 1.2;
  color: var(--bosque);
}

.rd-desc {
  margin: 8px 0 0;
  color: rgba(23, 58, 39, 0.66);
  line-height: 1.5;
}

.rd-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.rd-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(52, 179, 106, 0.12);
  color: var(--campo-hondo);
  font-weight: 700;
  font-size: 0.82rem;
  padding: 4px 12px;
  border-radius: 999px;
}

.rd-panel {
  margin-top: 16px;
  background: var(--aire-0);
  border: 1px solid rgba(31, 139, 87, 0.14);
  border-radius: 16px;
  padding: 16px;
}

.rd-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.rd-panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--bosque);
}

.rd-panel-actions {
  display: flex;
  gap: 8px;
}

.btn-soft-rio {
  background: rgba(37, 179, 194, 0.14);
  color: var(--rio);
  font-weight: 700;
  border-radius: 10px;
}

.nutri-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}

.nutri-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: #fff;
  border: 1px solid rgba(31, 139, 87, 0.12);
  border-radius: 12px;
  padding: 10px 12px;
}

.nutri-cell span {
  font-size: 0.74rem;
  color: rgba(23, 58, 39, 0.55);
  font-weight: 700;
}

.nutri-cell strong {
  color: var(--bosque);
  font-size: 1.02rem;
}

.nutri-score {
  background: linear-gradient(135deg, rgba(52, 179, 106, 0.16), rgba(37, 179, 194, 0.14));
}

.rd-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.rd-list,
.rd-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rd-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--bosque);
  line-height: 1.45;
}

.rd-bullet {
  color: var(--campo);
  margin-top: 7px;
  flex-shrink: 0;
}

.rd-swap {
  font-size: 0.78rem;
  color: rgba(23, 58, 39, 0.5);
}

.rd-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--bosque);
  line-height: 1.5;
}

.rd-step-num {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--campo), var(--campo-hondo));
  color: #fff;
  font-weight: 800;
  font-size: 0.78rem;
}

.rd-empty {
  margin: 0;
  color: rgba(23, 58, 39, 0.5);
  font-size: 0.88rem;
}
</style>
