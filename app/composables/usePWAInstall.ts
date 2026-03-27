import { ref, onMounted, onBeforeUnmount } from 'vue';

let eventListenersAttached = false;

export function usePWAInstall() {
  const deferredPrompt = ref<Event | null>(null);
  const isInstalled = ref(false);
  const showInstallBanner = ref(false);

  function canInstall(): boolean {
    return deferredPrompt.value !== null && !isInstalled.value;
  }

  async function install(): Promise<boolean> {
    if (!deferredPrompt.value) return false;
    
    const promptEvent = deferredPrompt.value as any;
    promptEvent.prompt();
    
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt.value = null;
      showInstallBanner.value = false;
      localStorage.setItem('pwa-install-dismissed', 'true');
      return true;
    }
    return false;
  }

  function dismissBanner() {
    showInstallBanner.value = false;
    localStorage.setItem('pwa-install-dismissed', 'true');
  }

  function shouldShowBanner(): boolean {
    if (isInstalled.value) return false;
    if (localStorage.getItem('pwa-install-dismissed') === 'true') return false;
    return true;
  }

  function handleBeforeInstallPrompt(e: Event) {
    e.preventDefault();
    deferredPrompt.value = e;
    if (shouldShowBanner()) {
      showInstallBanner.value = true;
    }
  }

  function handleAppInstalled() {
    isInstalled.value = true;
    showInstallBanner.value = false;
    localStorage.setItem('pwa-install-dismissed', 'true');
  }

  function handleDisplayModeChange(e: MediaQueryListEvent) {
    isInstalled.value = e.matches;
    if (isInstalled.value) {
      showInstallBanner.value = false;
    }
  }

  onMounted(() => {
    isInstalled.value = window.matchMedia('(display-mode: standalone)').matches;
    
    if (!eventListenersAttached) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
      window.matchMedia('(display-mode: standalone)').addEventListener('change', handleDisplayModeChange);
      eventListenersAttached = true;
    }
  });

  onBeforeUnmount(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  });

  return {
    canInstall,
    install,
    dismissBanner,
    showInstallBanner,
    isInstalled
  };
}
