'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { leaveApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import HrShell, { HR_RULES, HR_RULES_WRITE } from './HrShell';
import Button from '@/components/ui/Button';
import Field, { inputClass } from '@/components/ui/Field';
import {
  panel, eyebrow, sectionHeading, sectionHeadingTitle, emptyState, formError,
} from '@/components/ui/cx';

const SETTING_LABELS = {
  shift_start: 'Duty start time (HH:MM)',
  late_grace_minutes: 'Late grace (minutes)',
  weekend_days: 'Weekend days',
  chair_escalation_hours: 'Chairman inaction → alternate (hours)',
  chair_max_days: 'Chairman scope (days)',
  dean_max_days: 'Dean scope (days)',
  registrar_max_days: 'Registrar scope (days)',
  casual_max_once: 'Casual max at once (Rule 17)',
  casual_special_max: 'Casual special max (Rule 17)',
  earned_max_once_nocert: 'Earned max w/o cert (Rule 16)',
  earned_max_once_cert: 'Earned max with cert (Rule 16)',
  earned_medical_lifetime: 'Lifetime medical cap (Rule 16)',
  study_max_faculty_pct: 'Study-leave faculty cap % (Rule 20)',
  contract_casual_yearly: 'Contract casual / year (Rule x)',
  contract_earned_accrual: 'Contract earned / month (Rule x)',
};

export default function HrRules() {
  const user = useAuthStore((state) => state.user);
  const toast = useToastStore((state) => state.toast);
  const canWrite = HR_RULES_WRITE.includes(user?.role);
  const [types, setTypes] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [accrueForm, setAccrueForm] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [accrueMsg, setAccrueMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await leaveApi.get('/hr/rules');
      setTypes(res.data?.types || []);
      setQuotas(res.data?.quotas || []);
      setSettings(res.data?.settings || {});
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to load rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const quotaFor = (typeId, category) => quotas.find((q) => Number(q.leave_type_id) === Number(typeId) && q.category === category);

  const setQuota = (typeId, category, field, value) => {
    const existing = quotaFor(typeId, category);
    if (existing) {
      setQuotas(quotas.map((q) => (q === existing ? { ...q, [field]: value } : q)));
    } else {
      setQuotas([...quotas, { leave_type_id: typeId, category, quota_per_year: '', accrual_per_month: '', carry_forward: 0, [field]: value }]);
    }
  };

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await leaveApi.put('/hr/rules', {
        quotas: quotas.map((q) => ({
          leave_type_id: q.leave_type_id, category: q.category,
          quota_per_year: q.quota_per_year === '' || q.quota_per_year == null ? null : Number(q.quota_per_year),
          accrual_per_month: q.accrual_per_month === '' || q.accrual_per_month == null ? null : Number(q.accrual_per_month),
          carry_forward: q.carry_forward ? 1 : 0, notes: q.notes || null,
        })),
        settings,
      });
      setTypes(res.data?.types || []);
      setQuotas(res.data?.quotas || []);
      setSettings(res.data?.settings || {});
      toast('Leave rules updated.');
    } catch (requestError) {
      setSaveError(requestError.response?.data?.error?.message || 'Unable to save rules.');
    } finally {
      setSaving(false);
    }
  };

  const openYear = async () => {
    try {
      const res = await leaveApi.post('/hr/entitlements/open-year', { year: accrueForm.year });
      toast(`Year ${res.data.year} opened for ${res.data.people} people.`);
    } catch (requestError) {
      toast(requestError.response?.data?.error?.message || 'Unable to open year.');
    }
  };

  const accrue = async () => {
    setAccrueMsg('');
    try {
      const res = await leaveApi.post('/hr/entitlements/accrue', { year: accrueForm.year, month: accrueForm.month });
      setAccrueMsg(`Credited earned leave for ${res.data.credited} people (${res.data.year}-${res.data.month}).`);
    } catch (requestError) {
      setAccrueMsg(requestError.response?.data?.error?.message || 'Unable to accrue.');
    }
  };

  return (
    <HrShell title="Leave Rules" description="Leave types, yearly quotas and approval thresholds (FUUAST Leave Rules Ch. III)." allow={HR_RULES} wide>
      <section className={`${panel} p-[25px]`}>
        <div className={sectionHeading}>
          <div>
            <span className={eyebrow}>DR · ADD RULE</span>
            <h2 className={sectionHeadingTitle}>Quotas by category</h2>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={load} title="Refresh" className="grid h-[34px] w-[34px] place-items-center rounded-[5px] border border-line bg-paper text-brand transition hover:bg-brand-soft">
              <RefreshCw size={17} />
            </button>
            {canWrite ? <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save rules'}</Button> : null}
          </div>
        </div>
        {!canWrite ? <p className="mt-3 text-[13px] text-muted">Read-only for your role. Only the Deputy Registrar (or Super Admin) can change rules.</p> : null}
        {loading ? (
          <p className={emptyState}>Loading rules…</p>
        ) : error ? (
          <p className={`${emptyState} text-danger`}>{error}</p>
        ) : (
          <div className="mt-[14px] overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Leave type</th>
                  <th className="py-2 pr-3">Teaching quota / accrual</th>
                  <th className="py-2 pr-3">Non-teaching quota / accrual</th>
                  <th className="py-2 pr-3">Contract quota / accrual</th>
                  <th className="py-2">Carry fwd</th>
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.id} className="border-b border-line/60 align-top">
                    <td className="py-2 pr-3">
                      <p className="font-medium text-ink">{t.name}</p>
                      <p className="text-xs text-muted">{t.pay_type} pay{t.needs_medical_cert ? ' · medical cert' : ''}{t.counts_as_duty ? ' · duty' : ''}</p>
                    </td>
                    {['teaching', 'non_teaching', 'contract'].map((cat) => {
                      const q = quotaFor(t.id, cat);
                      return (
                        <td key={cat} className="py-2 pr-3">
                          <div className="flex items-center gap-1">
                            <input
                              className={`${inputClass} w-[70px]`} placeholder="quota"
                              disabled={!canWrite} value={q?.quota_per_year ?? ''}
                              onChange={(e) => setQuota(t.id, cat, 'quota_per_year', e.target.value)}
                            />
                            <input
                              className={`${inputClass} w-[70px]`} placeholder="/mo"
                              disabled={!canWrite} value={q?.accrual_per_month ?? ''}
                              onChange={(e) => setQuota(t.id, cat, 'accrual_per_month', e.target.value)}
                            />
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-2">
                      <input
                        type="checkbox" disabled={!canWrite}
                        checked={Boolean(['teaching', 'non_teaching', 'contract'].some((cat) => quotaFor(t.id, cat)?.carry_forward))}
                        onChange={(e) => ['teaching', 'non_teaching', 'contract'].forEach((cat) => setQuota(t.id, cat, 'carry_forward', e.target.checked ? 1 : 0))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {saveError ? <p className={`${formError} mt-3`}>{saveError}</p> : null}
      </section>

      <section className={`${panel} mt-[22px] p-[25px]`}>
        <div className={sectionHeading}>
          <div>
            <span className={eyebrow}>THRESHOLDS</span>
            <h2 className={sectionHeadingTitle}>Approval & attendance settings</h2>
          </div>
          {canWrite ? <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save rules'}</Button> : null}
        </div>
        <div className="mt-[16px] grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(SETTING_LABELS).map(([key, label]) => (
            <Field key={key} label={label}>
              <input className={inputClass} disabled={!canWrite} value={settings[key] ?? ''} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
            </Field>
          ))}
        </div>
      </section>

      {canWrite ? (
        <section className={`${panel} mt-[22px] p-[25px]`}>
          <div className={sectionHeading}>
            <div>
              <span className={eyebrow}>YEARLY CYCLE</span>
              <h2 className={sectionHeadingTitle}>Open year & monthly accrual</h2>
            </div>
          </div>
          <div className="mt-[16px] flex flex-wrap items-end gap-3">
            <Field label="Year">
              <input type="number" className={inputClass} value={accrueForm.year} onChange={(e) => setAccrueForm({ ...accrueForm, year: Number(e.target.value) })} />
            </Field>
            <Field label="Month">
              <input type="number" min="1" max="12" className={inputClass} value={accrueForm.month} onChange={(e) => setAccrueForm({ ...accrueForm, month: Number(e.target.value) })} />
            </Field>
            <Button variant="secondary" onClick={openYear}>Open year (casual + carry)</Button>
            <Button onClick={accrue}>Run earned accrual</Button>
          </div>
          {accrueMsg ? <p className="mt-3 text-[13px] text-brand">{accrueMsg}</p> : null}
        </section>
      ) : null}
    </HrShell>
  );
}
