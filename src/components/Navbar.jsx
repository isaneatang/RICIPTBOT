/**
 * Navbar — brand + primary navigation + wallet control.
 *
 * RICIPT branding only (never "DevicePassport" as the product name).
 * Uses a React Router <NavLink> so active states are styled automatically.
 */
import { NavLink, Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet.js';
import { activeNetwork } from '../config/chains.js';
import WalletButton from './WalletButton.jsx';

export default function Navbar() {
  const { isConnected, isOnActiveNetwork } = useWallet();

  const navLinkClass = ({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`;

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand" aria-label="RICIPT home">
          <span className="navbar__logo" aria-hidden="true">R</span>
          <span className="navbar__name">RICIPT</span>
        </Link>

        <nav className="navbar__links" aria-label="Primary">
          <NavLink to="/create" className={navLinkClass}>
            CREATE PASSPORT
          </NavLink>
          <NavLink to="/passes" className={navLinkClass}>
            MY PASSPORTS
          </NavLink>
        </nav>

        <div className="navbar__right">
          {isConnected && (
            <span
              className={`network-pill${isOnActiveNetwork ? ' network-pill--ok' : ' network-pill--warn'}`}
              title={`Active network: ${activeNetwork.label}`}
            >
              {activeNetwork.label}
            </span>
          )}
          <WalletButton />
        </div>
      </div>
    </header>
  );
}