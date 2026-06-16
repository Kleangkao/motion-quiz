import {
  listBrowserWalletOptions,
  type BrowserWalletId,
} from '@/solana/web-wallet-browser';
import { WalletBrandIcon } from '@/components/wallet/WalletBrandIcon';

interface Props {
  onSelect: (id: BrowserWalletId) => void;
  connecting?: boolean;
  error?: string | null;
  /** Modal overlay; omit for inline compact picker */
  open?: boolean;
  onClose?: () => void;
}

function WalletRow({
  wallet,
  connecting,
  onSelect,
}: {
  wallet: ReturnType<typeof listBrowserWalletOptions>[number];
  connecting?: boolean;
  onSelect: (id: BrowserWalletId) => void;
}) {
  const label = wallet.installed
    ? connecting
      ? 'Connecting…'
      : `Connect ${wallet.name}`
    : `Install ${wallet.name}`;

  const content = (
    <>
      <WalletBrandIcon id={wallet.id} />
      <span className="font-semibold">{label}</span>
    </>
  );

  const className = 'btn btn-secondary btn-md w-full flex items-center gap-3 text-left';

  if (wallet.installed) {
    return (
      <button
        type="button"
        onClick={() => onSelect(wallet.id)}
        disabled={connecting}
        className={className}
      >
        {content}
      </button>
    );
  }

  return (
    <a
      href={wallet.installUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {content}
    </a>
  );
}

function WalletOptions({
  onSelect,
  connecting,
}: Pick<Props, 'onSelect' | 'connecting'>) {
  const options = listBrowserWalletOptions();

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/50 leading-relaxed">
        Browser wallet mode — choose Phantom or Solflare. This is not Mobile Wallet Adapter.
      </p>
      {options.map((wallet) => (
        <WalletRow key={wallet.id} wallet={wallet} connecting={connecting} onSelect={onSelect} />
      ))}
      {!options.some((w) => w.installed) && (
        <p className="text-xs text-white/40 text-center pt-1">
          No browser wallet detected. Install Phantom or Solflare to connect.
        </p>
      )}
    </div>
  );
}

export function BrowserWalletPicker({
  onSelect,
  connecting = false,
  error = null,
  open,
  onClose,
}: Props) {
  if (open === false) return null;

  const body = (
    <>
      {open != null && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white text-sm">Connect browser wallet</h3>
          {onClose && (
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm text-xs">
              Close
            </button>
          )}
        </div>
      )}
      <WalletOptions onSelect={onSelect} connecting={connecting} />
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </>
  );

  if (open != null) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
        <div className="glass-card w-full max-w-sm p-5">{body}</div>
      </div>
    );
  }

  return <div className="space-y-2">{body}</div>;
}
