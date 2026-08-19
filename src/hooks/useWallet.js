/**
 * useWallet — conventional hook alias.
 *
 * The actual implementation lives in WalletContext; this file exists so pages
 * import from hooks/ (matching the architecture spec) and so the naming is
 * obvious: `const { isConnected, address, ensureNetwork } = useWallet()`.
 */
export { useWallet } from '../context/WalletContext.jsx';