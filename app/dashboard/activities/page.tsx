"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { TableSkeleton } from "@/components/skeleton";
import type { Activity as ActivityType, Contact } from "@/lib/types/database";
import {
  Activity,
  Plus,
  X,
  Trash2,
  Loader2,
  Phone,
  Mail,
  Video,
  FileText,
  CheckCircle,
  Clock,
} from "lucide-react";

type ActivityWithContact = ActivityType & {
  contacts: Pick<Contact, "id" | "name" | "company"> | null;
};

const typeOptions = ["call", "email", "meeting", "note"] as const;

const typeIcon: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Video,
  note: FileText,
};

const typeColor: Record<string, string> = {
  call: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  email: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  meeting: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  note: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityWithContact[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    contact_id: "",
    type: "note" as ActivityType["type"],
    description: "",
    scheduled_at: "",
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let actQuery = supabase
      .from("activities")
      .select("*, contacts(id, name, company)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (filterType) actQuery = actQuery.eq("type", filterType);

    const [actRes, contactsRes] = await Promise.all([
      actQuery,
      supabase.from("contacts").select("*").eq("user_id", user.id).order("name"),
    ]);

    if (actRes.error) setError(actRes.error.message);
    else setActivities((actRes.data as ActivityWithContact[]) ?? []);

    setContacts(contactsRes.data ?? []);
    setLoading(false);
  }, [filterType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({ contact_id: "", type: "note", description: "", scheduled_at: "" });
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      contact_id: formData.contact_id,
      type: formData.type,
      description: formData.description,
      scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
    };

    const res = await fetch("/api/activities", {
      method: "POST",
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

  const handleMarkComplete = async (id: string) => {
    const res = await fetch(`/api/activities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed_at: new Date().toISOString() }),
    });
    const data = await res.json();
    if (data.success) fetchData();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setActivities((prev) => prev.filter((a) => a.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Activities</h1>
        <TableSkeleton />
      </div>
    );
  }

  if (error && activities.length === 0) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Activities</h1>
          <p className="text-sm text-text-muted mt-1">{activities.length} activities logged</p>
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
          Log activity
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterType("")}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            !filterType ? "bg-primary text-white" : "bg-surface-hover text-text-secondary"
          }`}
        >
          All
        </button>
        {typeOptions.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors capitalize ${
              filterType === t ? "bg-primary text-white" : "bg-surface-hover text-text-secondary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Log Activity</h2>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as ActivityType["type"] })
                    }
                    className="input"
                  >
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Scheduled for
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input min-h-[100px] resize-y"
                  required
                  placeholder="What happened or what needs to happen?"
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
                  Log activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activities list */}
      {activities.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activities yet"
          description={
            contacts.length === 0
              ? "Add a contact first, then log activities to track your interactions."
              : "Start tracking your sales activities by logging calls, emails, and meetings."
          }
          actionLabel={contacts.length > 0 ? "Log activity" : undefined}
          onAction={contacts.length > 0 ? () => { resetForm(); setShowForm(true); } : undefined}
        />
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => {
            const Icon = typeIcon[activity.type] || FileText;
            return (
              <div key={activity.id} className="card flex items-start gap-3 p-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${typeColor[activity.type]}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-text-primary capitalize">
                      {activity.type}
                    </span>
                    {activity.completed_at ? (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <CheckCircle size={12} />
                        Completed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <Clock size={12} />
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2">{activity.description}</p>
                  <div className="flex gap-3 mt-1 text-xs text-text-muted">
                    {activity.contacts && (
                      <span>
                        {activity.contacts.name}
                        {activity.contacts.company ? ` — ${activity.contacts.company}` : ""}
                      </span>
                    )}
                    {activity.scheduled_at && (
                      <span>
                        Scheduled: {new Date(activity.scheduled_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!activity.completed_at && (
                    <button
                      onClick={() => handleMarkComplete(activity.id)}
                      className="p-2 hover:bg-success/10 rounded-lg transition-colors text-text-muted hover:text-success"
                      title="Mark complete"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(activity.id)}
                    className="p-2 hover:bg-danger/10 rounded-lg transition-colors text-text-muted hover:text-danger"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
