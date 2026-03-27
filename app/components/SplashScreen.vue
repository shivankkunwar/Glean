<template>
  <Teleport to="body">
    <Transition name="splash-fade" @after-leave="emit('done')">
      <div v-if="visible" id="splash" @click="dismiss" aria-hidden="true">
        <!-- Floating URL cards -->
        <div class="cards" id="cards">
          <div
            v-for="(card, i) in displayCards"
            :key="i"
            :id="`c${i + 1}`"
            :class="['card', `card--${card.palette}`]"
          >
            <div class="card__bar" />
            <div class="card__body">
              <div class="card__domain">
                <span class="card__favicon" :style="{ background: cardColors[card.palette] }" />
                {{ card.domain || 'glean.so' }}
              </div>
              <p class="card__title">{{ card.title }}</p>
              <p class="card__meta">Saved {{ card.savedAt || 'recently' }}</p>
            </div>
          </div>
        </div>

        <!-- Wordmark -->
        <div class="wordmark" aria-label="Glean">
          <div class="wordmark__dot" />
          <div class="wordmark__text">
            <span
              v-for="(letter, i) in 'glean'.split('')"
              :key="i"
              class="wordmark__letter"
              :style="{ animationDelay: `${0.18 + i * 0.055}s` }"
            >
              {{ letter }}
            </span>
          </div>
        </div>

        <!-- Tagline -->
        <p class="tagline">Remember everything.&ensp;Organize nothing.</p>

        <!-- Progress bar -->
        <div class="progress">
          <div class="progress__fill" />
        </div>

      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const emit = defineEmits<{ done: [] }>();

interface SplashCard {
  id?: number;
  title: string;
  domain: string;
  palette: string;
  typeLabel?: string;
  savedAt: string;
}

const visible = ref(true);

const cardColors: Record<string, string> = {
  amber: '#C4820A',
  sage: '#4A7060',
  terra: '#B04E38',
  slate: '#4A6070',
  sand: '#8B7250'
};

// Initial fallback state matching the exact HTML mockup
const displayCards = ref<SplashCard[]>([
  { title: 'The Architecture of Slowness', domain: 'aeon.co', savedAt: '2 days ago', palette: 'amber' },
  { title: 'How to Think in Permanent Notes', domain: 'zettelkasten.de', savedAt: 'last week', palette: 'sage' },
  { title: 'Preserved Lemon Chicken with Herbs', domain: 'seriouseats.com', savedAt: '3 weeks ago', palette: 'terra' },
  { title: 'Against Productivity Culture', domain: 'newyorker.com', savedAt: 'yesterday', palette: 'slate' },
  { title: 'On the Art of Paying Attention', domain: 'psyche.co', savedAt: '5 days ago', palette: 'sand' }
]);

function dismiss() {
  if (!visible.value) return;
  visible.value = false;
}

onMounted(async () => {
  try {
    const cards = await $fetch<SplashCard[]>('/api/splash-cards');
    if (Array.isArray(cards) && cards.length > 0) {
      const newCards = [...displayCards.value];
      cards.forEach((c, i) => {
        if (i < 5) newCards[i] = { ...newCards[i], ...c };
      });
      displayCards.value = newCards;
    }
  } catch (e) {
    console.warn('Splash API fetch failed:', e);
  }

  // Auto-dismiss after 4.8s
  setTimeout(dismiss, 4800);
});
</script>

<style scoped>
#splash {
  --cream:       oklch(97.5% 0.008 80);
  --pine:        oklch(38%   0.105 189);
  --pine-light:  oklch(50%   0.09  189);
  --ink:         oklch(22%   0.015 200);
  --ink-muted:   oklch(48%   0.02  200);
  --spring:      cubic-bezier(0.16, 1, 0.3, 1);
  --spring-soft: cubic-bezier(0.34, 1.45, 0.64, 1);

  /* card palette — earthy */
  --amber-bg:     #FDF4E3;
  --amber-bar:    #C4820A;
  --amber-text:   #7A4E08;
  --sage-bg:      #E9EEEA;
  --sage-bar:     #4A7060;
  --sage-text:    #2D4E3E;
  --terra-bg:     #F5EAE3;
  --terra-bar:    #B04E38;
  --terra-text:   #7A2E1A;
  --slate-bg:     #E8ECF0;
  --slate-bar:    #4A6070;
  --slate-text:   #2A3D4D;
  --sand-bg:      #F3EDDF;
  --sand-bar:     #8B7250;
  --sand-text:    #5A4830;

  position: fixed; inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: pointer;
  background: var(--cream);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

/* Transitions */
.splash-fade-leave-active {
  transition: opacity 0.5s ease 0.35s;
}
.splash-fade-leave-to {
  opacity: 0;
}

/* Grain texture overlay */
#splash::before {
  content: '';
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='320' height='320' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  opacity: 0.032;
  pointer-events: none;
  z-index: 1;
}

/* Warm radial vignette */
#splash::after {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 75% 75% at 50% 44%,
    transparent 0%, oklch(93% 0.014 75 / 0.4) 100%);
  pointer-events: none;
  z-index: 1;
}

/* ── WORDMARK ── */
.wordmark {
  position: relative;
  z-index: 20;
  display: flex;
  align-items: baseline;
  gap: 0;
  user-select: none;
}

.wordmark__dot {
  width: 9px; height: 9px;
  border-radius: 50%;
  background: var(--pine);
  margin-right: 4px;
  margin-bottom: 10px;
  opacity: 0;
  transform: scale(0.3);
  animation: dot-in 0.6s var(--spring-soft) 0.1s forwards;
}

.wordmark__text {
  font-family: 'Newsreader', Georgia, serif;
  font-size: clamp(52px, 7vw, 82px);
  font-weight: 300;
  font-style: italic;
  letter-spacing: -0.03em;
  color: var(--ink);
  line-height: 1;
  display: flex;
}

.wordmark__letter {
  display: inline-block;
  opacity: 0;
  transform: translateY(14px);
  animation: letter-in 0.7s var(--spring) forwards;
}

/* ── TAGLINE ── */
.tagline {
  margin-top: 18px;
  font-family: 'DM Sans', sans-serif;
  font-size: clamp(11px, 1.2vw, 13px);
  font-weight: 300;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-muted);
  opacity: 0;
  transform: translateY(8px);
  animation: fade-up 0.9s var(--spring) 1.55s forwards;
  position: relative;
  z-index: 20;
}

/* ── CARDS ── */
.cards {
  position: fixed; inset: 0;
  pointer-events: none;
  z-index: 5;
}

.card {
  position: absolute;
  width: 224px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow:
    0 1px 2px rgba(0,0,0,0.04),
    0 4px 16px rgba(0,0,0,0.07),
    0 12px 40px rgba(0,0,0,0.05);
  opacity: 0;
  pointer-events: auto;
  transition: transform 0.35s var(--spring), box-shadow 0.35s var(--spring);
}

/* Hover override — CSS handles both pausing the float and applying the transform lift */
.card:hover {
  z-index: 30 !important;
  box-shadow:
    0 2px 4px rgba(0,0,0,0.06),
    0 8px 24px rgba(0,0,0,0.1),
    0 20px 56px rgba(0,0,0,0.08);
  animation-play-state: paused, paused !important;
}

.card__bar { height: 3px; width: 100%; }
.card__body { padding: 11px 14px 13px; }

.card__domain {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.65;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 6px;
}

.card__favicon {
  width: 12px; height: 12px;
  border-radius: 2px;
  display: inline-block;
  flex-shrink: 0;
}

.card__title {
  font-family: 'Newsreader', Georgia, serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.card__meta {
  margin-top: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 10px;
  font-weight: 300;
  opacity: 0.5;
  letter-spacing: 0.03em;
}

/* card colour themes */
.card--amber { background: var(--amber-bg); }
.card--amber .card__bar { background: linear-gradient(90deg, var(--amber-bar), #E09B30); }
.card--amber .card__title { color: var(--amber-text); }
.card--amber .card__domain { color: var(--amber-text); }

.card--sage { background: var(--sage-bg); }
.card--sage .card__bar { background: linear-gradient(90deg, var(--sage-bar), #6B9E85); }
.card--sage .card__title { color: var(--sage-text); }
.card--sage .card__domain { color: var(--sage-text); }

.card--terra { background: var(--terra-bg); }
.card--terra .card__bar { background: linear-gradient(90deg, var(--terra-bar), #D0724A); }
.card--terra .card__title { color: var(--terra-text); }
.card--terra .card__domain { color: var(--terra-text); }

.card--slate { background: var(--slate-bg); }
.card--slate .card__bar { background: linear-gradient(90deg, var(--slate-bar), #6A8A9A); }
.card--slate .card__title { color: var(--slate-text); }
.card--slate .card__domain { color: var(--slate-text); }

.card--sand { background: var(--sand-bg); }
.card--sand .card__bar { background: linear-gradient(90deg, var(--sand-bar), #A89272); }
.card--sand .card__title { color: var(--sand-text); }
.card--sand .card__domain { color: var(--sand-text); }

/* ── KEYFRAMES ── */
@keyframes dot-in { to { opacity: 1; transform: scale(1); } }
@keyframes letter-in { to { opacity: 1; transform: translateY(0); } }
@keyframes fade-up { to { opacity: 1; transform: translateY(0); } }

@keyframes card-in-1 { from { opacity: 0; transform: translate(-22px, -18px) rotate(-6.5deg) scale(0.88); } to { opacity: 1; transform: translate(0, 0) rotate(-4.5deg) scale(1); } }
@keyframes card-in-2 { from { opacity: 0; transform: translate(20px, -24px) rotate(5deg) scale(0.88); } to { opacity: 1; transform: translate(0, 0) rotate(3.5deg) scale(1); } }
@keyframes card-in-3 { from { opacity: 0; transform: translate(-18px, 22px) rotate(5deg) scale(0.88); } to { opacity: 1; transform: translate(0, 0) rotate(-2deg) scale(1); } }
@keyframes card-in-4 { from { opacity: 0; transform: translate(16px, -20px) rotate(-4deg) scale(0.88); } to { opacity: 1; transform: translate(0, 0) rotate(5.5deg) scale(1); } }
@keyframes card-in-5 { from { opacity: 0; transform: translate(24px, 18px) rotate(-3deg) scale(0.88); } to { opacity: 1; transform: translate(0, 0) rotate(-5deg) scale(1); } }

@keyframes float-a { 0%, 100% { translate: 0 0; } 50% { translate: 0 -7px; } }
@keyframes float-b { 0%, 100% { translate: 0 0; } 50% { translate: 0 6px; } }
@keyframes float-c { 0%, 100% { translate: 0 0; } 50% { translate: -5px -5px; } }
@keyframes float-d { 0%, 100% { translate: 0 0; } 50% { translate: 4px -6px; } }
@keyframes float-e { 0%, 100% { translate: 0 0; } 50% { translate: -4px 5px; } }

/* ── PURE CSS POSITIONING (Matches Math.max/min boundary logic from HTML) ── */
/* c1: dx=-0.30 -> x-center: 50vw - 30vw = 20vw. dy=-0.26 -> y-center: 50vh - 26vh = 24vh. */
#c1 {
  left: clamp(8px, 20vw - 112px, 100vw - 232px);
  top: clamp(8px, 24vh - 55px, 100vh - 118px);
  animation: card-in-1 0.9s var(--spring) 0.55s forwards, float-a 5.2s ease-in-out 0s infinite;
}
#c1:hover { transform: rotate(-4.5deg) translateY(-6px) scale(1.03); }

/* c2: dx=0.24 -> 74vw. dy=-0.19 -> 31vh. */
#c2 {
  left: clamp(8px, 74vw - 112px, 100vw - 232px);
  top: clamp(8px, 31vh - 55px, 100vh - 118px);
  animation: card-in-2 0.9s var(--spring) 0.72s forwards, float-b 6.1s ease-in-out 0.8s infinite;
}
#c2:hover { transform: rotate(3.5deg) translateY(-6px) scale(1.03); }

/* c3: dx=-0.31 -> 19vw. dy=0.22 -> 72vh. */
#c3 {
  left: clamp(8px, 19vw - 112px, 100vw - 232px);
  top: clamp(8px, 72vh - 55px, 100vh - 118px);
  animation: card-in-3 0.9s var(--spring) 0.89s forwards, float-c 5.7s ease-in-out 1.4s infinite;
}
#c3:hover { transform: rotate(-2deg) translateY(-6px) scale(1.03); }

/* c4: dx=0.28 -> 78vw. dy=0.18 -> 68vh. */
#c4 {
  left: clamp(8px, 78vw - 112px, 100vw - 232px);
  top: clamp(8px, 68vh - 55px, 100vh - 118px);
  animation: card-in-4 0.9s var(--spring) 1.06s forwards, float-d 6.5s ease-in-out 0.4s infinite;
}
#c4:hover { transform: rotate(5.5deg) translateY(-6px) scale(1.03); }

/* c5: dx=0.06 -> 56vw. dy=0.32 -> 82vh. */
#c5 {
  left: clamp(8px, 56vw - 112px, 100vw - 232px);
  top: clamp(8px, 82vh - 55px, 100vh - 118px);
  animation: card-in-5 0.9s var(--spring) 1.23s forwards, float-e 4.9s ease-in-out 1.1s infinite;
}
#c5:hover { transform: rotate(-5deg) translateY(-6px) scale(1.03); }


/* ── PROGRESS TRACK ── */
.progress {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 2px;
  border-radius: 2px;
  background: rgba(0,0,0,0.1);
  overflow: hidden;
  opacity: 0;
  animation: fade-up 0.5s var(--spring) 1.8s forwards;
  z-index: 20;
}
.progress__fill {
  height: 100%;
  width: 0%;
  border-radius: 2px;
  background: var(--pine-light);
  animation: progress-fill 2.8s linear 1.9s forwards;
}
@keyframes progress-fill {
  to { width: 100%; }
}
</style>
