/**
 * QRCodeDisplay — renders a QR code pointing at the PUBLIC verify page.
 *
 * Security rule (see utils/qr.js): the payload only ever contains the token
 * id + app origin. Sensitive fields are never encoded.
 */
import { QRCodeSVG } from 'qrcode.react';
import { buildVerifyUrl } from '../utils/qr.js';

export default function QRCodeDisplay({ tokenId, size = 168 }) {
  const url = buildVerifyUrl(tokenId);

  return (
    <div className="qr-display">
      <div className="qr-display__box">
        <QRCodeSVG
          value={url}
          size={size}
          bgColor="#0a0e0a"
          fgColor="#c8f54a"
          level="M"
          aria-label={`Verify passport ${tokenId} QR code`}
        />
      </div>
      <p className="qr-display__caption">
        Scan to verify on-chain record
      </p>
    </div>
  );
}