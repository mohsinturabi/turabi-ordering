export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="font-display text-2xl text-ink">Turabi Labs — Ordering</h1>
        <p className="text-sm text-muted mt-2 max-w-sm">
          This app is reached per-restaurant via QR code, e.g.{' '}
          <code className="font-mono text-xs bg-accent-soft px-1.5 py-0.5 rounded">
            /order/your-restaurant?table=12
          </code>
        </p>
      </div>
    </main>
  );
}
