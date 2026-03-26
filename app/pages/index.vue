<template>
  <section class="dashboard">
    <!-- Save row — admin only -->
    <header v-if="isAuthenticated" class="save-row">
      <form class="save-form" @submit.prevent="addUrl">
        <input v-model="urlToSave" type="url" placeholder="Paste a URL and it will save instantly" required />
        <button class="primary" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save URL' }}</button>
      </form>
      <p v-if="message" class="message">{{ message }}</p>
    </header>

    <!-- Public banner -->
    <div v-else class="public-banner">
      <span>📖 You're browsing in read-only mode.</span>
      <NuxtLink to="/login" class="sign-in-link">Sign in to save links →</NuxtLink>
    </div>

    <section class="grid-wrap">
      <article v-if="loading && cards.length === 0" class="status-card">Loading…</article>
      <article v-else-if="!loading && cards.length === 0" class="status-card">No bookmarks yet.</article>

      <article
        v-for="bookmark in cards"
        :key="bookmark.id"
        :class="['card bookmark-card', { processing: isProcessing(bookmark) }]"
      >
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
            <NuxtLink :to="`/bookmarks/${bookmark.id}`" class="text-link">
              {{ isProcessing(bookmark) ? 'View status' : 'Open' }}
            </NuxtLink>
            <!-- Delete is admin-only -->
            <button v-if="isAuthenticated" class="ghost" @click="remove(bookmark.id)">Delete</button>
          </div>
        </div>
      </article>

      <!-- Infinite scroll sentinel -->
      <div ref="sentinel" class="sentinel" />

      <!-- Load more fallback / end of list state -->
      <p v-if="!hasMore && cards.length > 0" class="end-of-list">You've seen everything ✓</p>
      <p v-if="loadingMore" class="loading-more">Loading more…</p>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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

// Auth state — set by middleware, drives conditional UI
const isAuthenticated = useState<boolean>('isAuthenticated', () => false);

const cards = ref<BookmarkCard[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const saving = ref(false);
const urlToSave = ref('');
const message = ref('');
const page = ref(1);
const total = ref(0);
const sentinel = ref<HTMLElement | null>(null);
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let observer: IntersectionObserver | null = null;

const hasMore = computed(() => cards.value.length < total.value);

const categoryId = computed(() => {
  const raw = route.query.categoryId;
  if (typeof raw === 'string' && raw) {
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }
  return null;
});

const query = computed(() => route.query.q || '');

function normalizeCards(items: BookmarkCard[] | undefined) {
  return (items || []).map((item) => ({ ...item, tags: item.tags || [] }));
}

function isProcessing(bookmark: BookmarkCard) {
  return bookmark.status !== 'done' || Boolean(bookmark.aiStatus && bookmark.aiStatus !== 'done' && bookmark.aiStatus !== 'skipped');
}

function cardTitle(bookmark: BookmarkCard) {
  if (bookmark.title) return bookmark.title;
  if (isProcessing(bookmark)) return 'Saving bookmark preview';
  return 'Untitled bookmark';
}

function cardDescription(bookmark: BookmarkCard) {
  if (bookmark.description) return bookmark.description;
  if (isProcessing(bookmark)) {
    if (bookmark.sourceType === 'twitter') return 'Extracting the post text, author, and referenced topics.';
    if (bookmark.sourceType === 'youtube') return 'Pulling the video title, channel, and searchable metadata.';
    if (bookmark.sourceType === 'github') return 'Indexing repository details and generating retrieval-friendly tags.';
    return 'Fetching page content and preparing tags, summary, and search data.';
  }
  return 'No description extracted yet.';
}

function cardMeta(bookmark: BookmarkCard) {
  let domain = bookmark.domain || 'unknown source';
  if (!bookmark.domain) {
    try { domain = new URL(bookmark.url).hostname; } catch { domain = 'unknown source'; }
  }
  return isProcessing(bookmark) ? `${domain} · enrichment in progress` : `${domain} · ${bookmark.status}`;
}

function cardCoverLabel(bookmark: BookmarkCard) {
  if (bookmark.domain) return bookmark.domain.slice(0, 2).toUpperCase();
  try { return new URL(bookmark.url).hostname.slice(0, 2).toUpperCase(); } catch { return 'GL'; }
}

async function fetchPage(pageNum: number) {
  const params: Record<string, string | number> = {
    page: pageNum,
    limit: 24,
    ...(categoryId.value ? { categoryId: categoryId.value } : {})
  };

  if (query.value) {
    const response = await $fetch('/api/search', {
      query: {
        q: String(query.value),
        mode: 'keyword',  // public-safe default; server also enforces this for unauthenticated
        ...params
      } as Record<string, string | number>
    });
    return response as { items: BookmarkCard[]; total: number };
  }

  const response = await $fetch('/api/bookmarks', { query: params });
  return response as { items: BookmarkCard[]; total: number };
}

async function loadInitial() {
  loading.value = true;
  page.value = 1;
  const result = await fetchPage(1);
  cards.value = normalizeCards(result.items);
  total.value = result.total;
  loading.value = false;
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return;
  loadingMore.value = true;
  const nextPage = page.value + 1;
  const result = await fetchPage(nextPage);
  cards.value = [...cards.value, ...normalizeCards(result.items)];
  total.value = result.total;
  page.value = nextPage;
  loadingMore.value = false;
}

async function addUrl() {
  if (!urlToSave.value) return;
  saving.value = true;
  message.value = '';
  try {
    await $fetch('/api/save', {
      method: 'POST',
      body: { url: urlToSave.value, categoryId: categoryId.value ?? undefined }
    });
    message.value = 'Saved and queued for enrichment';
    urlToSave.value = '';
    await loadInitial();
  } catch {
    message.value = 'Could not save URL';
  } finally {
    saving.value = false;
  }
}

async function remove(id: number) {
  await $fetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
  cards.value = cards.value.filter(c => c.id !== id);
  total.value = Math.max(0, total.value - 1);
}

function setupObserver() {
  if (!sentinel.value) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value && !loadingMore.value) {
        void loadMore();
      }
    },
    { rootMargin: '200px' }
  );
  observer.observe(sentinel.value);
}

watch(() => route.fullPath, () => { void loadInitial(); });

onMounted(async () => {
  await loadInitial();
  setupObserver();

  // Poll for processing status updates
  refreshTimer = setInterval(() => {
    if (cards.value.some(isProcessing)) {
      // Only refresh first page in-place for processing cards
      fetchPage(1).then(result => {
        const processingIds = new Set(cards.value.filter(isProcessing).map(c => c.id));
        result.items.forEach(updated => {
          if (processingIds.has(updated.id)) {
            const idx = cards.value.findIndex(c => c.id === updated.id);
            if (idx !== -1) cards.value[idx] = { ...cards.value[idx], ...updated };
          }
        });
      });
    }
  }, 4000);
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
  if (observer) observer.disconnect();
});
</script>

<style scoped>
.public-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  background: oklch(97% 0.008 240);
  border: 1px solid oklch(88% 0.015 240);
  border-radius: 10px;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: oklch(35% 0.02 240);
}

.sign-in-link {
  font-weight: 500;
  color: oklch(25% 0.015 240);
  text-decoration: none;
  margin-left: auto;
}

.sign-in-link:hover {
  text-decoration: underline;
}

.sentinel {
  height: 1px;
  width: 100%;
}

.end-of-list {
  text-align: center;
  color: #94a3b8;
  font-size: 0.8125rem;
  padding: 1.5rem 0;
  grid-column: 1 / -1;
}

.loading-more {
  text-align: center;
  color: #94a3b8;
  font-size: 0.8125rem;
  padding: 1rem 0;
  grid-column: 1 / -1;
}

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
