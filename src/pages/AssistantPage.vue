<template>
  <q-page class="assistant-page">
    <div class="page-head">
      <p class="v-eyebrow">Asistente</p>
      <h1 class="page-title">Conversación sobre recetas</h1>
      <p class="page-sub">
        Cuéntame qué necesitas y te propongo opciones según ingredientes, tiempo o estilo.
      </p>
    </div>

    <q-card class="assistant-card surface">
      <q-card-section class="assistant-card__messages">
        <div v-for="message in assistant.messages" :key="message.id" :class="['chat-message', message.role]">
          <div class="text-caption text-grey-6">
            {{ message.role === 'assistant' ? 'Asistente' : 'Tú' }}
          </div>
          <div class="text-body2 q-mt-xs chat-message__content">{{ message.content }}</div>

          <div v-if="message.recipes?.length" class="chat-recipes q-mt-sm">
            <q-card v-for="recipe in message.recipes" :key="recipe.id" flat bordered class="chat-recipe-card">
              <q-card-section>
                <div class="text-subtitle2 text-weight-bold">{{ recipe.title }}</div>
                <div class="text-caption text-grey-7 q-mt-xs">
                  {{ recipe.description || 'Receta saludable recomendada.' }}
                </div>
                <div class="row items-center q-gutter-xs q-mt-sm">
                  <q-chip v-if="recipe.time_minutes" dense color="primary" text-color="white">
                    {{ recipe.time_minutes }} min
                  </q-chip>
                  <q-chip v-if="recipe.calories" dense color="teal" text-color="white">
                    {{ recipe.calories }} kcal
                  </q-chip>
                  <q-chip v-if="recipe.category" dense outline color="grey-7">
                    {{ recipe.category }}
                  </q-chip>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <div v-if="assistant.loading" class="assistant-typing q-mt-md">
          <q-spinner-dots color="primary" size="28px" />
          <span class="text-caption text-grey-6 q-ml-sm">Buscando ideas...</span>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-input
          v-model="draft"
          outlined
          autogrow
          type="textarea"
          label="Escribe tu mensaje"
          placeholder="Ej. Tengo pollo, tomate y arroz"
          @keydown.enter.exact.prevent="handleSend"
        />
        <div class="row items-center justify-between q-mt-sm assistant-bar">
          <div class="assistant-suggestions">
            <q-chip
              v-for="suggestion in assistant.suggestions"
              :key="suggestion"
              clickable
              class="chip-soft"
              @click="useSuggestion(suggestion)"
            >
              {{ suggestion }}
            </q-chip>
          </div>
          <q-btn class="btn-sol" unelevated no-caps icon="send" label="Enviar" :loading="assistant.loading" @click="handleSend" />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useAssistantStore } from 'stores/assistant-store'

const assistant = useAssistantStore()
const draft = ref('')

onMounted(() => {
  assistant.initWelcome()
})

function handleSend() {
  if (!draft.value.trim()) return
  assistant.sendMessage(draft.value)
  draft.value = ''
}

function useSuggestion(text) {
  draft.value = text
  handleSend()
}
</script>

<style scoped>
.assistant-page {
  padding: clamp(16px, 2.5vw, 26px);
  max-width: 920px;
  margin: 0 auto;
}

.assistant-card {
  border-radius: var(--r-xl);
}

.assistant-card__messages {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  max-height: 520px;
  overflow-y: auto;
}

.chat-message {
  max-width: 720px;
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--aire-1);
  color: var(--ink);
}

.chat-message .text-caption {
  color: var(--ink-3) !important;
  font-weight: 700;
}

/* Asistente = aire fresco a la izquierda; tú = campo suave a la derecha */
.chat-message.assistant {
  align-self: flex-start;
  border-bottom-left-radius: var(--r-sm);
}

.chat-message.user {
  align-self: flex-end;
  background: rgba(52, 179, 106, 0.12);
  border-bottom-right-radius: var(--r-sm);
}

.chat-message__content {
  white-space: pre-line;
  line-height: 1.5;
}

.chat-recipes {
  display: grid;
  gap: var(--sp-3);
}

.chat-recipe-card {
  border-radius: var(--r-md);
  border-color: var(--line);
}

.assistant-typing {
  display: flex;
  align-items: center;
}

.assistant-bar {
  gap: var(--sp-3);
}

.assistant-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}
</style>
