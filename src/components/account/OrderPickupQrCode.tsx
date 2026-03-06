'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';

export function OrderPickupQrCode({ token }: { token: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(token, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
      color: {
        dark: '#18284a',
        light: '#ffffff',
      },
    })
      .then((nextDataUrl) => {
        if (!cancelled) {
          setDataUrl(nextDataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not generate the pickup QR code.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return <p className="text-xs text-red-600">{error}</p>;
  }

  if (!dataUrl) {
    return <p className="text-xs text-slate-500">Generating pickup QR...</p>;
  }

  return (
    <Image
      src={dataUrl}
      alt="Feria pickup QR code"
      width={176}
      height={176}
      className="h-44 w-44 rounded-2xl border border-slate-200 bg-white p-2"
    />
  );
}
