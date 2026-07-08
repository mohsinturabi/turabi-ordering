import OrderTracker from '@/components/OrderTracker';

export default async function OrderTrackPage({
  params,
}: {
  params: Promise<{ orderCode: string }>;
}) {
  const { orderCode } = await params;
  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col">
      <OrderTracker orderCode={orderCode} />
    </div>
  );
}