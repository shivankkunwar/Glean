<template>
  <header class="editorial-header">
    <span v-if="eyebrow" class="editorial-eyebrow font-ui">{{ eyebrow }}</span>
    <h2 class="editorial-title font-editorial">{{ title }}</h2>
    <p v-if="description" class="editorial-description font-body">{{ description }}</p>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  description?: string;
}>();
</script>

<style scoped>
.editorial-header {
  margin-bottom: 28px;
}

.editorial-eyebrow {
  display: block;
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ref-pine);
  margin-bottom: 8px;
  font-family: var(--font-ui);
}

.editorial-title {
  font-size: clamp(1.5rem, 3vw, 1.875rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  line-height: 1.2;
  margin-bottom: 8px;
  font-family: var(--font-editorial);
}

.editorial-description {
  font-size: var(--text-base);
  color: var(--text-secondary);
  line-height: 1.55;
  max-width: 55ch;
  font-family: var(--font-body);
}

@media (max-width: 767px) {
  .editorial-header {
    margin-bottom: 16px;
  }
  .editorial-eyebrow {
    font-size: 0.625rem;
    margin-bottom: 6px;
  }
  .editorial-title {
    font-size: var(--text-xl);
    margin-bottom: 6px;
  }
  .editorial-description {
    font-size: var(--text-sm);
    line-height: 1.5;
  }
}
</style>
