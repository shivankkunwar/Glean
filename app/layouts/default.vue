<template>
  <div class="app-shell">
    <aside class="left-panel">
      <div class="brand">Glean</div>
      <p class="brand-subtitle">URL vault + semantic discover</p>
      <nav>
        <NuxtLink to="/" :class="{ active: activeCategoryId === null }">Dashboard</NuxtLink>

        <div v-for="category in categories" :key="category.id" class="category-item">
          <NuxtLink
            :to="{
              path: '/',
              query: {
                ...(route.query.q ? { q: route.query.q } : {}),
                categoryId: category.id
              }
            }"
            class="category-link"
            :class="{ active: activeCategoryId === category.id }"
          >
            <span>{{ category.icon }} {{ category.name }}</span>
            <small>{{ category.count }}</small>
          </NuxtLink>
        </div>

        <NuxtLink
          v-if="activeCategoryId"
          class="muted-link"
          to="/"
        >
          Clear filter
        </NuxtLink>
      </nav>
      <button class="ghost" @click="logout">Sign out</button>
    </aside>
    <main class="main-grid">
      <header class="top-bar">
        <form class="top-search" @submit.prevent>
          <input
            v-model="search"
            type="search"
            placeholder="Search titles, descriptions, notes"
            @input="$emit('search-change', search)"
          />
        </form>
        <slot name="top-actions" />
      </header>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useRoute } from '#app';

const search = ref('');
const categories = ref<Array<{ id: number; name: string; color: string; icon: string; count: number }>>([]);
const route = useRoute();

const activeCategoryId = computed(() => {
  const raw = route.query.categoryId;
  if (typeof raw === 'string' && raw) {
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }
  return null;
});

async function loadCategories() {
  const response = await $fetch('/api/categories');
  categories.value = (response as Array<{ id: number; name: string; color: string; icon: string; count: number }>).sort(
    (a, b) => b.count - a.count
  );
}

async function logout() {
  await $fetch('/api/logout', { method: 'POST' });
  navigateTo('/login');
}

function normalizeQuery(nextQuery: Record<string, unknown>) {
  const query = { ...route.query, ...nextQuery } as Record<string, string | undefined>;
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) =>
      value !== undefined && value !== null && String(value).trim().length > 0
    )
  ) as Record<string, string>;
}

watch(search, (value) => {
  if (value.trim()) {
    navigateTo({ path: '/', query: normalizeQuery({ q: value }) });
    return;
  }

  const { q, ...rest } = route.query as Record<string, string>;
  navigateTo({ path: '/', query: rest });
});

watch(
  () => route.query.q,
  (value) => {
    search.value = typeof value === 'string' ? value : '';
  },
  { immediate: true }
);

onMounted(loadCategories);
</script>
