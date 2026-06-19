<template>
  <div
    v-if="recipes.length"
    class="swiper"
    tabindex="0"
    role="group"
    aria-label="Descubre recetas: desliza a la derecha para guardar, a la izquierda para pasar"
    @keydown.left.prevent="commit('left')"
    @keydown.right.prevent="commit('right')"
  >
    <!-- Barra de progreso tipo "stories": se reinicia con cada receta -->
    <div class="swiper-progress" aria-hidden="true">
      <span
        :key="index"
        class="swiper-progress__bar"
        :class="{ 'is-paused': paused || dragging }"
        :style="{ animationDuration: autoplayMs + 'ms' }"
      />
    </div>

    <div class="deck">
      <!-- Carta de atrás (da profundidad) -->
      <article v-if="peek" :key="'peek-' + (peek.id ?? 'x')" class="dcard dcard--peek" aria-hidden="true">
        <q-img :src="peek.image || ''" :ratio="3 / 4" class="dcard__img" no-spinner>
          <template #error><div class="dcard__fallback"><q-icon name="restaurant_menu" size="56px" /></div></template>
        </q-img>
        <div class="dcard__shade" />
      </article>

      <!-- Carta de arriba: arrastrable -->
      <article
        v-if="current"
        :key="'top-' + index"
        class="dcard dcard--top"
        :class="{ 'is-dragging': dragging, 'is-anim': cardTransition }"
        :style="topStyle"
        @pointerdown="onDown"
        @click="onTap"
      >
        <q-img :src="current.image || ''" :ratio="3 / 4" class="dcard__img" no-spinner>
          <template #error><div class="dcard__fallback"><q-icon name="restaurant_menu" size="56px" /></div></template>
        </q-img>

        <span class="dcard__cat">{{ category(current) }}</span>
        <span v-if="paused && !dragging" class="dcard__paused"><q-icon name="pause" size="14px" /> en pausa</span>

        <!-- Sellos al arrastrar -->
        <span class="stamp stamp--like" :style="{ opacity: likeStamp }">Me gusta</span>
        <span class="stamp stamp--skip" :style="{ opacity: skipStamp }">Pasar</span>

        <div class="dcard__shade" />
        <div class="dcard__info">
          <h3 class="dcard__title">{{ current.title }}</h3>
          <div class="dcard__meta">
            <span><q-icon name="local_fire_department" size="15px" />{{ current.calories ?? 'N/D' }} kcal</span>
            <span><q-icon name="schedule" size="15px" />{{ current.time || 'Tiempo —' }}</span>
          </div>
          <button class="dcard__see" type="button" @pointerdown.stop @click.stop="$emit('view', current)">
            Ver receta <q-icon name="arrow_forward" size="15px" />
          </button>
        </div>
      </article>
    </div>

    <!-- Acciones: pasar · pausar/seguir · me gusta -->
    <div class="swiper-actions">
      <q-btn round unelevated class="act act--skip" icon="close" aria-label="Pasar" :disable="animating" @click="commit('left')">
        <q-tooltip>Pasar</q-tooltip>
      </q-btn>
      <q-btn
        round
        unelevated
        class="act act--pause"
        :icon="paused ? 'play_arrow' : 'pause'"
        :aria-label="paused ? 'Reanudar' : 'Pausar'"
        @click="paused = !paused"
      >
        <q-tooltip>{{ paused ? 'Reanudar' : 'Pausar' }}</q-tooltip>
      </q-btn>
      <q-btn
        round
        unelevated
        class="act act--like"
        :class="{ 'is-fav': isFav(current) }"
        :icon="isFav(current) ? 'favorite' : 'favorite_border'"
        aria-label="Me gusta"
        :disable="animating"
        @click="commit('right')"
      >
        <q-tooltip>Me gusta</q-tooltip>
      </q-btn>
    </div>

    <p class="swiper-hint">
      {{ paused ? 'En pausa · desliza ◀ ❤ ▶' : 'Pasan solas · desliza ❤ a la derecha si te gusta' }}
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  recipes: { type: Array, default: () => [] },
  favoriteIds: { type: Object, default: () => new Set() },
  autoplayMs: { type: Number, default: 4500 },
})

const emit = defineEmits(['view', 'toggle-favorite'])

const index = ref(0)
const paused = ref(false)
const dragging = ref(false)
const animating = ref(false)
const cardTransition = ref(false)
const dragX = ref(0)
const dragY = ref(0)
const opacity = ref(1)

const THRESHOLD = 110

const current = computed(() => props.recipes[index.value] || null)
const peek = computed(() => {
  if (props.recipes.length < 2) return null
  return props.recipes[(index.value + 1) % props.recipes.length] || null
})

const topStyle = computed(() => ({
  transform: `translate3d(${dragX.value}px, ${dragY.value}px, 0) rotate(${dragX.value * 0.05}deg)`,
  opacity: opacity.value,
}))

const likeStamp = computed(() => Math.max(0, Math.min(1, dragX.value / THRESHOLD)))
const skipStamp = computed(() => Math.max(0, Math.min(1, -dragX.value / THRESHOLD)))

function category(recipe) {
  return recipe?.category || recipe?.tag || 'Receta'
}
function isFav(recipe) {
  return recipe ? props.favoriteIds.has(recipe.id) : false
}

// --- Arrastre (Tinder) con bloqueo de eje para respetar el scroll vertical ---
let startX = 0
let startY = 0
let axis = null // null | 'h' | 'v'

function onDown(event) {
  if (animating.value) return
  dragging.value = true
  axis = null
  startX = event.clientX
  startY = event.clientY
  cardTransition.value = false
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function onMove(event) {
  if (!dragging.value) return
  const dx = event.clientX - startX
  const dy = event.clientY - startY
  if (axis === null) {
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v'
      if (axis === 'h') paused.value = true
    } else {
      return
    }
  }
  if (axis === 'v') {
    // Intención de scroll: soltamos la carta para no bloquear la página.
    endDrag()
    snapBack()
    return
  }
  dragX.value = dx
  dragY.value = dy * 0.25
}

function onUp() {
  if (!dragging.value) return
  const committed = Math.abs(dragX.value) > THRESHOLD
  if (committed) {
    commit(dragX.value > 0 ? 'right' : 'left')
  } else {
    snapBack()
  }
  endDrag()
}

function endDrag() {
  dragging.value = false
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
}

function onTap() {
  // Un toque (sin arrastre) detiene el autoplay para que decidas con calma.
  if (axis === null && !animating.value) paused.value = true
}

function snapBack() {
  cardTransition.value = true
  dragX.value = 0
  dragY.value = 0
  window.setTimeout(() => {
    cardTransition.value = false
  }, 300)
}

function commit(direction) {
  if (animating.value || !props.recipes.length) return
  animating.value = true
  cardTransition.value = true
  dragX.value = direction === 'right' ? 720 : -720
  dragY.value = dragY.value || -24
  opacity.value = 0
  // Deslizar a la derecha = me gusta. Idempotente: solo añade, nunca quita
  // (si ya era favorita, la mantenemos).
  if (direction === 'right' && current.value && !isFav(current.value)) {
    emit('toggle-favorite', current.value)
  }
  window.setTimeout(() => {
    index.value = (index.value + 1) % props.recipes.length
    cardTransition.value = false
    dragX.value = 0
    dragY.value = 0
    opacity.value = 1
    axis = null
    animating.value = false
  }, 320)
}

// --- Autoplay: las cartas "pasan solas" hacia la izquierda ---
let timer = null
onMounted(() => {
  timer = window.setInterval(() => {
    if (!paused.value && !dragging.value && !animating.value && props.recipes.length > 1) {
      commit('left')
    }
  }, props.autoplayMs)
})
onUnmounted(() => {
  if (timer) window.clearInterval(timer)
  endDrag()
})
</script>

<style scoped lang="scss">
.swiper {
  position: relative;
  max-width: 360px;
  margin: 0 auto;
  outline: none;
}

/* Barra de progreso tipo stories */
.swiper-progress {
  position: relative;
  height: 4px;
  border-radius: 999px;
  background: rgba(23, 58, 39, 0.1);
  overflow: hidden;
  margin-bottom: var(--sp-3);
}
.swiper-progress__bar {
  position: absolute;
  inset: 0;
  transform-origin: left;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--sol) 0%, var(--cta-gold-strong) 100%);
  animation: swiper-fill linear forwards;
}
.swiper-progress__bar.is-paused {
  animation-play-state: paused;
}
@keyframes swiper-fill {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* Pila de cartas */
.deck {
  position: relative;
  height: 430px;
}

.dcard {
  position: absolute;
  inset: 0;
  border-radius: var(--r-xl);
  overflow: hidden;
  box-shadow: var(--sh-3);
  background: var(--aire-1);
}
.dcard--peek {
  transform: translateY(14px) scale(0.94);
  filter: saturate(0.9) brightness(0.96);
}
.dcard--top {
  z-index: 2;
  cursor: grab;
  touch-action: pan-y;
  will-change: transform;
  animation: card-in 0.32s cubic-bezier(0.2, 0.8, 0.3, 1) both;
}
.dcard--top.is-dragging {
  cursor: grabbing;
}
.dcard--top.is-anim {
  transition:
    transform 0.32s cubic-bezier(0.2, 0.8, 0.3, 1),
    opacity 0.32s ease;
}
@keyframes card-in {
  from { transform: translateY(14px) scale(0.94); opacity: 0.5; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

.dcard__img,
.dcard :deep(.q-img) {
  height: 100%;
}
.dcard__fallback {
  height: 100%;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.92);
  background: linear-gradient(135deg, var(--campo) 0%, var(--campo-hondo) 100%);
}

.dcard__cat {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 3;
  background: rgba(255, 255, 255, 0.92);
  color: var(--campo-hondo);
  font-weight: 800;
  font-size: 0.72rem;
  padding: 4px 12px;
  border-radius: 999px;
  box-shadow: 0 4px 10px rgba(23, 58, 39, 0.18);
}
.dcard__paused {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(23, 58, 39, 0.55);
  color: #fff;
  font-weight: 700;
  font-size: 0.7rem;
  padding: 4px 10px;
  border-radius: 999px;
  backdrop-filter: blur(4px);
}

/* Sellos tipo Tinder */
.stamp {
  position: absolute;
  top: 22px;
  z-index: 4;
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 900;
  font-size: 1.5rem;
  letter-spacing: 0.04em;
  padding: 4px 14px;
  border-radius: 12px;
  text-transform: uppercase;
  pointer-events: none;
}
.stamp--like {
  right: 18px;
  color: var(--campo-hondo);
  border: 3px solid var(--campo);
  transform: rotate(14deg);
  background: rgba(255, 255, 255, 0.86);
}
.stamp--skip {
  left: 18px;
  color: #d2553f;
  border: 3px solid #e2715c;
  transform: rotate(-14deg);
  background: rgba(255, 255, 255, 0.86);
}

.dcard__shade {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(180deg, transparent 38%, rgba(15, 35, 23, 0.86) 100%);
}

.dcard__info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  padding: var(--sp-4);
  color: #fff;
}
.dcard__title {
  margin: 0;
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 700;
  font-size: 1.4rem;
  line-height: 1.15;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}
.dcard__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-2);
}
.dcard__meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.28);
  font-weight: 700;
  font-size: 0.76rem;
  padding: 3px 10px;
  border-radius: 999px;
  backdrop-filter: blur(4px);
}
.dcard__see {
  margin-top: var(--sp-3);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.95);
  color: var(--bosque);
  font-weight: 800;
  font-size: 0.84rem;
  padding: 7px 14px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
}

/* Acciones */
.swiper-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  margin-top: var(--sp-4);
  position: relative;
  z-index: 3;
}
.act {
  background: #fff;
  box-shadow: var(--sh-2);
  color: var(--ink-2);
}
.act--skip {
  width: 48px;
  height: 48px;
}
.act--pause {
  width: 44px;
  height: 44px;
  color: var(--campo-hondo);
}
.act--like {
  width: 64px;
  height: 64px;
  color: #ff6b6b;
  font-size: 1.3rem;
  box-shadow: 0 12px 26px rgba(255, 107, 107, 0.32);
}
.act--like.is-fav {
  background: #ff6b6b;
  color: #fff;
}

.swiper-hint {
  text-align: center;
  margin: var(--sp-3) 0 0;
  font-size: var(--fs-caption);
  color: var(--ink-3);
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .dcard--top {
    animation: none;
  }
  .swiper-progress__bar {
    animation: none;
    transform: scaleX(1);
    opacity: 0.4;
  }
}
</style>
