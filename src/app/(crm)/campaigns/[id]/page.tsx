'use client';
// src/app/(crm)/campaigns/[id]/page.tsx

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { StatusBadge, Avatar, StatCard, Skeleton, InfoRow } from '@/components/ui';
import { fmtINR, fmtDate, fmtDateTime, avatarColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function CampaignDetailPage() {
  const { id }  = useParams();
  const router  = useRouter();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/campaigns/${id}`);
      setData(res);
    } catch { toast.error('Campaign not found'); router.push('/campaigns'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-48 rounded mb-4" />
      <div className="grid grid-cols-4 gap-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl"/>)}</div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  if (!data) return null;
  const { campaign, leads } = data;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <button className="btn btn-ghost btn-sm text-xs" onClick={() => router.push('/campaigns')}>
          ← Campaigns
        </button>
        <span className="text-gray-400">/</span>
        <span className="text-sm font-medium text-gray-700">{campaign.name}</span>
        <span className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-full capitalize ml-1 ${
          campaign.status === 'active' ? 'bg-green-50 text-green-700' :
          campaign.status === 'paused' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
        }`}>{campaign.status}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Leads"    value={campaign.total_leads  || 0} icon="👥" color="blue"   />
        <StatCard label="Converted"      value={campaign.converted    || 0} icon="🎯" color="green"  />
        <StatCard label="Revenue"        value={fmtINR(campaign.revenue || 0)} icon="💰" color="amber" />
        <StatCard label="Conv. Rate"     value={`${campaign.conversion_rate || 0}%`} icon="📊" color="purple" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Campaign info */}
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-forest-DEFAULT">Campaign Info</span>
          </div>
          <div className="p-4">
            <InfoRow label="Name"        value={campaign.name} />
            <InfoRow label="Platform"    value={<span className="capitalize font-medium">{campaign.platform}</span>} />
            <InfoRow label="Status"      value={<span className="capitalize font-medium">{campaign.status}</span>} />
            <InfoRow label="Budget"      value={Number(campaign.budget) > 0 ? fmtINR(campaign.budget) : '—'} />
            <InfoRow label="Start Date"  value={fmtDate(campaign.start_date)} />
            <InfoRow label="End Date"    value={fmtDate(campaign.end_date)} />
            <InfoRow label="External ID" value={campaign.external_id || '—'} />
            <InfoRow label="Created"     value={fmtDate(campaign.created_at)} />
            {campaign.notes && (
              <div className="mt-3 bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600 leading-relaxed">
                {campaign.notes}
              </div>
            )}
          </div>
        </div>

        {/* Recent leads */}
        <div className="card col-span-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-forest-DEFAULT">
              Recent Leads ({campaign.total_leads || 0})
            </span>
            <button
              className="btn btn-ghost btn-sm text-xs"
              onClick={() => router.push(`/leads?campaign_id=${campaign.id}`)}
            >
              View all →
            </button>
          </div>
          <div className="p-4">
            {!leads?.length ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">👥</div>
                <p className="text-xs text-gray-500">No leads yet for this campaign</p>
                <p className="text-xs text-gray-400 mt-1">
                  Make.com se leads aane pe yahan dikhenge
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {leads.map((lead: any) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-100"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={lead.name} size={28} />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{lead.name}</div>
                        <div className="text-xs text-gray-500">{lead.phone}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={lead.status} />
                      {lead.order_amount && (
                        <span className="text-xs font-bold text-forest-DEFAULT">
                          {fmtINR(lead.order_amount)}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">{fmtDate(lead.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
