/**
 * Home — landing page.
 *
 * Primary message: "Turn a physical device purchase into a verifiable
 * blockchain passport." Two CTAs (CREATE PASSPORT / MY PASSPORTS) plus the
 * wallet button. Also shows recently-viewed passports (localStorage, UI
 * convenience only) and the active network badge.
 */
import { Link } from 'react-router-dom';
import WalletButton from '../components/WalletButton.jsx';
import { useWallet } from '../hooks/useWallet.js';
import { activeNetwork } from '../config/chains.js';
import { getRecent, getPassportMetadata } from '../utils/storage.js';

export default function Home() {
  const { isConnected } = useWallet();
  const recent = getRecent()
    .slice(0, 4)
    .map((id) => ({ id, meta: getPassportMetadata(id) }))
    .filter((entry) => entry.meta);

  return (
    <div className="page home">
      <section className="hero">
        <div className="hero__badge">
          <span className="hero__dot" aria-hidden="true" />
          LIVE ON {activeNetwork.label}
        </div>

        <h1 className="hero__title">
          Turn a physical device purchase into a <span className="hero__accent">verifiable</span>{' '}
          blockchain passport.
        </h1>

        <p className="hero__text">
          RICIPT creates a persistent, transferable, cryptographically verifiable purchase and
          provenance record for your physical device on BOT Chain.
        </p>

        <div className="hero__actions">
          <Link to="/create" className="btn btn--primary btn--lg">
            CREATE PASSPORT
          </Link>
          <Link to="/passes" className="btn btn--ghost btn--lg">
            MY PASSPORTS
          </Link>
        </div>

        <div className="hero__wallet">
          <WalletButton size="large" />
          {isConnected && (
            <span className="hero__hint">Connected. Ready to record a device.</span>
          )}
        </div>
      </section>

      <section className="how">
        <h2 className="how__title">HOW IT WORKS</h2>
        <ol className="how__steps">
          <li>
            <span className="how__num">01</span>
            <span>Buy a physical device</span>
          </li>
          <li>
            <span className="how__num">02</span>
            <span>Enter the purchase details in RICIPT</span>
          </li>
          <li>
            <span className="how__num">03</span>
            <span>A one-of-one Device Passport is minted on BOT Chain</span>
          </li>
          <li>
            <span className="how__num">04</span>
            <span>Resell? Transfer the passport to the new owner&apos;s wallet</span>
          </li>
        </ol>
      </section>

      <section className="why">
        <h2 className="why__title">A PASSPORT, NOT A PROMISE</h2>
        <p className="why__text">
          RICIPT records that a specific dataset was committed to the blockchain at a specific time
          by a specific wallet. It is <strong>blockchain proof of record</strong>, not proof that the
          purchase, retailer, or device are legitimate.
        </p>
        <Link to="/verify" className="link-arrow">
          Verify a passport without a wallet →
        </Link>
      </section>

      {recent.length > 0 && (
        <section className="recent">
          <h2 className="recent__title">RECENTLY VIEWED</h2>
          <ul className="recent__list">
            {recent.map(({ id, meta }) => (
              <li key={id}>
                <Link to={`/passport/${id}`} className="recent__item">
                  <span className="recent__token">#{id}</span>
                  <span>
                    {meta.manufacturer} {meta.model}
                  </span>
                  <span className="recent__arrow">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}