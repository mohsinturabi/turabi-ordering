import { DashboardAuthProvider } from '@/lib/dashboard-auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthProvider>
      <div className="min-h-screen bg-paper">{children}</div>
    </DashboardAuthProvider>
  );
}
