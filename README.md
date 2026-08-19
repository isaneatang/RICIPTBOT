# RICIPT

**Turn a physical device purchase into a verifiable blockchain passport.**

RICIPT is a blockchain-backed device provenance/passport application for the
BOT Chain Builder Challenge. A physical device is purchased → the buyer enters
the purchase details into RICIPT → RICIPT mints one ERC-721 **Device Passport**
that records a verifiable purchase/provenance record associated with that
device. If the device is later sold, the passport transfers to the new owner's
wallet.

> **Legal/honesty notice**
> RICIPT is a blockchain-backed provenance/purchase record and does not by
> itself constitute legal title or determine legal ownership of a physical
> device.

---

## What is a "Device Passport"?

A single ERC-721 token that represents **one physical device's passport** —
not a claim that the device is authentic. It commits to:

- a deterministic hash of the canonical purchase dataset,
- the issuing wallet (the person who created the record),
- the creation timestamp,
- the current owner (via standard ERC-721 ownership),
- a lifecycle status (`VERIFIED`, `LOST`, `STOLEN`, `DISPUTED`, `RECOVERED`).

### Blockchain proof of record vs. real-world truth

| Blockchain proof of record | Real-world truth |
| --- | --- |
| A passport was minted on-chain. | The purchase actually happened. |
| This exact dataset hash was committed at a timestamp by a wallet. | The retailer is legitimate. |
| The current owner is wallet X. | The device exists / is not stolen. |
| The status was last set to Y by an authorized wallet. | The person legally owns the device. |

The hash proves *a specific dataset was used* to create the passport. It does
**not** independently prove the purchase was legitimate, the retailer was
legitimate, the device actually exists, or that the entered data is truthful.

---

## Architecture

```
RICIPT
   ↓
Reown AppKit            ← owns wallet/session/connection infra
   ↓
Wagmi / EIP-1193 provider
   ↓
viem                    ← read + write clients
   ↓
BOT Chain               ← testnet (968) or mainnet (677)
```

- **No backend. No database.** localStorage is used for UI convenience only
  (recently viewed, form drafts, local display metadata). It is **not** secure
  storage and never authoritative.
- **Reown owns the session.** RICIPT consumes the resulting EIP-1193 provider
  via `useAppKitProvider('eip155')`. We never hand-roll WalletConnect and never
  assume `window.ethereum` exists. Normal Chrome without an extension connects
  via AppKit's QR / deep-link wallets.

### React structure

```
src/
├── components/    UI building blocks (Navbar, modals, cards, gates…)
├── pages/         Route-level pages (Home, CreatePassport, MyPassports, …)
├── blockchain/    client.js (viem clients) + contract.js (contract layer) + artifact.js (ABI)
├── config/        networks.testnet.js / networks.mainnet.js / chains.js / environment.js
├── context/       WalletContext.jsx (the one wallet/network interface)
├── hooks/         useWallet, useNetwork, usePassport (tx state machine)
├── utils/         hashing, validation, formatting, errors, storage, qr
└── styles/        globals.css, components.css, pages.css
contracts/         DevicePassport.sol
scripts/           compile-contract.js (regenerates src/blockchain/artifact.js)
deploy/            deploy.js (Hardhat deploy script)
```

### Key files & responsibilities

| File | Responsibility |
| --- | --- |
| `src/config/chains.js` | **The** TN/MN switch. Change `ACTIVE_NETWORK` here. |
| `src/config/networks.testnet.js` | All BOT Chain testnet values (chain 968). |
| `src/config/networks.mainnet.js` | All BOT Chain mainnet values (chain 677). |
| `src/config/environment.js` | Reads `VITE_*` env vars, merges into network config. |
| `src/blockchain/client.js` | viem public client (reads) + wallet client (writes) + raw `wallet_switchEthereumChain` / `wallet_addEthereumChain` helpers. |
| `src/blockchain/contract.js` | The only file that knows the contract address + ABI. Read/write functions. |
| `src/context/WalletContext.jsx` | Central wallet + network state machine (CONNECTED / WRONG_NETWORK / ADDING / SWITCHING / READY / REJECTED). |
| `src/hooks/usePassport.js` | Write-transaction state machine (PREPARING → AWAITING_WALLET → SUBMITTED → CONFIRMING → CONFIRMED/FAILED). |
| `src/utils/errors.js` | Central friendly-error mapping. The UI never sees raw wallet errors. |
| `src/utils/hashing.js` | Deterministic canonicalization + keccak256 hashing. |
| `src/utils/storage.js` | localStorage helpers (UI convenience only, honest about privacy). |

---

## Reown / AppKit architecture

- `createAppKit` + `WagmiAdapter` are wired once in `src/main.jsx`.
- Only the **active** chain is registered with AppKit (see
  `getAppKitNetworks()` in `src/config/chains.js`), enforcing **one active
  network at a time**.
- Pages use the Reown hooks **only through** `WalletContext` / `useWallet()`:
  `useAppKitAccount`, `useAppKitProvider('eip155')`, `useAppKit`, `useDisconnect`.
- Wrong-network handling runs **after** connection, never before. If the wallet
  rejects adding/switching chains, the session is **kept alive** and the user
  sees "Network change cancelled. Your wallet is still connected." — a failed
  network switch is never presented as a failed connection.

### WalletConnect error handling

Architected so Reown owns sessions, we consume the EIP-1193 provider, chain
config is consistent, and stale session state is impossible (disconnect/session
expiry flows through Reown). Wallet apps still control their own behavior, so
individual wallet quirks (OKX "Network Error", Bitget "Transaction Request
Failed", a deep link that never establishes a session) cannot be fully
eliminated — but the app never freezes on them: every phase has a retryable
state and a friendly message.

---

## BOT Chain configuration

Verified against the official developer docs
([quick guide](https://dev-docs.botchain.ai/docs/Developers/quick-guide),
[JSON-RPC endpoint](https://dev-docs.botchain.ai/docs/Developers/json-rpc-endpoint)):

| | Testnet | Mainnet |
| --- | --- | --- |
| Chain ID | 968 | 677 |
| RPC | `https://rpc.bohr.life` | `https://rpc.botchain.ai` |
| Native token | BOT | BOT |
| Explorer | `https://scan.bohr.life` | `https://scan.botchain.ai` |
| Faucet | `https://faucet.botchain.ai/basic` | — |

### TN / MN switch

`src/config/chains.js`:

```js
export const ACTIVE_NETWORK = 'TN'; // "TN" = testnet, "MN" = mainnet
```

- `TN` → BOT Chain Testnet (968), contract address from `VITE_TESTNET_CONTRACT_ADDRESS`.
- `MN` → BOT Chain Mainnet (677), contract address from `VITE_MAINNET_CONTRACT_ADDRESS`.

Change that one line and the whole app (wallet chains, clients, explorers,
contract address) follows. Chain IDs/RPCs/explorers are never hard-coded in
components.

---

## Environment variables

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `VITE_REOWN_PROJECT_ID` | **Public** | Reown dashboard Project ID (https://dashboard.reown.com). |
| `VITE_TESTNET_CONTRACT_ADDRESS` | **Public** | Deployed testnet contract address. |
| `VITE_MAINNET_CONTRACT_ADDRESS` | **Public** | Deployed mainnet contract address. |
| `DEPLOYER_PRIVATE_KEY` | **SECRET** | Used only by Hardhat deploys. Never a `VITE_` var, never bundled. |

`VITE_*` variables are bundled into the browser by Vite — anyone can read them.
That is fine for chain IDs, RPC URLs, contract addresses and the Reown project
ID (all public by nature). `DEPLOYER_PRIVATE_KEY` is **not** a `VITE_`
variable and is used only server-side/shell-side by `deploy/deploy.js`.

`.gitignore` excludes `.env` and `.env.*` (with `!.env.example`).

---

## Installation

```bash
# 1. Clone / enter the project, then install
npm install

# 2. Configure environment
cp .env.example .env
# edit .env → set VITE_REOWN_PROJECT_ID (and contract addresses after deploy)

# 3. Run the dev server
npm run dev
```

---

## Wallet setup

1. Create a free project at https://dashboard.reown.com → copy the Project ID
   into `VITE_REOWN_PROJECT_ID`.
2. Open RICIPT in a normal browser. Click **CONNECT WALLET** → the AppKit
   picker appears with injected wallets, WalletConnect QR and deep-link
   wallets.
3. On first use the app asks to **add + switch to BOT Chain** (testnet 968 or
   mainnet 677, depending on `ACTIVE_NETWORK`). Approve it.
4. Get test BOT from the faucet if needed:
   https://faucet.botchain.ai/basic

RICIPT never asks for a private key, seed phrase or wallet password. It never
stores wallet credentials.

---

## Smart contract

`contracts/DevicePassport.sol` — Solidity `^0.8.24`, OpenZeppelin ERC721 +
Ownable.

- One passport per device (single NFT; transfers move ownership, never a
  second mint on resale).
- On-chain `Passport` struct: `dataHash`, `metadataURI`, `issuer`,
  `createdAt`, `status`. **No raw sensitive fields** (IMEI, serial, receipt
  number) ever go on-chain.
- Anyone can mint; `msg.sender` is recorded as issuer (MVP product choice:
  connected user = issuer/creator). Retailer/manufacturer verification can
  tighten this later via the contract owner.
- Status updates authorized to: contract owner, issuer, or current owner.
- `passportsOfOwner()` keeps per-owner token lists **on-chain** so
  "My Passports" works without an indexer. A future indexer
  (TheGraph/Covalent) can replace it with zero frontend changes.

### Contract data model rationale

Hackathon simplicity + privacy + verifiability + gas cost:

- **Hash on-chain, plaintext local.** The chain only needs to prove a
  dataset existed; it does not need the dataset. Local display metadata
  (manufacturer, model, price…) is stored in localStorage so "My Passports"
  can render nicely — clearly labeled as non-authoritative.
- **Price as string** (`"1499.99"`) to avoid float precision traps when
  hashing.
- **metadataURI is optional and empty by default.** No IPFS just for the
  sake of it.

### Data hashing

`src/utils/hashing.js` builds a canonical object in a fixed key order
(`deviceType, manufacturer, model, purchaseDate, retailer, price, currency,
warranty, issuer`), trims all values, JSON-stringifies it, then computes
`keccak256` of the UTF-8 bytes. Deterministic: identical input → identical
hash. The hash is what goes on-chain.

---

## Contract compilation

```bash
npm run compile
```

Runs `hardhat compile` then regenerates `src/blockchain/artifact.js` (ABI +
bytecode) from the artifact. Run it after any Solidity change.

---

## Contract deployment

1. Fund the deployer address with BOT
   (testnet faucet: https://faucet.botchain.ai/basic).
2. Set `DEPLOYER_PRIVATE_KEY` in `.env` (secret, never committed).
3. Deploy:

```bash
npm run deploy:testnet   # BOT Chain Testnet (968)
npm run deploy:mainnet   # BOT Chain Mainnet (677)
```

4. Copy the printed address into `.env`:

```
VITE_TESTNET_CONTRACT_ADDRESS=0x…    (or VITE_MAINNET_CONTRACT_ADDRESS)
```

5. Restart the dev server. The app refuses to mint/verify with a clear
   "CONTRACT NOT CONFIGURED" message until the address is set.

The deploy script prints the contract address, transaction hash, active
network, and explorer links. The address config lives in
`src/config/environment.js` via `VITE_*`; `src/config/chains.js` decides which
one is used.

---

## Local test order (MVP definition of done)

1. **Wallet** — open `/`, click CONNECT WALLET, pick a wallet (extension or QR).
2. **Network** — approve the add/switch to BOT Chain; the nav pill turns
   green/READY. Try rejecting once — you stay connected and get a retry.
3. **Create** — `/create`, fill the form (use the TEXT/PICKER date toggle).
4. **Mint** — REVIEW → CONFIRM & MINT → approve in wallet → wait for
   CONFIRMED → token id shown.
5. **Passes** — `/passes` shows the new passport.
6. **Details** — `/passport/<id>` shows the full on-chain record + QR.
7. **Verify** — scan/visit `/verify?tokenId=<id>` without a wallet.
8. **Transfer** — `/passport/<id>` → TRANSFER → recipient address → confirm.
9. **Second wallet** — connect a second wallet → `/passes` shows the
   transferred passport under the new owner.
10. **Public verify** — `/verify?tokenId=<id>` still works with no wallet.

---

## Mobile testing

| Target | How |
| --- | --- |
| Android Chrome | Open the Vercel/dev URL, connect via WalletConnect QR or deep link. |
| Wallet DApp browsers | Open the URL inside the wallet browser (e.g. MetaMask mobile). Injected wallet appears in the AppKit picker. |
| WalletConnect QR | In normal Chrome (no extension) choose "WalletConnect" in the picker, scan with the phone wallet. |
| Deep links | The AppKit picker handles wallet deep links automatically. |

The UI is designed for 360px-wide screens: large touch targets, no hover-only
controls, hybrid date input (text `YYYY-MM-DD` or native picker), native
selects, modals fit small screens, no horizontal overflow, transaction state
stays visible during confirmations.

---

## Vercel deployment

1. Push the project to GitHub.
2. Import the repo into Vercel (framework preset: **Vite**).
3. Set environment variables:
   - `VITE_REOWN_PROJECT_ID`
   - `VITE_TESTNET_CONTRACT_ADDRESS`
   - `VITE_MAINNET_CONTRACT_ADDRESS`
4. Deploy.

`vercel.json` rewrites all routes to `/index.html`, so hard refreshes on
`/create`, `/passes`, `/passport/:id` and `/verify` work. No backend, no
Express, no database. Never put `DEPLOYER_PRIVATE_KEY` (or any secret) into
Vercel for the frontend — it is not a `VITE_` var and the app does not use it.

> Auto-deploy tip: Vercel's Git integration requires a commit identity that
> GitHub can link to your account. Use your GitHub noreply email
> (`<id>+<username>@users.noreply.github.com`) or a real email on the account —
> otherwise deployments are blocked with *"no git user associated with the
> commit"*.

### Error handling

`ErrorBoundary` (`src/components/ErrorBoundary.jsx`) wraps the app. If a page
throws during render you get a "SOMETHING WENT WRONG" screen with the error
message and a reload button — never a blank page. The last error is also
mirrored to `localStorage["ricipt:last-error"]` so it can be reported and
diagnosed.

---

## Security model

- Never requests/stores private keys, seed phrases or wallet passwords.
- Never sends private wallet information to a server (there is no server).
- Validates addresses, numbers, dates, strings and contract responses
  (`src/utils/validation.js`).
- Prevents duplicate mint submissions (the tx state machine disables buttons
  during `PREPARING…CONFIRMING`).
- Prevents invalid transfers (address validation + same-owner check).
- Prevents accidental wrong-network transactions (`requireReady()` blocks
  writes unless the wallet is READY on the active chain).
- QR codes encode only `/verify?tokenId=<id>` — never IMEI, serial, receipt
  image or receipt number.

## Privacy model

- On-chain: hash, issuer, timestamp, status, owner, optional metadata URI.
- Local (browser, non-authoritative): display metadata
  (manufacturer/model/price…), drafts, recently viewed.
- Sensitive fields (IMEI, serial, receipt number) are shown during creation
  and review but are **never written to the chain** and not persisted to the
  passport metadata cache.
- localStorage is a convenience cache, **not** secure storage. Anyone with
  access to the device/browser can read it. Do not store secrets there.

---

## Limitations (MVP)

- No backend/indexer: "My Passports" uses the on-chain per-owner list; a
  large owner could hit read limits (fine for a demo, indexer later).
- No retailer/manufacturer verification: anyone can mint (issuer = wallet).
- No marketplace, payments, escrow, DAO or governance.
- Wallet apps control their own connection/network behavior; we map errors to
  friendly messages but cannot fix a broken wallet.
- `metadataURI` is unused by the frontend; reserved for future off-chain
  metadata (e.g. IPFS) if desired.
- Receipt image is local preview only — no OCR, no upload.

## Future Gemini integration

`CreatePassport.jsx` is structured so an AI/OCR step slots in cleanly:

```
Receipt image → Gemini OCR → form populated → user reviews → user confirms → mint
```

Today the receipt image is optional and used for local preview only. Adding
Gemini later means: upload/read the image in the Create page, call an OCR
endpoint, pre-fill `form` via `setForm`, and keep the existing REVIEW → CONFIRM
flow. No Gemini/OCR is implemented in the MVP, by design.

---

*Footer content in the app is intentionally limited to: **EQUIXOTE**.*