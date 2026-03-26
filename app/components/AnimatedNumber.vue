<template>
  <span>{{ displayValue.toLocaleString() }}</span>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const props = defineProps<{
  value: number;
}>();

const displayValue = ref(props.value || 0);

watch(() => props.value, (newVal) => {
  animateValue(displayValue.value, newVal, 800);
});

function animateValue(start: number, end: number, duration: number) {
  let startTimestamp: number | null = null;
  const step = (timestamp: number) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    
    // easeOutExpo for sleek deceleration
    const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    
    displayValue.value = Math.floor(easeProgress * (end - start) + start);
    
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      displayValue.value = end;
    }
  };
  window.requestAnimationFrame(step);
}

onMounted(() => {
  if (props.value > 0) {
    animateValue(0, props.value, 800);
  }
});
</script>
