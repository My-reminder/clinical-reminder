# ClinicPulse - Product Requirements Document

## Original Problem Statement
Build a full-stack clinic reminder web application where clinics/doctors can add patients and automatically send medicine reminders via WhatsApp (Twilio). Features: Patient CRUD, background scheduler (cron every minute), Twilio WhatsApp messaging with SMS fallback, multi-language (English + Hindi), reminder logs, dashboard.

## Tech Stack (Built)
- **Backend**: FastAPI (Python) — note: user requested Node.js but environment requires FastAPI; functionality is identical
- **Frontend**: React 19 + TailwindCSS + shadcn/ui + lucide-react
- **Database**: MongoDB
- **Scheduler**: APScheduler (AsyncIO cron, runs every minute)
- **Messaging**: Twilio WhatsApp + SMS fallback
- **Auth**: Emergent-managed Google OAuth

## User Personas
- **Clinic Admin / Doctor**: Manages patient list and medicine reminders

## Core Requirements (Static)
- Google OAuth login
- Add / View / Edit / Delete patients (name, phone E.164, medicine, dosage, reminder_times[], frequency: once/daily/multiple, one_time_date, empty_stomach, language, notes, active)
- Background scheduler checking every minute for due reminders
- WhatsApp messaging via Twilio with auto-SMS fallback
- Phone number validation (E.164 via phonenumbers library)
- Reminder logs (sent/failed, channel, timestamp, message)
- Dashboard stats (total/active patients, sent today, scheduled today, failed today)
- Upcoming reminders view (next 24h)
- Multi-language (English + Hindi) for both UI and WhatsApp message content
- Test-send button to verify delivery without waiting

## What's Been Implemented (Feb 2026)
- [x] Backend: All API endpoints (auth, patients CRUD, reminders upcoming/logs/test, stats)
- [x] Scheduler: APScheduler lifespan-managed, cron second=0 every minute, deduplicated per day/time/patient
- [x] Twilio integration with WhatsApp + SMS fallback
- [x] Frontend: Login page with hero, Dashboard, Patients list+form, Reminders (upcoming/logs/adherence tabs)
- [x] Language switcher (EN/HI) with full UI translations and message templates in both languages
- [x] Design: Sage-green + bone-white "Organic & Earthy" theme, Manrope headings, Work Sans body
- [x] data-testid attributes on all interactive elements
- [x] README with setup, `.env.sample`, deployment instructions
- [x] **Two-way WhatsApp adherence loop (Feb 2026)**: `/api/webhooks/twilio` receives patient replies, classifies TAKEN/SKIP (EN + HI keywords), auto-acknowledges, stores in `adherence_records`. Dashboard shows adherence rate + recent responses. Reminders page has a new "Adherence" tab with today/7-day rates and response history.

## Prioritized Backlog

### P1 (Next)
- Add real Twilio WhatsApp sandbox opt-in instructions inline in UI
- CSV export for reminder logs
- Patient birthday / age field

### P2
- Weekly/custom frequency support (e.g., every Mon/Wed/Fri)
- Doctor/nurse role-based access
- Email notifications summary to clinic admin
- Timezone per patient (currently global via env)

### P3
- Mobile app wrapper (PWA)
- Batch import patients via CSV
- Medication adherence analytics (response tracking)

## Next Action Items
- User to confirm Twilio WhatsApp sandbox join (required for receiving messages in sandbox)
- Upgrade to Twilio production WhatsApp number for unrestricted sending
