<template>
  <div class="ai-monitor">
    <header class="page-header">
      <h1>AI Processing Monitor</h1>
      <div class="actions">
        <button @click="refresh" :disabled="loading" class="btn-refresh">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
        <button @click="autoRefresh = !autoRefresh" :class="{ active: autoRefresh }" class="btn-auto">
          {{ autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF' }}
        </button>
      </div>
    </header>
    
    <div v-if="loading && !data" class="loading-state">
      <div class="spinner"></div> Loading telemetry...
    </div>
    <div v-else-if="error" class="error-state">Failed to load telemetry data.</div>
    
    <div v-else class="monitor-content">
      <!-- Stuck Jobs Alert -->
      <transition name="slide-fade">
        <div v-if="data.staleJobCount > 0" class="alert-banner">
          <div class="alert-icon">⚠️</div>
          <div class="alert-text">
            <strong>{{ data.staleJobCount }} job(s)</strong> appear stuck in processing for over 3 minutes.
            <span class="alert-sub">They will self-recover on the next queue poll.</span>
          </div>
        </div>
      </transition>

      <!-- Top Row: Sparkline & Donut Chart -->
      <div class="charts-row">
        <!-- 24h Sparkline -->
        <section class="card chart-card sparkline-card">
          <header class="card-header">
            <div>
              <h2>Pipeline Velocity</h2>
              <p class="subtitle">Jobs completed in the last 24 hours</p>
            </div>
            <div class="big-number">
              <AnimatedNumber :value="data.throughput24h" />
            </div>
          </header>
          <div class="sparkline-container">
            <svg class="sparkline-svg" viewBox="0 0 300 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="oklch(60% 0.15 250)" stop-opacity="0.3" />
                  <stop offset="100%" stop-color="oklch(60% 0.15 250)" stop-opacity="0" />
                </linearGradient>
              </defs>
              <path :d="sparklinePathData.area" fill="url(#sparkGradient)" class="spark-area" />
              <path :d="sparklinePathData.line" fill="none" stroke="oklch(60% 0.15 250)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="spark-line" />
            </svg>
            <div class="spark-labels">
              <span>24h ago</span>
              <span>Now</span>
            </div>
          </div>
        </section>

        <!-- Donut Chart -->
        <section class="card chart-card donut-card">
          <header class="card-header">
            <div>
              <h2>AI Enrichment</h2>
              <p class="subtitle">Current status breakdown</p>
            </div>
          </header>
          <div class="donut-container">
            <svg class="donut-svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" class="donut-bg" stroke-width="12" />
              <circle
                v-for="segment in donutSegments"
                :key="segment.id"
                cx="50" cy="50" r="40"
                fill="none"
                :stroke="segment.color"
                stroke-width="12"
                :stroke-dasharray="`${segment.length} 300`"
                :stroke-dashoffset="segment.offset"
                class="donut-segment"
              />
            </svg>
            <div class="donut-center">
              <span class="donut-total"><AnimatedNumber :value="data.stats.totalBookmarks" /></span>
              <span class="donut-label">Total</span>
            </div>
          </div>
          <div class="donut-legend">
            <div v-for="seg in donutSegments" :key="seg.id" class="legend-item">
              <span class="legend-color" :style="{ background: seg.color }"></span>
              <span class="legend-label">{{ seg.label }}</span>
              <span class="legend-value">{{ seg.value }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- Second Row: Features & Skip Rates -->
      <div class="data-row">
        <section class="card">
          <header class="card-header">
            <h2>AI Skip Rates</h2>
            <p class="subtitle">Provider drop-off percentage</p>
          </header>
          <div class="skip-rates-list">
            <div v-if="!data.skipRates.length" class="empty-state">No AI artifacts yet.</div>
            <div v-for="rate in data.skipRates" :key="rate.kind" class="skip-rate-item">
              <div class="skip-rate-header">
                <span class="skip-kind">{{ rate.kind }}</span>
                <span class="skip-numbers"><b>{{ rate.total - rate.skipped }}</b> / {{ rate.total }} run</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: `${100 - rate.skipRate}%` }"></div>
              </div>
              <div class="skip-footer">
                <span :class="{ 'warning-text': rate.skipRate > 50 }">{{ rate.skipRate }}% skipped</span>
              </div>
            </div>
          </div>
        </section>
        
        <section class="card">
          <header class="card-header">
            <h2>Job Queue</h2>
            <p class="subtitle">Active background workers</p>
          </header>
          <table class="minimal-table">
            <thead>
              <tr>
                <th>Job Type</th>
                <th>Pending</th>
                <th>Running</th>
                <th>Failed</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(statuses, type) in data.jobQueue" :key="type">
                <td class="job-type-cell">{{ type }}</td>
                <td :class="{ 'highlight': statuses.pending }">{{ statuses.pending || 0 }}</td>
                <td :class="{ 'highlight-blue': statuses.processing }">{{ statuses.processing || 0 }}</td>
                <td :class="{ 'warning-text': statuses.failed }">{{ statuses.failed || 0 }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <!-- Failed Jobs -->
      <transition name="slide-fade">
        <div v-if="data.failedJobs.length > 0" class="card failed-card">
          <header class="card-header">
            <h2>⚠️ Recent Failed Jobs</h2>
          </header>
          <div class="failed-list">
            <div v-for="job in data.failedJobs" :key="job.id" class="failed-item">
              <div class="failed-meta">
                <span class="badge red">{{ job.type }}</span>
                <span class="attempts">{{ job.attempts }} attempts</span>
                <button @click="reprocess(job.bookmarkId)" class="btn-ghost small">Retry</button>
              </div>
              <a v-if="job.bookmark" :href="job.bookmark.url" target="_blank" class="failed-link">
                {{ job.bookmark.title || job.bookmark.url }}
              </a>
              <div class="failed-error">{{ job.error }}</div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Recent Artifacts -->
      <section class="card artifacts-card">
        <header class="card-header">
          <h2>Recent Artifacts</h2>
          <p class="subtitle">Latest AI outputs</p>
        </header>
        <div class="artifacts-grid">
          <div 
            v-for="artifact in data.recentArtifacts" 
            :key="artifact.id" 
            class="artifact-item"
            :class="{ isSkipped: artifact.skipped }"
          >
            <div class="artifact-top">
              <span class="badge blue">{{ artifact.kind }}</span>
              <span class="provider">{{ artifact.provider }}</span>
              <span class="time">{{ formatTime(artifact.createdAt) }}</span>
            </div>
            <NuxtLink v-if="artifact.bookmark" :to="`/bookmarks/${artifact.bookmarkId}`" class="artifact-title">
              {{ artifact.bookmark.title || artifact.bookmark.url }}
            </NuxtLink>
            <div v-if="artifact.skipped" class="artifact-skipped-reason">
              <span class="badge gray">Skipped</span> {{ artifact.reason }}
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';

const { data, refresh, pending: loading, error } = await useFetch<any>('/api/ai/status');

const autoRefresh = ref(false);
let refreshInterval: any = null;

watch(autoRefresh, (enabled) => {
  if (enabled) {
    refreshInterval = setInterval(() => refresh(), 5000);
  } else {
    clearInterval(refreshInterval);
  }
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});

function formatTime(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function reprocess(bookmarkId: number) {
  try {
    await $fetch(`/api/bookmarks/${bookmarkId}/reprocess`, { method: 'POST' });
    alert('Reprocessing queued!');
    refresh();
  } catch (e: any) {
    alert('Failed to queue: ' + e.message);
  }
}

// --- Sparkline Computation ---
// Converts hourly array into an SVG path smoothly connecting the points
const sparklinePathData = computed(() => {
  if (!data.value?.hourlyThroughput) return { line: '', area: '' };
  const pts = data.value.hourlyThroughput;
  if (pts.length === 0) return { line: '', area: '' };
  
  const w = 300;
  const h = 80;
  
  const maxVal = Math.max(...pts.map((p: any) => p.count), 1); // Avoid div by 0
  const minVal = 0;
  const range = maxVal - minVal;
  
  const coords = pts.map((p: any, i: number) => {
    const x = (i / (pts.length - 1)) * w;
    const y = h - ((p.count - minVal) / range) * (h - 10) - 5; // 5px padding
    return { x, y };
  });
  
  // Smooth curve generation using bezier
  let line = `M ${coords[0].x},${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const cp1x = (coords[i].x + coords[i + 1].x) / 2;
    const cp1y = coords[i].y;
    const cp2x = (coords[i].x + coords[i + 1].x) / 2;
    const cp2y = coords[i + 1].y;
    line += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${coords[i + 1].x},${coords[i + 1].y}`;
  }
  
  const area = `${line} L ${w},${h} L 0,${h} Z`;
  return { line, area };
});

// --- Donut Chart Computation ---
// Calculates stroke-dashoffset for circular ring chart
const donutSegments = computed(() => {
  if (!data.value?.stats?.aiStatus) return [];
  const st = data.value.stats.aiStatus;
  
  const total = st.pending + st.inProgress + st.done + st.skipped + st.failed;
  if (total === 0) return [];
  
  // SVG circle properties (r=40, circumference = 2 * PI * 40 = ~251.2)
  const circ = 2 * Math.PI * 40;
  
  const segments = [
    { id: 'done', label: 'Done', value: st.done, color: 'oklch(65% 0.15 150)' }, // Green
    { id: 'pending', label: 'Pending', value: st.pending, color: 'oklch(80% 0.15 80)' }, // Yellow
    { id: 'inProgress', label: 'Running', value: st.inProgress, color: 'oklch(60% 0.15 250)' }, // Blue
    { id: 'skipped', label: 'Skipped', value: st.skipped, color: 'oklch(85% 0.02 240)' }, // Gray
    { id: 'failed', label: 'Failed', value: st.failed, color: 'oklch(60% 0.20 20)' } // Red
  ];
  
  let currentOffset = 0;
  return segments
    .filter(s => s.value > 0)
    .map(s => {
      const percentage = s.value / total;
      const length = percentage * circ;
      // SVG stroke-dashoffset goes backwards
      const result = {
        ...s,
        length,
        offset: -currentOffset // Negative offset shifts the start point
      };
      currentOffset += length;
      return result;
    });
});
</script>

<style scoped>
.ai-monitor {
  max-width: 1040px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: inherit;
  color: oklch(25% 0.02 240);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0;
}

.actions {
  display: flex;
  gap: 8px;
}

button {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-refresh {
  background: white;
  color: oklch(25% 0.02 240);
  border: 1px solid oklch(88% 0.015 240);
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}

.btn-refresh:hover {
  background: oklch(98% 0.01 240);
}

.btn-auto {
  background: transparent;
  color: oklch(50% 0.02 240);
}

.btn-auto:hover {
  background: oklch(95% 0.015 240);
}

.btn-auto.active {
  background: oklch(96% 0.03 150);
  color: oklch(40% 0.1 150);
}

.btn-ghost {
  background: transparent;
  padding: 4px 8px;
  font-size: 0.75rem;
  color: oklch(50% 0.02 240);
  border: 1px solid oklch(88% 0.015 240);
}

.btn-ghost:hover {
  background: oklch(98% 0.01 240);
  color: oklch(25% 0.02 240);
}

/* Cards & Layout */
.charts-row, .data-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .charts-row, .data-row {
    grid-template-columns: 1fr;
  }
}

.card {
  background: white;
  border-radius: 16px;
  border: 1px solid oklch(92% 0.01 240);
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
}

.card-header {
  margin-bottom: 20px;
}

.card-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 4px;
}

.subtitle {
  font-size: 0.8125rem;
  color: oklch(55% 0.015 240);
  margin: 0;
}

/* Alert Banner */
.alert-banner {
  display: flex;
  gap: 12px;
  background: oklch(97% 0.03 40);
  border: 1px solid oklch(88% 0.05 40);
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.alert-text {
  font-size: 0.875rem;
  color: oklch(40% 0.08 40);
}

.alert-sub {
  display: block;
  font-size: 0.75rem;
  opacity: 0.8;
  margin-top: 2px;
}

/* Sparkline Card */
.sparkline-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.big-number {
  font-size: 2.5rem;
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.04em;
  color: oklch(20% 0.02 240);
}

.sparkline-container {
  height: 120px;
  position: relative;
  margin-top: 20px;
}

.sparkline-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.spark-line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: drawLine 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.spark-area {
  opacity: 0;
  animation: fadeArea 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
}

.spark-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: oklch(65% 0.01 240);
  margin-top: 8px;
}

/* Donut Chart */
.donut-container {
  position: relative;
  width: 160px;
  height: 160px;
  margin: 0 auto 24px;
}

.donut-svg {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
  overflow: visible;
}

.donut-bg {
  stroke: oklch(95% 0.01 240);
}

.donut-segment {
  transition: stroke-dasharray 1s cubic-bezier(0.16, 1, 0.3, 1);
  stroke-linecap: round;
  /* Animate in */
  animation: drawDonut 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.donut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.donut-total {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1;
}

.donut-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(60% 0.02 240);
  margin-top: 4px;
}

.donut-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 0.8125rem;
}

.legend-color {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-right: 10px;
}

.legend-label {
  color: oklch(40% 0.02 240);
  flex-grow: 1;
}

.legend-value {
  font-weight: 600;
}

/* Skip Rates */
.skip-rates-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.skip-rate-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skip-rate-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 0.8125rem;
}

.skip-kind {
  font-weight: 600;
  text-transform: capitalize;
}

.skip-numbers {
  color: oklch(50% 0.02 240);
}

.progress-track {
  height: 8px;
  background: oklch(93% 0.01 240);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: oklch(60% 0.15 250);
  border-radius: 4px;
  width: 0; /* Animated in via inline style transition */
  transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.skip-footer {
  font-size: 0.75rem;
  color: oklch(50% 0.02 240);
  text-align: right;
}

/* Tables */
.minimal-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.minimal-table th, .minimal-table td {
  padding: 12px 0;
  border-bottom: 1px solid oklch(95% 0.01 240);
  text-align: right;
}

.minimal-table th:first-child, .minimal-table td:first-child {
  text-align: left;
}

.minimal-table th {
  font-weight: 500;
  color: oklch(55% 0.01 240);
  padding-bottom: 8px;
}

.job-type-cell {
  font-weight: 500;
  text-transform: capitalize;
}

.highlight { color: oklch(65% 0.15 80); font-weight: 600; }
.highlight-blue { color: oklch(60% 0.15 250); font-weight: 600; }
.warning-text { color: oklch(60% 0.20 20); font-weight: 600; }

/* Badges */
.badge {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 4px;
}
.badge.blue { background: oklch(95% 0.03 250); color: oklch(45% 0.15 250); }
.badge.red { background: oklch(95% 0.05 20); color: oklch(45% 0.15 20); }
.badge.gray { background: oklch(95% 0.01 240); color: oklch(45% 0.02 240); }

/* Failed Jobs */
.failed-card { border-color: oklch(90% 0.05 20); }
.failed-list { display: flex; flex-direction: column; gap: 16px; }
.failed-item { padding-bottom: 16px; border-bottom: 1px solid oklch(95% 0.01 240); }
.failed-item:last-child { border: none; padding-bottom: 0; }

.failed-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
  font-size: 0.8125rem;
  color: oklch(55% 0.01 240);
}

.failed-link {
  font-weight: 500;
  color: oklch(25% 0.02 240);
  text-decoration: none;
  margin-bottom: 4px;
  display: inline-block;
}

.failed-link:hover { text-decoration: underline; }
.failed-error { font-family: monospace; font-size: 0.75rem; color: oklch(50% 0.15 20); background: oklch(98% 0.02 20); padding: 8px; border-radius: 6px; }

/* Artifacts Grid */
.artifacts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.artifact-item {
  background: oklch(98% 0.01 240);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: background 0.2s ease;
}

.artifact-item:hover { background: oklch(96% 0.015 240); }
.artifact-item.isSkipped { opacity: 0.7; }

.artifact-top { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.provider { font-size: 0.75rem; font-family: monospace; color: oklch(55% 0.01 240); flex-grow: 1; }
.time { font-size: 0.75rem; color: oklch(65% 0.01 240); }

.artifact-title {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: oklch(25% 0.02 240);
  text-decoration: none;
  line-height: 1.4;
}

.artifact-title:hover { text-decoration: underline; }
.artifact-skipped-reason { font-size: 0.75rem; margin-top: 8px; color: oklch(55% 0.01 240); }

/* Animations */
@keyframes drawLine {
  to { stroke-dashoffset: 0; }
}

@keyframes fadeArea {
  to { opacity: 1; }
}

@keyframes drawDonut {
  from { stroke-dasharray: 0 300; }
}

.slide-fade-enter-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-fade-leave-active { transition: all 0.4s cubic-bezier(0.4, 0, 1, 1); }
.slide-fade-enter-from, .slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
