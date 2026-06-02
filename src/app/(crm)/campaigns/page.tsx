'use client';
// src/app/(crm)/campaigns/page.tsx

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Modal, Spinner, Empty, Skeleton, StatCard } from '@/components/ui';
import { fmtINR, fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Campaign {
  id: number;
  name: string;
  platform: string;
  status: 'active' | 'paused' | 'ended';
  budget: number;
  start_date?: string;
  end_date?: string;
  external_id?: string;
  notes?: string;
  total_leads: number;
  converted: number;
  delivered: number;
  revenue: number;
  conversion_rate: number;
  created_at: string;
}

const PLATFORMS = ['meta', 'google', 'email', 'sms', 'whatsapp', 'other'];

const INITIAL_FORM = {
  name: '', platform: 'meta', status: 'active',
  budget: '', start_date: '', end_date: '', external_id: '', notes: '',
};

const PLATFORM_COLORS: Record<string, string> = {
  meta:      'bg-blue-50 text-blue-700',
  google:    'bg-red-50 text-red-700',
  email:     'bg-purple-50 text-purple-700',
  sms:       'bg-green-50 text-green-700',
  whatsapp:  'bg-emerald-50 text-emerald-700',
  other:     'bg-gray-100 text-gray-600',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  paused: 'bg-amber-50 text-amber-700',
  ended:  'bg-gray-100 text-gray-500',
};

export default function CampaignsPage() {
  const router = useRouter();
  const { isAdmin } = useAuthStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [editing, setEditing]     = useState<Campaign | null>(null);
  const [form, setForm]           = useState({ ...INITIAL_FORM });
  const [saving, setSaving]       = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<Campaign | null>(null);
  const [deleteSaving, setDeleteSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/campaigns');
      setCampaigns(res?.campaigns || []);
    } catch { toast.error('Failed to load campaigns'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...INITIAL_FORM });
    setErrors({});
    setModal(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      name:        c.name,
      platform:    c.platform,
      status:      c.status,
      budget:      String(c.budget || ''),
      start_date:  c.start_date?.split('T')[0] || '',
      end_date:    c.end_date?.split('T')[0]   || '',
      external_id: c.external_id || '',
      notes:       c.notes || '',
    });
    setErrors({});
    setModal(true);
  };

  const setF = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
  };

  const save = async () => {
    if (!form.name.trim()) { setErrors({ name: 'Campaign name required.' }); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        budget:     form.budget     ? Number(form.budget)  : 0,
        start_date: form.start_date || undefined,
        end_date:   form.end_date   || undefined,
        external_id: form.external_id || undefined,
        notes:       form.notes       || undefined,
      };
      if (editing) {
        await api.patch(`/campaigns/${editing.id}`, payload);
        toast.success('Campaign updated');
      } else {
        await api.post('/campaigns', payload);
        toast.success('Campaign created');
      }
      setModal(false);
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const deleteCampaign = async () => {
    if (!deleteConfirm) return;
    setDeleteSaving(true);
    try {
      await api.delete(`/campaigns/${deleteConfirm.id}`);
      toast.success('Campaign deleted');
      setDeleteConfirm(null);
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setDeleteSaving(false); }
  };

  // Summary stats
  const totalLeads    = campaigns.reduce((s, c) => s + Number(c.total_leads  || 0), 0);
  const totalRevenue  = campaigns.reduce((s, c) => s + Number(c.revenue      || 0), 0);
  const totalConverted= campaigns.reduce((s, c) => s + Number(c.converted    || 0), 0);
  const activeCamps   = campaigns.filter(c => c.status === 'active').length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-DEFAULT">Campaigns</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {campaigns.length} campaigns · {activeCamps} active
          </p>
        </div>
        {isAdmin() && (
          <button className="btn btn-amber text-xs" onClick={openCreate}>
            + New Campaign
          </button>
        )}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Campaigns" value={campaigns.length} icon="📢" color="green" />
        <StatCard label="Active"           value={activeCamps}      icon="🟢" color="amber" />
        <StatCard label="Total Leads"      value={totalLeads}        icon="👥" color="blue" />
        <StatCard label="Total Revenue"    value={fmtINR(totalRevenue)} icon="💰" color="green" />
      </div>

      {/* Campaigns table */}
      <div className="card">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <Empty
            icon="📢"
            title="No campaigns yet"
            description="Create your first campaign to start tracking leads from Meta Ads, Google, etc."
            action={
              isAdmin()
                ? <button className="btn btn-amber text-xs" onClick={openCreate}>+ Create Campaign</button>
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Platform</th>
                  <th>Status</th>
                  <th>Budget</th>
                  <th>Leads</th>
                  <th>Converted</th>
                  <th>Revenue</th>
                  <th>Conv. Rate</th>
                  <th>Start Date</th>
                  {isAdmin() && <th></th>}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} onClick={() => router.push(`/campaigns/${c.id}`)} className="cursor-pointer">
                    <td>
                      <div className="font-semibold text-sm text-gray-900">{c.name}</div>
                      {c.external_id && (
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          ID: {c.external_id}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge text-[10.5px] font-semibold capitalize ${PLATFORM_COLORS[c.platform] || 'bg-gray-100 text-gray-600'}`}>
                        {c.platform}
                      </span>
                    </td>
                    <td>
                      <span className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="text-sm text-gray-700">
                      {Number(c.budget) > 0 ? fmtINR(c.budget) : '—'}
                    </td>
                    <td>
                      <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                        {c.total_leads || 0}
                      </span>
                    </td>
                    <td className="text-sm font-medium text-gray-700">{c.converted || 0}</td>
                    <td className="text-sm font-bold text-forest-DEFAULT">
                      {Number(c.revenue) > 0 ? fmtINR(c.revenue) : '—'}
                    </td>
                    <td>
                      <span className={`text-xs font-semibold ${
                        Number(c.conversion_rate) >= 40 ? 'text-green-700' :
                        Number(c.conversion_rate) >= 20 ? 'text-amber-700' :
                        Number(c.conversion_rate) >  0  ? 'text-red-600'   : 'text-gray-400'
                      }`}>
                        {c.conversion_rate || 0}%
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">{fmtDate(c.start_date)}</td>
                    {isAdmin() && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-ghost btn-xs text-red-500"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c); }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? `Edit — ${editing.name}` : 'Create Campaign'}
        size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-amber" onClick={save} disabled={saving}>
              {saving
                ? <><Spinner size={14} /> Saving…</>
                : editing ? 'Save Changes' : 'Create Campaign'
              }
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          {/* Name */}
          <div className="col-span-2">
            <label className="form-label">Campaign Name <span className="text-red-500">*</span></label>
            <input
              className={`form-input ${errors.name ? 'error' : ''}`}
              value={form.name}
              onChange={(e) => setF('name', e.target.value)}
              placeholder="e.g. Kidney Stone - Meta Ads - July 2025"
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          {/* Platform */}
          <div>
            <label className="form-label">Platform</label>
            <select className="form-select" value={form.platform} onChange={(e) => setF('platform', e.target.value)}>
              {PLATFORMS.map(p => (
                <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={(e) => setF('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </select>
          </div>

          {/* Budget */}
          <div>
            <label className="form-label">Budget (₹)</label>
            <input
              type="number"
              className="form-input"
              value={form.budget}
              onChange={(e) => setF('budget', e.target.value)}
              placeholder="e.g. 50000"
            />
          </div>

          {/* External ID */}
          <div>
            <label className="form-label">Meta / Google Campaign ID</label>
            <input
              className="form-input font-mono text-xs"
              value={form.external_id}
              onChange={(e) => setF('external_id', e.target.value)}
              placeholder="From Meta Ads Manager"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">
              Make.com mein yeh ID use hogi automatically link karne ke liye
            </p>
          </div>

          {/* Start date */}
          <div>
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-input"
              value={form.start_date}
              onChange={(e) => setF('start_date', e.target.value)}
            />
          </div>

          {/* End date */}
          <div>
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="form-input"
              value={form.end_date}
              onChange={(e) => setF('end_date', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              value={form.notes}
              onChange={(e) => setF('notes', e.target.value)}
              placeholder="Target audience, objective, ad copy details…"
              rows={2}
            />
          </div>
        </div>

        {/* Make.com instruction box */}
        {!editing && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-800 mb-1">
              📌 Make.com ke liye — Campaign banane ke baad
            </p>
            <p className="text-xs text-amber-700">
              Is campaign ka <strong>ID</strong> note karo (table mein dikhega).
              Make.com HTTP module mein <code className="bg-amber-100 px-1 rounded">campaign_id</code> field mein woh number daalo.
              Phir har naye lead pe automatically yeh campaign link hogi.
            </p>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-display text-lg font-semibold text-red-700">Delete Campaign</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700 mb-2">
                <strong>{deleteConfirm.name}</strong> delete karna chahte ho?
              </p>
              <p className="text-xs text-gray-500">
                Is campaign ke saare leads unlink ho jaayenge. Yeh action undo nahi hogi.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)} disabled={deleteSaving}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={deleteCampaign} disabled={deleteSaving}>
                {deleteSaving ? <Spinner size={14} /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
