<template>
  <section class="dashboard" :class="{ 'reading-mode': readingMode }">
    <article v-if="loading" class="status-card">Loading…</article>

    <article v-else-if="!bookmark" class="status-card">Bookmark not found</article>

    <article v-else class="card bookmark-detail" :class="{ 'reading-mode': readingMode }">
      <header v-if="!readingMode">
        <h1>{{ bookmark.title || 'Untitled' }}</h1>
        <p class="muted">{{ bookmark.domain }}</p>
        <div class="actions-row">
          <a :href="bookmark.url" target="_blank" rel="noreferrer" class="primary">Open Source</a>
          <button class="ghost" @click="reprocess" :disabled="reprocessing">
            {{ reprocessing ? 'Reprocessing…' : 'Reprocess' }}
          </button>
          <button class="ghost" @click="togglePin" :disabled="pinning">
            {{ bookmark.isPinned ? '📌 Pinned' : 'Pin' }}
          </button>
          <button class="ghost" @click="readingMode = true">Reading Mode</button>
        </div>
      </header>

      <div class="reading-header" v-if="readingMode">
        <button class="ghost" @click="readingMode = false">← Back</button>
        <span class="reading-domain">{{ bookmark.domain }}</span>
      </div>

      <div class="content-section" :class="{ 'reading-content': readingMode }">
        <h1 v-if="readingMode" class="reading-title">{{ bookmark.title || 'Untitled' }}</h1>
        <p v-if="bookmark.content" class="full-content" style="white-space: pre-wrap;">{{ bookmark.content }}</p>
        <p v-else-if="bookmark.description">{{ bookmark.description }}</p>
        <p v-else class="muted">No description extracted yet.</p>
      </div>

      <div v-if="!readingMode">
        <form class="save-form" @submit.prevent="addTag">
          <input v-model="newTag" placeholder="Add tag" />
          <button class="primary" type="submit">Add</button>
        </form>

        <div class="chips">
          <span v-for="tag in tags" :key="tag.id" class="chip">
            {{ tag.name }}
            <button class="ghost tiny" @click="removeTag(tag.id)">×</button>
          </span>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { useRoute } from '#app';

type BookmarkDetail = {
  id: number;
  title: string | null;
  url: string;
  domain: string;
  description: string | null;
  content: string | null;
  isPinned?: boolean;
};

const route = useRoute();
const bookmark = ref<BookmarkDetail | null>(null);
const tags = ref<Array<{ id: number; name: string }>>([]);
const newTag = ref('');
const loading = ref(false);
const reprocessing = ref(false);
const pinning = ref(false);
const readingMode = ref(false);

const id = Number(route.params.id);

async function load() {
  loading.value = true;
  const response = await $fetch(`/api/bookmarks/${id}`);
  if ((response as { statusCode?: number }).statusCode) {
    bookmark.value = null;
    loading.value = false;
    return;
  }

  const payload = response as any;
  bookmark.value = {
    id: payload.id,
    title: payload.title,
    url: payload.url,
    domain: payload.domain,
    description: payload.description,
    content: payload.content,
    isPinned: payload.is_pinned === 1
  };
  tags.value = (payload.tags || []).map((tag: { id: number; name: string }) => ({ id: tag.id, name: tag.name }));
  loading.value = false;
}

async function reprocess() {
  if (reprocessing.value) return;
  reprocessing.value = true;
  try {
    await $fetch(`/api/bookmarks/${id}/reprocess`, { method: 'POST' });
    // Wait a bit for processing, then reload
    await new Promise(r => setTimeout(r, 3000));
    await load();
  } finally {
    reprocessing.value = false;
  }
}

async function togglePin() {
  if (pinning.value) return;
  pinning.value = true;
  try {
    await $fetch(`/api/bookmarks/${id}/pin`, { method: 'POST' });
    bookmark.value!.isPinned = !bookmark.value!.isPinned;
  } finally {
    pinning.value = false;
  }
}

async function addTag() {
  if (!newTag.value.trim()) {
    return;
  }

  await $fetch('/api/tags', {
    method: 'POST',
    body: {
      bookmarkId: id,
      name: newTag.value.trim()
    }
  });
  newTag.value = '';
  await load();
}

async function removeTag(tagId: number) {
  await $fetch(`/api/bookmarks/${id}/tags/${tagId}`, { method: 'DELETE' });
  await load();
}

await load();
</script>

<style scoped>
.content-section {
  margin: 1rem 0;
}

.full-content {
  font-size: 0.95rem;
  line-height: 1.6;
  max-height: 400px;
  overflow-y: auto;
}

.actions-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.reading-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.reading-domain {
  font-size: 0.85rem;
  color: #666;
}

.reading-content {
  max-width: 680px;
  margin: 0 auto;
}

.reading-title {
  font-size: 1.75rem;
  line-height: 1.3;
  margin-bottom: 1.5rem;
}

.reading-mode .full-content {
  font-size: 1.1rem;
  line-height: 1.8;
  max-height: none;
  overflow: visible;
}

.bookmark-detail.reading-mode {
  padding: 2rem;
}
</style>
