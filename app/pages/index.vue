<template>
  <section class="dashboard">
    <header class="save-row">
      <form class="save-form" @submit.prevent="addUrl">
        <input v-model="urlToSave" type="url" placeholder="Paste a URL and it will save instantly" required />
        <button class="primary" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save URL' }}</button>
      </form>
      <p v-if="message" class="message">{{ message }}</p>
    </header>

    <section class="grid-wrap">
      <article v-if="loading" class="status-card">Loading your cards…</article>
      <article v-else-if="cards.length === 0" class="status-card">No bookmarks yet. Save one to begin.</article>

      <article v-for="bookmark in cards" :key="bookmark.id" class="card bookmark-card">
        <img
          v-if="bookmark.ogImage"
          :src="bookmark.ogImage"
          alt=""
          class="cover"
          loading="lazy"
        />
        <div class="cover fallback" v-else>{{ bookmark.domain?.slice(0, 2)?.toUpperCase() || 'GL' }}</div>

        <div class="card-body">
          <h2>{{ bookmark.title || 'Untitled' }}</h2>
          <p class="meta">{{ bookmark.domain || 'unknown' }} · {{ bookmark.status }}</p>
          <p class="description">{{ bookmark.description || 'No description yet' }}</p>

          <div class="chips">
            <span v-for="tag in bookmark.tags" :key="tag.id" class="chip">{{ tag.name }}</span>
          </div>

          <div class="actions">
            <NuxtLink :to="`/bookmarks/${bookmark.id}`" class="text-link">Open</NuxtLink>
            <button class="ghost" @click="remove(bookmark.id)">Delete</button>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute } from '#app';

type BookmarkCard = {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  ogImage: string | null;
  status: string;
  domain: string | null;
  tags: Array<{ id: number; name: string; source: string; confidence: number }>;
};

const route = useRoute();
const cards = ref<BookmarkCard[]>([]);
const loading = ref(false);
const saving = ref(false);
const urlToSave = ref('');
const message = ref('');
const page = ref(1);
const total = ref(0);

const categoryId = computed(() => {
  const raw = route.query.categoryId;
  if (typeof raw === 'string' && raw) {
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }
  return null;
});

const activeFilters = computed<Record<string, string | number>>(() => {
  const filters: Record<string, string | number> = {
    page: page.value,
    limit: 24
  };

  if (categoryId.value) {
    filters.categoryId = categoryId.value;
  }

  return filters;
});

const query = computed(() => route.query.q || '');

async function loadCards() {
  loading.value = true;
  const response = await $fetch('/api/bookmarks', { query: activeFilters.value });
  if ((response as { items?: BookmarkCard[] }).items) {
    cards.value = (response as { items: BookmarkCard[] }).items;
    total.value = Number((response as { total: number }).total || 0);
  }
  loading.value = false;
}

async function loadSearch() {
  if (!query.value) {
    await loadCards();
    return;
  }

  loading.value = true;
  const response = await $fetch('/api/search', {
    query: {
      q: String(query.value),
      page: page.value,
      limit: 24,
      categoryId: categoryId.value ?? undefined
    } as Record<string, string | number | undefined>
  });
  cards.value = (response as { items: BookmarkCard[] }).items || [];
  total.value = Number((response as { total: number }).total || 0);
  loading.value = false;
}

async function refresh() {
  if (query.value) {
    await loadSearch();
  } else {
    await loadCards();
  }
}

async function addUrl() {
  if (!urlToSave.value) {
    return;
  }

  saving.value = true;
  message.value = '';
  try {
    await $fetch('/api/save', {
      method: 'POST',
      body: {
        url: urlToSave.value,
        categoryId: categoryId.value ?? undefined
      }
    });
    message.value = 'Saved and queued for enrichment';
    urlToSave.value = '';
    await refresh();
  } catch {
    message.value = 'Could not save URL';
  } finally {
    saving.value = false;
  }
}

async function remove(id: number) {
  await $fetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
  await refresh();
}

watch(
  () => route.fullPath,
  async () => {
    await refresh();
  }
);

onMounted(async () => {
  await refresh();
});
</script>
