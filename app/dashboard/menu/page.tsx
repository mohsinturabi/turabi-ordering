import RequireStaffAuth from '@/components/dashboard/RequireStaffAuth';
import MenuEditor from '@/components/dashboard/MenuEditor';

export default function DashboardMenuPage() {
  return (
    <RequireStaffAuth>
      <MenuEditor />
    </RequireStaffAuth>
  );
}