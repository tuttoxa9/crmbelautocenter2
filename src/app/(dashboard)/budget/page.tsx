"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, Trash2, ChevronDown, ChevronRight, DollarSign,
  TrendingUp, Star, Copy, Check, Pencil, X, Save,
  LayoutGrid, Layers, FileText, Loader2, AlertCircle
} from "lucide-react";
import { BudgetPlan, AdCampaign, AdGroup, AdCreative, AdPlatform, AdGroupBudgetResult } from "@/lib/budgetTypes";
import { subscribeToBudgetPlans, createBudgetPlan, updateBudgetPlan, deleteBudgetPlan } from "@/lib/budgetService";

// ─── SVG Platform Icons ────────────────────────────────────────────
function MetaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l7 4.5-7 4.5z" />
      <path d="M6.5 8.5C8 7 9.5 6.5 12 6.5c2 0 3.5.5 4.5 1.5-1.2-.4-2.6-.5-4.5-.5-1.8 0-3.3.2-5.5 1z" opacity=".5"/>
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.77a4.85 4.85 0 01-1.01-.08z" />
    </svg>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function calcResults(plan: BudgetPlan): AdGroupBudgetResult[] {
  const DAYS = 30;
  const allGroups: AdGroupBudgetResult[] = [];

  plan.campaigns.forEach((camp) => {
    camp.adGroups.forEach((grp) => {
      allGroups.push({
        campaignId: camp.id,
        campaignName: camp.name,
        platform: camp.platform,
        adGroupId: grp.id,
        adGroupName: grp.name,
        isPremium: grp.isPremium,
        adsCount: grp.ads.length,
        monthlyBudget: 0,
        dailyBudget: 0,
        percentage: 0,
      });
    });
  });

  const totalWeight = allGroups.reduce((s, g) => s + (g.isPremium ? 2 : 1), 0);
  if (totalWeight === 0) return allGroups;

  return allGroups.map((g) => {
    const weight = g.isPremium ? 2 : 1;
    const monthly = (plan.monthlyBudget * weight) / totalWeight;
    const daily = monthly / DAYS;
    const pct = (monthly / plan.monthlyBudget) * 100;
    return { ...g, monthlyBudget: monthly, dailyBudget: daily, percentage: pct };
  });
}

// ─── Small UI pieces ────────────────────────────────────────────────
function PlatformBadge({ platform }: { platform: AdPlatform }) {
  const isMeta = platform === "meta";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
      isMeta ? "bg-blue-100 text-blue-700" : "bg-black/10 text-zinc-800"
    }`}>
      {isMeta ? <MetaIcon className="w-3 h-3" /> : <TikTokIcon className="w-3 h-3" />}
      {isMeta ? "Meta" : "TikTok"}
    </span>
  );
}

function InlineEdit({ value, onSave, className }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => { if (draft.trim()) onSave(draft.trim()); setEditing(false); };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        className={`bg-white border border-blue-400 rounded-md px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${className}`}
      />
    );
  }
  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Нажмите чтобы изменить название"
      className={`text-left hover:text-blue-700 transition-colors flex items-center gap-1.5 cursor-text ${className}`}
    >
      <span>{value}</span>
      <Pencil className="w-3 h-3 opacity-30 hover:opacity-70 transition-opacity shrink-0" />
    </button>
  );
}

// ─── Copied toast ───────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} title="Скопировать" className="p-1 rounded hover:bg-zinc-200 transition-colors text-zinc-400 hover:text-zinc-700">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function BudgetPage() {
  const [plans, setPlans] = useState<BudgetPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

  // Subscribe to Firestore
  useEffect(() => {
    const unsub = subscribeToBudgetPlans((fetched) => {
      setPlans(fetched);
      if (fetched.length > 0 && !activePlanId) {
        setActivePlanId(fetched[0].id!);
      }
      setIsLoading(false);
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePlan = useMemo(() => plans.find((p) => p.id === activePlanId) ?? null, [plans, activePlanId]);

  // ─── Persist helper ──────────────────────────────────────────────
  const persist = useCallback(async (updated: BudgetPlan) => {
    if (!updated.id) return;
    setIsSaving(true);
    try {
      await updateBudgetPlan(updated.id, updated);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Optimistic local update + persist
  const mutatePlan = useCallback((updater: (p: BudgetPlan) => BudgetPlan) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== activePlanId) return p;
        const updated = updater(p);
        persist(updated);
        return updated;
      })
    );
  }, [activePlanId, persist]);

  // ─── Plan actions ────────────────────────────────────────────────
  const addPlan = async () => {
    const now = Date.now();
    const newPlan: Omit<BudgetPlan, "id"> = {
      name: "Новый план",
      monthlyBudget: 3000,
      campaigns: [],
      createdAt: now,
      updatedAt: now,
    };
    setIsSaving(true);
    try {
      const id = await createBudgetPlan(newPlan);
      setActivePlanId(id);
    } finally {
      setIsSaving(false);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Удалить план? Это действие нельзя отменить.")) return;
    await deleteBudgetPlan(id);
    setActivePlanId(plans.find((p) => p.id !== id)?.id ?? null);
  };

  // ─── Campaign / Group / Ad actions ──────────────────────────────
  const addCampaign = (platform: AdPlatform) => {
    const newCamp: AdCampaign = {
      id: uid(), name: `Новая кампания (${platform === "meta" ? "Meta" : "TikTok"})`,
      platform, adGroups: [], createdAt: Date.now(),
    };
    mutatePlan((p) => ({ ...p, campaigns: [...p.campaigns, newCamp] }));
    setExpandedCampaigns((s) => new Set(s).add(newCamp.id));
  };

  const updateCampaignName = (campId: string, name: string) => {
    mutatePlan((p) => ({ ...p, campaigns: p.campaigns.map((c) => c.id === campId ? { ...c, name } : c) }));
  };

  const deleteCampaign = (campId: string) => {
    if (!confirm("Удалить кампанию со всеми группами объявлений?")) return;
    mutatePlan((p) => ({ ...p, campaigns: p.campaigns.filter((c) => c.id !== campId) }));
  };

  const addAdGroup = (campId: string) => {
    const newGroup: AdGroup = {
      id: uid(), name: "Новая группа", isPremium: false, weight: 1, ads: [], createdAt: Date.now(),
    };
    mutatePlan((p) => ({
      ...p,
      campaigns: p.campaigns.map((c) =>
        c.id === campId ? { ...c, adGroups: [...c.adGroups, newGroup] } : c
      ),
    }));
  };

  const updateAdGroup = (campId: string, groupId: string, patch: Partial<AdGroup>) => {
    mutatePlan((p) => ({
      ...p,
      campaigns: p.campaigns.map((c) =>
        c.id === campId
          ? { ...c, adGroups: c.adGroups.map((g) => g.id === groupId ? { ...g, ...patch, weight: patch.isPremium !== undefined ? (patch.isPremium ? 2 : 1) : g.weight } : g) }
          : c
      ),
    }));
  };

  const deleteAdGroup = (campId: string, groupId: string) => {
    mutatePlan((p) => ({
      ...p,
      campaigns: p.campaigns.map((c) =>
        c.id === campId ? { ...c, adGroups: c.adGroups.filter((g) => g.id !== groupId) } : c
      ),
    }));
  };

  const addAd = (campId: string, groupId: string) => {
    const newAd: AdCreative = { id: uid(), name: "Новое объявление", createdAt: Date.now() };
    mutatePlan((p) => ({
      ...p,
      campaigns: p.campaigns.map((c) =>
        c.id === campId
          ? { ...c, adGroups: c.adGroups.map((g) => g.id === groupId ? { ...g, ads: [...g.ads, newAd] } : g) }
          : c
      ),
    }));
  };

  const updateAdName = (campId: string, groupId: string, adId: string, name: string) => {
    mutatePlan((p) => ({
      ...p,
      campaigns: p.campaigns.map((c) =>
        c.id === campId
          ? { ...c, adGroups: c.adGroups.map((g) => g.id === groupId ? { ...g, ads: g.ads.map((a) => a.id === adId ? { ...a, name } : a) } : g) }
          : c
      ),
    }));
  };

  const deleteAd = (campId: string, groupId: string, adId: string) => {
    mutatePlan((p) => ({
      ...p,
      campaigns: p.campaigns.map((c) =>
        c.id === campId
          ? { ...c, adGroups: c.adGroups.map((g) => g.id === groupId ? { ...g, ads: g.ads.filter((a) => a.id !== adId) } : g) }
          : c
      ),
    }));
  };

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Budget results ──────────────────────────────────────────────
  const results = useMemo(() => activePlan ? calcResults(activePlan) : [], [activePlan]);
  const totalAdGroups = useMemo(() => activePlan?.campaigns.reduce((s, c) => s + c.adGroups.length, 0) ?? 0, [activePlan]);
  const dailyTotal = activePlan ? activePlan.monthlyBudget / 30 : 0;

  // ─── Loading state ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F8FAFC]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  // ─── Empty state ─────────────────────────────────────────────────
  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F8FAFC] p-8 text-center">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-md border border-zinc-100 flex items-center justify-center mb-6">
          <DollarSign className="w-9 h-9 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Калькулятор бюджета</h2>
        <p className="text-zinc-500 max-w-sm leading-relaxed mb-8">
          Создайте первый план, чтобы рассчитать дневные бюджеты для Meta Ads и TikTok Ads.
        </p>
        <button
          onClick={addPlan}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Создать план
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#F8FAFC] overflow-hidden">

      {/* ═══ Left: Plans sidebar ═════════════════════════════════════ */}
      <div className="w-[220px] shrink-0 bg-white border-r border-zinc-200/80 flex flex-col">
        <div className="px-4 py-4 border-b border-zinc-100">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Планы</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setActivePlanId(plan.id!)}
              className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all group ${
                plan.id === activePlanId
                  ? "bg-blue-600 text-white font-semibold"
                  : "text-zinc-600 hover:bg-zinc-100 font-medium"
              }`}
            >
              <span className="truncate">{plan.name}</span>
              {plan.id !== activePlanId && (
                <button
                  onClick={(e) => { e.stopPropagation(); deletePlan(plan.id!); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-zinc-100">
          <button
            onClick={addPlan}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-2 text-[13px] font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Новый план
          </button>
        </div>
      </div>

      {/* ═══ Center: Editor ══════════════════════════════════════════ */}
      {activePlan && (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <div className="h-16 px-6 bg-white border-b border-zinc-200/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <InlineEdit
                value={activePlan.name}
                onSave={(name) => mutatePlan((p) => ({ ...p, name }))}
                className="text-lg font-bold text-zinc-900"
              />
              {isSaving && (
                <span className="flex items-center gap-1.5 text-[12px] text-zinc-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Сохранение...
                </span>
              )}
            </div>

            {/* Monthly budget input */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <label className="text-[12px] font-semibold text-zinc-500 shrink-0">Бюджет / месяц:</label>
              <input
                type="number"
                min={0}
                value={activePlan.monthlyBudget}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!isNaN(v)) mutatePlan((p) => ({ ...p, monthlyBudget: v }));
                }}
                className="w-24 bg-transparent text-right font-mono font-bold text-zinc-900 text-[15px] focus:outline-none"
              />
              <span className="text-[13px] font-bold text-zinc-400">$</span>
            </div>
          </div>

          {/* KPI bar */}
          <div className="px-6 py-3 bg-white border-b border-zinc-100 flex items-center gap-6 text-[13px] shrink-0">
            <div className="flex items-center gap-2 text-zinc-500">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span>Дневной бюджет:</span>
              <span className="font-black text-zinc-900 font-mono">${dailyTotal.toFixed(2)}</span>
            </div>
            <div className="h-4 w-px bg-zinc-200" />
            <div className="flex items-center gap-2 text-zinc-500">
              <LayoutGrid className="w-4 h-4 text-zinc-400" />
              <span>Кампаний:</span>
              <span className="font-bold text-zinc-800">{activePlan.campaigns.length}</span>
            </div>
            <div className="h-4 w-px bg-zinc-200" />
            <div className="flex items-center gap-2 text-zinc-500">
              <Layers className="w-4 h-4 text-zinc-400" />
              <span>Групп объявлений:</span>
              <span className="font-bold text-zinc-800">{totalAdGroups}</span>
            </div>
            {totalAdGroups === 0 && (
              <div className="ml-auto flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg text-[12px] font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                Добавьте группы объявлений для расчёта
              </div>
            )}
          </div>

          {/* Campaigns list */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-4 pb-20">

              {activePlan.campaigns.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
                  <LayoutGrid className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                  <p className="text-[15px] font-semibold text-zinc-600 mb-1">Кампаний пока нет</p>
                  <p className="text-sm text-zinc-400 mb-6">Добавьте кампанию для Meta или TikTok</p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => addCampaign("meta")} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                      <MetaIcon className="w-4 h-4" /> Meta Ads
                    </button>
                    <button onClick={() => addCampaign("tiktok")} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-700 transition-colors shadow-sm">
                      <TikTokIcon className="w-4 h-4" /> TikTok Ads
                    </button>
                  </div>
                </div>
              )}

              {activePlan.campaigns.map((camp) => {
                const isExpanded = expandedCampaigns.has(camp.id);
                const campResults = results.filter((r) => r.campaignId === camp.id);

                return (
                  <div key={camp.id} className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
                    {/* Campaign header */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100">
                      <button onClick={() => toggleCampaign(camp.id)} className="text-zinc-400 hover:text-zinc-700 transition-colors">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <PlatformBadge platform={camp.platform} />
                      <InlineEdit value={camp.name} onSave={(name) => updateCampaignName(camp.id, name)} className="font-bold text-zinc-800 flex-1" />
                      <span className="text-[12px] text-zinc-400 font-medium shrink-0">{camp.adGroups.length} гр.</span>
                      <button onClick={() => deleteCampaign(camp.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Ad Groups */}
                    {isExpanded && (
                      <div className="p-3 space-y-2">
                        {camp.adGroups.length === 0 && (
                          <p className="text-center text-[13px] text-zinc-400 py-4">Нет групп объявлений</p>
                        )}
                        {camp.adGroups.map((grp) => {
                          const grpResult = campResults.find((r) => r.adGroupId === grp.id);
                          return (
                            <div key={grp.id} className="border border-zinc-100 rounded-[1.25rem] bg-zinc-50/50 overflow-hidden">
                              {/* Group row */}
                              <div className="flex items-center gap-3 px-4 py-3">
                                {/* Premium toggle */}
                                <button
                                  onClick={() => updateAdGroup(camp.id, grp.id, { isPremium: !grp.isPremium })}
                                  title="Высокая стоимость автомобиля (Премиум)"
                                  className={`shrink-0 p-1 rounded-lg transition-all ${grp.isPremium ? "text-amber-500 bg-amber-50" : "text-zinc-300 hover:text-amber-400"}`}
                                >
                                  <Star className="w-4 h-4" fill={grp.isPremium ? "currentColor" : "none"} />
                                </button>
                                <InlineEdit value={grp.name} onSave={(name) => updateAdGroup(camp.id, grp.id, { name })} className="font-semibold text-[14px] text-zinc-800 flex-1" />
                                {grp.isPremium && (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">Премиум</span>
                                )}
                                {grpResult && grpResult.dailyBudget > 0 && (
                                  <div className="shrink-0 flex items-center gap-1 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1">
                                    <span className="font-black text-blue-700 font-mono text-[13px]">${grpResult.dailyBudget.toFixed(2)}</span>
                                    <span className="text-[10px] text-blue-400 font-medium">/день</span>
                                    <CopyButton text={grpResult.dailyBudget.toFixed(2)} />
                                  </div>
                                )}
                                <button onClick={() => deleteAdGroup(camp.id, grp.id)} className="p-1 rounded-lg hover:bg-red-50 text-zinc-200 hover:text-red-400 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Ads inside group */}
                              {grp.ads.length > 0 && (
                                <div className="px-4 pb-2 space-y-1.5 border-t border-zinc-100 pt-2">
                                  {grp.ads.map((ad) => (
                                    <div key={ad.id} className="flex items-center gap-2 pl-6">
                                      <FileText className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                                      <InlineEdit value={ad.name} onSave={(name) => updateAdName(camp.id, grp.id, ad.id, name)} className="text-[13px] text-zinc-600 flex-1" />
                                      <button onClick={() => deleteAd(camp.id, grp.id, ad.id)} className="p-0.5 text-zinc-200 hover:text-red-400 transition-colors">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Add ad button */}
                              <div className="px-4 py-2 border-t border-zinc-100/60">
                                <button
                                  onClick={() => addAd(camp.id, grp.id)}
                                  className="flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-blue-600 transition-colors font-medium pl-6"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Добавить объявление
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        <button
                          onClick={() => addAdGroup(camp.id)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border-2 border-dashed border-zinc-200 hover:border-blue-200"
                        >
                          <Plus className="w-3.5 h-3.5" /> Добавить группу объявлений
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add campaign buttons */}
              {activePlan.campaigns.length > 0 && (
                <div className="flex gap-3 pt-2">
                  <button onClick={() => addCampaign("meta")} className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-blue-200 text-blue-600 rounded-2xl text-[13px] font-semibold hover:bg-blue-50 transition-colors">
                    <MetaIcon className="w-4 h-4" /> + Meta Ads кампания
                  </button>
                  <button onClick={() => addCampaign("tiktok")} className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-200 text-zinc-600 rounded-2xl text-[13px] font-semibold hover:bg-zinc-50 transition-colors">
                    <TikTokIcon className="w-4 h-4" /> + TikTok Ads кампания
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Right: Results panel ════════════════════════════════════ */}
      {activePlan && results.length > 0 && (
        <div className="w-[300px] shrink-0 bg-white border-l border-zinc-200/80 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Итоговые настройки</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">Что поставить в Meta / TikTok</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {results.map((r) => (
              <div
                key={r.adGroupId}
                className={`p-3 rounded-[1.25rem] border ${r.isPremium ? "bg-amber-50/60 border-amber-100" : "bg-zinc-50 border-zinc-100"}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-[11px] text-zinc-400 font-medium truncate">{r.campaignName}</p>
                    <p className="text-[13px] font-bold text-zinc-800 truncate flex items-center gap-1">
                      {r.isPremium && <Star className="w-3 h-3 text-amber-500 shrink-0" fill="currentColor" />}
                      {r.adGroupName}
                    </p>
                  </div>
                  <PlatformBadge platform={r.platform} />
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-200/60">
                  <div>
                    <div className="text-[11px] text-zinc-400 font-medium">Дневной бюджет</div>
                    <div className="font-black text-[18px] text-zinc-900 font-mono leading-tight">
                      ${r.dailyBudget.toFixed(2)}
                    </div>
                  </div>
                  <CopyButton text={r.dailyBudget.toFixed(2)} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                  <span>{r.percentage.toFixed(1)}% бюджета</span>
                  <span>${r.monthlyBudget.toFixed(0)}/мес</span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${r.isPremium ? "bg-amber-400" : "bg-blue-500"}`}
                    style={{ width: `${Math.min(r.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Summary footer */}
          <div className="p-4 border-t border-zinc-100 bg-zinc-50">
            <div className="flex justify-between text-[13px] font-semibold text-zinc-700">
              <span>Итого / день:</span>
              <span className="font-mono font-black text-zinc-900">${dailyTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[12px] text-zinc-400 mt-1">
              <span>Итого / месяц:</span>
              <span className="font-mono">${activePlan.monthlyBudget.toFixed(0)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
