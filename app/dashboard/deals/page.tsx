"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { TableSkeleton } from "@/components/skeleton";
import type { Deal, Contact } from "@/lib/types/database";
import {
  Briefcase,
  Plus,
  X,
  Pencil,
  Trash2,
  Loader2,
  DollarSign,
  Calendar,
} from "lucide-react";

type DealWithContact = Deal & { contacts: Pick<Contact, "id" | "name" | "company"> | null };

const stageOptions = ["discovery", "proposal", "negotiation", "closed_won", "closed_lost"] as const;

const stageLabel: Record<string, string> = {
  discovery: "Discovery",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const stageColor: Record<string, string> = {
  discovery: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  proposal: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  negotiation: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  closed_won: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  closed_lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function DealsPage() {
  const [deals, setDeals] = useState<DealWithContact[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealWithContact | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    contact_id: "",
    title: "",
    value: "",
    currency: "USD",
    stage: "discovery" as Deal["stage"],
    expected_close_date: "",
    notes: "",
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let dealsQuery = supabase
      .from("deals")
      .select("*, contacts(id, name, company)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (filterStage) dealsQuery = dealsQuery.eq("stage", filterStage);

    const [dealsRes, contactsRes] = await Promise.all([
      dealsQuery,
      supabase.from("contacts").select("*").eq("user_id", user.id).order("name"),
    ]);

    if (dealsRes.error) setError(dealsRes.error.message);
    else setDeals((dealsRes.data as DealWithContact[]) ?? []);

    setContacts(contactsRes.data ?? []);
    setLoading(false);
  }, [filterStage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({
      contact_id: "",
      title: "",
      value: "",
      currency: "USD",
      stage: "discovery",
      expected_close_date: "",
      notes: "",
    });
    setEditingDeal(null);
    setShowForm(false);
  };

  const openEdit = (deal: DealWithContact) => {
    setEditingDeal(deal);
    setFormData({
      contact_id: deal.contact_id,
      title: deal.title,
      value: String(deal.value),
      currency: deal.currency,
      stage: deal.stage,
      expected_close_date: deal.expected_close_date
        ? new Date(deal.expected_close_date).toISOString().split("T")[0]
        : "",
      notes: deal.notes || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      contact_id: formData.contact_id,
      title: formData.title,
      value: parseFloat(formData.value) || 0,
      currency: formData.currency,
      stage: formData.stage,
      expected_close_date: formData.expected_close_date
        ? new Date(formData.expected_close_date).toISOString()
        : null,
      notes: formData.notes || null,
    };

    const url = editingDeal ? `/api/deals/${editingDeal.id}` : "/api/deals";
    const method = editingDeal ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.success) {
      resetForm();
      fetchData();
    } else {
      setError(data.error);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setDeals((prev) => prev.filter((d) => d.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Deals</h1>
        <TableSkeleton />
      </div>
    );
  }

  if (error && deals.length === 0) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Deals</h1>
          <p className="text-sm text-text-muted mt-1">
            {deals.length} deals &middot; $
            {deals.reduce((sum, d) => sum + Number(d.value), 0).toLocaleString()} total
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
          disabled={contacts.length === 0}
          title={contacts.length === 0 ? "Add a contact first" : undefined}
        >
          <Plus size={16} />
          Add deal
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStage("")}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            !filterStage ? "bg-primary text-white" : "bg-surface-hover text-text-secondary"
          }`}
        >
          All
        </button>
        {stageOptions.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStage(s)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filterStage === s ? "bg-primary text-white" : "bg-surface-hover text-text-secondary"
            }`}
          >
            {stageLabel[s]}
          </button>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                {editingDeal ? "Edit Deal" : "New Deal"}
              </h2>
              <button onClick={resetForm} className="p-1 hover:bg-surface-hover rounded-lg">
                <X size={18} className="text-text-muted" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Contact *</label>
                <select
                  value={formData.contact_id}
                  onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select a contact</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  required
                  placeholder="e.g., Acme Corp - Enterprise Plan"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Value</label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="input"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="input"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) =>
                      setFormData({ ...formData, stage: e.target.value as Deal["stage"] })
                    }
                    className="input"
                  >
                    {stageOptions.map((s) => (
                      <option key={s} value={s}>
                        {stageLabel[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Expected Close
                  </label>
                  <input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expected_close_date: e.target.value })
                    }
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input min-h-[80px] resize-y"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingDeal ? "Save changes" : "Create deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deals list */}
      {deals.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No deals yet"
          description={
            contacts.length === 0
              ? "Add a contact first, then create deals to track your pipeline."
              : "Start tracking your pipeline by creating your first deal."
          }
          actionLabel={contacts.length > 0 ? "Add deal" : undefined}
          onAction={contacts.length > 0 ? () => { resetForm(); setShowForm(true); } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {deals.map((deal) => (
            <div key={deal.id} className="card flex flex-col sm:flex-row sm:items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-text-primary truncate">{deal.title}</h3>
                  <span className={`badge ${stageColor[deal.stage]}`}>{stageLabel[deal.stage]}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
                  {deal.contacts && (
                    <span>{deal.contacts.name}{deal.contacts.company ? ` — ${deal.contacts.company}` : ""}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <DollarSign size={12} />
                    {Number(deal.value).toLocaleString()} {deal.currency}
                  </span>
                  {deal.expected_close_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(deal.expected_close_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openEdit(deal)}
                  className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-text-muted"
                  aria-label="Edit"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(deal.id)}
                  className="p-2 hover:bg-danger/10 rounded-lg transition-colors text-text-muted hover:text-danger"
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
