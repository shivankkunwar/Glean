<template>
  <section class="dashboard">
    <article v-if="loading" class="status-card">Loading…</article>

    <article v-else-if="!bookmark" class="status-card">Bookmark not found</article>

    <article v-else class="card bookmark-detail">
      <header>
        <h1>{{ bookmark.title || 'Untitled' }}</h1>
        <p class="muted">{{ bookmark.domain }}</p>
        <a :href="bookmark.url" target="_blank" rel="noreferrer" class="primary">Open Source</a>
      </header>

      <p>{{ bookmark.description || 'No description extracted yet.' }}</p>

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
};

const route = useRoute();
const bookmark = ref<BookmarkDetail | null>(null);
const tags = ref<Array<{ id: number; name: string }>>([]);
const newTag = ref('');
const loading = ref(false);

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
    description: payload.description
  };
  tags.value = (payload.tags || []).map((tag: { id: number; name: string }) => ({ id: tag.id, name: tag.name }));
  loading.value = false;
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
