export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') {
    return;
  }

  try {
    const session = await $fetch('/api/session', { retry: false });
    if (session && (session as { authenticated: boolean }).authenticated) {
      return;
    }
  } catch {
    return navigateTo('/login');
  }
});
