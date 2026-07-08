'use client';

import { useEffect, useState } from 'react';
import { useDashboardAuth } from '@/lib/dashboard-auth';
import { getStaffForTenant, removeStaff, type StaffRow } from '@/lib/admin-queries';

export default function AdminStaffPage() {
  const { staff, session } = useDashboardAuth();
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadStaff() {
    if (!staff?.tenant_id) return;
    const rows = await getStaffForTenant(staff.tenant_id);
    setStaffList(rows);
  }

  useEffect(() => {
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.tenant_id]);

  async function handleCreate() {
    if (!staff?.tenant_id || !session) return;
    setCreating(true);
    setMessage(null);

    const res = await fetch('/api/admin/create-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestingUserId: session.user.id,
        tenantId: staff.tenant_id,
        name,
        email,
        password,
        role,
      }),
    });
    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setMessage(data.error ?? 'Could not create staff.');
      return;
    }

    setMessage('Staff added.');
    setName('');
    setEmail('');
    setPassword('');
    await loadStaff();
  }

  async function handleRemove(staffId: string) {
    if (!confirm('Remove this staff member?')) return;
    setMessage(null);
    const { error } = await removeStaff(staffId);
    if (error) {
      setMessage(`Could not remove: ${error}`);
      return;
    }
    await loadStaff();
  }

  return (
    <div className="flex flex-col gap-8 max-w-xl">
      <h1 className="font-display text-2xl text-ink">Staff Accounts</h1>

      <div className="border border-line rounded-chit bg-white">
        {staffList.length === 0 ? (
          <p className="p-4 text-sm text-muted">No staff yet.</p>
        ) : (
          staffList.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-4 border-b border-line last:border-0"
            >
              <div>
                <p className="text-ink">{s.name}</p>
                <p className="text-xs text-muted">{s.role}</p>
              </div>
              {!s.is_primary_owner ? (
                <button
                  type="button"
                  onClick={() => handleRemove(s.id)}
                  className="text-sm text-accent underline"
                >
                  Remove
                </button>
              ) : (
                <span className="text-xs text-muted">Primary Owner (protected)</span>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border border-line rounded-chit p-5 bg-white flex flex-col gap-3">
        <p className="font-medium text-ink">Add staff member</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="border border-line rounded-chit px-4 py-2.5 bg-white"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="border border-line rounded-chit px-4 py-2.5 bg-white"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Temporary password"
          className="border border-line rounded-chit px-4 py-2.5 bg-white"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border border-line rounded-chit px-4 py-2.5 bg-white"
        >
          <option value="staff">Staff (Counter Dashboard only)</option>
          <option value="owner">Owner (full Admin Panel access)</option>
        </select>
        {message && <p className="text-sm text-muted">{message}</p>}
        <button
          onClick={handleCreate}
          disabled={creating || !name || !email || !password}
          className="bg-ink text-paper rounded-chit py-3 font-medium disabled:opacity-50"
        >
          {creating ? 'Adding…' : 'Add staff'}
        </button>
      </div>
    </div>
  );
}