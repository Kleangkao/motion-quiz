/** Desktop/browser — use Phantom/Solflare picker, not Mobile Wallet Adapter auto-connect */
export function isBrowserWalletMode(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !/Android/i.test(navigator.userAgent);
}
