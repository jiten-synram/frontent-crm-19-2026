'use client';
// src/app/(crm)/integrations/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { integrationsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { CopyField, Toggle, Spinner, Empty, Skeleton, Modal } from '@/components/ui';
import { fmtDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { WebhookLog } from '@/types';

type Tab = 'whatsapp' | 'shopify' | 'makecom' | 'logs';

export default function IntegrationsPage() {
  const router = useRouter();
  const { isAdmin } = useAuthStore();
  const [tab, setTab]         = useState<Tab>('whatsapp');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [logs, setLogs]         = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // WhatsApp test
  const [testPhone, setTestPhone]     = useState('');
  const [testMsg,   setTestMsg]       = useState('Namaste! Test message from Yogveda CRM. 🌿');
  const [testSending, setTestSending] = useState(false);

  // Broadcast
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [bcPhones, setBcPhones]           = useState('');
  const [bcMsg,    setBcMsg]              = useState('');
  const [bcSending, setBcSending]         = useState(false);

  useEffect(() => {
    if (!isAdmin()) { router.push('/dashboard'); return; }
    loadSettings();
  }, []);

  useEffect(() => {
    if (tab === 'logs') loadLogs();
  }, [tab]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res: any = await integrationsAPI.getSettings();
      setSettings(res?.settings || {});
    } catch { toast.error('Failed to load settings'); }
    finally { setLoading(false); }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res: any = await integrationsAPI.getLogs();
      setLogs(res?.logs || []);
    } catch { toast.error('Failed to load logs'); }
    finally { setLogsLoading(false); }
  };

  const saveSettings = async (keys: string[]) => {
    setSaving(true);
    try {
      const toSave: Record<string, string> = {};
      keys.forEach(k => { toSave[k] = settings[k] || ''; });
      await integrationsAPI.saveSettings(toSave);
      toast.success('Settings saved');
    } catch (e: any) { toast.error(e?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const sendTestWA = async () => {
    if (!testPhone.trim() || !testMsg.trim()) { toast.error('Phone and message required'); return; }
    setTestSending(true);
    try {
      await integrationsAPI.sendWA({ phone: testPhone.trim(), message: testMsg.trim() });
      toast.success(`Message sent to ${testPhone}`);
    } catch (e: any) { toast.error(e?.message || 'Failed — check WhatsApp API credentials'); }
    finally { setTestSending(false); }
  };

  const sendBroadcast = async () => {
    const phones = bcPhones.split('\n').map(p => p.trim()).filter(Boolean);
    if (!phones.length || !bcMsg.trim()) { toast.error('Phones and message required'); return; }
    setBcSending(true);
    try {
      const res: any = await integrationsAPI.broadcast({ phones, message: bcMsg });
      toast.success(`Sent: ${res.sent}, Failed: ${res.failed}`);
      setBroadcastOpen(false);
      setBcPhones(''); setBcMsg('');
    } catch (e: any) { toast.error(e?.message || 'Broadcast failed'); }
    finally { setBcSending(false); }
  };

  const set = (k: string, v: string) => setSettings(s => ({ ...s, [k]: v }));

  const LOG_STATUS_COLORS: Record<string, string> = {
    received:   'bg-gray-100 text-gray-600',
    processing: 'bg-blue-50 text-blue-700',
    success:    'bg-green-50 text-green-700',
    failed:     'bg-red-50 text-red-700',
  };

  // Get API base for webhook URL display
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api','') || 'https://crm.yourdomain.com';

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-DEFAULT">Integrations</h1>
          <p className="text-xs text-gray-500 mt-0.5">Connect WhatsApp, Shopify, and Make.com</p>
        </div>
      </div>

      <div className="tab-nav">
        {[
          { key:'whatsapp', label:'💬 WhatsApp' },
          { key:'shopify',  label:'🛍 Shopify' },
          { key:'makecom',  label:'⚙️ Make.com' },
          { key:'logs',     label:'📋 Webhook Logs' },
        ].map(({ key, label }) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key as Tab)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <Skeleton className="h-64 rounded-xl mt-5" /> : (
        <>
          {/* ── WhatsApp Tab ── */}
          {tab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-2xl">💬</div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">WhatsApp Business API</h3>
                    <p className="text-xs text-gray-500">Send messages, follow-up reminders, and broadcast campaigns</p>
                  </div>
                  <div className="ml-auto">
                    <span className={`badge ${settings.wa_phone_number_id && settings.wa_phone_number_id !== '***configured***' ? 'badge-new' : settings.wa_phone_number_id === '***configured***' ? 'badge-converted' : 'bg-gray-100 text-gray-500'}`}>
                      {settings.wa_phone_number_id ? (settings.wa_phone_number_id === '***configured***' ? '✓ Configured' : '✓ Configured') : 'Not configured'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="form-label">Phone Number ID</label>
                    <input className="form-input" value={settings.wa_phone_number_id === '***configured***' ? '' : (settings.wa_phone_number_id || '')}
                      onChange={(e) => set('wa_phone_number_id', e.target.value)}
                      placeholder={settings.wa_phone_number_id === '***configured***' ? '••• (already set — enter to update)' : 'From Meta Business → WhatsApp'} />
                    <p className="text-xs text-gray-400 mt-1">Find in: Meta Business → Apps → WhatsApp → Getting Started</p>
                  </div>
                  <div>
                    <label className="form-label">Access Token (Permanent)</label>
                    <input className="form-input" type="password" value={settings.wa_access_token === '***configured***' ? '' : (settings.wa_access_token || '')}
                      onChange={(e) => set('wa_access_token', e.target.value)}
                      placeholder={settings.wa_access_token === '***configured***' ? '••• (already set — enter to update)' : 'System user permanent token'} />
                    <p className="text-xs text-gray-400 mt-1">Create in Meta Business Manager → System Users → Generate Token</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label">Webhook Verify Token</label>
                  <input className="form-input max-w-xs" value={settings.wa_verify_token || ''}
                    onChange={(e) => set('wa_verify_token', e.target.value)} placeholder="yogveda_verify_2025" />
                </div>

                <button className="btn btn-amber text-xs" onClick={() => saveSettings(['wa_phone_number_id','wa_access_token','wa_verify_token'])} disabled={saving}>
                  {saving ? <Spinner size={13} /> : 'Save WhatsApp Settings'}
                </button>
              </div>

              {/* Test message */}
              <div className="card p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Test WhatsApp Message</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="form-label">Phone Number (with country code)</label>
                    <input className="form-input" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="e.g. 919876543210" />
                  </div>
                  <div>
                    <label className="form-label">Message</label>
                    <input className="form-input" value={testMsg} onChange={(e) => setTestMsg(e.target.value)} />
                  </div>
                </div>
                <button className="btn btn-outline btn-sm text-xs" onClick={sendTestWA} disabled={testSending}>
                  {testSending ? <><Spinner size={12} /> Sending…</> : '💬 Send Test Message'}
                </button>
              </div>

              {/* Broadcast */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-900">Bulk Broadcast</h3>
                  <button className="btn btn-outline btn-sm text-xs" onClick={() => setBroadcastOpen(true)}>📢 Start Broadcast</button>
                </div>
                <p className="text-xs text-gray-500">Send a single message to multiple contacts at once. Use responsibly — WhatsApp may restrict accounts for spam.</p>
              </div>
            </div>
          )}

          {/* ── Shopify Tab ── */}
          {tab === 'shopify' && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-2xl">🛍</div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Shopify Integration</h3>
                    <p className="text-xs text-gray-500">Sync orders and customers from your Shopify store</p>
                  </div>
                  <div className="ml-auto">
                    <span className={`badge ${settings.shopify_store_domain ? 'badge-converted' : 'bg-gray-100 text-gray-500'}`}>
                      {settings.shopify_store_domain ? '✓ Configured' : 'Not configured'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="form-label">Shopify Store Domain</label>
                    <input className="form-input" value={settings.shopify_store_domain || ''} onChange={(e) => set('shopify_store_domain', e.target.value)} placeholder="yourstore.myshopify.com" />
                  </div>
                  <div>
                    <label className="form-label">Webhook Secret</label>
                    <input className="form-input" type="password" value={settings.shopify_webhook_secret === '***configured***' ? '' : (settings.shopify_webhook_secret || '')}
                      onChange={(e) => set('shopify_webhook_secret', e.target.value)}
                      placeholder={settings.shopify_webhook_secret === '***configured***' ? '••• (already set)' : 'From Shopify Notifications → Webhooks'} />
                  </div>
                </div>

                <button className="btn btn-amber text-xs mb-4" onClick={() => saveSettings(['shopify_store_domain','shopify_webhook_secret'])} disabled={saving}>
                  {saving ? <Spinner size={13} /> : 'Save Shopify Settings'}
                </button>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Shopify Webhook Setup</h3>
                <p className="text-xs text-gray-500 mb-3">Register this webhook URL in your Shopify store to receive order notifications in real-time.</p>
                <CopyField
                  label="Shopify Order Webhook URL"
                  value={`${apiBase}/api/webhooks/shopify/orders`}
                  hint="In Shopify Admin → Settings → Notifications → Webhooks → Create webhook → Event: Order payment"
                />
                <div className="mt-4 space-y-2 text-xs text-gray-600">
                  <p className="font-semibold">What gets synced:</p>
                  <ul className="list-disc ml-4 space-y-1 text-gray-500">
                    <li>Every paid Shopify order auto-creates/updates a customer in CRM</li>
                    <li>Repeat customers are detected by phone/email fingerprinting</li>
                    <li>Revenue is tracked and attributed to customer lifetime value</li>
                    <li>New customers from Shopify appear in the Customers section</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ── Make.com Tab ── */}
          {tab === 'makecom' && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">⚙️</div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Make.com Automation</h3>
                    <p className="text-xs text-gray-500">Connect Meta Ads leads to CRM via Make.com (formerly Integromat)</p>
                  </div>
                  <div className="ml-auto">
                    <span className="badge badge-converted">Always Active</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <CopyField
                    label="Meta Leads Webhook URL"
                    value={`${apiBase}/api/webhooks/meta-leads`}
                    hint="Paste this URL in Make.com → HTTP module when a new Meta Lead Ad form is submitted"
                  />

                  <div className="border border-gray-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-800 mb-2">Make.com Scenario Setup</p>
                    <ol className="text-xs text-gray-500 space-y-1.5 list-decimal ml-4">
                      <li>In Make.com, create a new scenario</li>
                      <li>Add trigger: <strong>Facebook Lead Ads</strong> → Watch Lead Ads</li>
                      <li>Connect your Facebook Ad Account and select the Lead Form</li>
                      <li>Add module: <strong>HTTP</strong> → Make a Request</li>
                      <li>Set URL to the webhook URL above, Method: POST</li>
                      <li>Map fields: name, phone_number, email, city, category</li>
                      <li>Save and Activate the scenario</li>
                    </ol>
                  </div>

                  <div className="border border-gray-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-800 mb-2">Expected Payload</p>
                    <pre className="text-xs text-gray-600 bg-gray-50 rounded p-3 overflow-x-auto">{JSON.stringify({
                      name: "Patient Name",
                      phone: "9876543210",
                      email: "patient@example.com",
                      city: "Bhopal",
                      state: "Madhya Pradesh",
                      category: "Kidney Stone Treatment",
                      form_id: "meta_form_id_optional"
                    }, null, 2)}</pre>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { icon:'🔄', title:'Auto Round-Robin', desc:'Leads auto-assigned to right sales agent' },
                      { icon:'💬', title:'Auto WhatsApp', desc:'Instant acknowledgement sent to lead' },
                      { icon:'📋', title:'Duplicate Detection', desc:'Phone fingerprinting prevents duplicate records' },
                    ].map(({ icon, title, desc }) => (
                      <div key={title} className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xl mb-1">{icon}</div>
                        <div className="text-xs font-semibold text-gray-800">{title}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Webhook Logs Tab ── */}
          {tab === 'logs' && (
            <div className="card">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-forest-DEFAULT">Webhook Logs (Last 100)</span>
                <button className="btn btn-ghost btn-sm text-xs" onClick={loadLogs} disabled={logsLoading}>
                  {logsLoading ? <Spinner size={12} /> : '↻ Refresh'}
                </button>
              </div>
              {logsLoading ? (
                <div className="p-4 space-y-2">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
              ) : logs.length === 0 ? (
                <Empty icon="📋" title="No webhook logs yet" description="Logs will appear here when Make.com or Shopify sends webhooks" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Source</th><th>Event</th><th>Status</th><th>Lead ID</th><th>Error</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id}>
                          <td><span className="badge bg-indigo-50 text-indigo-700 capitalize">{log.source}</span></td>
                          <td className="text-xs font-mono text-gray-600">{log.event}</td>
                          <td><span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${LOG_STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-600'}`}>{log.status}</span></td>
                          <td className="text-xs text-gray-500">{log.lead_id || '—'}</td>
                          <td className="text-xs text-red-600 max-w-[180px] truncate">{log.error_msg || '—'}</td>
                          <td className="text-xs text-gray-500">{fmtDateTime(log.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Broadcast modal */}
      <Modal open={broadcastOpen} onClose={() => setBroadcastOpen(false)} title="WhatsApp Broadcast"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setBroadcastOpen(false)} disabled={bcSending}>Cancel</button>
            <button className="btn btn-amber" onClick={sendBroadcast} disabled={bcSending}>
              {bcSending ? <><Spinner size={14} /> Sending…</> : '📢 Send Broadcast'}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="form-label">Phone Numbers (one per line, with country code)</label>
          <textarea className="form-textarea font-mono text-xs" rows={5} value={bcPhones}
            onChange={(e) => setBcPhones(e.target.value)} placeholder={'919876543210\n918765432109\n917654321098'} />
          <p className="text-xs text-gray-400 mt-1">{bcPhones.split('\n').filter(p => p.trim()).length} numbers</p>
        </div>
        <div>
          <label className="form-label">Message</label>
          <textarea className="form-textarea" rows={3} value={bcMsg} onChange={(e) => setBcMsg(e.target.value)}
            placeholder="Namaste! This is Yogveda Healthcare reaching out about your wellness journey…" />
        </div>
        <div className="mt-3 alert alert-amber text-xs">
          ⚠ WhatsApp may temporarily limit your account if you send too many messages. Recommended max: 500/day for new accounts.
        </div>
      </Modal>
    </div>
  );
}
