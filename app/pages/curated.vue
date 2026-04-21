<template>
  <div class="curated-page">
    <!-- Skeleton loading state -->
    <template v-if="pending">
      <div class="skeleton-section">
        <div class="skeleton-hero">
          <div class="skeleton-line skeleton-line--lg" />
          <div class="skeleton-line skeleton-line--md" />
        </div>
      </div>
      <div class="skeleton-section">
        <div class="skeleton-header">
          <div class="skeleton-line skeleton-line--sm" />
          <div class="skeleton-line skeleton-line--lg" />
        </div>
        <div class="skeleton-shelf">
          <div class="skeleton-card skeleton-card--lead" />
          <div class="skeleton-card skeleton-card--companion" />
        </div>
      </div>
      <div class="skeleton-section">
        <div class="skeleton-header">
          <div class="skeleton-line skeleton-line--sm" />
          <div class="skeleton-line skeleton-line--lg" />
        </div>
        <div class="skeleton-grid">
          <div class="skeleton-card" />
          <div class="skeleton-card" />
        </div>
      </div>
    </template>

    <div v-else-if="error" class="curated-error">
      <p>Could not load your curated view. <button class="curated-retry" @click="refresh()">Try again</button></p>
    </div>

    <template v-else-if="data">
      <CuratedHero />
      <!-- Sparse state -->
      <template v-if="isSparse">
        <TopOfMindShelf v-if="data.topOfMind.length > 0" :items="data.topOfMind" />
        <div class="sparse-state">
          <h3 class="sparse-title font-editorial">Curated gets better as your vault grows</h3>
          <p class="sparse-text font-body">Save a few more articles, notes, or links and Glean will start surfacing themes and threads here.</p>
        </div>
      </template>

      <!-- Full curated view -->
      <template v-else>
        <TopOfMindShelf v-if="data.topOfMind.length > 0" :items="data.topOfMind" />
        <RadarSection v-if="data.radar.length > 0" :themes="data.radar" />
        <ThreadShelf v-if="data.threads.length > 0" :threads="data.threads" />
        <WeeklyBriefCard v-if="data.weeklyBrief" :brief="data.weeklyBrief" />
        <RediscoverRitual
          v-if="data.rediscover.length > 0"
          :items="data.rediscover"
          :is-refreshing="refreshingRediscover"
          @refresh="refreshRediscover"
        />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { CuratedOverviewResponse, CuratedBookmark } from '~/types/curated';
import CuratedHero from '~/components/curated/CuratedHero.vue';
import TopOfMindShelf from '~/components/curated/TopOfMindShelf.vue';
import RadarSection from '~/components/curated/RadarSection.vue';
import ThreadShelf from '~/components/curated/ThreadShelf.vue';
import WeeklyBriefCard from '~/components/curated/WeeklyBriefCard.vue';
import RediscoverRitual from '~/components/curated/RediscoverRitual.vue';

const { data, pending, error, refresh } = useFetch<CuratedOverviewResponse>('/api/curated/overview');

const refreshingRediscover = ref(false);

async function refreshRediscover() {
  if (refreshingRediscover.value) return;
  refreshingRediscover.value = true;
  try {
    const fresh = await $fetch<CuratedBookmark[]>('/api/curated/rediscover');
    if (data.value && fresh.length > 0) {
      data.value.rediscover = fresh;
    }
  } catch (e) {
    console.error('Failed to refresh rediscover:', e);
  } finally {
    refreshingRediscover.value = false;
  }
}

const totalBookmarkCount = computed(() => {
  if (!data.value) return 0;
  const allIds = new Set<number>();
  data.value.topOfMind.forEach((b) => allIds.add(b.id));
  data.value.radar.forEach((t) => t.items.forEach((b) => allIds.add(b.id)));
  data.value.threads.forEach((t) => t.items.forEach((b) => allIds.add(b.id)));
  data.value.rediscover.forEach((b) => allIds.add(b.id));
  if (data.value.weeklyBrief) {
    data.value.weeklyBrief.items.forEach((b) => allIds.add(b.id));
  }
  return allIds.size;
});

const isSparse = computed(() => totalBookmarkCount.value < 5);
</script>

<style scoped>
.curated-page {
  min-height: 100dvh;
  padding-bottom: 80px;
  overflow-x: hidden;
}

/* Skeleton loading */
.skeleton-section {
  padding: 0 48px 48px;
}
.skeleton-hero {
  max-width: 900px;
  margin: 0 auto;
  padding: 80px 0 40px;
}
.skeleton-header {
  max-width: 1100px;
  margin: 0 auto 24px;
}
.skeleton-line {
  background: var(--bg-raised);
  border-radius: 6px;
  margin-bottom: 12px;
}
.skeleton-line--lg {
  height: 36px;
  width: 60%;
  max-width: 480px;
}
.skeleton-line--md {
  height: 20px;
  width: 50%;
  max-width: 380px;
}
.skeleton-line--sm {
  height: 14px;
  width: 80px;
  margin-bottom: 8px;
}
.skeleton-shelf {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;
}
.skeleton-grid {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
.skeleton-card {
  background: var(--bg-raised);
  border-radius: var(--radius-lg);
  height: 200px;
  border: 1px solid var(--border-subtle);
}
.skeleton-card--lead {
  height: 360px;
}
.skeleton-card--companion {
  height: 170px;
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}
.skeleton-line,
.skeleton-card {
  animation: skeleton-pulse 1.8s ease-in-out infinite;
}

.curated-error {
  text-align: center;
  padding: 120px 20px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-family: var(--font-body);
}
.curated-retry {
  color: var(--color-accent);
  font-weight: 500;
  text-decoration: underline;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
}

.sparse-state {
  max-width: 560px;
  margin: 0 auto;
  padding: 64px 20px;
  text-align: center;
}
.sparse-title {
  font-size: var(--text-2xl);
  color: var(--text-primary);
  margin-bottom: 12px;
  line-height: 1.3;
}
.sparse-text {
  font-size: var(--text-base);
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Mobile skeleton */
@media (max-width: 767px) {
  .skeleton-section {
    padding: 0 16px 32px;
  }
  .skeleton-hero {
    padding: 48px 0 24px;
  }
  .skeleton-shelf {
    grid-template-columns: 1fr;
  }
  .skeleton-grid {
    grid-template-columns: 1fr;
  }
  .skeleton-card--companion {
    display: none;
  }
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}
</style>
