import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { format, parseISO } from "date-fns";
import { CheckCircle2, XCircle, MessageCircle, Phone, Clock, CalendarClock, Pill } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

const Reminders = () => {
  const { t } = useApp();
  const [logs, setLogs] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [l, u] = await Promise.all([api.get("/reminders/logs?limit=200"), api.get("/reminders/upcoming")]);
        setLogs(l.data);
        setUpcoming(u.data);
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
        </Tabs>
      </div>
    </Layout>
  );
};

export default Reminders;
