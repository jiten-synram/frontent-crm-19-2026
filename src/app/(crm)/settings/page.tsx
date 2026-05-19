'use client';
// src/app/(crm)/settings/page.tsx

import { useState } from 'react';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Avatar, Spinner, Toggle } from '@/components/ui';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateUser, isAdmin } = useAuthStore();

  // Profile form
  const [profile, setProfile]     = useState({ name: user?.name || '', phone: user?.phone || '', designation: user?.designation || '' });
  const [profileSaving, setProfileSaving] = useState(false);

  // Password form
  const [pwForm, setPwForm]     = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwShow, setPwShow]     = useState(false);

  const saveProfile = async () => {
    if (!profile.name.trim()) { toast.error('Name is required'); return; }
    setProfileSaving(true);
    try {
      await authAPI.updateUser(user!.id, { name: profile.name, phone: profile.phone, designation: profile.designation });
      updateUser({ name: profile.name, phone: profile.phone, designation: profile.designation });
      toast.success('Profile updated');
    } catch (e: any) { toast.error(e?.message || 'Failed to save profile'); }
    finally { setProfileSaving(false); }
  };

  const changePassword = async () => {
    const e: Record<string, string> = {};
    if (!pwForm.currentPassword) e.currentPassword = 'Current password required';
    if (!pwForm.newPassword)     e.newPassword     = 'New password required';
    else if (pwForm.newPassword.length < 8) e.newPassword = 'Minimum 8 characters';
    if (pwForm.newPassword !== pwForm.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setPwErrors(e);
    if (Object.keys(e).length) return;

    setPwSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully');
      setPwForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch (e: any) { toast.error(e?.message || 'Failed to change password'); }
    finally { setPwSaving(false); }
  };

  if (!user) return null;

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-semibold text-forest-DEFAULT">Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: Profile */}
        <div className="col-span-2 space-y-5">
          {/* Profile card */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-forest-DEFAULT">Profile Information</h2>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                <Avatar name={user.name} size={56} />
                <div>
                  <div className="font-bold text-gray-900 text-base">{user.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
                  <div className="text-xs mt-1">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : user.role === 'sub_admin' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                    {Number(user.incentive_rate) > 0 && (
                      <span className="ml-2 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{user.incentive_rate}% incentive</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={profile.name} onChange={(e) => setProfile(p => ({...p, name: e.target.value}))} />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={profile.phone} onChange={(e) => setProfile(p => ({...p, phone: e.target.value}))} />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input className="form-input bg-gray-50 text-gray-500" value={user.email} disabled />
                  <p className="text-xs text-gray-400 mt-0.5">Email cannot be changed. Contact admin.</p>
                </div>
                <div>
                  <label className="form-label">Designation</label>
                  <input className="form-input" value={profile.designation} onChange={(e) => setProfile(p => ({...p, designation: e.target.value}))} placeholder="e.g. Senior Sales Executive" />
                </div>
              </div>

              <button className="btn btn-amber text-xs" onClick={saveProfile} disabled={profileSaving}>
                {profileSaving ? <><Spinner size={13} /> Saving…</> : 'Save Profile'}
              </button>
            </div>
          </div>

          {/* Security card */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-forest-DEFAULT">Security — Change Password</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="col-span-2">
                  <label className="form-label">Current Password</label>
                  <div className="relative">
                    <input type={pwShow ? 'text' : 'password'} className={`form-input pr-10 ${pwErrors.currentPassword ? 'error' : ''}`}
                      value={pwForm.currentPassword} onChange={(e) => setPwForm(f => ({...f, currentPassword: e.target.value}))} />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs" onClick={() => setPwShow(!pwShow)}>
                      {pwShow ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {pwErrors.currentPassword && <p className="form-error">{pwErrors.currentPassword}</p>}
                </div>
                <div>
                  <label className="form-label">New Password</label>
                  <input type="password" className={`form-input ${pwErrors.newPassword ? 'error' : ''}`}
                    value={pwForm.newPassword} onChange={(e) => setPwForm(f => ({...f, newPassword: e.target.value}))} placeholder="Minimum 8 characters" />
                  {pwErrors.newPassword && <p className="form-error">{pwErrors.newPassword}</p>}
                </div>
                <div>
                  <label className="form-label">Confirm Password</label>
                  <input type="password" className={`form-input ${pwErrors.confirmPassword ? 'error' : ''}`}
                    value={pwForm.confirmPassword} onChange={(e) => setPwForm(f => ({...f, confirmPassword: e.target.value}))} placeholder="Re-enter new password" />
                  {pwErrors.confirmPassword && <p className="form-error">{pwErrors.confirmPassword}</p>}
                </div>
              </div>
              <button className="btn btn-primary text-xs" onClick={changePassword} disabled={pwSaving}>
                {pwSaving ? <><Spinner size={13} /> Updating…</> : '🔒 Change Password'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Account info */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-bold text-forest-DEFAULT mb-3">Account Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-xs"><span className="text-gray-500">User ID</span><span className="font-mono font-semibold">#{user.id}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Role</span><span className="font-semibold capitalize">{user.role.replace('_', ' ')}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Status</span><span className="text-green-700 font-semibold">Active</span></div>
              {Number(user.incentive_rate) > 0 && (
                <div className="flex justify-between text-xs"><span className="text-gray-500">Incentive</span><span className="font-bold text-amber-700">{user.incentive_rate}%</span></div>
              )}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-bold text-forest-DEFAULT mb-2">App Version</h3>
            <div className="text-xs text-gray-500 space-y-1">
              <div>Yogveda CRM v2.0.0</div>
              <div>Next.js 14 · Node.js · MySQL</div>
              <div className="pt-1 text-[10px] text-gray-400">© {new Date().getFullYear()} Yogveda Healthcare. All rights reserved.</div>
            </div>
          </div>

          {isAdmin() && (
            <div className="card p-4">
              <h3 className="text-sm font-bold text-forest-DEFAULT mb-2">Admin Quick Links</h3>
              <div className="space-y-1.5">
                {[
                  { href: '/team',         label: '👥 Manage Team' },
                  { href: '/integrations', label: '🔌 Integrations' },
                  { href: '/reports',      label: '📊 Reports' },
                ].map(({ href, label }) => (
                  <a key={href} href={href} className="block text-xs text-forest-DEFAULT hover:text-amber-600 transition-colors py-1 border-b border-gray-100 last:border-0 font-medium">
                    {label} →
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
