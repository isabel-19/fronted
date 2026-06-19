<template>
  <div class="floating-assistant">
    <q-btn
      round
      color="primary"
      size="lg"
      icon="smart_toy"
      class="floating-assistant__button"
      @click="open = true"
    >
      <q-menu
        v-model="open"
        anchor="top right"
        self="bottom right"
        :offset="[0, 12]"
        :auto-close="false"
      >
        <q-card class="floating-assistant__card">
          <q-bar class="floating-assistant__bar text-white">
            <div class="floating-assistant__hero-mark">
              <q-icon name="smart_toy" size="20px" />
            </div>
            <div>
              <div class="floating-assistant__title">Asistente</div>
              <div class="floating-assistant__subtitle">Recetas, preparación y hábitos saludables</div>
            </div>
            <q-space />
            <q-btn dense flat icon="close" @click="open = false" />
          </q-bar>

          <q-banner v-if="assistant.lastError" dense class="bg-red-1 text-red-8">
            No se pudo conectar con el asistente. Revisa que el backend esté activo.
          </q-banner>

          <q-card-section ref="messagesRef" class="floating-assistant__messages">
            <transition-group name="chat-list" tag="div" class="chat-list">
              <div v-for="message in assistant.messages" :key="message.id" :class="['chat-message', message.role]">
                <div class="chat-message__head">
                  <div :class="['chat-message__avatar', `is-${message.role}`]">
                    <q-icon :name="message.role === 'assistant' ? 'smart_toy' : 'person'" size="16px" />
                  </div>
                  <div class="chat-message__meta">
                    <div class="chat-message__role text-caption text-grey-6">
                      {{ message.role === 'assistant' ? 'Asistente' : 'Tú' }}
                    </div>
                  </div>
                </div>
                <div class="text-body2 q-mt-xs chat-message__content">{{ message.content }}</div>

                <div v-if="message.recipes?.length" class="chat-recipes q-mt-sm">
                  <div class="chat-recipes__label">Recetas sugeridas</div>
                  <transition-group name="chat-recipes" tag="div" class="chat-recipes__grid">
                    <q-card
                      v-for="recipe in message.recipes"
                      :key="recipe.id"
                      flat
                      bordered
                      class="chat-recipe-card"
                      clickable
                      @click.stop="openRecipeDetail(recipe)"
                    >
                      <q-card-section>
                        <div class="chat-recipe-card__topline">
                          <span class="chat-recipe-card__badge">Ver detalle</span>
                          <span v-if="recipe.category" class="chat-recipe-card__category">{{ recipe.category }}</span>
                        </div>
                        <div class="text-subtitle2 text-weight-bold chat-recipe-card__title">{{ recipe.title }}</div>
                        <div class="text-caption text-grey-7 q-mt-xs">
                          {{ recipe.description || 'Receta saludable recomendada.' }}
                        </div>
                        <div class="row items-center q-gutter-xs q-mt-sm chat-recipe-card__chips">
                          <q-chip v-if="recipe.time_minutes" dense color="primary" text-color="white">
                            {{ recipe.time_minutes }} min
                          </q-chip>
                          <q-chip v-if="recipe.calories" dense color="teal" text-color="white">
                            {{ recipe.calories }} kcal
                          </q-chip>
                        </div>
                        <div class="chat-recipe-card__footer">
                          <span>Ingredientes y preparación</span>
                          <q-icon name="arrow_forward" size="16px" />
                        </div>
                      </q-card-section>
                    </q-card>
                  </transition-group>
                </div>
              </div>
            </transition-group>

            <transition name="typing-fade">
              <div v-if="assistant.loading" class="assistant-typing q-mt-md">
              <q-spinner-dots color="primary" size="24px" />
              <span class="text-caption text-grey-6 q-ml-sm">Buscando ideas...</span>
              </div>
            </transition>
            <div ref="messagesEndRef" class="floating-assistant__end-anchor"></div>
          </q-card-section>

          <q-separator />

          <q-card-section class="floating-assistant__composer">
            <q-input
              v-model="draft"
              filled
              autogrow
              type="textarea"
              class="floating-assistant__input"
              label="Escribe tu mensaje"
              placeholder="Ej. Tengo pollo y arroz"
              @keydown.enter.exact.prevent="handleSend"
            />
            <div class="floating-assistant__hint">Pulsa Enter para enviar y usa las sugerencias para empezar más rápido.</div>
            <div class="row items-end justify-between q-mt-sm no-wrap q-col-gutter-sm">
              <div class="assistant-suggestions">
                <q-chip
                  v-for="suggestion in assistant.suggestions"
                  :key="suggestion"
                  clickable
                  outline
                  color="primary"
                  @click="useSuggestion(suggestion)"
                >
                  {{ suggestion }}
                </q-chip>
              </div>
              <q-btn color="primary" glossy unelevated class="floating-assistant__send" label="Enviar" :loading="assistant.loading" @click="handleSend" />
            </div>
          </q-card-section>
        </q-card>
      </q-menu>
    </q-btn>

    <RecipeDetailDialog
      v-model="recipeDialogOpen"
      :recipe="selectedRecipe"
      :nutrition="selectedNutrition"
      :loading="detailLoading"
      :favorite="selectedRecipe ? wellnessStore.favoriteIds.has(selectedRecipe.id) : false"
      @calculate="calculateNutrition"
      @register="registerConsumption"
      @toggle-favorite="toggleFavorite"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAssistantStore } from 'stores/assistant-store'
import { useWellnessStore } from 'stores/wellness-store'
import RecipeDetailDialog from 'components/RecipeDetailDialog.vue'

const assistant = useAssistantStore()
const wellnessStore = useWellnessStore()
const $q = useQuasar()
const draft = ref('')
const open = ref(false)
const recipeDialogOpen = ref(false)
const detailLoading = ref(false)
const selectedRecipe = ref(null)
const messagesRef = ref(null)
const messagesEndRef = ref(null)

const selectedNutrition = computed(() => {
  const id = Number(selectedRecipe.value?.id || 0)
  if (!id) return null
  return wellnessStore.nutritionByRecipe?.[id] || null
})

onMounted(() => {
  assistant.initWelcome()
})

async function scrollToBottom(behavior = 'smooth') {
  await nextTick()
  const container = messagesRef.value?.$el || messagesRef.value
  if (!container) return

  const anchor = messagesEndRef.value
  if (anchor && typeof anchor.scrollIntoView === 'function') {
    anchor.scrollIntoView({ block: 'end', behavior })
    return
  }

  if (typeof container.scrollTo === 'function') {
    container.scrollTo({ top: container.scrollHeight, behavior })
  }
}

watch(
  () => [open.value, assistant.messages.length, assistant.loading],
  async ([isOpen]) => {
    if (!isOpen) return
    await scrollToBottom(assistant.loading ? 'auto' : 'smooth')
  },
  { deep: true }
)

async function handleSend() {
  if (!draft.value.trim()) return
  assistant.sendMessage(draft.value)
  draft.value = ''
  await scrollToBottom('smooth')
}

function useSuggestion(text) {
  draft.value = text
  handleSend()
}

async function openRecipeDetail(recipe) {
  open.value = false
  selectedRecipe.value = recipe
  await nextTick()
  recipeDialogOpen.value = true
  detailLoading.value = false

  if (recipe) {
    wellnessStore.addRecent(recipe)
  }

  if (!recipe?.slug) return

  const hasDetail = Array.isArray(recipe.ingredients) && recipe.ingredients.length && Array.isArray(recipe.steps) && recipe.steps.length
  if (hasDetail) return

  detailLoading.value = true
  try {
    const detail = await wellnessStore.fetchRecipeDetail(recipe.slug)
    if (detail) {
      selectedRecipe.value = detail
    }
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
    $q.notify({ type: 'positive', message: 'Nutrición calculada.' })
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo calcular la nutrición.' })
  }
}

async function registerConsumption(recipe) {
  if (!recipe?.id && !recipe?.slug) return
  try {
    await wellnessStore.registerConsumption(recipe, { portion: 1, baseline: false })
    await wellnessStore.refreshNutritionDashboard(90)
    $q.notify({ type: 'positive', message: 'Consumo registrado.' })
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo registrar el consumo.' })
  }
}

function toggleFavorite(recipe) {
  wellnessStore.toggleFavorite(recipe)
  const isFavorite = wellnessStore.favoriteIds.has(recipe.id)
  $q.notify({
    type: 'positive',
    message: isFavorite ? 'Receta guardada en favoritos' : 'Receta eliminada',
    icon: isFavorite ? 'favorite' : 'favorite_border',
  })
}
</script>

<style scoped>
.floating-assistant {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 2000;
}

.floating-assistant__button {
  box-shadow: 0 14px 30px rgba(22, 90, 170, 0.25);
}

.floating-assistant__card {
  width: min(430px, 94vw);
  max-width: 94vw;
  max-height: min(78vh, 720px);
  border-radius: 22px;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border: 1px solid rgba(23, 58, 39, 0.08);
  background:
    radial-gradient(circle at top right, rgba(248, 182, 45, 0.18), transparent 28%),
    linear-gradient(180deg, #ffffff 0%, #f7fbf9 100%);
  box-shadow: 0 28px 60px rgba(23, 58, 39, 0.18);
}

.floating-assistant__bar {
  min-height: 68px;
  padding: 10px 12px 10px 16px;
  background: linear-gradient(135deg, var(--campo-hondo), var(--rio));
}

.floating-assistant__hero-mark {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  margin-right: 10px;
  color: white;
  background: rgba(255, 255, 255, 0.16);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

.floating-assistant__title {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.1;
}

.floating-assistant__subtitle {
  margin-top: 4px;
  font-size: 0.74rem;
  color: rgba(255, 255, 255, 0.8);
}

.floating-assistant__messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.76), rgba(245, 251, 248, 0.92));
  scroll-behavior: smooth;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.floating-assistant__messages::-webkit-scrollbar {
  width: 8px;
}

.floating-assistant__messages::-webkit-scrollbar-thumb {
  background: rgba(31, 139, 87, 0.22);
  border-radius: 999px;
}

.floating-assistant__messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-message {
  width: min(100%, 320px);
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(23, 58, 39, 0.08);
  box-shadow: 0 10px 20px rgba(23, 58, 39, 0.06);
}

.chat-message__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-message__avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.chat-message__avatar.is-assistant {
  color: white;
  background: linear-gradient(135deg, var(--campo-hondo), var(--rio));
}

.chat-message__avatar.is-user {
  color: var(--bosque);
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(23, 58, 39, 0.1);
}

.chat-message__meta {
  min-width: 0;
}

.chat-message.user {
  align-self: flex-end;
  background: linear-gradient(135deg, rgba(31, 154, 168, 0.16), rgba(31, 139, 87, 0.16));
  border-bottom-right-radius: 8px;
}

.chat-message.assistant {
  align-self: flex-start;
  border-bottom-left-radius: 8px;
}

.chat-message__role {
  font-weight: 700;
  letter-spacing: 0.01em;
}

.chat-message__content {
  white-space: pre-line;
  color: var(--bosque);
  line-height: 1.5;
}

.chat-recipes {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.chat-recipes__label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(23, 58, 39, 0.54);
}

.chat-recipe-card {
  border-radius: 16px;
  cursor: pointer;
  border: 1px solid rgba(31, 139, 87, 0.12);
  background: linear-gradient(180deg, #ffffff 0%, rgba(233, 244, 240, 0.65) 100%);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.chat-recipe-card:hover {
  transform: translateY(-2px);
  border-color: rgba(31, 154, 168, 0.34);
  box-shadow: 0 14px 24px rgba(23, 58, 39, 0.09);
}

.chat-recipe-card__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.chat-recipe-card__badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(31, 139, 87, 0.1);
  color: var(--campo-hondo);
  font-size: 0.72rem;
  font-weight: 800;
}

.chat-recipe-card__category {
  font-size: 0.74rem;
  color: rgba(23, 58, 39, 0.56);
  font-weight: 700;
}

.chat-recipe-card__title {
  color: var(--bosque);
  line-height: 1.3;
}

.chat-recipe-card__chips :deep(.q-chip) {
  border-radius: 999px;
}

.chat-recipe-card__footer {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--rio);
  font-size: 0.8rem;
  font-weight: 800;
}

.assistant-typing {
  display: flex;
  align-items: center;
  padding: 0 6px 6px;
}

.floating-assistant__end-anchor {
  width: 100%;
  height: 1px;
}

.assistant-suggestions {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 6px;
  max-width: 270px;
  padding-bottom: 2px;
}

.assistant-suggestions::-webkit-scrollbar {
  display: none;
}

.floating-assistant__composer {
  padding: 14px 16px 16px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(8px);
}

.floating-assistant__hint {
  margin-top: 8px;
  color: rgba(23, 58, 39, 0.5);
  font-size: 0.76rem;
  line-height: 1.35;
}

.floating-assistant__input :deep(.q-field__control) {
  border-radius: 16px;
  background: #f6fbf8;
}

.floating-assistant__send {
  min-width: 96px;
  border-radius: 14px;
  box-shadow: 0 12px 20px rgba(31, 154, 168, 0.18);
}

.chat-list-enter-active,
.chat-list-leave-active,
.chat-list-move {
  transition: transform 0.28s ease, opacity 0.28s ease;
}

.chat-list-enter-from,
.chat-list-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.chat-recipes__grid {
  display: grid;
  gap: 10px;
}

.chat-recipes-enter-active,
.chat-recipes-leave-active,
.chat-recipes-move {
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.chat-recipes-enter-from,
.chat-recipes-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

.typing-fade-enter-active,
.typing-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.typing-fade-enter-from,
.typing-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 640px) {
  .floating-assistant {
    right: 12px;
    bottom: 12px;
  }

  .floating-assistant__card {
    width: min(96vw, 420px);
    max-height: 82vh;
  }

  .chat-message {
    width: 100%;
  }

  .assistant-suggestions {
    max-width: 190px;
  }
}
</style>
