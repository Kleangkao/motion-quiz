/** App identity for Mobile Wallet Adapter */
export const SOLANA_APP_IDENTITY = {
  name: 'Seeker Motion Quiz',
  uri: typeof window !== 'undefined' ? window.location.origin : 'https://seeker-motion-quiz.app',
  icon: '/icon.svg',
} as const;

export const SOLANA_MAINNET_CHAIN = 'solana:mainnet' as const;
export const SOLANA_DEVNET_CHAIN = 'solana:devnet' as const;

export const SUPPORTED_CHAINS = [SOLANA_MAINNET_CHAIN, SOLANA_DEVNET_CHAIN] as const;
