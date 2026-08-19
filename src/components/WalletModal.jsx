/**
 * WalletModal — thin wrapper that opens the Reown wallet picker.
 *
 * RICIPT intentionally does NOT build its own wallet modal. Reown AppKit
 * renders the actual picker (wallets, QR, deep links). This component exists
 * so pages can trigger the modal declaratively (`<WalletModal />` as a
 * control) without importing AppKit hooks themselves.
 *
 * It renders nothing visually — it only exposes a trigger via the child
 * render prop pattern. Most pages should just use useWallet().connect()
 * directly instead.
 */
import { useWallet } from '../hooks/useWallet.js';

export default function WalletModal({ render }) {
  const { connect } = useWallet();

  // Children receive the trigger so they can style their own button.
  if (typeof render === 'function') return render({ open: connect });
  return null;
}