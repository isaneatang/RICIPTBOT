/**
 * App — layout + routes.
 *
 * WalletProvider sits ABOVE the router so every page shares the same wallet
 * and network state through useWallet(). Navbar + Footer wrap all pages.
 * Footer contains exactly one thing: EQUIXOTE.
 */
import { Route, Routes } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext.jsx';
import Navbar from './components/Navbar.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Home from './pages/Home.jsx';
import CreatePassport from './pages/CreatePassport.jsx';
import MyPassports from './pages/MyPassports.jsx';
import PassportDetails from './pages/PassportDetails.jsx';
import VerifyPassport from './pages/VerifyPassport.jsx';

export default function App() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <div className="app">
          <Navbar />
          <main className="app__main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreatePassport />} />
              <Route path="/passes" element={<MyPassports />} />
              <Route path="/passport/:tokenId" element={<PassportDetails />} />
              <Route path="/verify" element={<VerifyPassport />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          <footer className="app__footer">EQUIXOTE</footer>
        </div>
      </WalletProvider>
    </ErrorBoundary>
  );
}