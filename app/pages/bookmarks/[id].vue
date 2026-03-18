<template>
  <section class="dashboard">
    <article v-if="loading" class="status-card">Loading…</article>

    <article v-else-if="!bookmark" class="status-card">Bookmark not found</article>

    <article v-else class="card bookmark-detail">
      <header>
        <h1>{{ bookmark.title || 'Untitled' }}</h1>
        <p class="muted">{{ bookmark.domain }}</p>
        <div class="actions-row">
          <a :href="bookmark.url" target="_blank" rel="noreferrer" class="primary">Open Source</a>
          <button class="ghost" @click="reprocess" :disabled="reprocessing">
            {{ reprocessing ? 'Reprocessing…' : 'Reprocess' }}
          </button>
        </div>
      </header>

      <div class="content-section">
        <p v-if="bookmark.content" class="full-content" style="white-space: pre-wrap;">{{ bookmark.content }}</p>
        <p v-else-if="bookmark.description">{{ bookmark.description }}</p>
        <p v-else class="muted">No description extracted yet.</p>
      </div>

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
};

const route = useRoute();
const bookmark = ref<BookmarkDetail | null>(null);
const tags = ref<Array<{ id: number; name: string }>>([]);
const newTag = ref('');
const loading = ref(false);
const reprocessing = ref(false);

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
    content: payload.content
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
</style>
