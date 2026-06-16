import type { BrowserWalletId } from '@/solana/web-wallet-browser';

interface Props {
  id: BrowserWalletId;
  className?: string;
}

const WALLET_LOGOS: Record<BrowserWalletId, { src: string; alt: string }> = {
  phantom: { src: '/wallets/phantom.png', alt: 'Phantom' },
  solflare: { src: '/wallets/solflare.png', alt: 'Solflare' },
};

export function WalletBrandIcon({ id, className = 'h-7 w-7 rounded-lg shrink-0' }: Props) {
  const logo = WALLET_LOGOS[id];
  return (
    <img
      src={logo.src}
      alt={logo.alt}
      width={28}
      height={28}
      draggable={false}
      className={`aspect-square object-cover ${className}`}
    />
  );
}
