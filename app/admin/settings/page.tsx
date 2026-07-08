'use client';

import { useEffect, useState } from 'react';
import { useDashboardAuth } from '@/lib/dashboard-auth';
import {
  getRestaurantSettings,
  updateRestaurantSettings,
  uploadLogo,
  type RestaurantSettings,
} from '@/lib/admin-queries';

export default function SettingsPage() {
  const { staff } = useDashboardAuth();
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!staff?.tenant_id) return;
    getRestaurantSettings(staff.tenant_id).then(setSettings);
  }, [staff?.tenant_id]);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    const { error } = await updateRestaurantSettings(settings.id, {
      name: settings.name,
      about_text: settings.about_text,
      contact_phone: settings.contact_phone,
      contact_email: settings.contact_email,
    });
    setSaving(false);
    setMessage(error ?? 'Saved successfully.');
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    setSaving(true);
    const { url, error } = await uploadLogo(settings.id, file);
    if (url) {
      await updateRestaurantSettings(settings.id, { logo_url: url });
      setSettings({ ...settings, logo_url: url });
    }
    setSaving(false);
    setMessage(error ?? 'Logo updated.');
  }

  if (!settings) return <p className="text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <h1 className="font-display text-2xl text-ink">Restaurant Settings</h1>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Restaurant name</span>
        <input
          value={settings.name}
          onChange={(e) => setSettings({ ...settings, name: e.target.value })}
          className="border border-line rounded-chit px-4 py-3 bg-white"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Subdomain</span>
        <input
          value={settings.subdomain}
          disabled
          className="border border-line rounded-chit px-4 py-3 bg-gray-100 text-muted"
        />
        <span className="text-xs text-muted">Subdomain can't be changed here — contact support.</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Logo</span>
        {settings.logo_url && (
          <img src={settings.logo_url} alt="Logo" className="w-20 h-20 object-cover rounded-chit border border-line" />
        )}
        <input type="file" accept="image/*" onChange={handleLogoChange} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">About</span>
        <textarea
          value={settings.about_text ?? ''}
          onChange={(e) => setSettings({ ...settings, about_text: e.target.value })}
          rows={4}
          className="border border-line rounded-chit px-4 py-3 bg-white"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Contact phone</span>
        <input
          value={settings.contact_phone ?? ''}
          onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
          className="border border-line rounded-chit px-4 py-3 bg-white"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Contact email</span>
        <input
          value={settings.contact_email ?? ''}
          onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
          className="border border-line rounded-chit px-4 py-3 bg-white"
        />
      </label>

      {message && <p className="text-sm text-muted">{message}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-ink text-paper rounded-chit py-3 font-medium disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}