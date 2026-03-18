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

      <article v-for="bookmark in cards" :key="bookmark.id" :class="['card bookmark-card', { processing: isProcessing(bookmark) }]">
        <img
          v-if="bookmark.ogImage"
          :src="bookmark.ogImage"
          alt=""
          class="cover"
          loading="lazy"
        />
        <div class="cover fallback" v-else>{{ cardCoverLabel(bookmark) }}</div>

        <div class="card-body">
          <div class="title-row">
            <h2>{{ cardTitle(bookmark) }}</h2>
            <span v-if="isProcessing(bookmark)" class="processing-pill">Processing</span>
          </div>
          <p class="meta">{{ cardMeta(bookmark) }}</p>
          <p class="description">{{ cardDescription(bookmark) }}</p>

          <div class="chips">
            <span v-for="tag in bookmark.tags" :key="tag.id" class="chip">{{ tag.name }}</span>
            <span v-if="isProcessing(bookmark) && bookmark.tags.length === 0" class="chip chip-muted">extracting</span>
            <span v-if="isProcessing(bookmark) && bookmark.tags.length === 0" class="chip chip-muted">classifying</span>
          </div>

          <div class="actions">
            <NuxtLink :to="`/bookmarks/${bookmark.id}`" class="text-link">{{ isProcessing(bookmark) ? 'View status' : 'Open' }}</NuxtLink>
            <button class="ghost" @click="remove(bookmark.id)">Delete</button>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute } from '#app';

type BookmarkCard = {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  ogImage: string | null;
  status: string;
  domain: string | null;
  aiStatus?: string | null;
  sourceType?: string | null;
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
let refreshTimer: ReturnType<typeof setInterval> | null = null;

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

function normalizeCards(items: BookmarkCard[] | undefined) {
  return (items || []).map((item) => ({
    ...item,
    tags: item.tags || []
  }));
}

function isProcessing(bookmark: BookmarkCard) {
  return bookmark.status !== 'done' || Boolean(bookmark.aiStatus && bookmark.aiStatus !== 'done' && bookmark.aiStatus !== 'skipped');
}

function cardTitle(bookmark: BookmarkCard) {
  if (bookmark.title) {
    return bookmark.title;
  }
  if (isProcessing(bookmark)) {
    return 'Saving bookmark preview';
  }
  return 'Untitled bookmark';
}

function cardDescription(bookmark: BookmarkCard) {
  if (bookmark.description) {
    return bookmark.description;
  }
  if (isProcessing(bookmark)) {
    if (bookmark.sourceType === 'twitter') {
      return 'Extracting the post text, author, and referenced topics.';
    }
    if (bookmark.sourceType === 'youtube') {
      return 'Pulling the video title, channel, and searchable metadata.';
    }
    if (bookmark.sourceType === 'github') {
      return 'Indexing repository details and generating retrieval-friendly tags.';
    }
    return 'Fetching page content and preparing tags, summary, and search data.';
  }
  return 'No description extracted yet.';
}

function cardMeta(bookmark: BookmarkCard) {
  let domain = bookmark.domain || 'unknown source';
  if (!bookmark.domain) {
    try {
      domain = new URL(bookmark.url).hostname;
    } catch {
      domain = 'unknown source';
    }
  }
  if (isProcessing(bookmark)) {
    return `${domain} · enrichment in progress`;
  }
  return `${domain} · ${bookmark.status}`;
}

function cardCoverLabel(bookmark: BookmarkCard) {
  if (bookmark.domain) {
    return bookmark.domain.slice(0, 2).toUpperCase();
  }
  try {
    return new URL(bookmark.url).hostname.slice(0, 2).toUpperCase();
  } catch {
    return 'GL';
  }
}

async function loadCards() {
  loading.value = true;
  const response = await $fetch('/api/bookmarks', { query: activeFilters.value });
  if ((response as { items?: BookmarkCard[] }).items) {
    cards.value = normalizeCards((response as { items: BookmarkCard[] }).items);
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
  cards.value = normalizeCards((response as { items: BookmarkCard[] }).items);
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
  refreshTimer = setInterval(() => {
    if (cards.value.some((bookmark) => isProcessing(bookmark))) {
      void refresh();
    }
  }, 4000);
});

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<style scoped>
.bookmark-card.processing {
  border-color: rgba(245, 158, 11, 0.35);
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.12);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.processing-pill,
.chip-muted {
  background: rgba(245, 158, 11, 0.14);
  color: #9a6700;
}

.processing-pill {
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.3rem 0.65rem;
  text-transform: uppercase;
  white-space: nowrap;
}
</style>
