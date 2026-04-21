<template>
  <section class="tom-section">
    <div class="curated-container">
      <EditorialSectionHeader
        eyebrow="Current"
        title="Top of Mind"
        description="The pieces you've chosen to keep close."
      />

      <div v-if="items.length === 0" class="tom-empty font-body">
        <p>Pinned items will appear here.</p>
      </div>

      <div v-else class="tom-shelf">
        <!-- Lead card -->
        <div v-if="leadItem" class="tom-lead-card">
          <NuxtLink :to="`/bookmarks/${leadItem.id}`" class="tom-card-link" />
          <div v-if="leadItem.ogImage" class="tom-lead-image">
            <img :src="leadItem.ogImage" :alt="leadItem.title || ''" loading="lazy" />
          </div>
          <div class="tom-lead-body">
            <h3 class="tom-lead-title font-editorial">{{ leadItem.title || 'Untitled' }}</h3>
            <p v-if="leadItem.description || leadItem.summary" class="tom-lead-desc font-body">
              {{ leadItem.description || leadItem.summary }}
            </p>
            <div class="tom-lead-meta font-ui">
              <span>{{ leadItem.domain }}</span>
              <span v-if="leadItem.tags && leadItem.tags.length > 0" class="tom-lead-tags">
                <span v-for="tag in leadItem.tags.slice(0, 3)" :key="tag.id" class="tom-tag">{{ tag.name }}</span>
              </span>
            </div>
          </div>
          <a
            v-if="leadItem.url"
            :href="leadItem.url"
            target="_blank"
            rel="noreferrer noopener"
            class="tom-open-link"
          >
            <i class="ph ph-arrow-square-out" />
          </a>
        </div>

        <!-- Companion cards -->
        <div v-if="companionItems.length > 0" class="tom-companion-list">
          <div
            v-for="item in companionItems"
            :key="item.id"
            class="tom-companion-card"
          >
            <NuxtLink :to="`/bookmarks/${item.id}`" class="tom-card-link" />
            <div v-if="item.ogImage" class="tom-companion-image">
              <img :src="item.ogImage" :alt="item.title || ''" loading="lazy" />
            </div>
            <div class="tom-companion-body">
              <h4 class="tom-companion-title font-editorial">{{ item.title || 'Untitled' }}</h4>
              <div class="tom-companion-meta font-ui">
                <span>{{ item.domain }}</span>
              </div>
            </div>
            <a
              v-if="item.url"
              :href="item.url"
              target="_blank"
              rel="noreferrer noopener"
              class="tom-open-link"
            >
              <i class="ph ph-arrow-square-out" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CuratedBookmark } from '~/types/curated';
import EditorialSectionHeader from './EditorialSectionHeader.vue';

const props = defineProps<{
  items: CuratedBookmark[];
}>();

const leadItem = computed(() => props.items[0] || null);
const companionItems = computed(() => props.items.slice(1));
</script>

<style scoped>
.tom-section {
  padding: 0 48px 64px;
}

.curated-container {
  max-width: 1100px;
  margin: 0 auto;
}

.tom-empty {
  padding: 40px 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.tom-shelf {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;
  align-items: start;
}

/* Lead card */
.tom-lead-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: transform var(--d-fast) var(--ease-out), box-shadow var(--d-fast) var(--ease-out);
  position: relative;
}

.tom-card-link {
  position: absolute;
  inset: 0;
  z-index: 1;
  text-decoration: none;
}

.tom-lead-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--ref-pine);
  opacity: 0.6;
}

@media (hover: hover) and (pointer: fine) {
  .tom-lead-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-lg);
  }
}

.tom-lead-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}
.tom-lead-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform var(--d-slow) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .tom-lead-card:hover .tom-lead-image img {
    transform: scale(1.03);
  }
}

.tom-lead-body {
  padding: 20px 22px 22px;
}
.tom-lead-title {
  font-size: var(--text-xl);
  font-weight: 500;
  line-height: 1.25;
  margin-bottom: 10px;
  color: var(--text-primary);
}
.tom-lead-desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.55;
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}
.tom-lead-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  flex-wrap: wrap;
}
.tom-lead-tags {
  display: flex;
  gap: 6px;
}
.tom-tag {
  background: var(--color-accent-bg);
  color: var(--ref-pine);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: var(--text-xs);
  font-weight: 500;
}

/* Companion cards */
.tom-companion-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tom-companion-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: transform var(--d-fast) var(--ease-out), box-shadow var(--d-fast) var(--ease-out);
  display: flex;
  align-items: stretch;
  position: relative;
}
@media (hover: hover) and (pointer: fine) {
  .tom-companion-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
}

.tom-companion-image {
  width: 100px;
  min-height: 80px;
  flex-shrink: 0;
  overflow: hidden;
}
.tom-companion-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tom-companion-body {
  padding: 14px 16px;
  flex: 1;
  min-width: 0;
}
.tom-companion-title {
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.3;
  margin-bottom: 6px;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}
.tom-companion-meta {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* Open link */
.tom-open-link {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: oklch(99.2% 0.007 78 / 0.92);
  display: grid;
  place-items: center;
  color: var(--text-muted);
  font-size: 12px;
  opacity: 0;
  transform: scale(0.9);
  transition: opacity var(--d-fast) var(--ease-out), transform var(--d-fast) var(--ease-out), color var(--d-fast);
  text-decoration: none;
  z-index: 2;
}
@media (hover: hover) and (pointer: fine) {
  .tom-lead-card:hover .tom-open-link,
  .tom-companion-card:hover .tom-open-link {
    opacity: 1;
    transform: scale(1);
  }
  .tom-open-link:hover {
    color: var(--color-accent);
    background: var(--color-accent-bg);
  }
}

/* Tablet */
@media (max-width: 1023px) {
  .tom-shelf {
    grid-template-columns: 1fr;
  }
}

/* Mobile */
@media (max-width: 767px) {
  .tom-section {
    padding: 0 16px 28px;
  }
  .tom-shelf {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .tom-lead-card {
    border-radius: var(--radius-md);
    box-shadow: none;
  }
  .tom-lead-body {
    padding: 14px 16px 16px;
  }
  .tom-lead-title {
    font-size: var(--text-base);
    margin-bottom: 8px;
  }
  .tom-lead-desc {
    font-size: var(--text-sm);
    -webkit-line-clamp: 2;
    line-clamp: 2;
    margin-bottom: 10px;
  }
  .tom-lead-meta {
    gap: 8px;
    font-size: 11px;
  }
  .tom-companion-list {
    display: flex;
    flex-direction: row;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 6px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    margin: 0 -4px;
    padding-left: 4px;
    padding-right: 4px;
  }
  .tom-companion-list::-webkit-scrollbar {
    height: 3px;
  }
  .tom-companion-list::-webkit-scrollbar-thumb {
    background: var(--border-default);
    border-radius: 3px;
  }
  .tom-companion-card {
    flex: 0 0 200px;
    scroll-snap-align: start;
    flex-direction: column;
    border-radius: var(--radius-sm);
  }
  .tom-companion-image {
    width: 100%;
    aspect-ratio: 16 / 9;
    min-height: auto;
  }
  .tom-companion-body {
    padding: 10px 12px;
  }
  .tom-companion-title {
    font-size: var(--text-sm);
    margin-bottom: 4px;
  }
  .tom-companion-meta {
    font-size: 11px;
  }
  .tom-open-link {
    opacity: 1;
    transform: scale(1);
    width: 30px;
    height: 30px;
    top: 8px;
    right: 8px;
  }
}

/* Small phones */
@media (max-width: 380px) {
  .tom-companion-card {
    flex: 0 0 170px;
  }
  .tom-lead-title {
    font-size: var(--text-sm);
  }
  .tom-lead-desc {
    -webkit-line-clamp: 1;
    line-clamp: 1;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .tom-lead-card,
  .tom-companion-card {
    transition: none;
  }
  .tom-lead-card:hover,
  .tom-companion-card:hover {
    transform: none;
  }
}
</style>
