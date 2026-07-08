'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useDashboardAuth } from '@/lib/dashboard-auth';
import { getTenantById } from '@/lib/queries';
import { getTablesForQR, getCounterQR, type TableWithQR, type CounterQR } from '@/lib/admin-queries';

type Tab = 'tables' | 'counter';

export default function AdminQRPage() {
  const { staff } = useDashboardAuth();
  const [activeTab, setActiveTab] = useState<Tab>('tables');

  const [tables, setTables] = useState<TableWithQR[]>([]);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  const [counter, setCounter] = useState<CounterQR | null>(null);
  const [counterQrImage, setCounterQrImage] = useState<string>('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!staff?.tenant_id) return;
      const tenant = await getTenantById(staff.tenant_id);
      if (!tenant) return;

      // Tables QR — ab logo ke saath, Counter QR jaisa
const rows = await getTablesForQR(staff.tenant_id, tenant.subdomain);
setTables(rows);

const images: Record<string, string> = {};
for (const t of rows) {
  images[t.id] = await generateQRWithLogo(t.order_url, tenant.logo_url);
}
setQrImages(images);

      // Counter QR (new)
      const counterData = await getCounterQR(staff.tenant_id, tenant.subdomain);
      setCounter(counterData);

      if (counterData) {
        const dataUrl = await generateQRWithLogo(counterData.order_url, counterData.logo_url);
        setCounterQrImage(dataUrl);
      }

      setLoading(false);
    }
    load();
  }, [staff?.tenant_id]);

  // Generates a QR code and draws the restaurant logo in the center on a canvas.
  // High error-correction level ('H') is used so the QR stays scannable even
  // with the center covered by the logo.
  async function generateQRWithLogo(url: string, logoUrl: string | null): Promise<string> {
    const size = 320;
    const qrDataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: size,
      errorCorrectionLevel: 'H',
    });

    if (!logoUrl) return qrDataUrl;

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(qrDataUrl);

      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 0, 0, size, size);

        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.onload = () => {
          const logoBoxSize = size * 0.26;
          const x = (size - logoBoxSize) / 2;
          const y = (size - logoBoxSize) / 2;

          // White rounded background so the logo stands out cleanly.
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          const r = 12;
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + logoBoxSize, y, x + logoBoxSize, y + logoBoxSize, r);
          ctx.arcTo(x + logoBoxSize, y + logoBoxSize, x, y + logoBoxSize, r);
          ctx.arcTo(x, y + logoBoxSize, x, y, r);
          ctx.arcTo(x, y, x + logoBoxSize, y, r);
          ctx.closePath();
          ctx.fill();

          const padding = logoBoxSize * 0.12;
          ctx.drawImage(
            logoImg,
            x + padding,
            y + padding,
            logoBoxSize - padding * 2,
            logoBoxSize - padding * 2
          );

          resolve(canvas.toDataURL('image/png'));
        };
        logoImg.onerror = () => resolve(qrDataUrl); // logo fetch fail -> fall back to plain QR
        logoImg.src = logoUrl;
      };
      qrImg.src = qrDataUrl;
    });
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url);
    alert('Link copied.');
  }

  function downloadQR(filename: string, dataUrl: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  if (loading) return <p className="text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink">QR Codes & Links</h1>
      <p className="text-sm text-muted">
        Har table ka QR code aur link yahan se download/copy kar sakte ho, print karke table pe chipkane ke liye.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-line">
        <button
          onClick={() => setActiveTab('tables')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'tables' ? 'border-ink text-ink' : 'border-transparent text-muted'
          }`}
        >
          Tables
        </button>
        <button
          onClick={() => setActiveTab('counter')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'counter' ? 'border-ink text-ink' : 'border-transparent text-muted'
          }`}
        >
          Counter
        </button>
      </div>

      {/* Tables tab */}
      {activeTab === 'tables' && (
        <>
          {tables.length === 0 ? (
            <p className="text-muted">Koi table nahi hai — pehle "Tables" section se table add karo.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {tables.map((t) => (
                <div
                  key={t.id}
                  className="border border-line rounded-chit bg-white p-4 flex flex-col items-center gap-3"
                >
                  <p className="font-medium text-ink">Table {t.table_number}</p>
                  {qrImages[t.id] && (
                    <img src={qrImages[t.id]} alt={`QR for table ${t.table_number}`} className="w-40 h-40" />
                  )}
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => downloadQR(`table-${t.table_number}-qr.png`, qrImages[t.id])}
                      className="flex-1 bg-ink text-paper rounded-chit py-2 text-sm"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => copyLink(t.order_url)}
                      className="flex-1 border border-line rounded-chit py-2 text-sm text-ink"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Counter tab */}
      {activeTab === 'counter' && (
        <>
          {!counter ? (
            <p className="text-muted">
              Counter QR abhi generate nahi hua — restaurant setup mein counter token missing hai.
            </p>
          ) : (
            <div className="max-w-xs">
              <div className="border border-line rounded-chit bg-white p-4 flex flex-col items-center gap-3">
                <p className="font-medium text-ink">Counter Pickup</p>
                {counterQrImage && (
                  <img src={counterQrImage} alt="Counter pickup QR" className="w-52 h-52" />
                )}
                <p className="text-xs text-muted text-center">
                  Ye ek hi QR hai — sab customers isi se order kar sakte hain, har order alag track hota hai.
                </p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => downloadQR('counter-pickup-qr.png', counterQrImage)}
                    className="flex-1 bg-ink text-paper rounded-chit py-2 text-sm"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => copyLink(counter.order_url)}
                    className="flex-1 border border-line rounded-chit py-2 text-sm text-ink"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}