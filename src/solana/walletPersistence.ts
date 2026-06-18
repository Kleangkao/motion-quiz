import type { BrowserWalletId } from './web-wallet-browser';

const BROWSER_WALLET_KEY = 'motion-quiz:last-browser-wallet';

export function saveBrowserWalletId(id: BrowserWalletId): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(BROWSER_WALLET_KEY, id);
}

export function getSavedBrowserWalletId(): BrowserWalletId | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(BROWSER_WALLET_KEY);
  return raw === 'phantom' || raw === 'solflare' ? raw : null;
}

export function clearSavedBrowserWalletId(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(BROWSER_WALLET_KEY);
}
