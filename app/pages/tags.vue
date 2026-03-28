<template>
  <div class="tags-page">
    <header class="tags-header">
      <NuxtLink to="/" class="back-link">
        <i class="ph ph-arrow-left" /> Back to Vault
      </NuxtLink>
      <h1>All Tags</h1>
      <p class="tags-count">{{ tags.length }} tags</p>
    </header>

    <div v-if="loading" class="loading-state">
      <i class="ph ph-spinner-gap spin" /> Loading tags…
    </div>

    <div v-else-if="tags.length === 0" class="empty-state">
      <p>No tags yet. Start saving bookmarks to generate tags.</p>
    </div>

    <div v-else class="tags-grid">
      <NuxtLink
        v-for="tag in sortedTags"
        :key="tag.name"
        :to="`/?tag=${encodeURIComponent(tag.name)}`"
        class="tag-card"
      >
        <span class="tag-name">#{{ tag.name }}</span>
        <span class="tag-count">{{ tag.count }} bookmarks</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const tags = ref<Array<{ name: string; count: number }>>([]);
const loading = ref(true);

const sortedTags = computed(() => {
  return [...tags.value].sort((a, b) => b.count - a.count);
});

async function loadTags() {
  try {
    const allTags = await $fetch('/api/tags') as Array<{ name: string }>;
    const counts: Record<string, number> = {};
    allTags.forEach(t => {
      if (t.name && !t.name.startsWith('tag:')) {
        counts[t.name] = (counts[t.name] || 0) + 1;
      }
    });
    tags.value = Object.entries(counts).map(([name, count]) => ({ name, count }));
  } catch {
    tags.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadTags();
});
</script>

<style scoped>
.tags-page {
  min-height: 100dvh;
  background: var(--bg-ground);
  padding: 48px;
}

.tags-header {
  max-width: 900px;
  margin: 0 auto 48px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-decoration: none;
  margin-bottom: 24px;
  transition: color var(--d-fast);
}
.back-link:hover { color: var(--color-accent); }

.tags-header h1 {
  font-size: var(--text-3xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
}

.tags-count {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.loading-state,
.empty-state {
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
  padding: 64px 20px;
  color: var(--text-muted);
}

.spin {
  display: inline-block;
  animation: spin 1s linear infinite;
}
@keyframes spin { 100% { transform: rotate(360deg); } }

.tags-grid {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.tag-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  text-decoration: none;
  transition: all var(--d-fast) var(--ease-out);
}

.tag-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.tag-name {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-accent);
}

.tag-count {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-weight: 500;
}

@media (max-width: 767px) {
  .tags-page { padding: 24px 16px; }
  .tags-header h1 { font-size: var(--text-2xl); }
  .tags-grid { grid-template-columns: 1fr; }
}
</style>
