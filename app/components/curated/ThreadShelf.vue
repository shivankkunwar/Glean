<template>
  <section class="threads-section">
    <div class="curated-container">
      <EditorialSectionHeader
        eyebrow="Living Collections"
        title="Threads"
        description="Related items that seem to belong to the same line of thought."
      />

      <div class="threads-list">
        <article
          v-for="thread in threads"
          :key="thread.id"
          class="thread-card"
          :class="{ 'is-expanded': expandedThread === thread.id }"
        >
          <!-- Header -->
          <button
            class="thread-header"
            @click="toggleThread(thread.id)"
          >
            <div class="thread-header-main">
              <div class="thread-header-top">
                <span class="thread-kind">{{ thread.kind }}</span>
                <span class="thread-count">{{ thread.itemCount }} items</span>
              </div>
              <h3 class="thread-title font-editorial">{{ thread.title }}</h3>
              <p class="thread-description font-body">{{ thread.description }}</p>
            </div>
            <div class="thread-header-action">
              <i
                class="ph"
                :class="expandedThread === thread.id ? 'ph-caret-up' : 'ph-caret-down'"
              />
            </div>
          </button>

          <!-- Preview strip (visible when collapsed) -->
          <div v-if="expandedThread !== thread.id" class="thread-preview-strip">
            <NuxtLink
              v-for="item in thread.items.slice(0, 3)"
              :key="item.id"
              :to="`/bookmarks/${item.id}`"
              class="thread-preview-item"
            >
              <div class="thread-preview-media">
                <img
                  v-if="item.ogImage"
                  :src="item.ogImage"
                  :alt="item.title || ''"
                  loading="lazy"
                />
                <div v-else class="thread-preview-fallback">
                  <i class="ph ph-bookmark" />
                </div>
              </div>
              <span class="thread-preview-name">{{ item.title || 'Untitled' }}</span>
            </NuxtLink>
          </div>

          <!-- Expanded content -->
          <Transition name="thread-reveal">
            <div v-if="expandedThread === thread.id" class="thread-expanded">
              <div class="thread-items">
                <NuxtLink
                  v-for="item in thread.items"
                  :key="item.id"
                  :to="`/bookmarks/${item.id}`"
                  class="thread-item"
                >
                  <div class="thread-item-media">
                    <img
                      v-if="item.ogImage"
                      :src="item.ogImage"
                      :alt="item.title || ''"
                      loading="lazy"
                    />
                    <div v-else class="thread-item-fallback">
                      <i class="ph ph-bookmark" />
                    </div>
                  </div>
                  <div class="thread-item-text">
                    <span class="thread-item-title">{{ item.title || 'Untitled' }}</span>
                    <span class="thread-item-domain">{{ item.domain }}</span>
                  </div>
                </NuxtLink>
              </div>
            </div>
          </Transition>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { CuratedThread } from '~/types/curated'
import EditorialSectionHeader from './EditorialSectionHeader.vue'

const props = defineProps<{
  threads: CuratedThread[]
}>()

const expandedThread = ref<string | null>(null)

function toggleThread(id: string) {
  expandedThread.value = expandedThread.value === id ? null : id
}
</script>

<style scoped>
.threads-section {
  padding: 0 48px 64px;
}

.curated-container {
  max-width: 1100px;
  margin: 0 auto;
}

.threads-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Card */
.thread-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.thread-card.is-expanded {
  box-shadow: var(--shadow-md);
}

/* Header */
.thread-header {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.thread-header:hover {
  background: var(--bg-raised);
}

.thread-header-main {
  flex: 1;
  min-width: 0;
}

.thread-header-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.thread-kind {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ref-pine);
  background: var(--color-accent-bg);
  padding: 3px 10px;
  border-radius: 100px;
}

.thread-count {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

.thread-title {
  font-size: var(--text-lg);
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.3;
  margin-bottom: 6px;
}

.thread-description {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

.thread-header-action {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 18px;
  padding-top: 4px;
}

/* Preview strip */
.thread-preview-strip {
  display: flex;
  gap: 12px;
  padding: 0 24px 20px;
}

.thread-preview-item {
  flex: 1;
  max-width: 160px;
  text-decoration: none;
  transition: transform 0.2s ease;
}

.thread-preview-item:hover {
  transform: translateY(-2px);
}

.thread-preview-media {
  aspect-ratio: 16 / 10;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-raised);
  margin-bottom: 6px;
}

.thread-preview-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thread-preview-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--text-muted);
  font-size: 20px;
}

.thread-preview-name {
  font-size: 12px;
  color: var(--text-secondary);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Expanded */
.thread-expanded {
  padding: 0 24px 20px;
}

.thread-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
}

.thread-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg-raised);
  border-radius: var(--radius-sm);
  text-decoration: none;
  transition: background 0.15s ease;
}

.thread-item:hover {
  background: var(--bg-surface);
}

.thread-item-media {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-surface);
}

.thread-item-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thread-item-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--text-muted);
  font-size: 16px;
}

.thread-item-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.thread-item-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thread-item-domain {
  font-size: 12px;
  color: var(--text-muted);
}

/* Transition */
.thread-reveal-enter-active,
.thread-reveal-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.thread-reveal-enter-from,
.thread-reveal-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Tablet */
@media (max-width: 1023px) {
  .thread-preview-strip {
    gap: 10px;
  }
  .thread-preview-item {
    max-width: 140px;
  }
}

/* Mobile */
@media (max-width: 767px) {
  .threads-section {
    padding: 0 16px 28px;
  }
  
  .threads-list {
    gap: 10px;
  }
  
  .thread-card {
    border-radius: var(--radius-md);
  }
  
  .thread-header {
    padding: 14px 16px;
    gap: 12px;
  }
  
  .thread-header-top {
    margin-bottom: 6px;
    gap: 8px;
  }
  
  .thread-kind {
    font-size: 10px;
    padding: 2px 8px;
  }
  
  .thread-count {
    font-size: 11px;
  }
  
  .thread-title {
    font-size: var(--text-base);
    margin-bottom: 4px;
  }
  
  .thread-description {
    font-size: var(--text-sm);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }
  
  .thread-header-action {
    font-size: 16px;
    padding-top: 2px;
  }
  
  .thread-preview-strip {
    padding: 0 16px 14px;
    gap: 10px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin-right: -4px;
    padding-right: 20px;
  }
  
  .thread-preview-strip::-webkit-scrollbar {
    display: none;
  }
  
  .thread-preview-item {
    flex: 0 0 120px;
    max-width: none;
  }
  
  .thread-preview-media {
    aspect-ratio: 16 / 10;
  }
  
  .thread-preview-name {
    font-size: 11px;
  }
  
  .thread-expanded {
    padding: 0 16px 14px;
  }
  
  .thread-items {
    gap: 6px;
    padding-top: 10px;
  }
  
  .thread-item {
    padding: 8px 12px;
    gap: 10px;
  }
  
  .thread-item-media {
    width: 36px;
    height: 36px;
  }
  
  .thread-item-title {
    font-size: 13px;
  }
  
  .thread-item-domain {
    font-size: 11px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .thread-card,
  .thread-header,
  .thread-preview-item,
  .thread-item {
    transition: none;
  }
  .thread-reveal-enter-active,
  .thread-reveal-leave-active {
    transition: none;
  }
}
</style>