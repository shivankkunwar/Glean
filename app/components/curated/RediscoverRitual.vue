<template>
  <section class="rediscover-section">
    <div class="curated-container">
      <div class="rediscover-header-row">
        <EditorialSectionHeader
          eyebrow="Return"
          title="Rediscover"
          description="A few older pieces worth another look."
        />
        <button
          class="rediscover-refresh font-ui"
          :disabled="isRefreshing"
          @click="$emit('refresh')"
        >
          <i class="ph ph-arrows-clockwise" :class="{ spin: isRefreshing }" />
          <span>{{ isRefreshing ? 'Refreshing…' : 'Show 3 others' }}</span>
        </button>
      </div>

      <div class="rediscover-list">
        <article
          v-for="item in items.slice(0, 3)"
          :key="item.id"
          class="rediscover-card"
        >
          <div v-if="item.ogImage" class="rediscover-image">
            <img :src="item.ogImage" :alt="item.title || ''" loading="lazy" />
          </div>
          <div class="rediscover-body">
            <h3 class="rediscover-title font-editorial">{{ item.title || 'Untitled' }}</h3>
            <p v-if="item.description || item.summary" class="rediscover-desc font-body">
              {{ item.description || item.summary }}
            </p>
            <div class="rediscover-meta font-ui">
              <span>{{ item.domain }}</span>
              <span v-if="item.createdAt" class="rediscover-date">{{ formatDate(item.createdAt) }}</span>
            </div>
            <div class="rediscover-actions">
              <a
                v-if="item.url"
                :href="item.url"
                target="_blank"
                rel="noreferrer noopener"
                class="rediscover-action font-ui"
              >
                Open
              </a>
              <NuxtLink :to="`/bookmarks/${item.id}`" class="rediscover-action font-ui">
                View
              </NuxtLink>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CuratedBookmark } from '~/types/curated';
import EditorialSectionHeader from './EditorialSectionHeader.vue';

defineProps<{
  items: CuratedBookmark[];
  isRefreshing?: boolean;
}>();

defineEmits<{
  refresh: [];
}>();

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
</script>

<style scoped>
.rediscover-section {
  padding: 0 48px 80px;
}

.curated-container {
  max-width: 1100px;
  margin: 0 auto;
}

.rediscover-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.rediscover-refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--d-fast), color var(--d-fast), border-color var(--d-fast);
  flex-shrink: 0;
  margin-top: 24px;
}

.rediscover-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (hover: hover) and (pointer: fine) {
  .rediscover-refresh:hover:not(:disabled) {
    background: var(--color-accent-bg);
    color: var(--ref-pine);
    border-color: var(--ref-pine);
  }
}

.rediscover-refresh:active:not(:disabled) {
  transform: scale(0.97);
}

.spin {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.rediscover-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.rediscover-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: transform var(--d-fast) var(--ease-out), box-shadow var(--d-fast) var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .rediscover-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
  }
}

.rediscover-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--bg-raised);
}
.rediscover-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform var(--d-slow) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .rediscover-card:hover .rediscover-image img {
    transform: scale(1.02);
  }
}

.rediscover-body {
  padding: 20px 22px 22px;
}

.rediscover-title {
  font-size: var(--text-base);
  font-weight: 500;
  line-height: 1.3;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.rediscover-desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.55;
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.rediscover-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.rediscover-date::before {
  content: '·';
  margin-right: 10px;
}

.rediscover-actions {
  display: flex;
  gap: 10px;
}

.rediscover-action {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--ref-pine);
  background: var(--color-accent-bg);
  padding: 6px 12px;
  border-radius: 6px;
  text-decoration: none;
  transition: background var(--d-fast), color var(--d-fast);
}

@media (hover: hover) and (pointer: fine) {
  .rediscover-action:hover {
    background: var(--ref-pine);
    color: var(--text-inverse);
  }
}

/* Tablet */
@media (max-width: 1023px) {
  .rediscover-list {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
}

/* Mobile */
@media (max-width: 767px) {
  .rediscover-section {
    padding: 0 16px 28px;
  }
  .rediscover-list {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .rediscover-card {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    border-radius: var(--radius-md);
    box-shadow: none;
  }
  .rediscover-image {
    width: 80px;
    aspect-ratio: auto;
    min-height: 100%;
    flex-shrink: 0;
  }
  .rediscover-body {
    padding: 10px 12px;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .rediscover-title {
    font-size: var(--text-sm);
    margin-bottom: 3px;
    line-height: 1.3;
  }
  .rediscover-desc {
    font-size: 11px;
    margin-bottom: 6px;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    line-height: 1.4;
  }
  .rediscover-meta {
    margin-bottom: 8px;
    font-size: 10px;
    gap: 6px;
  }
  .rediscover-date::before {
    margin-right: 6px;
  }
  .rediscover-actions {
    gap: 6px;
  }
  .rediscover-action {
    padding: 5px 10px;
    font-size: 11px;
    min-height: 28px;
    display: inline-flex;
    align-items: center;
    border-radius: 5px;
  }
  .rediscover-header-row {
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }
  .rediscover-refresh {
    margin-top: 0;
    align-self: flex-start;
    padding: 5px 10px;
    font-size: 11px;
    min-height: 32px;
  }
}

/* Small phones */
@media (max-width: 380px) {
  .rediscover-image {
    width: 70px;
  }
  .rediscover-body {
    padding: 8px 10px;
  }
  .rediscover-title {
    font-size: 13px;
  }
  .rediscover-desc {
    -webkit-line-clamp: 1;
    line-clamp: 1;
  }
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  .rediscover-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .rediscover-card {
    transition: none;
  }
  .rediscover-card:hover {
    transform: none;
  }
}
</style>
