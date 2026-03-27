<template>
  <Transition
    enter-active-class="install-enter"
    leave-active-class="install-leave"
    @enter="onEnter"
    @leave="onLeave"
  >
    <div
      v-if="canInstall() && !isDismissed"
      ref="installRef"
      class="pwa-minimal-install"
      :class="{ 
        'is-expanded': isExpanded,
        'is-breathing': isBreathing && !isExpanded 
      }"
      role="banner"
      aria-label="Install Glean app"
      @mouseenter="onHover"
      @mouseleave="onLeave"
    >
      <!-- Collapsed State: Just Icon -->
      <button
        v-if="!isExpanded"
        class="install-collapsed"
        @click="expand"
        aria-label="Install Glean app"
      >
        <div class="install-icon-wrapper">
          <svg 
            class="install-icon" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2"
          >
            <path 
              class="install-icon-arrow"
              d="M12 5v14M5 12l7 7 7-7"
              stroke-linecap="round" 
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </button>

      <!-- Expanded State: Rich Card -->
      <div
        v-else
        class="install-expanded"
        @click.stop
      >
        <div class="install-header">
          <div class="install-app-icon">
            <img src="/icons/pwa-icon-144.png" alt="Glean" />
          </div>
          <div class="install-info">
            <span class="install-app-name">Glean</span>
            <span class="install-app-desc">Save & organize links</span>
          </div>
          <button class="install-close" @click="dismiss" aria-label="Dismiss">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div class="install-actions">
          <button class="install-btn install-btn--primary" @click="install">
            <span class="install-btn-text">Get</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { usePWAInstall } from '~/composables/usePWAInstall';

const { canInstall, install, dismissBanner } = usePWAInstall();

const installRef = ref<HTMLElement | null>(null);
const isExpanded = ref(false);
const isDismissed = ref(false);
const isBreathing = ref(false);

// Auto-breathe animation interval
let breatheInterval: ReturnType<typeof setInterval> | null = null;
let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

function expand() {
  isExpanded.value = true;
  stopBreathing();
}

function dismiss() {
  isExpanded.value = false;
  isDismissed.value = true;
  dismissBanner();
}

function onHover() {
  if (!isExpanded.value) {
    stopBreathing();
    expand();
  }
}

function onLeave() {
  // Don't collapse on mouse leave to prevent annoying behavior
  // Only collapse after install or dismiss
}

// Breathing animation - subtle pulse to attract attention
function startBreathing() {
  if (isExpanded.value || isDismissed.value) return;
  
  isBreathing.value = true;
  
  // Random intervals between 8-15 seconds to feel organic
  const scheduleNext = () => {
    const delay = 8000 + Math.random() * 7000;
    breatheInterval = setTimeout(() => {
      if (!isExpanded.value && !isDismissed.value) {
        isBreathing.value = true;
        setTimeout(() => {
          isBreathing.value = false;
          scheduleNext();
        }, 1500);
      }
    }, delay);
  };
  
  scheduleNext();
}

function stopBreathing() {
  isBreathing.value = false;
  if (breatheInterval) {
    clearTimeout(breatheInterval);
    breatheInterval = null;
  }
}

// Spring physics animation helpers
function onEnter(el: Element) {
  // Entrance animation handled by CSS transitions
}

function onLeave(el: Element) {
  // Exit animation handled by CSS transitions
}

onMounted(() => {
  // Start breathing after 3 seconds delay
  setTimeout(startBreathing, 3000);
});

onBeforeUnmount(() => {
  stopBreathing();
  if (hoverTimeout) clearTimeout(hoverTimeout);
});
</script>

<style scoped>
/* CSS Variables for spring easing */
:root {
  --spring-bouncy: cubic-bezier(0.34, 1.56, 0.64, 1);
  --spring-gentle: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}

/* Base Container */
.pwa-minimal-install {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  pointer-events: auto;
  will-change: transform;
}

/* Collapsed State - Minimal Icon Button */
.install-collapsed {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.04),
    inset 0 0 0 1px rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 300ms var(--spring-bouncy);
  transform-origin: center;
  overflow: hidden;
}

.install-collapsed:hover {
  transform: scale(1.08);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 2px 6px rgba(0, 0, 0, 0.06),
    inset 0 0 0 1px rgba(255, 255, 255, 0.6);
}

.install-collapsed:active {
  transform: scale(0.92);
  transition-duration: 100ms;
}

/* Breathing Animation */
.is-breathing .install-collapsed {
  animation: breathe 1.5s var(--spring-gentle);
}

@keyframes breathe {
  0%, 100% { 
    transform: scale(1); 
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  }
  50% { 
    transform: scale(1.05); 
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 4px rgba(0, 0, 0, 0.02);
  }
}

/* Icon Animation */
.install-icon-wrapper {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.install-icon {
  width: 100%;
  height: 100%;
  color: #000;
  transition: transform 300ms var(--spring-bouncy);
}

.is-breathing .install-icon {
  animation: iconBounce 1.5s var(--spring-bouncy);
}

@keyframes iconBounce {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(-3px); }
  60% { transform: translateY(1px); }
}

/* Expanded State - iOS App Store Style Card */
.install-expanded {
  width: 280px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 
    0 12px 48px rgba(0, 0, 0, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.08),
    inset 0 0 0 1px rgba(255, 255, 255, 0.8);
  animation: expandIn 400ms var(--spring-bouncy);
  transform-origin: bottom right;
}

@keyframes expandIn {
  0% {
    opacity: 0;
    transform: scale(0.6) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Expanded Header */
.install-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.install-app-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.install-app-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.install-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.install-app-name {
  font-size: 17px;
  font-weight: 600;
  color: #000;
  letter-spacing: -0.01em;
}

.install-app-desc {
  font-size: 13px;
  color: #666;
  font-weight: 400;
}

.install-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.04);
  border: none;
  cursor: pointer;
  color: #666;
  transition: all 200ms var(--ease-out-quart);
}

.install-close:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #000;
}

.install-close svg {
  width: 14px;
  height: 14px;
}

/* Actions */
.install-actions {
  display: flex;
  gap: 8px;
}

/* iOS Style Get Button */
.install-btn {
  flex: 1;
  height: 40px;
  border-radius: 20px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 200ms var(--ease-out-quart);
  border: none;
}

.install-btn--primary {
  background: #007AFF;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}

.install-btn--primary:hover {
  background: #0056CC;
  transform: scale(1.02);
}

.install-btn--primary:active {
  transform: scale(0.98);
  transition-duration: 100ms;
}

/* Transitions */
.install-enter-active {
  transition: all 400ms var(--spring-bouncy);
}

.install-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

.install-leave-active {
  transition: all 300ms var(--ease-out-quart);
}

.install-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.9);
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .install-collapsed,
  .install-expanded,
  .install-btn {
    transition: none;
    animation: none;
  }
  
  .is-breathing .install-collapsed,
  .is-breathing .install-icon {
    animation: none;
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .install-collapsed {
    background: rgba(30, 30, 30, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 
      0 4px 24px rgba(0, 0, 0, 0.3),
      0 1px 3px rgba(0, 0, 0, 0.2),
      inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  }
  
  .install-icon {
    color: #fff;
  }
  
  .install-expanded {
    background: rgba(40, 40, 40, 0.98);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .install-app-name {
    color: #fff;
  }
  
  .install-close {
    background: rgba(255, 255, 255, 0.08);
    color: #999;
  }
  
  .install-close:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }
}

/* Mobile Optimization */
@media (max-width: 480px) {
  .pwa-minimal-install {
    bottom: 16px;
    right: 16px;
  }
  
  .install-expanded {
    width: calc(100vw - 32px);
    max-width: 320px;
  }
}
</style>