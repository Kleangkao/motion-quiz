export function friendlyWalletError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/user rejected|rejected the request|request rejected/i.test(msg)) {
    return 'Request was rejected in your wallet.';
  }
  if (/cancel|denied|declined|closed/i.test(msg)) {
    return 'Connection was cancelled.';
  }
  return msg || 'Wallet request failed.';
}
