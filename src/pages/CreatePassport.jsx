/**
 * CreatePassport — multi-step device passport creation.
 *
 *   STEP 1  FORM     device + purchase details
 *   STEP 2  REVIEW   clean passport preview  -> [EDIT] [CONFIRM & MINT]
 *   STEP 3  RESULT   transaction outcome + token id
 *
 * Design decisions:
 *   - We NEVER mint on form submit. The user always reviews first.
 *   - Only a deterministic keccak256 of canonical data is sent to the chain
 *     (utils/hashing.js). Sensitive fields (IMEI, serial, receipt number) are
 *     shown only in this browser session and are NOT stored on-chain.
 *   - The receipt image is optional, local preview only, never uploaded.
 *   - The date field is a hybrid text/date input that works in wallet
 *     webviews where native date controls misbehave.
 *   - A draft is kept in localStorage so a wallet rejection doesn't lose
 *     the user's half-completed form (UI convenience, not secure storage).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import NetworkGate from '../components/NetworkGate.jsx';
import PassportPreview from '../components/PassportPreview.jsx';
import TransactionStatus from '../components/TransactionStatus.jsx';
import { useWallet } from '../hooks/useWallet.js';
import { usePassport } from '../hooks/usePassport.js';
import { hashPassportData } from '../utils/hashing.js';
import { validatePassportForm } from '../utils/validation.js';
import { saveDraft, getDraft, clearDraft } from '../utils/storage.js';
import Select from '../components/Select.jsx';

const DEVICE_TYPES = [
  'Smartphone',
  'Tablet',
  'Laptop',
  'Desktop',
  'Headphones',
  'Camera',
  'Wearable',
  'Gaming Console',
  'TV / Display',
  'Other',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'GHS', 'INR', 'CNY', 'JPY', 'AED', 'Other'];

const WARRANTIES = ['No Warranty', '6 Months', '1 Year', '2 Years', '3 Years', 'Other'];

const EMPTY_FORM = {
  deviceType: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  imei: '',
  purchaseDate: '',
  retailer: '',
  receiptNumber: '',
  price: '',
  currency: 'USD',
  warranty: '1 Year',
};

export default function CreatePassport() {
  const { address } = useWallet();
  const { mint, tx, reset, isBusy } = usePassport();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(getDraft() || {}) }));
  const [errors, setErrors] = useState({});
  const [useNativeDate, setUseNativeDate] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null); // { name, url }
  const [dataHash, setDataHash] = useState(null);
  const fileInputRef = useRef(null);

  // Persist the form draft as the user types (UI convenience only).
  useEffect(() => {
    if (step === 1) saveDraft(form);
  }, [form, step]);

  const handleChange = (key) => (eventOrValue) => {
    const value = typeof eventOrValue === 'string' ? eventOrValue : eventOrValue.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleReceiptFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (receiptImage) URL.revokeObjectURL(receiptImage.url);
    setReceiptImage({ name: file.name, url: URL.createObjectURL(file) });
  };

  const removeReceiptImage = () => {
    if (receiptImage) URL.revokeObjectURL(receiptImage.url);
    setReceiptImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // STEP 1 -> STEP 2 : validate, then commit to a hash.
  const goToReview = () => {
    const result = validatePassportForm(form);
    setErrors(result);
    if (Object.keys(result).length > 0) return;

    const hash = hashPassportData({ ...form, issuer: address || '' });
    setDataHash(hash);
    setStep(2);
  };

  // STEP 2 -> STEP 3 : user explicitly confirms, then we mint.
  const confirmMint = async () => {
    const result = await mint({
      dataHash,
      metadataURI: '',
      displayData: {
        deviceType: form.deviceType,
        manufacturer: form.manufacturer,
        model: form.model,
        purchaseDate: form.purchaseDate,
        retailer: form.retailer,
        price: form.price,
        currency: form.currency,
        warranty: form.warranty,
      },
    });
    if (result != null) {
      clearDraft();
      setStep(3);
    }
  };

  const mintedTokenId = useMemo(() => (step === 3 ? tx.result : null), [step, tx.result]);

  return (
    <div className="page">
      <NetworkGate>
        <div className="create">
          <div className="create__head">
            <h1 className="page-title">CREATE DEVICE PASSPORT</h1>
            <div className="steps-tracker" aria-label="Progress">
              <span className={`steps-tracker__item${step >= 1 ? ' steps-tracker__item--active' : ''}`}>1 FORM</span>
              <span className={`steps-tracker__item${step >= 2 ? ' steps-tracker__item--active' : ''}`}>2 REVIEW</span>
              <span className={`steps-tracker__item${step >= 3 ? ' steps-tracker__item--active' : ''}`}>3 MINT</span>
            </div>
          </div>

          {step === 1 && (
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                goToReview();
              }}
              noValidate
            >
              <fieldset className="form-section">
                <legend className="form-section__title">DEVICE INFORMATION</legend>

                <div className="form-row">
                  <label className="field">
                    <span className="field__label">DEVICE TYPE *</span>
                    <Select
                      className="field__input"
                      aria-label="Device type"
                      placeholder="Select type..."
                      value={form.deviceType}
                      options={DEVICE_TYPES.map((type) => ({ value: type, label: type }))}
                      onChange={handleChange('deviceType')}
                    />
                    {errors.deviceType && <span className="field__error">{errors.deviceType}</span>}
                  </label>

                  <label className="field">
                    <span className="field__label">MANUFACTURER *</span>
                    <input
                      className="field__input"
                      type="text"
                      value={form.manufacturer}
                      onChange={handleChange('manufacturer')}
                      placeholder="Samsung"
                      maxLength={80}
                    />
                    {errors.manufacturer && <span className="field__error">{errors.manufacturer}</span>}
                  </label>
                </div>

                <div className="form-row">
                  <label className="field">
                    <span className="field__label">MODEL *</span>
                    <input
                      className="field__input"
                      type="text"
                      value={form.model}
                      onChange={handleChange('model')}
                      placeholder="Galaxy S24"
                      maxLength={80}
                    />
                    {errors.model && <span className="field__error">{errors.model}</span>}
                  </label>

                  <label className="field">
                    <span className="field__label">SERIAL NUMBER *</span>
                    <input
                      className="field__input"
                      type="text"
                      value={form.serialNumber}
                      onChange={handleChange('serialNumber')}
                      placeholder="Serial number"
                      maxLength={64}
                    />
                    {errors.serialNumber && <span className="field__error">{errors.serialNumber}</span>}
                  </label>
                </div>

                <div className="form-row">
                  <label className="field">
                    <span className="field__label">IMEI (OPTIONAL)</span>
                    <input
                      className="field__input"
                      type="text"
                      value={form.imei}
                      onChange={handleChange('imei')}
                      placeholder="15 digits"
                      maxLength={24}
                      inputMode="numeric"
                    />
                    {errors.imei && <span className="field__error">{errors.imei}</span>}
                  </label>
                </div>
              </fieldset>

              <fieldset className="form-section">
                <legend className="form-section__title">PURCHASE INFORMATION</legend>

                <div className="form-row">
                  <div className="field">
                    <span className="field__label">PURCHASE DATE *</span>
                    <div className="date-hybrid">
                      {useNativeDate ? (
                        <input
                          className="field__input"
                          type="date"
                          value={form.purchaseDate}
                          onChange={handleChange('purchaseDate')}
                        />
                      ) : (
                        <input
                          className="field__input mono"
                          type="text"
                          value={form.purchaseDate}
                          onChange={handleChange('purchaseDate')}
                          placeholder="YYYY-MM-DD"
                          maxLength={10}
                          inputMode="numeric"
                          autoComplete="off"
                        />
                      )}
                      <button
                        type="button"
                        className="btn btn--tiny"
                        onClick={() => setUseNativeDate((v) => !v)}
                        aria-label="Toggle native date picker"
                      >
                        {useNativeDate ? 'TEXT' : 'PICKER'}
                      </button>
                    </div>
                    {errors.purchaseDate && <span className="field__error">{errors.purchaseDate}</span>}
                    <span className="field__hint">Use YYYY-MM-DD, e.g. 2026-08-15</span>
                  </div>

                  <label className="field">
                    <span className="field__label">RETAILER / STORE *</span>
                    <input
                      className="field__input"
                      type="text"
                      value={form.retailer}
                      onChange={handleChange('retailer')}
                      placeholder="Example Store"
                      maxLength={120}
                    />
                    {errors.retailer && <span className="field__error">{errors.retailer}</span>}
                  </label>
                </div>

                <div className="form-row">
                  <label className="field">
                    <span className="field__label">RECEIPT NUMBER (OPTIONAL)</span>
                    <input
                      className="field__input"
                      type="text"
                      value={form.receiptNumber}
                      onChange={handleChange('receiptNumber')}
                      placeholder="Receipt number"
                      maxLength={64}
                    />
                    {errors.receiptNumber && <span className="field__error">{errors.receiptNumber}</span>}
                  </label>
                </div>

                <div className="form-row">
                  <label className="field">
                    <span className="field__label">PRICE *</span>
                    <input
                      className="field__input"
                      type="text"
                      value={form.price}
                      onChange={handleChange('price')}
                      placeholder="1499.99"
                      inputMode="decimal"
                    />
                    {errors.price && <span className="field__error">{errors.price}</span>}
                  </label>

                  <label className="field">
                    <span className="field__label">CURRENCY *</span>
                    <Select
                      className="field__input"
                      aria-label="Currency"
                      placeholder="Select currency"
                      value={form.currency}
                      options={CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
                      onChange={handleChange('currency')}
                    />
                    {errors.currency && <span className="field__error">{errors.currency}</span>}
                  </label>

                  <label className="field">
                    <span className="field__label">WARRANTY *</span>
                    <Select
                      className="field__input"
                      aria-label="Warranty"
                      placeholder="Select warranty"
                      value={form.warranty}
                      options={WARRANTIES.map((warranty) => ({ value: warranty, label: warranty }))}
                      onChange={handleChange('warranty')}
                    />
                    {errors.warranty && <span className="field__error">{errors.warranty}</span>}
                  </label>
                </div>
              </fieldset>

              <fieldset className="form-section">
                <legend className="form-section__title">RECEIPT IMAGE (OPTIONAL)</legend>
                <div className="receipt-upload">
                  {receiptImage ? (
                    <div className="receipt-upload__preview">
                      <img src={receiptImage.url} alt="Receipt preview" />
                      <div className="receipt-upload__meta">
                        <span className="mono">{receiptImage.name}</span>
                        <button type="button" className="btn btn--tiny btn--danger" onClick={removeReceiptImage}>
                          REMOVE
                        </button>
                      </div>
                      <p className="field__hint">Local preview only. Never uploaded or stored on-chain.</p>
                    </div>
                  ) : (
                    <button type="button" className="btn btn--ghost" onClick={() => fileInputRef.current?.click()}>
                      UPLOAD RECEIPT
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleReceiptFile} hidden />
                </div>
              </fieldset>

              <div className="create__actions">
                <button type="submit" className="btn btn--primary btn--lg">
                  REVIEW PASSPORT
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="review">
              <h2 className="review__title">REVIEW YOUR PASSPORT</h2>
              <p className="review__sub">
                Only a deterministic hash of this data goes on-chain. IMEI, serial number and
                receipt number are shown here but are NOT written to the blockchain.
              </p>

              <PassportPreview data={{ ...form, receiptImageName: receiptImage?.name }} />

              <TransactionStatus tx={tx} />

              <div className="review__actions">
                <button type="button" className="btn btn--ghost btn--lg" onClick={() => setStep(1)} disabled={isBusy}>
                  EDIT
                </button>
                <button type="button" className="btn btn--primary btn--lg" onClick={confirmMint} disabled={isBusy}>
                  {isBusy ? 'MINTING…' : 'CONFIRM & MINT'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="result">
              <h2 className="result__title">
                {tx.state === 'CONFIRMED' ? 'PASSPORT CREATED' : 'MINT IN PROGRESS'}
              </h2>

              <TransactionStatus tx={tx} />

              {tx.state === 'FAILED' && (
                <div className="result__actions">
                  <button type="button" className="btn btn--ghost" onClick={() => { reset(); setStep(2); }}>
                    BACK TO REVIEW
                  </button>
                  <Link to="/create" className="btn btn--primary">
                    START OVER
                  </Link>
                </div>
              )}

              {mintedTokenId != null && (
                <div className="result__success">
                  <p>
                     Your Device Passport <strong>#{mintedTokenId}</strong> is live on BOT Chain.
                  </p>
                  <div className="result__actions">
                    <Link to={`/passport/${mintedTokenId}`} className="btn btn--primary btn--lg">
                      VIEW PASSPORT
                    </Link>
                    <Link to="/passes" className="btn btn--ghost btn--lg">
                      MY PASSPORTS
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </NetworkGate>
    </div>
  );
}