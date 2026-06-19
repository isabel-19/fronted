<template>
  <article
    class="recipe-card"
    role="button"
    tabindex="0"
    @click="$emit('view', recipe)"
    @keyup.enter="$emit('view', recipe)"
  >
    <div class="rc-media">
      <q-img v-if="recipe.image" :src="recipe.image" :ratio="4 / 3" class="rc-img" no-spinner>
        <template #error>
          <div class="rc-fallback"><q-icon name="restaurant_menu" size="40px" /></div>
        </template>
      </q-img>
      <div v-else class="rc-fallback"><q-icon name="restaurant_menu" size="40px" /></div>

      <span class="rc-cat">{{ category }}</span>

      <q-btn
        round
        dense
        unelevated
        class="rc-fav"
        :class="{ 'is-fav': favorite }"
        :icon="favorite ? 'favorite' : 'favorite_border'"
        @click.stop="$emit('toggle-favorite', recipe)"
      >
        <q-tooltip>{{ favorite ? 'Quitar de favoritos' : 'Guardar en favoritos' }}</q-tooltip>
      </q-btn>
    </div>

    <div class="rc-body">
      <h3 class="rc-title">{{ recipe.title }}</h3>
      <p class="rc-desc">{{ cleanDescription }}</p>
      <div class="rc-meta">
        <span class="rc-tag"><q-icon name="local_fire_department" size="15px" />{{ recipe.calories ?? 'N/D' }} kcal</span>
        <span class="rc-tag"><q-icon name="schedule" size="15px" />{{ recipe.time || 'Tiempo —' }}</span>
      </div>
    </div>

    <div class="rc-foot">
      <span class="rc-view">Ver receta <q-icon name="arrow_forward" size="16px" /></span>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  recipe: { type: Object, required: true },
  favorite: { type: Boolean, default: false },
})

defineEmits(['view', 'toggle-favorite'])

const category = computed(() => props.recipe.category || props.recipe.tag || 'Receta')

const FALLBACK_DESC = 'Receta saludable y equilibrada para tu menú diario.'
// Krug: escribe para la persona. El dataset a veces trae "Fuente: http://…"
// o una URL como descripción; eso no ayuda a decidir, así que lo ocultamos.
const cleanDescription = computed(() => {
  const raw = String(props.recipe.description || '').trim()
  if (!raw) return FALLBACK_DESC
  if (/^(fuente|source)\b/i.test(raw)) return FALLBACK_DESC
  if (/https?:\/\/|www\./i.test(raw)) return FALLBACK_DESC
  return raw
})
</script>

<style scoped lang="scss">
.recipe-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid rgba(23, 58, 39, 0.08);
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(23, 58, 39, 0.08);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.recipe-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(23, 58, 39, 0.16);
}

.recipe-card:focus-visible {
  outline: 3px solid var(--rio);
  outline-offset: 2px;
}

.rc-media {
  position: relative;
}

.rc-img {
  display: block;
}

.rc-fallback {
  aspect-ratio: 4 / 3;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.9);
  background: linear-gradient(135deg, var(--campo) 0%, var(--campo-hondo) 100%);
}

.rc-cat {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--campo-hondo);
  font-weight: 800;
  font-size: 0.72rem;
  padding: 3px 12px;
  border-radius: 999px;
  box-shadow: 0 4px 10px rgba(23, 58, 39, 0.12);
}

.rc-fav {
  position: absolute;
  top: 8px;
  right: 8px;
  color: #fff;
  background: rgba(23, 58, 39, 0.4);
  backdrop-filter: blur(4px);
}

.rc-fav.is-fav {
  color: #ff6b6b;
  background: rgba(255, 255, 255, 0.92);
}

.rc-body {
  padding: 14px 14px 6px;
  flex: 1;
}

.rc-title {
  margin: 0;
  font-size: 1.04rem;
  font-weight: 800;
  line-height: 1.3;
  color: var(--bosque);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rc-desc {
  margin: 6px 0 0;
  font-size: 0.85rem;
  line-height: 1.45;
  color: rgba(23, 58, 39, 0.6);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.5em;
}

.rc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.rc-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(52, 179, 106, 0.12);
  color: var(--campo-hondo);
  font-weight: 700;
  font-size: 0.78rem;
  padding: 3px 10px;
  border-radius: 999px;
}

.rc-foot {
  padding: 8px 14px 14px;
}

.rc-view {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--rio);
  font-weight: 800;
  font-size: 0.86rem;
}
</style>
