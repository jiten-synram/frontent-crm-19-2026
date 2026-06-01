'use client';
// src/app/(crm)/team/page.tsx

import { useEffect, useState, useCallback } from 'react';
import { authAPI, teamAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Avatar, Modal, Spinner, Toggle, Empty, Skeleton, InfoRow, ConfirmDialog } from '@/components/ui';
import { fmtDate, CATEGORIES, avatarColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { User } from '@/types';
import { useRouter } from 'next/navigation';

type Tab = 'users' | 'round-robin';

interface RRStatus {
  id: number; category: string; current_index: number;
  last_user_name?: string; total_members: number; active_members: number;
}

interface UserFormState {
  name: string; email: string; phone: string; password: string;
  role: string; incentive_rate: string; designation: string; categories: string[];
}

const INITIAL_FORM: UserFormState = {
  name:'', email:'', phone:'', password:'', role:'sales', incentive_rate:'0', designation:'', categories:[],
};

export default function TeamPage() {
  const router = useRouter();
  const { isAdmin } = useAuthStore();
  const [tab, setTab]       = useState<Tab>('users');
  const [users, setUsers]   = useState<User[]>([]);
  const [rr, setRR]         = useState<RRStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // User form modal
  const [userModal, setUserModal] = useState<{ open: boolean; editing: User | null }>({ open: false, editing: null });
  const [form, setForm]           = useState<UserFormState>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving]         = useState(false);

  // Deactivate confirm
  const [deactivateUser, setDeactivateUser] = useState<User | null>(null);
  const [deactivateSaving, setDeactivateSaving] = useState(false);

  // RR pool modal
  const [poolModal, setPoolModal]   = useState<{ open: boolean; category: string } | null>(null);
  const [poolUsers, setPoolUsers]   = useState<User[]>([]);
  const [poolMemberIds, setPoolMemberIds] = useState<Set<number>>(new Set());
  const [resetSaving, setResetSaving] = useState<string>('');

  useEffect(() => {
    if (!isAdmin()) { router.push('/dashboard'); return; }
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [usersRes, rrRes]: any[] = await Promise.all([
        authAPI.getUsers(),
        teamAPI.roundRobinStatus(),
      ]);
      setUsers(usersRes?.users || []);
      setRR(rrRes?.status || []);
    } catch { toast.error('Failed to load team data'); }
    finally { setLoading(false); }
  };

  const setF = (k: keyof UserFormState, v: any) => {
    setForm(f => ({ ...f, [k]: v }));
    if (formErrors[k]) setFormErrors(e => ({ ...e, [k]: '' }));
  };

  const toggleCategory = (cat: string) => {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const openCreate = () => { setForm(INITIAL_FORM); setFormErrors({}); setUserModal({ open: true, editing: null }); };
  const openEdit   = async (u: User) => {
    setForm({
      name: u.name, email: u.email, phone: u.phone, password: '',
      role: u.role, incentive_rate: String(u.incentive_rate || 0),
      designation: u.designation || '', categories: [],
    });
    setFormErrors({});
    setUserModal({ open: true, editing: u });

    // ✅ Categories fetch karo
    if (u.role === 'sales') {
      try {
        const res: any = await teamAPI.getUserCategories(u.id);
        setForm(f => ({ ...f, categories: res?.categories || [] }));
      } catch {
        // silent fail
      }
    }
    
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())  e.name  = 'Name required';
    if (!form.email.trim()) e.email = 'Email required';
    if (!form.phone.trim()) e.phone = 'Phone required';
    if (!userModal.editing && !form.password.trim()) e.password = 'Password required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveUser = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: form.name, email: form.email, phone: form.phone,
        role: form.role, incentive_rate: Number(form.incentive_rate) || 0,
        designation: form.designation || undefined,
        categories: form.categories.length ? form.categories : undefined,
      };
      if (!userModal.editing) payload.password = form.password;

      if (userModal.editing) {
        await authAPI.updateUser(userModal.editing.id, payload);
        toast.success('User updated');
      } else {
        await authAPI.createUser(payload);
        toast.success('User created successfully');
      }
      setUserModal({ open: false, editing: null });
      await loadAll();
    } catch (err: any) { toast.error(err?.message || 'Failed to save user'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (u: User) => {
    if (!u.is_active) {
      // Re-activate directly
      try {
        await authAPI.updateUser(u.id, { is_active: true });
        toast.success(`${u.name} reactivated`);
        await loadAll();
      } catch (e: any) { toast.error(e?.message || 'Failed'); }
    } else {
      setDeactivateUser(u);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateUser) return;
    setDeactivateSaving(true);
    try {
      await authAPI.updateUser(deactivateUser.id, { is_active: false });
      toast.success(`${deactivateUser.name} deactivated`);
      setDeactivateUser(null);
      await loadAll();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setDeactivateSaving(false); }
  };

  // const openPoolModal = async (category: string) => {
  //   const allUsers = users.filter(u => u.role === 'sales' && u.is_active);
  //   setPoolUsers(allUsers);
  //   setPoolModal({ open: true, category });
  // };

  // const addToPool = async (userId: number, category: string) => {
  //   try {
  //     await teamAPI.addToPool({ user_id: userId, category });
  //     toast.success('Added to pool');
  //     await loadAll();
  //   } catch (e: any) { toast.error(e?.message || 'Failed'); }
  // };

  // const removeFromPool = async (userId: number, category: string) => {
  //   try {
  //     await teamAPI.removeFromPool({ user_id: userId, category });
  //     toast.success('Removed from pool');
  //     await loadAll();
  //   } catch (e: any) { toast.error(e?.message || 'Failed'); }
  // };

  const openPoolModal = async (category: string) => {
      const allUsers = users.filter(u => u.role === 'sales' && u.is_active);
      setPoolUsers(allUsers);

      // ✅ Current pool members find karo RR data se
      const rrRow = rr.find(r => r.category === category);
      // Backend se pool members fetch karo
      try {
        const res: any = await teamAPI.getPoolMembers(category);
        const ids = new Set<number>((res?.members || []).map((m: any) => m.id));
        setPoolMemberIds(ids);
      } catch {
        setPoolMemberIds(new Set());
      }

      setPoolModal({ open: true, category });
  };

  const addToPool = async (userId: number, category: string) => {
    try {
      await teamAPI.addToPool({ user_id: userId, category });
      toast.success('Added to pool');
      // ✅ Local state update — reload ki zaroorat nahi
      // setPoolMemberIds(prev => new Set([...prev, userId]));
      setPoolMemberIds(prev => {
        const next = new Set<number>(Array.from(prev));
        next.add(userId);
        return next;
      });
      await loadAll();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
  };

  const removeFromPool = async (userId: number, category: string) => {
    try {
      await teamAPI.removeFromPool({ user_id: userId, category });
      toast.success('Removed from pool');
      // ✅ Local state update
      setPoolMemberIds(prev => {
        const s = new Set(prev);
        s.delete(userId);
        return s;
      });
      await loadAll();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
  };

  const resetRR = async (category: string) => {
    setResetSaving(category);
    try {
      await teamAPI.resetIndex(category);
      toast.success(`Round-robin reset for ${category}`);
      await loadAll();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setResetSaving(''); }
  };

  const activeCount   = users.filter(u => u.is_active).length;
  const salesCount    = users.filter(u => u.role === 'sales' && u.is_active).length;
  const adminCount    = users.filter(u => u.role !== 'sales' && u.is_active).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-DEFAULT">Team Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeCount} active · {salesCount} sales agents · {adminCount} admins
          </p>
        </div>
        <button className="btn btn-amber text-xs" onClick={openCreate}>+ Add User</button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Users',   value: users.length,   icon: '👥', color: 'green' },
          { label: 'Sales Agents',  value: salesCount,     icon: '🎯', color: 'amber' },
          { label: 'RR Categories', value: rr.length,      icon: '🔄', color: 'blue'  },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className={`kpi-card kpi-${color}`}>
            <div className={`text-2xl mb-1`}>{icon}</div>
            <div className="font-display text-3xl font-semibold text-forest-DEFAULT">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        <button className={`tab-btn ${tab === 'users' ? 'active' : ''}`}      onClick={() => setTab('users')}>Users ({users.length})</button>
        <button className={`tab-btn ${tab === 'round-robin' ? 'active' : ''}`} onClick={() => setTab('round-robin')}>Round-Robin ({rr.length})</button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (
        <>
          {/* ── USERS TAB ── */}
          {tab === 'users' && (
            <div className="card">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr><th>User</th><th>Role</th><th>Designation</th><th>Incentive Rate</th><th>Last Login</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={u.name} size={32} />
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{u.name}</div>
                              <div className="text-xs text-gray-500">{u.email} · {u.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge text-[10.5px] ${u.role === 'admin' ? 'bg-purple-50 text-purple-700' : u.role === 'sub_admin' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="text-xs text-gray-600">{u.designation || '—'}</td>
                        <td>
                          {Number(u.incentive_rate) > 0 ? (
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{u.incentive_rate}%</span>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="text-xs text-gray-500">{u.last_login ? fmtDate(u.last_login) : 'Never'}</td>
                        <td>
                          <Toggle checked={u.is_active} onChange={() => toggleActive(u)} />
                        </td>
                        <td>
                          <button className="btn btn-outline btn-xs" onClick={() => openEdit(u)}>Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ROUND ROBIN TAB ── */}
          {tab === 'round-robin' && (
            <div>
              <div className="alert alert-blue mb-4 text-xs">
                ℹ Round-robin automatically assigns incoming leads (via Meta Ads / Make.com) to sales agents in each category pool. Add agents to pools and reset the index here.
              </div>
              <div className="grid grid-cols-2 gap-3">
                {rr.map((row) => (
                  <div key={row.id} className="card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{row.category}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {row.active_members || 0} active · Index: {row.current_index}
                          {row.last_user_name && ` · Last: ${row.last_user_name}`}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button className="btn btn-outline btn-xs" onClick={() => openPoolModal(row.category)}>Manage Pool</button>
                        <button className="btn btn-ghost btn-xs text-amber-600" onClick={() => resetRR(row.category)} disabled={resetSaving === row.category}>
                          {resetSaving === row.category ? <Spinner size={11} /> : 'Reset'}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.max(row.total_members, 1) }).map((_, i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full ${i < (row.current_index % Math.max(row.total_members, 1)) ? 'bg-amber-400' : 'bg-gray-200'}`} />
                      ))}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{row.total_members} member{row.total_members !== 1 ? 's' : ''} in pool</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Create/Edit User Modal ── */}
      <Modal
        open={userModal.open} onClose={() => setUserModal({ open:false, editing:null })}
        title={userModal.editing ? `Edit — ${userModal.editing.name}` : 'Add New User'}
        size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setUserModal({ open:false, editing:null })} disabled={saving}>Cancel</button>
            <button className="btn btn-amber" onClick={saveUser} disabled={saving}>
              {saving ? <><Spinner size={14} /> Saving…</> : (userModal.editing ? 'Save Changes' : 'Create User')}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Full Name <span className="text-red-500">*</span></label>
            <input className={`form-input ${formErrors.name ? 'error' : ''}`} value={form.name} onChange={(e) => setF('name', e.target.value)} placeholder="e.g. Ravi Sharma" />
            {formErrors.name && <p className="form-error">{formErrors.name}</p>}
          </div>
          <div>
            <label className="form-label">Email <span className="text-red-500">*</span></label>
            <input className={`form-input ${formErrors.email ? 'error' : ''}`} type="email" value={form.email} onChange={(e) => setF('email', e.target.value)} placeholder="ravi@yogveda.com" />
            {formErrors.email && <p className="form-error">{formErrors.email}</p>}
          </div>
          <div>
            <label className="form-label">Phone <span className="text-red-500">*</span></label>
            <input className={`form-input ${formErrors.phone ? 'error' : ''}`} value={form.phone} onChange={(e) => setF('phone', e.target.value)} placeholder="10-digit mobile" />
            {formErrors.phone && <p className="form-error">{formErrors.phone}</p>}
          </div>
          {!userModal.editing && (
            <div>
              <label className="form-label">Password <span className="text-red-500">*</span></label>
              <input className={`form-input ${formErrors.password ? 'error' : ''}`} type="password" value={form.password} onChange={(e) => setF('password', e.target.value)} placeholder="Strong password" />
              {formErrors.password && <p className="form-error">{formErrors.password}</p>}
            </div>
          )}
          <div>
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={(e) => setF('role', e.target.value)}>
              <option value="sales">Sales</option>
              <option value="sub_admin">Sub Admin</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="form-label">Incentive Rate (%)</label>
            <input type="number" className="form-input" value={form.incentive_rate} onChange={(e) => setF('incentive_rate', e.target.value)} placeholder="e.g. 5" min="0" max="100" step="0.5" />
            <p className="text-xs text-gray-400 mt-0.5">% of delivered order amount paid as incentive</p>
          </div>
          <div>
            <label className="form-label">Designation</label>
            <input className="form-input" value={form.designation} onChange={(e) => setF('designation', e.target.value)} placeholder="e.g. Senior Sales Executive" />
          </div>
        </div>

        {form.role === 'sales' && (
          <div className="mt-4">
            <label className="form-label">Category Pools (for Round Robin)</label>
            <p className="text-xs text-gray-400 mb-2">Select which lead categories this user handles.</p>
            <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {CATEGORIES.map((cat) => (
                <label key={cat} className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer text-xs hover:bg-gray-50 border ${form.categories.includes(cat) ? 'border-green-600 bg-green-50 text-green-800 font-medium' : 'border-transparent text-gray-600'}`}>
                  <input type="checkbox" className="sr-only" checked={form.categories.includes(cat)} onChange={() => toggleCategory(cat)} />
                  <span className={`w-3 h-3 border rounded flex-shrink-0 flex items-center justify-center ${form.categories.includes(cat) ? 'bg-green-600 border-green-600' : 'border-gray-400'}`}>
                    {form.categories.includes(cat) && <svg width="8" height="8" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                  </span>
                  <span className="truncate">{cat}</span>
                </label>
              ))}
            </div>
            {form.categories.length > 0 && (
              <p className="text-xs text-green-700 mt-1.5">✓ {form.categories.length} categor{form.categories.length > 1 ? 'ies' : 'y'} selected</p>
            )}
          </div>
        )}
      </Modal>

      {/* Pool modal */}
      {/* Pool modal */}
    {poolModal?.open && (
      <Modal open title={`Manage Pool — ${poolModal.category}`} onClose={() => setPoolModal(null)} size="sm">
        <p className="text-xs text-gray-500 mb-3">
          Pool mein agents add/remove karo — Round Robin inhe assign karega.
        </p>
        {poolUsers.map((u) => {
          const inPool = poolMemberIds.has(u.id); // ✅ already in pool check

          return (
            <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
              {/* Agent info */}
              <div className="flex items-center gap-2">
                <Avatar name={u.name} size={26} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">{u.name}</span>
                    {inPool && (
                      <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">
                        ✓ IN POOL
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{u.designation || u.role}</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-1.5">
                {/* Add button — active sirf jab NOT in pool */}
                <button
                  className={`btn btn-xs px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    inPool
                      ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                      : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                  disabled={inPool}
                  onClick={() => !inPool && addToPool(u.id, poolModal.category)}>
                  {inPool ? '✓ Added' : '+ Add'}
                </button>

                {/* Remove button — active sirf jab IN pool */}
                <button
                  className={`btn btn-xs px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    !inPool
                      ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                      : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                  disabled={!inPool}
                  onClick={() => inPool && removeFromPool(u.id, poolModal.category)}>
                  Remove
                </button>
              </div>
            </div>
          );
        })}
        <button className="btn btn-outline w-full mt-4" onClick={() => setPoolModal(null)}>Close</button>
      </Modal>
    )}

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={!!deactivateUser}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${deactivateUser?.name}? They will no longer be able to log in or receive new leads.`}
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateUser(null)}
        loading={deactivateSaving}
        danger
      />
    </div>
  );
}
