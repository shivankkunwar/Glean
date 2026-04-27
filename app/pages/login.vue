<template>
  <section class="auth-shell">
    <form class="login-card" @submit.prevent="submit">
      <div class="login-logo">Glean</div>
      <h1 class="login-title">Welcome back.</h1>
      <p class="login-sub">Your personal knowledge vault awaits.</p>

      <label class="field">
        <span>Password</span>
        <input v-model="password" type="password" autocomplete="current-password" required minlength="3" placeholder="Enter your password" />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button class="login-btn" type="submit" :disabled="isLoading">
        {{ isLoading ? 'Signing in…' : 'Sign in' }}
      </button>

      <p class="login-hint">Works with the ADMIN_PASSWORD set in your environment.</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports';

definePageMeta({ middleware: [] });

const password = ref('');
const isLoading = ref(false);
const error = ref('');

async function submit() {
  isLoading.value = true;
  error.value = '';
  try {
    const response = await $fetch('/api/login', { method: 'POST', body: { password: password.value } });
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

<style scoped>
.login-card {
  width: min(440px, 100%);
  background: var(--bg-surface); border-radius: 24px;
  box-shadow: var(--shadow-xl); border: 1px solid var(--border-subtle);
  padding: 48px 40px;
  display: flex; flex-direction: column; gap: 0;
}

.login-logo {
  font-size: var(--text-2xl); font-weight: 700;
  letter-spacing: -0.03em; color: var(--text-primary);
  margin-bottom: 24px;
}

.login-title {
  font-size: var(--text-3xl); font-weight: 700;
  letter-spacing: -0.02em; color: var(--text-primary);
  margin-bottom: 6px;
}

.login-sub {
  font-size: var(--text-base); color: var(--text-secondary);
  margin-bottom: 32px;
}

.field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.field span { font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); }
.field input {
  width: 100%; border: 1.5px solid var(--border-default);
  border-radius: 12px; padding: 14px 16px;
  background: var(--input-bg); color: var(--text-primary);
  font-size: var(--text-base); font-family: var(--font-ui);
  transition: border-color var(--d-fast) var(--ease-out), box-shadow var(--d-fast) var(--ease-out);
}
.field input:focus { outline: none; border-color: var(--color-accent); box-shadow: var(--shadow-accent); }
.field input::placeholder { color: var(--text-muted); }

.login-btn {
  margin-top: 8px;
  width: 100%; padding: 14px;
  background: var(--color-accent); color: var(--text-inverse);
  border: none; border-radius: 12px;
  font-size: var(--text-base); font-weight: 600; cursor: pointer;
  box-shadow: var(--shadow-accent);
  transition: transform var(--d-fast) var(--ease-out), box-shadow var(--d-fast);
  font-family: var(--font-ui);
}
.login-btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-md), var(--shadow-accent); }
.login-btn:active { transform: scale(0.98); }
.login-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

.error { color: oklch(55% 0.18 20); font-size: var(--text-sm); margin: 4px 0 8px; }
.login-hint { font-size: var(--text-xs); color: var(--text-muted); margin-top: 20px; text-align: center; }
</style>
