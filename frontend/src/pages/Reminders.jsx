import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { format, parseISO } from "date-fns";
import { CheckCircle2, XCircle, MessageCircle, Phone, Clock, CalendarClock, Pill, HeartPulse, MessageSquare } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

const Reminders = () => {
  const { t } = useApp();
  const [logs, setLogs] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [adherence, setAdherence] = useState([]);
  const [adhStats, setAdhStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [l, u, a, s] = await Promise.all([
          api.get("/reminders/logs?limit=200"),
          api.get("/reminders/upcoming"),
          api.get("/adherence?limit=200"),
          api.get("/adherence/stats"),
        ]);
        setLogs(l.data);
        setUpcoming(u.data);
        setAdherence(a.data);
        setAdhStats(s.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="text-sm uppercase tracking-[0.2em] text-clinic-muted mb-2">{t("nav_reminders")}</div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-clinic-text tracking-tight">
            {t("upcoming")}
          </h1>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="bg-clinic-tint border border-clinic-border rounded-xl p-1 mb-6" data-testid="reminder-tabs">
            <TabsTrigger data-testid="tab-upcoming" value="upcoming" className="rounded-lg data-[state=active]:bg-clinic-surface data-[state=active]:text-clinic-text">
              {t("upcoming")}
            </TabsTrigger>
            <TabsTrigger data-testid="tab-logs" value="logs" className="rounded-lg data-[state=active]:bg-clinic-surface data-[state=active]:text-clinic-text">
              {t("reminder_logs")}
            </TabsTrigger>
            <TabsTrigger data-testid="tab-adherence" value="adherence" className="rounded-lg data-[state=active]:bg-clinic-surface data-[state=active]:text-clinic-text">
              {t("adherence")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <div className="bg-clinic-surface border border-clinic-border rounded-2xl overflow-hidden">
              {loading ? (
                <div className="p-10 text-center text-clinic-muted text-sm">Loading...</div>
              ) : upcoming.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-clinic-tint flex items-center justify-center mb-4">
                    <CalendarClock className="w-6 h-6 text-clinic-muted" />
                  </div>
                  <div className="text-clinic-muted text-sm">{t("no_upcoming")}</div>
                </div>
              ) : (
                <div className="divide-y divide-clinic-border">
                  {upcoming.map((r, i) => (
                    <div key={i} className="p-5 flex items-center gap-4 hover:bg-clinic-tint/40 transition" data-testid={`r-upcoming-${i}`}>
                      <div className="w-11 h-11 rounded-xl bg-clinic-tint flex items-center justify-center flex-shrink-0">
                        <Pill className="w-5 h-5 text-clinic-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-clinic-text">
                          {r.patient_name} · <span className="text-clinic-muted font-normal">{r.medicine}</span>
                        </div>
                        <div className="text-xs text-clinic-muted mt-1 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(r.when_iso), "EEE, MMM d · HH:mm")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <div className="bg-clinic-surface border border-clinic-border rounded-2xl overflow-hidden">
              {loading ? (
                <div className="p-10 text-center text-clinic-muted text-sm">Loading...</div>
              ) : logs.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-clinic-tint flex items-center justify-center mb-4">
                    <MessageCircle className="w-6 h-6 text-clinic-muted" />
                  </div>
                  <div className="text-clinic-muted text-sm" data-testid="no-logs">{t("no_logs")}</div>
                </div>
              ) : (
                <div className="divide-y divide-clinic-border">
                  {logs.map((l, i) => {
                    const sent = l.status === "sent";
                    return (
                      <div key={l.id} className="p-5 flex items-start gap-4" data-testid={`log-${i}`}>
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            sent ? "bg-clinic-tint text-clinic-primary" : "bg-[#FBEAE6] text-clinic-warning"
                          }`}
                        >
                          {sent ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-medium text-clinic-text">{l.patient_name}</div>
                            <span className="text-xs text-clinic-muted">·</span>
                            <div className="text-sm text-clinic-muted">{l.medicine}</div>
                            <span
                              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                sent ? "bg-clinic-tint text-clinic-primary" : "bg-[#FBEAE6] text-clinic-warning"
                              }`}
                            >
                              {sent ? t("status_sent") : t("status_failed")}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-clinic-border text-clinic-muted flex items-center gap-1">
                              {l.channel === "whatsapp" ? <MessageCircle className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                              {l.channel === "whatsapp" ? t("channel_whatsapp") : t("channel_sms")}
                            </span>
                          </div>
                          <div className="text-xs text-clinic-muted mt-1">
                            {t("at")} {l.scheduled_time} · {format(parseISO(l.sent_at), "MMM d, HH:mm:ss")}
                          </div>
                          <div className="text-xs text-clinic-muted mt-2 bg-clinic-bg rounded-md p-2 border border-clinic-border">
                            {l.message}
                          </div>
                          {l.error && (
                            <div className="text-xs text-clinic-warning mt-1.5">{l.error}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="adherence">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-clinic-surface border border-clinic-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <HeartPulse className="w-5 h-5 text-clinic-primary" />
                  <div className="text-sm uppercase tracking-[0.15em] text-clinic-muted font-medium">Today</div>
                </div>
                <div className="font-heading text-4xl font-bold text-clinic-text">
                  {adhStats?.today?.rate != null ? `${adhStats.today.rate}%` : "—"}
                </div>
                <div className="text-xs text-clinic-muted mt-1">
                  {adhStats?.today?.total || 0} {t("responded")}
                </div>
              </div>
              <div className="bg-clinic-surface border border-clinic-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarClock className="w-5 h-5 text-clinic-primary" />
                  <div className="text-sm uppercase tracking-[0.15em] text-clinic-muted font-medium">7 Days</div>
                </div>
                <div className="font-heading text-4xl font-bold text-clinic-text">
                  {adhStats?.last_7_days?.rate != null ? `${adhStats.last_7_days.rate}%` : "—"}
                </div>
                <div className="text-xs text-clinic-muted mt-1">
                  {adhStats?.last_7_days?.total || 0} {t("responded")}
                </div>
              </div>
              <div className="bg-clinic-tint/50 border border-clinic-border rounded-2xl p-6">
                <div className="text-xs text-clinic-text leading-relaxed">
                  💬 {t("adherence_tip")}
                </div>
              </div>
            </div>

            <div className="bg-clinic-surface border border-clinic-border rounded-2xl overflow-hidden">
              {loading ? (
                <div className="p-10 text-center text-clinic-muted text-sm">Loading...</div>
              ) : adherence.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-clinic-tint flex items-center justify-center mb-4">
                    <MessageSquare className="w-6 h-6 text-clinic-muted" />
                  </div>
                  <div className="text-clinic-muted text-sm max-w-sm mx-auto" data-testid="no-adherence">{t("no_adherence")}</div>
                </div>
              ) : (
                <div className="divide-y divide-clinic-border">
                  {adherence.map((a) => {
                    const Ic =
                      a.status === "taken" ? CheckCircle2 : a.status === "skipped" ? XCircle : MessageSquare;
                    const color =
                      a.status === "taken"
                        ? "bg-clinic-tint text-clinic-primary"
                        : a.status === "skipped"
                        ? "bg-[#FBEAE6] text-clinic-warning"
                        : "bg-clinic-border text-clinic-muted";
                    return (
                      <div key={a.id} className="p-5 flex items-start gap-4" data-testid={`adherence-${a.id}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                          <Ic className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-medium text-clinic-text">{a.patient_name}</div>
                            <span className="text-xs text-clinic-muted">·</span>
                            <div className="text-sm text-clinic-muted">{a.medicine}</div>
                            <span
                              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                a.status === "taken"
                                  ? "bg-clinic-tint text-clinic-primary"
                                  : a.status === "skipped"
                                  ? "bg-[#FBEAE6] text-clinic-warning"
                                  : "bg-clinic-border text-clinic-muted"
                              }`}
                            >
                              {t(a.status === "taken" ? "taken" : a.status === "skipped" ? "skipped" : "unknown_reply")}
                            </span>
                          </div>
                          <div className="text-xs text-clinic-muted mt-1">
                            {format(parseISO(a.responded_at), "MMM d, HH:mm:ss")}
                            {a.scheduled_time && ` · ${t("at")} ${a.scheduled_time}`}
                          </div>
                          <div className="text-xs text-clinic-text mt-2 bg-clinic-bg rounded-md p-2 border border-clinic-border italic">
                            "{a.reply_body}"
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Reminders;
