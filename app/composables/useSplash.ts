export function useSplash() {
  return useState('splash-ready', () => false)
}
