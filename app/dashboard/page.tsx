import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Users, Briefcase, Activity, TrendingUp } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [contactsRes, dealsRes, activitiesRes] = await Promise.all([
    supabase.from("contacts").select("id, status", { count: "exact" }).eq("user_id", user.id),
    supabase.from("deals").select("id, stage, value", { count: "exact" }).eq("user_id", user.id),
    supabase.from("activities").select("id, type, completed_at", { count: "exact" }).eq("user_id", user.id),
  ]);

  const contacts = contactsRes.data ?? [];
  const deals = dealsRes.data ?? [];
  const activities = activitiesRes.data ?? [];

  const totalPipeline = deals
    .filter((d) => !["closed_won", "closed_lost"].includes(d.stage))
    .reduce((sum, d) => sum + Number(d.value), 0);

  const wonRevenue = deals
    .filter((d) => d.stage === "closed_won")
    .reduce((sum, d) => sum + Number(d.value), 0);

  const stats = [
    {
      label: "Total Contacts",
      value: contacts.length,
      icon: Users,
      href: "/dashboard/contacts",
      sub: `${contacts.filter((c) => c.status === "customer").length} customers`,
    },
    {
      label: "Active Deals",
      value: deals.filter((d) => !["closed_won", "closed_lost"].includes(d.stage)).length,
      icon: Briefcase,
      href: "/dashboard/deals",
      sub: `$${totalPipeline.toLocaleString()} pipeline`,
    },
    {
      label: "Activities",
      value: activities.length,
      icon: Activity,
      href: "/dashboard/activities",
      sub: `${activities.filter((a) => a.completed_at).length} completed`,
    },
    {
      label: "Won Revenue",
      value: `$${wonRevenue.toLocaleString()}`,
      icon: TrendingUp,
      href: "/dashboard/deals",
      sub: `${deals.filter((d) => d.stage === "closed_won").length} deals closed`,
    },
  ];

  const stageOrder = ["discovery", "proposal", "negotiation", "closed_won", "closed_lost"] as const;
  const stageCounts = stageOrder.map((stage) => ({
    stage,
    count: deals.filter((d) => d.stage === stage).length,
    value: deals
      .filter((d) => d.stage === stage)
      .reduce((sum, d) => sum + Number(d.value), 0),
  }));

  const stageLabels: Record<string, string> = {
    discovery: "Discovery",
    proposal: "Proposal",
    negotiation: "Negotiation",
    closed_won: "Closed Won",
    closed_lost: "Closed Lost",
  };

  const stageColors: Record<string, string> = {
    discovery: "bg-blue-500",
    proposal: "bg-amber-500",
    negotiation: "bg-purple-500",
    closed_won: "bg-green-500",
    closed_lost: "bg-red-500",
  };

  const recentActivities = activities.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">Your sales pipeline at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href, sub }) => (
          <Link key={label} href={href} className="card hover:border-primary/30 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-text-muted">{label}</span>
              <Icon size={18} className="text-text-muted group-hover:text-primary transition-colors" />
            </div>
            <div className="text-2xl font-bold text-text-primary">{value}</div>
            <div className="text-xs text-text-muted mt-1">{sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline stages */}
        <div className="card">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Pipeline Stages</h2>
          {deals.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">
              No deals yet.{" "}
              <Link href="/dashboard/deals" className="text-primary hover:text-primary-hover">
                Create your first deal
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {stageCounts.map(({ stage, count, value }) => (
                <div key={stage} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${stageColors[stage]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">{stageLabels[stage]}</span>
                      <span className="text-sm font-medium text-text-primary">{count} deals</span>
                    </div>
                    <div className="text-xs text-text-muted">${value.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h2>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">
              No activities yet.{" "}
              <Link href="/dashboard/activities" className="text-primary hover:text-primary-hover">
                Log your first activity
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 py-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                      activity.completed_at
                        ? "bg-success/10 text-success"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {activity.type.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-secondary capitalize">{activity.type}</div>
                    <div className="text-xs text-text-muted">
                      {activity.completed_at ? "Completed" : "Pending"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
