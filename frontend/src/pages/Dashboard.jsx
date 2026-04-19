import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { Users, UserCheck, Send, CalendarClock, AlertTriangle, Pill, Clock, HeartPulse, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";

const StatCard = ({ icon: Icon, label, value, accent, testId }) => (
  <div
    data-testid={testId}
    className="card-hover bg-clinic-surface border border-clinic-border rounded-2xl p-6"
  >
    <div className="flex items-start justify-between">
      <div>
        <div className="text-sm uppercase tracking-[0.15em] text-clinic-muted font-medium">{label}</div>
        <div className="font-heading text-4xl font-bold text-clinic-text mt-3">{value}</div>
      </div>
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          accent === "warn" ? "bg-[#FBEAE6] text-clinic-warning" : "bg-clinic-tint text-clinic-primary"
        }`}
      >
        <Icon className="w-5 h-5" strokeWidth={1.8} />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { t, user, lang } = useApp();
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [adherence, setAdherence] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [s, u, a] = await Promise.all([
        api.get("/stats"),
        api.get("/reminders/upcoming"),
        api.get("/adherence?limit=5"),
      ]);
      setStats(s.data);
      setUpcoming(u.data);
      setAdherence(a.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <div className="text-sm uppercase tracking-[0.2em] text-clinic-muted mb-2">{t("overview")}</div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-clinic-text tracking-tight">
            {t("welcome")}, {user?.name?.split(" ")[0] || ""}
          </h1>
          <p className="text-base text-clinic-muted mt-3">{t("manage")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard testId="stat-total" icon={Users} label={t("total_patients")} value={stats?.total_patients ?? "–"} />
          <StatCard testId="stat-active" icon={UserCheck} label={t("active_patients")} value={stats?.active_patients ?? "–"} />
          <StatCard testId="stat-sent" icon={Send} label={t("sent_today")} value={stats?.reminders_sent_today ?? "–"} />
          <StatCard
            testId="stat-adherence"
            icon={HeartPulse}
            label={t("adherence_rate")}
            value={stats?.adherence_rate_today != null ? `${stats.adherence_rate_today}%` : "—"}
          />
        </div>

        {stats?.reminders_failed_today > 0 && (
          <div
            data-testid="failed-alert"
            className="mb-8 p-4 rounded-2xl border border-clinic-warning/30 bg-[#FBEAE6] flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-clinic-warning flex-shrink-0" />
            <div className="text-sm text-clinic-text">
              {stats.reminders_failed_today} {t("failed_today")}. Check Reminders tab for details.
            </div>
          </div>
        )}

        {/* Upcoming + Adherence grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-clinic-surface border border-clinic-border rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-clinic-border flex items-center justify-between">
              <h2 className="font-heading text-2xl font-semibold text-clinic-text">{t("upcoming")}</h2>
              <CalendarClock className="w-5 h-5 text-clinic-muted" />
            </div>
            {loading ? (
              <div className="p-10 text-center text-clinic-muted text-sm">Loading...</div>
            ) : upcoming.length === 0 ? (
              <div className="p-10 text-center text-clinic-muted text-sm" data-testid="no-upcoming">{t("no_upcoming")}</div>
            ) : (
              <div className="divide-y divide-clinic-border">
                {upcoming.slice(0, 8).map((r, i) => (
                  <div key={i} data-testid={`upcoming-item-${i}`} className="p-5 flex items-center gap-4 hover:bg-clinic-tint/40 transition">
                    <div className="w-11 h-11 rounded-xl bg-clinic-tint flex items-center justify-center flex-shrink-0">
                      <Pill className="w-5 h-5 text-clinic-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-clinic-text truncate">
                        {r.patient_name} · <span className="text-clinic-muted font-normal">{r.medicine}</span>
                      </div>
                      <div className="text-xs text-clinic-muted mt-1 flex items-center gap-2 flex-wrap">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(r.when_iso), "EEE, MMM d · HH:mm")}
                        {r.empty_stomach && (
                          <span className="px-2 py-0.5 rounded-full bg-clinic-secondary/30 text-[10px] uppercase tracking-wider">
                            {t("empty_stomach_yes")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs uppercase tracking-wider text-clinic-muted hidden sm:block">
                      {r.language === "hi" ? "हिं" : "EN"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent adherence */}
          <div className="bg-clinic-surface border border-clinic-border rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-clinic-border">
              <div className="flex items-center gap-2 mb-1">
                <HeartPulse className="w-5 h-5 text-clinic-primary" />
                <h2 className="font-heading text-xl font-semibold text-clinic-text">{t("adherence")}</h2>
              </div>
              {stats && (
                <div className="text-xs text-clinic-muted mt-2 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-clinic-primary" />{stats.adherence_taken_today ?? 0}</span>
                  <span className="inline-flex items-center gap-1"><XCircle className="w-3 h-3 text-clinic-warning" />{stats.adherence_skipped_today ?? 0}</span>
                </div>
              )}
            </div>
            {adherence.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="w-8 h-8 mx-auto text-clinic-muted/50 mb-2" />
                <div className="text-xs text-clinic-muted leading-relaxed">{t("no_adherence")}</div>
              </div>
            ) : (
              <div className="divide-y divide-clinic-border">
                {adherence.map((a) => {
                  const icon =
                    a.status === "taken" ? CheckCircle2 : a.status === "skipped" ? XCircle : MessageSquare;
                  const Ic = icon;
                  const color =
                    a.status === "taken"
                      ? "bg-clinic-tint text-clinic-primary"
                      : a.status === "skipped"
                      ? "bg-[#FBEAE6] text-clinic-warning"
                      : "bg-clinic-border text-clinic-muted";
                  return (
                    <div key={a.id} className="p-4 flex items-start gap-3" data-testid={`adh-${a.id}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                        <Ic className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-clinic-text truncate">{a.patient_name}</div>
                        <div className="text-xs text-clinic-muted truncate">
                          {t(a.status === "taken" ? "taken" : a.status === "skipped" ? "skipped" : "unknown_reply")} · {a.medicine}
                        </div>
                        <div className="text-[10px] text-clinic-muted mt-0.5">
                          {format(parseISO(a.responded_at), "MMM d · HH:mm")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
