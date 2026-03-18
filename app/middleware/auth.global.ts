export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') {
    return;
  }

  try {
    const headers = process.server ? useRequestHeaders(['cookie']) : undefined;
    const session = await $fetch('/api/session', {
      retry: false,
      headers,
      credentials: 'include'
    });
    if (session && (session as { authenticated: boolean }).authenticated) {
      return;
    }
  } catch {
    return navigateTo('/login');
  }
});
