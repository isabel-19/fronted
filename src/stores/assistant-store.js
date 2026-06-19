import { defineStore, acceptHMRUpdate } from 'pinia'
import { api } from 'boot/axios'

const DEFAULT_SUGGESTIONS = [
  'Quiero una receta rápida',
  'Algo con pollo y verduras',
  'Opciones vegetarianas',
  'Ideas para desayuno',
  'Recetas bajas en calorías',
]

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
  let normalized = trimmed
  if (normalized.startsWith('//')) normalized = `https:${normalized}`
  if (normalized.startsWith('http://')) normalized = `https://${normalized.slice('http://'.length)}`
  return normalized.replaceAll(' ', '%20')
}

function normalizeAssistantRecipe(dto) {
  if (!dto || typeof dto !== 'object') return dto
  const ingredients = Array.isArray(dto.ingredients)
    ? dto.ingredients.map((item) => ({
        name: item?.name ?? '',
        quantity: item?.quantity ?? null,
        swap: item?.swap ?? null,
        optional: Boolean(item?.optional),
      }))
    : []
  const steps = Array.isArray(dto.steps)
    ? dto.steps
        .map((step) => {
          if (typeof step === 'string') return step
          return step?.instruction || step?.text || step?.description || ''
        })
        .filter(Boolean)
    : []

  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    description: dto.description ?? null,
    tag: dto.tag ?? null,
    category: dto.category ?? dto.tag ?? null,
    calories: dto.calories ?? null,
    time: formatMinutes(dto.time_minutes),
    time_minutes: dto.time_minutes ?? null,
    image: normalizeImageUrl(dto.image_url),
    image_url: dto.image_url ?? null,
    dietTags: Array.isArray(dto.diet_tags) ? dto.diet_tags : [],
    ingredients,
    steps,
  }
}

function createMessage({ role, content, recipes = [] }) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    recipes,
    createdAt: new Date().toISOString(),
  }
}

export const useAssistantStore = defineStore('assistant', {
  state: () => ({
    messages: [],
    suggestions: [...DEFAULT_SUGGESTIONS],
    loading: false,
    lastError: null,
  }),

  actions: {
    initWelcome() {
      if (this.messages.length) return
      this.messages = [
        createMessage({
          role: 'assistant',
          content:
            'Hola, soy tu asistente de recetas. Pregúntame por ingredientes, tiempos de preparación o ideas para la semana.',
        }),
      ]
    },

    async sendMessage(text) {
      const content = String(text || '').trim()
      if (!content || this.loading) return

      this.messages = [...this.messages, createMessage({ role: 'user', content })]
      this.loading = true
      this.lastError = null

      try {
        const history = this.messages
          .filter((message) => message.role && message.content)
          .slice(-10)
          .map((message) => ({ role: message.role, content: message.content }))

        const { data } = await api.post('/assistant/chat', {
          message: content,
          history,
        })

        const reply = String(data?.reply || 'Aquí tienes algunas ideas para ti.')
  const recipes = Array.isArray(data?.recipes) ? data.recipes.map(normalizeAssistantRecipe) : []
        this.messages = [...this.messages, createMessage({ role: 'assistant', content: reply, recipes })]

        if (Array.isArray(data?.suggestions) && data.suggestions.length) {
          this.suggestions = data.suggestions
        }
      } catch (error) {
        this.lastError = error
        console.error('Assistant API error', error)
        this.messages = [
          ...this.messages,
          createMessage({
            role: 'assistant',
            content: 'No pude responder ahora. Intenta de nuevo en unos segundos.',
          }),
        ]
      } finally {
        this.loading = false
      }
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAssistantStore, import.meta.hot))
}
