import { DashboardAuthProvider } from '@/lib/dashboard-auth';
import RequireOwner from '@/components/admin/RequireOwner';
import AdminShell from '@/components/admin/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthProvider>
      <RequireOwner>
        <AdminShell>{children}</AdminShell>
      </RequireOwner>
    </DashboardAuthProvider>
  );
}