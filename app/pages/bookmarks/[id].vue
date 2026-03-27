<template>
  <div class="reading-page">
    <div v-if="loading" class="loading-shell">
      <i class="ph ph-spinner-gap spin" /> Loading…
    </div>
    <div v-else-if="!bookmark" class="loading-shell">Bookmark not found.</div>
    <template v-else>
      <!-- Reading Header -->
      <header class="reading-header">
        <NuxtLink to="/" class="reading-back-btn">
          <i class="ph ph-arrow-left" /> Back to Vault
        </NuxtLink>
        <div class="reading-actions">
          <a :href="bookmark.url" target="_blank" rel="noreferrer" class="reading-action-btn" title="Open source">
            <i class="ph ph-arrow-square-out" />
          </a>
          <button class="reading-action-btn" @click="reprocess" :disabled="reprocessing" title="Reprocess with AI">
            <i class="ph ph-arrows-clockwise" :class="{ spin: reprocessing }" />
          </button>
          <button class="reading-action-btn" @click="togglePin" :disabled="pinning" :title="bookmark.isPinned ? 'Unpin' : 'Pin'">
            <i :class="['ph', bookmark.isPinned ? 'ph-fill ph-push-pin' : 'ph-push-pin']" />
          </button>
        </div>
      </header>

      <!-- Reading Body -->
      <div class="reading-scroll-area">
        <div class="reading-container">
          <div v-if="bookmark.ogImage" class="reading-hero-wrap">
            <img :src="bookmark.ogImage" :alt="bookmark.title || ''" class="reading-hero-image" />
          </div>
          <span class="reading-domain">{{ bookmark.domain }}</span>
          <h1 class="reading-title">{{ bookmark.title || 'Untitled' }}</h1>

          <div class="reading-meta-bar">
            <div class="reading-author">
              <a :href="bookmark.url" target="_blank" rel="noreferrer" class="source-link">View original →</a>
            </div>
            <div class="reading-tags">
              <span v-for="tag in tags" :key="tag.id" class="reading-tag">
                {{ tag.name }}
                <button @click="removeTag(tag.id)" class="tag-del" title="Remove tag">×</button>
              </span>
              <form @submit.prevent="addTag" class="tag-add-form">
                <input v-model="newTag" placeholder="+ add tag" class="tag-add-input" />
              </form>
            </div>
          </div>

          <div class="reading-body">
            <!-- AI Summary (or raw description if no summary) -->
            <p v-if="bookmark.summary || bookmark.description" class="reading-summary">
              {{ bookmark.summary || bookmark.description }}
            </p>

            <!-- Raw Content / Transcript Accordion -->
            <details v-if="bookmark.content" class="transcript-accordion">
              <summary class="transcript-toggle">
                <i class="ph ph-article"></i>
                View Full {{ bookmark.sourceType === 'youtube' ? 'Transcript' : 'Content' }}
                <i class="ph ph-caret-down accordion-icon"></i>
              </summary>
              <div class="transcript-content">
                <p style="white-space: pre-wrap;">{{ bookmark.content }}</p>
              </div>
            </details>
            
            <p v-else-if="!bookmark.summary && !bookmark.description" class="reading-empty">
              No description extracted yet.
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from '#app';

type BookmarkDetail = {
  id: number; title: string | null; url: string; domain: string;
  description: string | null; content: string | null; isPinned?: boolean;
  ogImage?: string | null; summary?: string | null; sourceType?: string | null;
};

const route = useRoute();
const bookmark = ref<BookmarkDetail | null>(null);
const tags = ref<Array<{ id: number; name: string }>>([]);
const newTag = ref('');
const loading = ref(false);
const reprocessing = ref(false);
const pinning = ref(false);
const id = Number(route.params.id);

async function load() {
  loading.value = true;
  const response = await $fetch(`/api/bookmarks/${id}`);
  if ((response as { statusCode?: number }).statusCode) { bookmark.value = null; loading.value = false; return; }
  const p = response as any;
  bookmark.value = { 
    id: p.id, title: p.title, url: p.url, domain: p.domain, description: p.description, 
    content: p.content, isPinned: p.is_pinned === 1, ogImage: p.ogImage, 
    summary: p.summary, sourceType: p.source_type 
  };
  tags.value = (p.tags || []).map((t: { id: number; name: string }) => ({ id: t.id, name: t.name }));
  loading.value = false;
}
async function reprocess() {
  if (reprocessing.value) return;
  reprocessing.value = true;
  try { await $fetch(`/api/bookmarks/${id}/reprocess`, { method: 'POST' }); await new Promise(r => setTimeout(r, 3000)); await load(); } finally { reprocessing.value = false; }
}
async function togglePin() {
  if (pinning.value) return;
  pinning.value = true;
  try { await $fetch(`/api/bookmarks/${id}/pin`, { method: 'POST' }); bookmark.value!.isPinned = !bookmark.value!.isPinned; } finally { pinning.value = false; }
}
async function addTag() {
  if (!newTag.value.trim()) return;
  await $fetch('/api/tags', { method: 'POST', body: { bookmarkId: id, name: newTag.value.trim() } });
  newTag.value = ''; await load();
}
async function removeTag(tagId: number) {
  await $fetch(`/api/bookmarks/${id}/tags/${tagId}`, { method: 'DELETE' }); await load();
}

await load();
</script>

<style scoped>
.reading-page { min-height: 100dvh; background: var(--bg-ground); display: flex; flex-direction: column; }

.loading-shell {
  display: flex; align-items: center; justify-content: center;
  min-height: 60vh; font-size: var(--text-lg); color: var(--text-muted); gap: 10px;
}
.spin { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.reading-header {
  padding: 16px 48px; display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface);
  position: sticky; top: 0; z-index: var(--z-sticky); backdrop-filter: blur(12px);
}
.reading-back-btn {
  display: flex; align-items: center; gap: 8px;
  font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--d-fast);
}
.reading-back-btn:hover { color: var(--color-accent); }
.reading-actions { display: flex; gap: 10px; }
.reading-action-btn {
  width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center;
  color: var(--text-secondary); font-size: 18px; text-decoration: none;
  transition: background var(--d-fast), color var(--d-fast);
  border: 1px solid var(--border-subtle);
}
.reading-action-btn:hover { background: var(--bg-raised); color: var(--text-primary); }
.reading-action-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.reading-scroll-area { flex: 1; overflow-y: auto; padding: 48px 0 80px; }
.reading-container { max-width: 720px; margin: 0 auto; padding: 0 24px; }

.reading-hero-wrap { margin-bottom: 28px; }
.reading-hero-image { width: 100%; border-radius: 20px; object-fit: cover; max-height: 400px; box-shadow: var(--shadow-md); }

.reading-domain { font-size: var(--text-sm); font-weight: 600; color: var(--color-accent); margin-bottom: 10px; display: block; }
.reading-title { font-size: var(--text-4xl); font-weight: 700; line-height: 1.15; letter-spacing: -0.025em; margin-bottom: 20px; color: var(--text-primary); }

.reading-meta-bar {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding-bottom: 24px; margin-bottom: 32px; border-bottom: 1px solid var(--border-subtle);
  flex-wrap: wrap;
}
.source-link { font-size: var(--text-sm); color: var(--color-accent); font-weight: 500; transition: opacity var(--d-fast); }
.source-link:hover { opacity: 0.75; }
.reading-tags { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.reading-tag {
  background: var(--color-accent-bg); color: var(--ref-pine);
  font-size: var(--text-xs); padding: 4px 10px; border-radius: 6px;
  border: 1px solid oklch(38% 0.105 189 / 0.18);
  font-weight: 500; display: flex; align-items: center; gap: 4px;
}
.tag-del { opacity: 0.5; font-size: 14px; line-height: 1; transition: opacity var(--d-fast); }
.tag-del:hover { opacity: 1; }

.tag-add-form { display: inline; }
.tag-add-input {
  font-size: var(--text-xs); color: var(--text-muted); font-family: var(--font-ui);
  border: 1px dashed var(--border-default); border-radius: 6px;
  padding: 4px 8px; background: transparent; width: 80px;
  transition: border-color var(--d-fast), width var(--d-base) var(--ease-out);
}
.tag-add-input:focus { outline: none; border-color: var(--color-accent); color: var(--text-primary); width: 120px; }
.tag-add-input::placeholder { color: var(--text-muted); }

.reading-body { font-size: var(--text-lg); line-height: 1.8; color: var(--text-primary); }
.reading-body p { margin-bottom: 1.5em; }
.reading-empty { color: var(--text-muted); font-style: italic; }

.reading-summary {
  font-size: 1.15rem;
  line-height: 1.7;
  color: var(--text-primary);
  margin-bottom: 32px;
}

.transcript-accordion {
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  background: var(--bg-surface);
  overflow: hidden;
  margin-top: 24px;
  transition: all var(--d-fast);
}

.transcript-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
  user-select: none;
  list-style: none; /* Hide default triangle */
}
.transcript-toggle::-webkit-details-marker {
  display: none;
}
.transcript-toggle:hover {
  background: var(--bg-raised);
  color: var(--text-primary);
}

.accordion-icon {
  margin-left: auto;
  transition: transform var(--d-fast);
}

details[open] .accordion-icon {
  transform: rotate(180deg);
}
details[open] .transcript-toggle {
  border-bottom: 1px solid var(--border-subtle);
}

.transcript-content {
  padding: 24px;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  max-height: 60vh;
  overflow-y: auto;
  scrollbar-width: thin;
}

@media (max-width: 767px) {
  .reading-header { padding: 14px 20px; }
  .reading-title { font-size: var(--text-3xl); }
  .reading-container { padding: 0 16px; }
  .reading-scroll-area { padding: 32px 0 60px; }
}
</style>
