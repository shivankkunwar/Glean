<template>
  <section class="radar-section">
    <div class="curated-container">
      <EditorialSectionHeader
        eyebrow="Emerging"
        title="Radar"
        description="Themes appearing across what you've saved lately."
      />

      <div class="radar-grid">
        <article
          v-for="theme in themes.slice(0, 4)"
          :key="theme.id"
          class="radar-card"
        >
          <div class="radar-card-header">
            <h3 class="radar-title font-editorial">{{ theme.title }}</h3>
            <span class="radar-count font-ui">{{ theme.itemCount }} items</span>
          </div>
          <p class="radar-subtitle font-body">{{ theme.subtitle }}</p>

          <div v-if="theme.items.length > 0" class="radar-previews">
            <NuxtLink
              v-for="item in theme.items.slice(0, 3)"
              :key="item.id"
              :to="`/bookmarks/${item.id}`"
              class="radar-preview"
            >
              <div v-if="item.ogImage" class="radar-preview-image">
                <img :src="item.ogImage" :alt="item.title || ''" loading="lazy" />
              </div>
              <div v-else class="radar-preview-placeholder">
                <i class="ph ph-bookmark" />
              </div>
              <span class="radar-preview-title font-ui">{{ item.title || 'Untitled' }}</span>
            </NuxtLink>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CuratedTheme } from '~/types/curated';
import EditorialSectionHeader from './EditorialSectionHeader.vue';

defineProps<{
  themes: CuratedTheme[];
}>();
</script>

<style scoped>
.radar-section {
  padding: 0 48px 64px;
}

.curated-container {
  max-width: 1100px;
  margin: 0 auto;
}

.radar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.radar-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 20px;
  transition: transform var(--d-fast) var(--ease-out), box-shadow var(--d-fast) var(--ease-out);
  min-width: 0;
}

@media (hover: hover) and (pointer: fine) {
  .radar-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
}

.radar-card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.radar-title {
  font-size: var(--text-lg);
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.2;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.radar-count {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-weight: 500;
  flex-shrink: 0;
}

.radar-subtitle {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: 16px;
  line-height: 1.5;
}

.radar-previews {
  display: flex;
  gap: 10px;
}

.radar-preview {
  flex: 1;
  min-width: 0;
  cursor: pointer;
  transition: transform var(--d-fast) var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .radar-preview:hover {
    transform: translateY(-2px);
  }
}

.radar-preview-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: 6px;
  background: var(--bg-raised);
}
.radar-preview-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.radar-preview-placeholder {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-sm);
  background: var(--bg-raised);
  display: grid;
  place-items: center;
  color: var(--text-muted);
  font-size: 18px;
  margin-bottom: 6px;
}

.radar-preview-title {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Tablet and below */
@media (max-width: 1024px) {
  .radar-grid {
    grid-template-columns: 1fr;
  }
}

/* Mobile */
@media (max-width: 767px) {
  .radar-section {
    padding: 0 16px 40px;
  }
  .radar-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .radar-card {
    padding: 14px;
    min-width: 0;
  }
  .radar-card-header {
    gap: 8px;
  }
  .radar-title {
    font-size: var(--text-base);
  }
  .radar-subtitle {
    font-size: var(--text-sm);
    margin-bottom: 12px;
  }
  .radar-previews {
    gap: 8px;
  }
  .radar-preview-image,
  .radar-preview-placeholder {
    aspect-ratio: 16 / 10;
    margin-bottom: 4px;
  }
  .radar-preview-title {
    font-size: 11px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .radar-card,
  .radar-preview {
    transition: none;
  }
  .radar-card:hover,
  .radar-preview:hover {
    transform: none;
  }
}
</style>
