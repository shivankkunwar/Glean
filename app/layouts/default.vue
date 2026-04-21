<template>
  <div class="v6-shell">
    <!-- Splash — shown once per session -->
    <SplashScreen v-if="showSplash" @done="showSplash = false" />
    <!-- HEADER -->
    <header class="site-header" :class="{ scrolled: isScrolled }" id="site-header">
      <NuxtLink to="/" class="header-logo">Glean</NuxtLink>

      <!-- Compact search: morphs into header when scrolled (only on index route) -->
      <div
        v-if="isIndexRoute"
        class="header-compact-search"
        :class="{ 'is-active': isScrolled }"
      >
        <i class="ph ph-magnifying-glass hcs-icon" />
        <input
          v-model="headerSearchVal"
          type="text"
          class="hcs-input"
          placeholder="Search your vault…"
          autocomplete="off"
          @keydown.enter.prevent="submitHeaderSearch"
          @input="onHeaderSearchInput"
        />
        <button v-if="headerSearchVal" class="hcs-clear" @click="clearHeaderSearch">
          <i class="ph ph-x" />
        </button>
      </div>

      <div class="header-right">
        <NuxtLink to="/curated" class="header-link curated-link" :class="{ active: route.path === '/curated' }">
          Curated
        </NuxtLink>
        <button class="header-link" id="collections-btn" @click.stop="toggleCollections"
          :aria-expanded="collectionsOpen">
          Collections
          <i class="ph ph-caret-down" style="font-size:10px; margin-left:2px;"
            :style="{ transform: collectionsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }" />
        </button>
        <NuxtLink v-if="isAuthenticated" to="/ai-monitor" class="header-avatar-wrap" title="AI Monitor">
          <div class="header-avatar">S</div>
        </NuxtLink>
        <div v-else class="header-avatar-wrap">
          <NuxtLink to="/login" class="header-sign-in">Sign in</NuxtLink>
        </div>
      </div>
    </header>

    <!-- COLLECTIONS POPOVER -->
    <div class="collections-popover" :class="{ 'is-open': collectionsOpen }" role="menu" @click.stop>
      <div class="collections-header">
        <h4>Your Vault</h4>
        <span class="collections-total numeric">{{ totalCount }}</span>
      </div>
      <NuxtLink to="/" class="collection-item" role="menuitem" @click="collectionsOpen = false">
        <span class="collection-name"><i class="ph ph-tray" /> Everything</span>
        <span class="collection-count numeric">{{ totalCount }}</span>
      </NuxtLink>
      <div v-if="categories.length > 0" class="collections-sub-header">
        <h4>Collections</h4>
      </div>
      <NuxtLink
        v-for="cat in categories"
        :key="cat.id"
        :to="{ path: '/', query: { ...(route.query.q ? { q: route.query.q } : {}), categoryId: cat.id } }"
        class="collection-item"
        :class="{ active: activeCategoryId === cat.id }"
        role="menuitem"
        @click="collectionsOpen = false"
      >
        <span class="collection-name">{{ cat.icon || '📁' }} {{ cat.name }}</span>
        <span class="collection-count numeric">{{ cat.count }}</span>
      </NuxtLink>
      <div v-if="isAuthenticated" class="collections-footer">
        <button class="collections-logout" @click="logout">Sign out</button>
      </div>
    </div>

    <!-- PAGE CONTENT -->
    <main class="v6-main">
      <slot />
    </main>

    <!-- PWA INSTALL - Minimal iOS Style -->
    <PWAInstallMinimal />

    <!-- TOAST CONTAINER (global) -->
    <div class="toast-container" id="toast-container" aria-live="polite" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from '#app';
import { usePWAInstall } from '~/composables/usePWAInstall';
import SplashScreen from '~/components/SplashScreen.vue';

// Show splash once per browser session — default true so it renders before page content
const showSplash = ref(true);

const route = useRoute();
const isAuthenticated = useState<boolean>('isAuthenticated', () => false);
const categories = ref<Array<{ id: number; name: string; color: string; icon: string; count: number }>>([]);

const { canInstall, install, dismissBanner, showInstallBanner } = usePWAInstall();

async function installPWA() {
  await install();
}

function showToast(msg: string) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => { t.className = 'toast toast-out'; setTimeout(() => t.remove(), 300); }, 2700);
}

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const shared = urlParams.get('shared');
  if (shared === '1') {
    showToast('Link saved to your vault!');
    window.history.replaceState({}, '', window.location.pathname);
  } else if (shared === '0') {
    showToast('Could not save link. Try again.');
    window.history.replaceState({}, '', window.location.pathname);
  }
});
const totalCount = ref(0);
const collectionsOpen = ref(false);
const isScrolled = ref(false);
const headerSearchVal = ref('');

const isIndexRoute = computed(() => route.path === '/');

const activeCategoryId = computed(() => {
  const raw = route.query.categoryId;
  if (typeof raw === 'string' && raw) {
    const v = Number(raw);
    return Number.isFinite(v) ? v : null;
  }
  return null;
});

// Sync header search input with URL query param
watch(() => route.query.q, (q) => {
  headerSearchVal.value = typeof q === 'string' ? q : '';
}, { immediate: true });

function toggleCollections() { collectionsOpen.value = !collectionsOpen.value; }

function closeCollections(e: MouseEvent) {
  const btn = document.getElementById('collections-btn');
  if (!btn?.contains(e.target as Node)) collectionsOpen.value = false;
}

function onScroll() { isScrolled.value = window.scrollY > 60; }

function onHeaderSearchInput() {
  // Live search: update route query to trigger page data fetch
  const q = headerSearchVal.value.trim();
  if (q) {
    navigateTo({ path: '/', query: { ...route.query, q } });
  } else {
    const { q: _q, ...rest } = route.query as Record<string, string>;
    navigateTo({ path: '/', query: rest });
  }
}

function submitHeaderSearch() {
  onHeaderSearchInput();
}

function clearHeaderSearch() {
  headerSearchVal.value = '';
  const { q: _q, ...rest } = route.query as Record<string, string>;
  navigateTo({ path: '/', query: rest });
}

async function loadCategories() {
  const response = await $fetch('/api/categories') as Array<{ id: number; name: string; color: string; icon: string; count: number }>;
  categories.value = response.sort((a, b) => b.count - a.count);
  totalCount.value = response.reduce((sum, c) => sum + c.count, 0);
}

async function logout() {
  await $fetch('/api/logout', { method: 'POST' });
  navigateTo('/login');
}

onMounted(() => {
  const showForced = route.query.splash === '1';
  if (showForced || !sessionStorage.getItem('glean-splash-seen')) {
    showSplash.value = true;
    if (!showForced) {
      sessionStorage.setItem('glean-splash-seen', '1');
    }
  } else {
    showSplash.value = false;
  }
  loadCategories();
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('click', closeCollections);
  // Initial scroll check
  onScroll();
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
  document.removeEventListener('click', closeCollections);
});

watch(() => route.fullPath, () => { collectionsOpen.value = false; });
</script>

<style scoped>
.v6-shell {
  min-height: 100dvh;
  background: var(--bg-ground);
}

/* ── HEADER ─────────────────────────────────────────────────────────── */
.site-header {
  position: sticky; top: 0; z-index: var(--z-sticky);
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 48px;
  gap: 20px;
  background: transparent;
  transition:
    background-color var(--d-base) var(--ease-out),
    backdrop-filter var(--d-base) var(--ease-out),
    padding var(--d-base) var(--ease-out),
    box-shadow var(--d-base) var(--ease-out);
}
.site-header.scrolled {
  background: oklch(95.5% 0.022 72 / 0.92);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  box-shadow: 0 1px 0 var(--border-subtle);
}

.header-logo {
  font-size: var(--text-xl); font-weight: 700;
  letter-spacing: -0.03em; color: var(--text-primary);
  flex-shrink: 0; text-decoration: none;
  transition: opacity var(--d-base) var(--ease-out), transform var(--d-base) var(--ease-out);
}
/* Logo doesn't disappear — stays for brand consistency */

/* ── COMPACT SEARCH BAR IN HEADER ───────────────────────────────────── */
.header-compact-search {
  flex: 1; max-width: 480px; position: relative;
  opacity: 0; transform: translateY(-6px) scale(0.97);
  pointer-events: none;
  transition:
    opacity var(--d-base) var(--ease-out),
    transform var(--d-base) var(--ease-spring);
}
.header-compact-search.is-active {
  opacity: 1; transform: translateY(0) scale(1); pointer-events: auto;
}
.hcs-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  font-size: 14px; color: var(--text-muted); pointer-events: none;
}
.hcs-input {
  width: 100%; padding: 9px 36px 9px 34px;
  background: var(--bg-surface); border: 1.5px solid var(--border-subtle);
  border-radius: 100px; font-size: var(--text-sm); color: var(--text-primary);
  transition: border-color var(--d-fast) var(--ease-out), box-shadow var(--d-fast);
  font-family: var(--font-ui);
}
.hcs-input::placeholder { color: var(--text-muted); }
.hcs-input:focus {
  outline: none; border-color: var(--color-accent);
  box-shadow: 0 0 0 3px oklch(38% 0.105 189 / 0.12);
}
.hcs-clear {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--bg-raised); color: var(--text-muted);
  display: grid; place-items: center; font-size: 10px;
  transition: background var(--d-fast), color var(--d-fast);
}
.hcs-clear:hover { background: var(--border-default); color: var(--text-primary); }

/* ── HEADER RIGHT ───────────────────────────────────────────────────── */
.header-right {
  display: flex; align-items: center; gap: 20px; flex-shrink: 0;
}
.header-link {
  font-size: var(--text-sm); color: var(--text-secondary); font-weight: 500;
  display: flex; align-items: center; gap: 4px;
  transition: color var(--d-instant) var(--ease-quart);
  text-decoration: none;
}
.header-link:hover { color: var(--text-primary); }
.header-link.active { color: var(--color-accent); }
.header-link i { transition: transform var(--d-fast) var(--ease-out); }

.header-avatar-wrap { display: flex; align-items: center; }
.header-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: var(--bg-inverted); color: var(--text-inverse);
  display: grid; place-items: center;
  font-size: var(--text-xs); font-weight: 600;
  transition: filter var(--d-instant), box-shadow var(--d-instant);
  text-decoration: none;
}
.header-avatar:hover { filter: brightness(1.3); box-shadow: var(--shadow-accent); }

.header-sign-in {
  font-size: var(--text-sm); font-weight: 500;
  color: var(--color-accent); letter-spacing: -0.01em;
  padding: 6px 14px; border-radius: 999px;
  border: 1.5px solid var(--color-accent);
  transition: background var(--d-fast) var(--ease-out), color var(--d-fast);
  text-decoration: none;
}
.header-sign-in:hover { background: var(--color-accent); color: var(--text-inverse); }

/* ── COLLECTIONS POPOVER ────────────────────────────────────────────── */
.collections-popover {
  position: fixed; top: 62px; right: 48px;
  width: 290px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px; box-shadow: var(--shadow-xl);
  z-index: var(--z-modal);
  opacity: 0; transform: translateY(-8px) scale(0.97);
  pointer-events: none;
  transition: opacity var(--d-fast) var(--ease-out), transform var(--d-fast) var(--ease-out);
  transform-origin: top right;
  padding: var(--space-3);
}
.collections-popover.is-open {
  opacity: 1; transform: translateY(0) scale(1); pointer-events: auto;
}
.collections-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 10px 10px;
  border-bottom: 1px solid var(--border-subtle); margin-bottom: 4px;
}
.collections-header h4 { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); }
.collections-total { font-size: var(--text-xs); color: var(--text-muted); }

.collections-sub-header { padding: 10px 10px 4px; }
.collections-sub-header h4 {
  font-size: var(--text-xs); color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;
}
.collection-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 10px; border-radius: 10px; cursor: pointer;
  transition: background var(--d-fast);
  color: inherit; text-decoration: none;
}
.collection-item:hover { background: var(--bg-raised); }
.collection-item.active { background: var(--color-accent-bg); }
.collection-name {
  font-size: var(--text-sm); font-weight: 500;
  display: flex; align-items: center; gap: 8px; color: var(--text-primary);
}
.collection-count {
  font-size: var(--text-xs); color: var(--text-muted);
  background: var(--bg-ground); padding: 2px 7px; border-radius: 10px;
}
.collections-footer {
  border-top: 1px solid var(--border-subtle); margin-top: 4px; padding-top: 4px;
}
.collections-logout {
  width: 100%; text-align: left; padding: 8px 10px; border-radius: 8px;
  font-size: var(--text-sm); color: var(--text-tertiary); font-weight: 500;
  transition: background var(--d-fast), color var(--d-fast);
}
.collections-logout:hover { background: var(--bg-raised); color: oklch(55% 0.18 20); }

.v6-main { min-height: 100dvh; }

/* ── PWA INSTALL BANNER ─────────────────────────────────────────────── */
.pwa-install-banner {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px; box-shadow: var(--shadow-xl);
  padding: 14px 20px; z-index: var(--z-modal);
  animation: slideUp 0.3s var(--ease-out);
}
@keyframes slideUp {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.pwa-install-content {
  display: flex; align-items: center; gap: 12px;
}
.pwa-install-icon { font-size: 24px; color: var(--color-accent); }
.pwa-install-text { font-size: var(--text-sm); font-weight: 500; color: var(--text-primary); }
.pwa-install-actions { display: flex; gap: 8px; }
.pwa-install-btn {
  padding: 8px 16px; border-radius: 10px; font-size: var(--text-sm); font-weight: 600;
  cursor: pointer; transition: all var(--d-fast);
}
.pwa-install-btn--secondary {
  background: var(--bg-raised); color: var(--text-secondary); border: none;
}
.pwa-install-btn--secondary:hover { background: var(--bg-ground); }
.pwa-install-btn--primary {
  background: var(--color-accent); color: var(--text-inverse); border: none;
}
.pwa-install-btn--primary:hover { filter: brightness(1.1); }

@media (max-width: 600px) {
  .pwa-install-banner {
    left: 16px; right: 16px; transform: none;
    flex-direction: column; gap: 12px;
  }
  .pwa-install-content { width: 100%; }
  .pwa-install-actions { width: 100%; }
  .pwa-install-btn { flex: 1; }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
}

/* ── RESPONSIVE ─────────────────────────────────────────────────────── */
@media (max-width: 767px) {
  .site-header { padding: 14px 20px; gap: 12px; }
  .collections-popover { right: 16px; top: 56px; width: calc(100vw - 32px); }
  .header-link { display: none; }
  .header-link.curated-link { display: flex; }
  .header-compact-search { max-width: 100%; }
}
</style>
