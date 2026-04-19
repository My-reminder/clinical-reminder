import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Search, Plus, Edit3, Trash2, Send, Phone, Pill, Clock, UserX } from "lucide-react";
import PatientForm from "../components/PatientForm";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

const Patients = () => {
  const { t } = useApp();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/patients");
      setPatients(res.data);
    } catch (err) {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/patients/${confirmDelete.id}`);
      toast.success(t("patient_deleted"));
      setConfirmDelete(null);
      load();
    } catch (e) {
      toast.error(t("error"));
    }
  };

  const handleTestSend = async (id) => {
    try {
      const res = await api.post(`/reminders/test/${id}`);
      if (res.data.status === "sent") {
        toast.success(`${t("test_sent")} (${res.data.channel})`);
      } else {
        toast.error(`${t("test_failed")}: ${res.data.error || ""}`);
      }
    } catch (e) {
      toast.error(t("test_failed"));
    }
  };

  const filtered = patients.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.medicine.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-clinic-muted mb-2">{t("nav_patients")}</div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold text-clinic-text tracking-tight">
              {t("total_patients")}
            </h1>
          </div>
          <Button
            data-testid="open-add-patient"
            className="btn-primary rounded-xl px-5 py-6"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> {t("add_patient")}
          </Button>
        </div>

        <div className="mb-6 relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-clinic-muted" />
          <Input
            data-testid="patient-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="pl-10 bg-clinic-surface border-clinic-border"
          />
        </div>

        {loading ? (
          <div className="p-10 text-center text-clinic-muted text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-clinic-surface border border-clinic-border rounded-2xl p-16 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-clinic-tint flex items-center justify-center mb-4">
              <UserX className="w-6 h-6 text-clinic-muted" />
            </div>
            <div className="text-clinic-muted text-sm" data-testid="no-patients">{t("no_patients")}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <div
                key={p.id}
                data-testid={`patient-card-${p.id}`}
                className="card-hover bg-clinic-surface border border-clinic-border rounded-2xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-clinic-secondary/50 text-clinic-text font-medium flex items-center justify-center flex-shrink-0">
                      {p.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-heading font-semibold text-clinic-text truncate">{p.name}</div>
                      <div className="text-xs text-clinic-muted flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {p.phone}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                      p.active ? "bg-clinic-tint text-clinic-primary" : "bg-clinic-border text-clinic-muted"
                    }`}
                  >
                    {p.active ? t("active") : "—"}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-clinic-text">
                    <Pill className="w-4 h-4 text-clinic-muted flex-shrink-0" />
                    <span className="font-medium">{p.medicine}</span>
                    {p.dosage && <span className="text-clinic-muted text-xs">· {p.dosage}</span>}
                  </div>
                  <div className="flex items-start gap-2 text-sm text-clinic-muted">
                    <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      {p.reminder_times.map((tm) => (
                        <span key={`${p.id}-${tm}`} className="px-2 py-0.5 bg-clinic-tint rounded-md text-xs font-medium text-clinic-text">
                          {tm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider mb-4">
                  <span className="px-2 py-1 rounded-full bg-clinic-tint text-clinic-primary">{t(`freq_${p.frequency}`)}</span>
                  {p.empty_stomach && <span className="px-2 py-1 rounded-full bg-clinic-secondary/40 text-clinic-text">{t("empty_stomach_yes")}</span>}
                  <span className="px-2 py-1 rounded-full bg-clinic-border text-clinic-muted">{p.language === "hi" ? "हिं" : "EN"}</span>
                </div>

                <div className="flex gap-2 pt-3 border-t border-clinic-border">
                  <Button
                    data-testid={`test-send-${p.id}`}
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-clinic-primary hover:bg-clinic-tint"
                    onClick={() => handleTestSend(p.id)}
                  >
                    <Send className="w-3.5 h-3.5 mr-1" /> {t("test_send")}
                  </Button>
                  <Button
                    data-testid={`edit-${p.id}`}
                    variant="ghost"
                    size="sm"
                    className="text-clinic-muted hover:bg-clinic-tint hover:text-clinic-text"
                    onClick={() => {
                      setEditing(p);
                      setFormOpen(true);
                    }}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    data-testid={`delete-${p.id}`}
                    variant="ghost"
                    size="sm"
                    className="text-clinic-warning hover:bg-[#FBEAE6]"
                    onClick={() => setConfirmDelete(p)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <PatientForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          patient={editing}
          onSaved={() => {
            setFormOpen(false);
            load();
          }}
        />

        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent data-testid="delete-confirm-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("delete")}?</AlertDialogTitle>
              <AlertDialogDescription>{t("confirm_delete")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="delete-cancel">{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                data-testid="delete-confirm"
                className="bg-clinic-warning hover:bg-[#a8543f] text-white"
                onClick={handleDelete}
              >
                {t("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Patients;
