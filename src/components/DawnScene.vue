<template>
  <!-- Escena decorativa "Amanecer en el campo": cielo · sol · campo · río -->
  <div class="scene" aria-hidden="true">
    <span class="sky"></span>
    <span class="sun-glow"></span>
    <span class="sun"></span>
    <svg class="horizon" viewBox="0 0 480 320" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="ds-farGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9bdcb4" />
          <stop offset="1" stop-color="#86cc9e" />
        </linearGradient>
        <linearGradient id="ds-midGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#5cc187" />
          <stop offset="1" stop-color="#43b673" />
        </linearGradient>
        <linearGradient id="ds-nearGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#34b36a" />
          <stop offset="1" stop-color="#1f8b57" />
        </linearGradient>
        <linearGradient id="ds-riverGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#d4f0f2" />
          <stop offset="0.45" stop-color="#8ad9e0" />
          <stop offset="1" stop-color="#3aa9b3" />
        </linearGradient>
      </defs>

      <path
        class="layer"
        fill="url(#ds-farGrad)"
        d="M0,96 C70,72 130,82 200,100 C275,119 350,90 420,102 C450,107 470,104 480,106 L480,320 L0,320 Z"
      />
      <path
        class="layer"
        fill="url(#ds-midGrad)"
        d="M0,142 C90,120 160,130 240,148 C320,166 400,134 480,150 L480,320 L0,320 Z"
      />
      <path
        class="layer"
        fill="url(#ds-nearGrad)"
        d="M0,320 L0,162 C60,136 120,132 175,162 C215,184 265,184 305,162 C360,132 420,136 480,162 L480,320 Z"
      />
      <g class="river-group">
        <path
          fill="url(#ds-riverGrad)"
          d="M238,150 C234,195 224,235 216,270 C210,296 207,312 206,326 L258,326 C257,312 256,296 261,270 C268,235 258,195 254,150 Z"
        />
        <path
          class="river-shine"
          fill="#ffffff"
          d="M244,156 C240,198 231,236 224,270 C219,295 217,310 216,326 L226,326 C227,310 229,295 234,270 C241,236 250,198 250,156 Z"
        />
      </g>
    </svg>
  </div>
</template>

<script setup>
// Componente puramente decorativo: el amanecer compartido por login y wizard.
</script>

<style scoped lang="scss">
.scene {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #e9f4f0 0%, #f1f8f2 36%, #fdf4e3 60%, #fbeede 74%, #f3f7ee 100%);
}

.sun {
  position: absolute;
  top: clamp(28px, 6vh, 84px);
  left: 66%;
  width: clamp(66px, 13vw, 96px);
  aspect-ratio: 1;
  border-radius: 50%;
  transform: translateX(-50%);
  background: radial-gradient(circle at 50% 44%, #ffe28d 0%, #ffd24d 44%, #f8b62d 100%);
  box-shadow: 0 0 50px 14px rgba(248, 182, 45, 0.3);
  animation: ds-sun-rise 1.1s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.sun-glow {
  position: absolute;
  top: clamp(-44px, 0vh, 36px);
  left: 66%;
  width: clamp(240px, 64vw, 440px);
  aspect-ratio: 1;
  transform: translate(-50%, 0);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 228, 160, 0.55) 0%, rgba(255, 228, 160, 0) 62%);
  animation: ds-glow-bloom 1.6s ease both;
}

.horizon {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: clamp(54%, 60vh, 66%);
}

.river-group {
  opacity: 0.82;
}

.river-shine {
  opacity: 0.25;
  mix-blend-mode: screen;
}

@keyframes ds-sun-rise {
  from {
    transform: translateX(-50%) translateY(26px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

@keyframes ds-glow-bloom {
  from {
    transform: translate(-50%, 0) scale(0.7);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0) scale(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .river-shine {
    animation: ds-shimmer 5.5s ease-in-out infinite;
  }

  .sun {
    animation:
      ds-sun-rise 1.1s cubic-bezier(0.22, 1, 0.36, 1) both,
      ds-sun-pulse 6s ease-in-out 1.2s infinite;
  }
}

@keyframes ds-shimmer {
  0%,
  100% {
    opacity: 0.22;
    transform: translateX(0);
  }
  50% {
    opacity: 0.5;
    transform: translateX(4px);
  }
}

@keyframes ds-sun-pulse {
  0%,
  100% {
    box-shadow: 0 0 50px 14px rgba(248, 182, 45, 0.3);
  }
  50% {
    box-shadow: 0 0 66px 22px rgba(248, 182, 45, 0.42);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sun,
  .sun-glow {
    animation: none;
  }
}
</style>
