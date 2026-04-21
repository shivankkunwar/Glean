<template>
  <section class="brief-section">
    <div class="curated-container">
      <EditorialSectionHeader
        eyebrow="This Week"
        title="Weekly Brief"
        description="A compact synthesis of recent saves."
      />

      <article class="brief-card">
        <div class="brief-card-accent" />
        
        <div class="brief-content">
          <header class="brief-header">
            <h3 class="brief-title font-editorial">{{ brief.title }}</h3>
            <p class="brief-dek font-body">{{ brief.dek }}</p>
          </header>

          <div class="brief-body font-body">
            <p class="brief-summary">{{ brief.summary }}</p>

            <ul v-if="brief.bullets.length" class="brief-bullets">
              <li v-for="(bullet, i) in brief.bullets" :key="i">{{ bullet }}</li>
            </ul>

            <p class="brief-question font-editorial">{{ brief.question }}</p>
          </div>

          <div v-if="brief.items.length" class="brief-sources">
            <span class="brief-sources-label">Sources</span>
            <div class="brief-sources-list">
              <NuxtLink
                v-for="item in brief.items"
                :key="item.id"
                :to="`/bookmarks/${item.id}`"
                class="brief-source"
              >
                <img
                  v-if="item.ogImage"
                  :src="item.ogImage"
                  :alt="item.title || ''"
                  class="brief-source-img"
                  loading="lazy"
                />
                <div v-else class="brief-source-img brief-source-img--fallback">
                  <i class="ph ph-bookmark" />
                </div>
                <div class="brief-source-text">
                  <span class="brief-source-title">{{ item.title || 'Untitled' }}</span>
                  <span class="brief-source-domain">{{ item.domain }}</span>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { WeeklyBrief } from '~/types/curated'
import EditorialSectionHeader from './EditorialSectionHeader.vue'

defineProps<{
  brief: WeeklyBrief
}>()
</script>

<style scoped>
.brief-section {
  padding: 0 48px 64px;
}

.curated-container {
  max-width: 1100px;
  margin: 0 auto;
}

.brief-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  position: relative;
  overflow: hidden;
}

.brief-card-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-pine);
  opacity: 0.3;
}

.brief-content {
  padding: 36px 40px 40px;
}

.brief-header {
  margin-bottom: 28px;
}

.brief-title {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.2;
  margin-bottom: 8px;
  letter-spacing: -0.01em;
}

.brief-dek {
  font-size: var(--text-base);
  color: var(--text-secondary);
  line-height: 1.5;
  max-width: 55ch;
}

.brief-body {
  margin-bottom: 28px;
}

.brief-summary {
  font-size: var(--text-base);
  color: var(--text-primary);
  line-height: 1.65;
  margin-bottom: 20px;
}

.brief-bullets {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.brief-bullets li {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.55;
  padding-left: 18px;
  position: relative;
}

.brief-bullets li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ref-pine);
  opacity: 0.5;
}

.brief-question {
  font-size: var(--text-lg);
  font-weight: 400;
  font-style: italic;
  color: var(--text-secondary);
  line-height: 1.5;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
  margin: 0;
}

.brief-sources {
  padding-top: 24px;
  border-top: 1px solid var(--border-subtle);
}

.brief-sources-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.brief-sources-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.brief-source {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  text-decoration: none;
  transition: background 0.15s ease;
  flex: 1;
  min-width: 200px;
  max-width: 300px;
}

.brief-source:hover {
  background: var(--bg-surface);
}

.brief-source-img {
  width: 32px;
  height: 32px;
  border-radius: 5px;
  object-fit: cover;
  flex-shrink: 0;
}

.brief-source-img--fallback {
  display: grid;
  place-items: center;
  background: var(--bg-surface);
  color: var(--text-muted);
  font-size: 14px;
}

.brief-source-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.brief-source-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brief-source-domain {
  font-size: 11px;
  color: var(--text-muted);
}

/* Tablet */
@media (max-width: 1023px) {
  .brief-source {
    max-width: 100%;
  }
}

/* Mobile */
@media (max-width: 767px) {
  .brief-section {
    padding: 0 16px 28px;
  }
  
  .brief-content {
    padding: 24px 20px 28px;
  }
  
  .brief-header {
    margin-bottom: 20px;
  }
  
  .brief-title {
    font-size: var(--text-xl);
    margin-bottom: 6px;
  }
  
  .brief-dek {
    font-size: var(--text-sm);
  }
  
  .brief-body {
    margin-bottom: 20px;
  }
  
  .brief-summary {
    font-size: var(--text-sm);
    line-height: 1.55;
    margin-bottom: 16px;
  }
  
  .brief-bullets {
    gap: 8px;
    margin-bottom: 16px;
  }
  
  .brief-bullets li {
    font-size: var(--text-sm);
    padding-left: 16px;
  }
  
  .brief-bullets li::before {
    top: 7px;
    width: 5px;
    height: 5px;
  }
  
  .brief-question {
    font-size: var(--text-base);
    padding-top: 12px;
  }
  
  .brief-sources {
    padding-top: 16px;
  }
  
  .brief-sources-label {
    margin-bottom: 10px;
  }
  
  .brief-sources-list {
    flex-direction: column;
    gap: 8px;
  }
  
  .brief-source {
    min-width: 0;
    max-width: 100%;
    width: 100%;
    padding: 10px 12px;
  }
  
  .brief-source-img {
    width: 36px;
    height: 36px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .brief-source {
    transition: none;
  }
}
</style>