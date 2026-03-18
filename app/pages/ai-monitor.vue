<template>
  <div class="ai-monitor">
    <h1>AI Processing Monitor</h1>
    
    <div v-if="loading" class="loading">Loading...</div>
    
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <div v-else>
      <!-- Overall Status -->
      <div class="status-card" :class="{ healthy: data.summary.healthy, warning: !data.summary.healthy }">
        <h2>Status: {{ data.summary.healthy ? '✅ Healthy' : '⚠️ Issues Detected' }}</h2>
        <p>{{ data.summary.message }}</p>
      </div>

      <!-- Stats Overview -->
      <div class="stats-grid">
        <div class="stat-box">
          <h3>Total Bookmarks</h3>
          <div class="number">{{ data.stats.totalBookmarks }}</div>
        </div>
        
        <div class="stat-box">
          <h3>AI Enrichment</h3>
          <div class="breakdown">
            <span class="pending">{{ data.stats.aiStatus.pending }} pending</span>
            <span class="in-progress">{{ data.stats.aiStatus.inProgress }} in progress</span>
            <span class="done">{{ data.stats.aiStatus.done }} done</span>
            <span class="skipped">{{ data.stats.aiStatus.skipped }} skipped</span>
            <span class="failed">{{ data.stats.aiStatus.failed }} failed</span>
          </div>
        </div>
        
        <div class="stat-box">
          <h3>With Summary</h3>
          <div class="number">{{ data.stats.enrichment.hasSummary }}</div>
        </div>
        
        <div class="stat-box">
          <h3>With Canonical Text</h3>
          <div class="number">{{ data.stats.enrichment.hasCanonical }}</div>
        </div>
      </div>

      <!-- Job Queue Status -->
      <div class="section">
        <h2>Job Queue</h2>
        <table class="queue-table">
          <thead>
            <tr>
              <th>Job Type</th>
              <th>Pending</th>
              <th>Processing</th>
              <th>Done</th>
              <th>Failed</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(statuses, type) in data.jobQueue" :key="type">
              <td>{{ type }}</td>
              <td :class="{ active: statuses.pending }">{{ statuses.pending || 0 }}</td>
              <td :class="{ active: statuses.processing }">{{ statuses.processing || 0 }}</td>
              <td>{{ statuses.done || 0 }}</td>
              <td :class="{ error: statuses.failed }">{{ statuses.failed || 0 }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Failed Jobs -->
      <div v-if="data.failedJobs.length > 0" class="section error-section">
        <h2>⚠️ Recent Failed Jobs (Last 10)</h2>
        <div v-for="job in data.failedJobs" :key="job.id" class="failed-job">
          <div class="job-header">
            <span class="job-type">{{ job.type }}</span>
            <span class="job-id">#{{ job.id }}</span>
            <span class="attempts">{{ job.attempts }} attempts</span>
            <button @click="reprocess(job.bookmarkId)" class="btn-retry">Retry</button>
          </div>
          <div class="job-bookmark" v-if="job.bookmark">
            <a :href="job.bookmark.url" target="_blank">{{ job.bookmark.title || job.bookmark.url }}</a>
          </div>
          <div class="job-error">{{ job.error }}</div>
        </div>
      </div>

      <!-- Recent Artifacts -->
      <div class="section">
        <h2>Recent AI Artifacts (Last 20)</h2>
        <div class="artifacts-list">
          <div 
            v-for="artifact in data.recentArtifacts" 
            :key="artifact.id" 
            class="artifact"
            :class="{ skipped: artifact.skipped }"
          >
            <div class="artifact-header">
              <span class="kind">{{ artifact.kind }}</span>
              <span class="provider">{{ artifact.provider }}</span>
              <span class="model">{{ artifact.model }}</span>
              <span v-if="artifact.skipped" class="badge skipped">skipped</span>
            </div>
            <div class="artifact-bookmark" v-if="artifact.bookmark">
              <NuxtLink :to="`/bookmarks/${artifact.bookmarkId}`">
                {{ artifact.bookmark.title || artifact.bookmark.url }}
              </NuxtLink>
            </div>
            <div v-if="artifact.reason" class="artifact-reason">Reason: {{ artifact.reason }}</div>
            <div class="artifact-time">{{ formatTime(artifact.createdAt) }}</div>
          </div>
        </div>
      </div>

      <!-- Refresh Button -->
      <div class="actions">
        <button @click="refresh" :disabled="loading" class="btn-refresh">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
        <button @click="autoRefresh = !autoRefresh" :class="{ active: autoRefresh }" class="btn-auto">
          {{ autoRefresh ? 'Auto-refresh ON (5s)' : 'Auto-refresh OFF' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const { data, refresh, pending: loading, error } = await useFetch('/api/ai/status')

const autoRefresh = ref(false)
let refreshInterval = null

watch(autoRefresh, (enabled) => {
  if (enabled) {
    refreshInterval = setInterval(() => refresh(), 5000)
  } else {
    clearInterval(refreshInterval)
  }
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})

function formatTime(isoString) {
  return new Date(isoString).toLocaleString()
}

async function reprocess(bookmarkId) {
  try {
    await $fetch(`/api/bookmarks/${bookmarkId}/reprocess`, { method: 'POST' })
    alert('Reprocessing queued!')
    refresh()
  } catch (e) {
    alert('Failed to queue reprocessing: ' + e.message)
  }
}
</script>

<style scoped>
.ai-monitor {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  margin-bottom: 20px;
}

.status-card {
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.status-card.healthy {
  background: #dcfce7;
  border: 1px solid #86efac;
}

.status-card.warning {
  background: #fee2e2;
  border: 1px solid #fca5a5;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.stat-box {
  background: #f8fafc;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.stat-box h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #64748b;
}

.number {
  font-size: 32px;
  font-weight: bold;
  color: #0f172a;
}

.breakdown {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 13px;
}

.breakdown span {
  padding: 3px 8px;
  border-radius: 4px;
}

.pending { background: #fef3c7; }
.in-progress { background: #dbeafe; }
.done { background: #dcfce7; }
.skipped { background: #f3f4f6; }
.failed { background: #fee2e2; color: #991b1b; }

.section {
  margin-bottom: 30px;
}

.queue-table {
  width: 100%;
  border-collapse: collapse;
}

.queue-table th,
.queue-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.queue-table th {
  background: #f8fafc;
  font-weight: 600;
}

.queue-table td.active {
  background: #dbeafe;
  font-weight: bold;
}

.queue-table td.error {
  background: #fee2e2;
  color: #991b1b;
}

.error-section {
  background: #fef2f2;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #fecaca;
}

.failed-job {
  background: white;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 6px;
  border-left: 4px solid #ef4444;
}

.job-header {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 8px;
}

.job-type {
  font-weight: bold;
  text-transform: uppercase;
  font-size: 12px;
  background: #fecaca;
  padding: 3px 8px;
  border-radius: 4px;
}

.job-error {
  font-family: monospace;
  font-size: 12px;
  color: #991b1b;
  background: #fef2f2;
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
}

.artifacts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.artifact {
  background: #f8fafc;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.artifact.skipped {
  opacity: 0.7;
  border-color: #cbd5e1;
}

.artifact-header {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}

.kind {
  font-weight: bold;
  font-size: 12px;
  text-transform: uppercase;
  background: #dbeafe;
  padding: 2px 8px;
  border-radius: 4px;
}

.provider {
  font-size: 13px;
  color: #64748b;
}

.model {
  font-size: 12px;
  color: #94a3b8;
}

.badge.skipped {
  background: #f3f4f6;
  color: #64748b;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}

.artifact-reason {
  font-size: 12px;
  color: #64748b;
  margin-top: 5px;
}

.artifact-time {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 5px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 30px;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-refresh {
  background: #3b82f6;
  color: white;
}

.btn-refresh:hover {
  background: #2563eb;
}

.btn-auto {
  background: #f3f4f6;
  color: #374151;
}

.btn-auto.active {
  background: #10b981;
  color: white;
}

.btn-retry {
  background: #ef4444;
  color: white;
  padding: 5px 10px;
  font-size: 12px;
}

.btn-retry:hover {
  background: #dc2626;
}

.loading, .error {
  padding: 40px;
  text-align: center;
}

.error {
  color: #ef4444;
}
</style>
