'use client';
// src/components/leads/NewLeadModal.tsx

import { useState } from 'react';
import { Modal, Spinner } from '@/components/ui';
import { leadsAPI, authAPI } from '@/lib/api';
import { CATEGORIES, SUPPLEMENTS, SOURCES, SOURCE_CONFIG } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';
import type { LeadSource } from '@/types';

interface Props { open: boolean; onClose: () => void; onCreated: () => void; }

const INITIAL: Record<string, any> = {
  name:'', phone:'', alt_phone:'', email:'', city:'', state:'',
  source:'call', category:'Kidney Stone Treatment', supplement:'',
  product_name:'', notes:'', assigned_to:'',
};

export default function NewLeadModal({ open, onClose, onCreated }: Props) {
  const { isAdmin } = useAuthStore();
  const [form, setForm]     = useState(INITIAL);
  const [users, setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [dupWarn, setDupWarn] = useState('');

  // Load users on open
  useState(() => {
    if (open && isAdmin()) {
      authAPI.getUsers({ role:'sales', is_active:'true' }).then((d: any) => setUsers(d?.users || [])).catch(() => {});
    }
  });

  const set = (k: string, v: any) => { setForm((f) => ({ ...f, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())  e.name  = 'Name is required.';
    if (!form.phone.trim()) e.phone = 'Phone is required.';
    else if (form.phone.replace(/\D/g,'').length < 10) e.phone = 'Enter a valid 10-digit phone number.';
    if (!form.source)   e.source   = 'Source is required.';
    if (!form.category) e.category = 'Category is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true); setDupWarn('');
    try {
      const payload: Record<string, any> = { ...form };
      if (!payload.alt_phone)   delete payload.alt_phone;
      if (!payload.email)       delete payload.email;
      if (!payload.city)        delete payload.city;
      if (!payload.state)       delete payload.state;
      if (!payload.supplement)  delete payload.supplement;
      if (!payload.product_name)delete payload.product_name;
      if (!payload.notes)       delete payload.notes;
      if (!payload.assigned_to) delete payload.assigned_to;
      else payload.assigned_to = Number(payload.assigned_to);

      const res: any = await leadsAPI.create(payload);

      if (res?.isDuplicate) {
        setDupWarn(`⚠ Duplicate: A lead with this phone already exists (${res.duplicateOf?.name}). Lead created anyway and flagged.`);
      }

      toast.success(`Lead created & assigned to ${res?.lead?.assigned_name || 'team'} via round-robin`);
      setForm(INITIAL);
      onCreated();
      if (!res?.isDuplicate) onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open} onClose={onClose} title="Add New Lead" size="lg"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-amber" onClick={handleSubmit} disabled={loading}>
            {loading ? <><Spinner size={14} /> Creating…</> : 'Create Lead'}
          </button>
        </>
      }
    >
      {dupWarn && <div className="alert alert-amber mb-4 text-xs">{dupWarn}</div>}
      <div className="overflow-y-auto max-h-[65vh] pr-1">
        <div className="grid grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label className="form-label">Full Name <span className="text-red-500">*</span></label>
            <input className={`form-input ${errors.name ? 'error' : ''}`} value={form.name}
              onChange={(e) => set('name', e.target.value)} placeholder="Patient full name" />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="form-label">Phone <span className="text-red-500">*</span></label>
            <input className={`form-input ${errors.phone ? 'error' : ''}`} value={form.phone}
              onChange={(e) => set('phone', e.target.value)} placeholder="10-digit mobile" type="tel" />
            {errors.phone && <p className="form-error">{errors.phone}</p>}
          </div>

          {/* Alt phone */}
          <div>
            <label className="form-label">Alternate Phone</label>
            <input className="form-input" value={form.alt_phone} onChange={(e) => set('alt_phone', e.target.value)} placeholder="Optional" />
          </div>

          {/* Email */}
          <div>
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Optional" />
          </div>

          {/* City */}
          <div>
            <label className="form-label">City</label>
            <input className="form-input" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Bhopal" />
          </div>

          {/* State */}
          <div>
            <label className="form-label">State</label>
            <input className="form-input" value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="e.g. Madhya Pradesh" />
          </div>

          {/* Source */}
          <div>
            <label className="form-label">Source <span className="text-red-500">*</span></label>
            <select className={`form-select ${errors.source ? 'error' : ''}`} value={form.source}
              onChange={(e) => set('source', e.target.value)}>
              {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_CONFIG[s as LeadSource]?.label || s}</option>)}
            </select>
            {errors.source && <p className="form-error">{errors.source}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="form-label">Category <span className="text-red-500">*</span></label>
            <select className={`form-select ${errors.category ? 'error' : ''}`} value={form.category}
              onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="form-error">{errors.category}</p>}
          </div>

          {/* Supplement */}
          <div>
            <label className="form-label">Supplement</label>
            <select className="form-select" value={form.supplement} onChange={(e) => set('supplement', e.target.value)}>
              <option value="">None</option>
              {SUPPLEMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Product name */}
          <div>
            <label className="form-label">Product Name</label>
            <input className="form-input" value={form.product_name} onChange={(e) => set('product_name', e.target.value)} placeholder="e.g. Kidney Care 3-Month Pack" />
          </div>

          {/* Assign to — admin only */}
          {isAdmin() && (
            <div>
              <label className="form-label">Assign To</label>
              <select className="form-select" value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}>
                <option value="">Auto (Round-Robin)</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="col-span-2">
            <label className="form-label">Initial Notes</label>
            <textarea className="form-textarea" value={form.notes} onChange={(e) => set('notes', e.target.value)}
              placeholder="Any initial details about this patient…" rows={2} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
