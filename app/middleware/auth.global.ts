export default defineNuxtRouteMiddleware(async (to) => {
  // Login page is always public
  if (to.path === '/login') return;

  // Admin-only pages — always require auth
  const ADMIN_ONLY_PATHS = ['/ai-monitor'];
  const requiresAuth = ADMIN_ONLY_PATHS.some(p => to.path.startsWith(p));

  try {
    const headers = process.server ? useRequestHeaders(['cookie']) : undefined;
    const session = await $fetch('/api/session', {
      retry: false,
      headers,
      credentials: 'include'
    });
    const isAuthenticated = session && (session as { authenticated: boolean }).authenticated;

    if (requiresAuth && !isAuthenticated) {
      return navigateTo('/login');
    }

    // Store auth state in nuxt state so pages can read it without extra fetches
    const authState = useState<boolean>('isAuthenticated', () => false);
    authState.value = Boolean(isAuthenticated);
  } catch {
    if (requiresAuth) {
      return navigateTo('/login');
    }
    // Public browsing pages — allow through unauthenticated
    const authState = useState<boolean>('isAuthenticated', () => false);
    authState.value = false;
  }
});
