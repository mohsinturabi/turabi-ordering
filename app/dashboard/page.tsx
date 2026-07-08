import RequireStaffAuth from '@/components/dashboard/RequireStaffAuth';
import DashboardView from '@/components/dashboard/DashboardView';

export default function DashboardPage() {
  return (
    <RequireStaffAuth>
      <DashboardView />
    </RequireStaffAuth>
  );
}
