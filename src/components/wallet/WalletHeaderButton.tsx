import { useEffect, useRef, useState } from 'react';
import { useWallet, shortenAddress } from '@/solana/WalletProvider';
import { BrowserWalletPicker } from '@/components/wallet/BrowserWalletPicker';
import type { BrowserWalletId } from '@/solana/web-wallet-browser';

export function WalletHeaderButton() {
  const { address, isBrowserWalletMode, connect, disconnect, connecting, error } = useWallet();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  const handleBrowserConnect = async (id: BrowserWalletId) => {
    try {
      await connect(id);
      setPickerOpen(false);
    } catch {
      // error surfaced via wallet context
    }
  };

  const handleClick = () => {
    if (address) {
      setMenuOpen((open) => !open);
      return;
    }
    if (isBrowserWalletMode) {
      setPickerOpen(true);
      return;
    }
    connect().catch(() => {});
  };

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // ignore clipboard failures
    }
    setMenuOpen(false);
  };

  const handleDisconnect = () => {
    disconnect();
    setMenuOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={connecting}
        className="btn btn-secondary btn-sm font-mono text-xs max-w-[9.5rem] truncate"
        title={address ? 'Wallet connected' : 'Connect wallet (optional)'}
      >
        {connecting ? '…' : address ? shortenAddress(address, 4) : 'Connect Wallet'}
      </button>
      {menuOpen && address && (
        <div className="absolute top-full right-0 z-50 mt-1 min-w-[10rem] rounded-lg border border-white/10 bg-slate-900 py-1 shadow-lg">
          <button
            type="button"
            onClick={handleCopy}
            className="block w-full px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10"
          >
            Copy address
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            className="block w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-white/10"
          >
            Disconnect
          </button>
        </div>
      )}
      {error && !pickerOpen && (
        <p className="absolute top-full right-0 mt-1 text-[10px] text-red-400 max-w-[12rem] text-right">
          {error}
        </p>
      )}
      {pickerOpen && (
        <BrowserWalletPicker
          open
          onClose={() => setPickerOpen(false)}
          onSelect={handleBrowserConnect}
          connecting={connecting}
          error={error}
        />
      )}
    </div>
  );
}
