<template>
  <section class="auth-shell">
    <form class="card" @submit.prevent="submit">
      <h1>Welcome to Glean</h1>
      <p>Set your session password once to start saving links.</p>

      <label class="field">
        <span>Password</span>
        <input v-model="password" type="password" autocomplete="current-password" required minlength="3" />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button class="primary" type="submit" :disabled="isLoading">{{ isLoading ? 'Signing in…' : 'Sign in' }}</button>

      <p class="muted">Works best with a shared secret in ADMIN_PASSWORD.</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports';

definePageMeta({
  middleware: []
});

const password = ref('');
const isLoading = ref(false);
const error = ref('');

async function submit() {
  isLoading.value = true;
  error.value = '';

  try {
    const response = await $fetch('/api/login', {
      method: 'POST',
      body: { password: password.value }
    });
    if ((response as { statusCode?: number }).statusCode) {
      error.value = (response as { message?: string }).message || 'Invalid password';
      return;
    }
    await navigateTo('/');
  } catch {
    error.value = 'Invalid password';
  } finally {
    isLoading.value = false;
  }
}
</script>
