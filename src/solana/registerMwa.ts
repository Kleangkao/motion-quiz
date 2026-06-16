import {
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
} from '@solana-mobile/wallet-standard-mobile';
import { SOLANA_APP_IDENTITY, SUPPORTED_CHAINS } from './config';

let registered = false;

/** Register Mobile Wallet Adapter — call once on client mount only */
export function ensureMwaRegistered(): void {
  if (registered || typeof window === 'undefined') return;
  try {
    registerMwa({
      appIdentity: {
        name: SOLANA_APP_IDENTITY.name,
        uri: SOLANA_APP_IDENTITY.uri,
        icon: SOLANA_APP_IDENTITY.icon,
      },
      authorizationCache: createDefaultAuthorizationCache(),
      chains: [...SUPPORTED_CHAINS],
      chainSelector: createDefaultChainSelector(),
      onWalletNotFound: createDefaultWalletNotFoundHandler(),
    });
    registered = true;
  } catch {
    // MWA unavailable outside supported Android environments
  }
}
