/**
 * PassportPreview — the printed-style preview shown on the REVIEW step of
 * CreatePassport, and on the Verify page when display data exists locally.
 *
 * It renders the RICIPT DEVICE PASSPORT card exactly like the demo spec:
 * a strong header, device line, and a key/value block of display fields.
 */
import { formatPrice } from '../utils/formatting.js';

export default function PassportPreview({ data, footerNote }) {
  if (!data) return null;

  const {
    deviceType,
    manufacturer,
    model,
    serialNumber,
    purchaseDate,
    retailer,
    receiptNumber,
    price,
    currency,
    warranty,
  } = data;

  const deviceName = manufacturer && model ? `${manufacturer} ${model}` : model || manufacturer || '';

  const rows = [
    { label: 'DEVICE TYPE', value: deviceType },
    { label: 'MANUFACTURER', value: manufacturer },
    { label: 'MODEL', value: model },
    ...(serialNumber ? [{ label: 'SERIAL NUMBER', value: serialNumber }] : []),
    { label: 'PURCHASE DATE', value: purchaseDate },
    { label: 'RETAILER', value: retailer },
    ...(receiptNumber ? [{ label: 'RECEIPT #', value: receiptNumber }] : []),
    { label: 'PRICE', value: formatPrice(price, currency) },
    { label: 'WARRANTY', value: warranty },
  ];

  return (
    <div className="passport-preview">
      <div className="passport-preview__stripe" />
      <div className="passport-preview__header">
        <span className="passport-preview__brand">RICIPT</span>
        <span className="passport-preview__sub">DEVICE PASSPORT</span>
      </div>

      <h3 className="passport-preview__device">{deviceName}</h3>

      <dl className="passport-preview__rows">
        {rows.map((row) => (
          <div key={row.label} className="passport-preview__row">
            <dt>{row.label}</dt>
            <dd>{row.value || ''}</dd>
          </div>
        ))}
      </dl>

      {footerNote && <p className="passport-preview__note">{footerNote}</p>}
    </div>
  );
}