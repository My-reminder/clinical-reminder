import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";

const emptyForm = {
  name: "",
  phone: "",
  medicine: "",
  dosage: "",
  reminder_times: ["09:00"],
  frequency: "daily",
  one_time_date: "",
  empty_stomach: false,
  language: "en",
  notes: "",
  active: true,
};

const PatientForm = ({ open, onClose, patient, onSaved }) => {
  const { t } = useApp();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (patient) {
      setForm({
        name: patient.name || "",
        phone: patient.phone || "",
        medicine: patient.medicine || "",
        dosage: patient.dosage || "",
        reminder_times: patient.reminder_times?.length ? patient.reminder_times : ["09:00"],
        frequency: patient.frequency || "daily",
        one_time_date: patient.one_time_date || "",
        empty_stomach: !!patient.empty_stomach,
        language: patient.language || "en",
        notes: patient.notes || "",
        active: patient.active !== false,
      });
    } else {
      setForm(emptyForm);
    }
  }, [patient, open]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addTime = () => {
    setForm((f) => ({ ...f, reminder_times: [...f.reminder_times, "12:00"] }));
  };
  const removeTime = (i) => {
    setForm((f) => ({ ...f, reminder_times: f.reminder_times.filter((_, idx) => idx !== i) }));
  };
  const updateTime = (i, val) => {
    setForm((f) => ({ ...f, reminder_times: f.reminder_times.map((t, idx) => (idx === i ? val : t)) }));
  };

  const handleFreqChange = (v) => {
    setForm((f) => {
      let times = f.reminder_times;
      if (v === "multiple" && times.length < 2) {
        times = [...times, "20:00"];
      } else if ((v === "once" || v === "daily") && times.length > 1) {
        times = [times[0]];
      }
      return { ...f, frequency: v, reminder_times: times };
    });
  };

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.medicine.trim()) {
      toast.error(t("error"));
      return;
    }
    if (!form.reminder_times.length) {
      toast.error(t("required_time"));
      return;
    }
    if (form.frequency === "once" && !form.one_time_date) {
      toast.error(t("error"));
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.frequency !== "once") payload.one_time_date = null;
      if (patient) {
        await api.put(`/patients/${patient.id}`, payload);
        toast.success(t("patient_updated"));
      } else {
        await api.post("/patients", payload);
        toast.success(t("patient_added"));
      }
      onSaved?.();
    } catch (e) {
      const msg = e.response?.data?.detail || t("error");
      toast.error(typeof msg === "string" ? msg : t("error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl bg-clinic-surface border-clinic-border max-h-[90vh] overflow-y-auto" data-testid="patient-form-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl text-clinic-text">
            {patient ? t("edit_patient") : t("add_patient")}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-2">
          <div className="md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-clinic-muted">{t("patient_name")}</Label>
            <Input
              data-testid="input-name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className="mt-1.5 bg-clinic-bg border-clinic-border"
              placeholder="Aditi Sharma"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-clinic-muted">{t("phone")}</Label>
            <Input
              data-testid="input-phone"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              className="mt-1.5 bg-clinic-bg border-clinic-border"
              placeholder={t("phone_placeholder")}
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-clinic-muted">{t("language")}</Label>
            <Select value={form.language} onValueChange={(v) => setField("language", v)}>
              <SelectTrigger data-testid="select-language" className="mt-1.5 bg-clinic-bg border-clinic-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("language_en")}</SelectItem>
                <SelectItem value="hi">{t("language_hi")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-clinic-muted">{t("medicine")}</Label>
            <Input
              data-testid="input-medicine"
              value={form.medicine}
              onChange={(e) => setField("medicine", e.target.value)}
              className="mt-1.5 bg-clinic-bg border-clinic-border"
              placeholder="Paracetamol"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-clinic-muted">{t("dosage")}</Label>
            <Input
              data-testid="input-dosage"
              value={form.dosage}
              onChange={(e) => setField("dosage", e.target.value)}
              className="mt-1.5 bg-clinic-bg border-clinic-border"
              placeholder="500mg · 1 tablet"
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-clinic-muted">{t("frequency")}</Label>
            <Select value={form.frequency} onValueChange={handleFreqChange}>
              <SelectTrigger data-testid="select-frequency" className="mt-1.5 bg-clinic-bg border-clinic-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">{t("freq_once")}</SelectItem>
                <SelectItem value="daily">{t("freq_daily")}</SelectItem>
                <SelectItem value="multiple">{t("freq_multiple")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.frequency === "once" && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-clinic-muted">{t("one_time_date")}</Label>
              <Input
                data-testid="input-one-time-date"
                type="date"
                value={form.one_time_date}
                onChange={(e) => setField("one_time_date", e.target.value)}
                className="mt-1.5 bg-clinic-bg border-clinic-border"
              />
            </div>
          )}

          <div className="md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-clinic-muted">{t("reminder_times")}</Label>
            <div className="mt-1.5 flex flex-wrap gap-2 items-center">
              {form.reminder_times.map((t_, i) => (
                <div key={i} className="flex items-center gap-1 bg-clinic-bg border border-clinic-border rounded-xl pl-3 pr-1 py-1">
                  <Input
                    data-testid={`time-input-${i}`}
                    type="time"
                    value={t_}
                    onChange={(e) => updateTime(i, e.target.value)}
                    className="border-0 p-0 h-8 w-24 bg-transparent focus-visible:ring-0"
                  />
                  {form.reminder_times.length > 1 && (
                    <button
                      data-testid={`remove-time-${i}`}
                      type="button"
                      onClick={() => removeTime(i)}
                      className="w-6 h-6 rounded-md hover:bg-clinic-tint flex items-center justify-center text-clinic-muted"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {form.frequency === "multiple" && (
                <Button
                  data-testid="add-time-btn"
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTime}
                  className="border-dashed border-clinic-border text-clinic-muted"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> {t("add_time")}
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-clinic-bg border border-clinic-border">
            <Label htmlFor="es" className="text-sm text-clinic-text">{t("empty_stomach")}</Label>
            <Switch
              id="es"
              data-testid="switch-empty-stomach"
              checked={form.empty_stomach}
              onCheckedChange={(v) => setField("empty_stomach", v)}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-clinic-bg border border-clinic-border">
            <Label htmlFor="ac" className="text-sm text-clinic-text">{t("active")}</Label>
            <Switch
              id="ac"
              data-testid="switch-active"
              checked={form.active}
              onCheckedChange={(v) => setField("active", v)}
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-clinic-muted">{t("notes")}</Label>
            <Textarea
              data-testid="input-notes"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              className="mt-1.5 bg-clinic-bg border-clinic-border"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button data-testid="form-cancel" variant="outline" onClick={onClose} className="border-clinic-border">
            {t("cancel")}
          </Button>
          <Button data-testid="form-submit" onClick={submit} disabled={saving} className="btn-primary">
            {saving ? "..." : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PatientForm;
