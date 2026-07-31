'use client';

import { useEffect, useState } from 'react';
import { useDashboardAuth } from '@/lib/dashboard-auth';
import {
  getRestaurantSettings,
  updateRestaurantSettings,
  uploadLogo,
  uploadBanner,
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
      gst_enabled: settings.gst_enabled,
      gst_percentage: settings.gst_percentage,
      gstin: settings.gstin,
      kitchen_dashboard_enabled: settings.kitchen_dashboard_enabled,
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

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    setSaving(true);
    const { url, error } = await uploadBanner(settings.id, file);
    if (url) {
      await updateRestaurantSettings(settings.id, { banner_url: url });
      setSettings({ ...settings, banner_url: url });
    }
    setSaving(false);
    setMessage(error ?? 'Banner updated.');
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
        <span className="text-sm font-medium text-ink">Menu Banner</span>
        <span className="text-xs text-muted">Yeh image customer ke menu page ke top par dikhegi.</span>
        {settings.banner_url && (
          <img src={settings.banner_url} alt="Banner" className="w-full h-32 object-cover rounded-chit border border-line" />
        )}
        <input type="file" accept="image/*" onChange={handleBannerChange} />
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

      <div className="border-2 border-line rounded-chit p-4 flex flex-col gap-4">
        <div>
          <h2 className="font-display text-lg text-ink">GST Settings</h2>
          <p className="text-sm text-muted">GST on ya off karo — jab bhi badlo, sirf naye orders pe apply hoga. Purane orders unchanged rahenge.</p>
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.gst_enabled}
            onChange={(e) => setSettings({ ...settings, gst_enabled: e.target.checked })}
          />
          <span className="text-sm font-medium text-ink">GST Enabled</span>
        </label>

        {settings.gst_enabled && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">GST Percentage</span>
              <select
                value={settings.gst_percentage}
                onChange={(e) => setSettings({ ...settings, gst_percentage: Number(e.target.value) })}
                className="border border-line rounded-chit px-4 py-3 bg-white"
              >
                {[0, 5, 12, 18, 28].map((pct) => (
                  <option key={pct} value={pct}>
                    {pct}%
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">GSTIN (optional — shown on invoice)</span>
              <input
                value={settings.gstin ?? ''}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                className="border border-line rounded-chit px-4 py-3 bg-white"
                placeholder="22AAAAA0000A1Z5"
              />
            </label>
          </>
        )}
      </div>

      <div className="border-2 border-line rounded-chit p-4 flex flex-col gap-2">
        <div>
          <h2 className="font-display text-lg text-ink">Kitchen Dashboard</h2>
          <p className="text-sm text-muted">
            Active: kitchen staff Preparing/Ready khud karte hain, counter sirf Accept + Complete karta hai.
            Inactive: counter khud poora flow (Accept se Complete tak) handle karta hai, kitchen role bypass ho jata hai.
          </p>
        </div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.kitchen_dashboard_enabled}
            onChange={(e) => setSettings({ ...settings, kitchen_dashboard_enabled: e.target.checked })}
          />
          <span className="text-sm font-medium text-ink">Kitchen Dashboard Active</span>
        </label>
      </div>

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
