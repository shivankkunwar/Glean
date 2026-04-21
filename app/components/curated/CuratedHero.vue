<template>
  <section class="curated-hero">
    <h1 class="curated-hero-title font-editorial">{{ title }}</h1>
    <p class="curated-hero-subtitle font-body">{{ subtitle }}</p>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string;
  subtitle?: string;
}>(), {
  title: 'A quieter view of your vault',
  subtitle: 'Themes, threads, and a few things worth revisiting.',
});
</script>

<style scoped>
.curated-hero {
  max-width: 900px;
  margin: 0 auto;
  padding: 80px 48px 64px;
}

.curated-hero-title {
  font-size: clamp(2rem, 4vw, 2.75rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  line-height: 1.15;
  margin-bottom: 16px;
}

.curated-hero-subtitle {
  font-size: var(--text-lg);
  color: var(--text-secondary);
  line-height: 1.55;
  max-width: 55ch;
}

@media (max-width: 767px) {
  .curated-hero {
    padding: 48px 20px 40px;
  }
  .curated-hero-title {
    font-size: clamp(1.75rem, 6vw, 2rem);
  }
  .curated-hero-subtitle {
    font-size: var(--text-base);
  }
}

@media (prefers-reduced-motion: reduce) {
  .curated-hero-title,
  .curated-hero-subtitle {
    transition: none;
  }
}
</style>
