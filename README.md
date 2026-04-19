# ClinicPulse - Clinic Reminder App

A full-stack clinic reminder system that automatically sends medicine reminders to patients via WhatsApp (Twilio).

## Features
- Google OAuth login (Emergent-managed)
- Patient management (add/edit/delete) with phone validation, medicine, frequency, reminder times, empty-stomach flag
- Background scheduler (APScheduler) that checks every minute and sends due reminders
- Twilio WhatsApp integration with SMS fallback
- Multi-language support: English + Hindi (UI + message templates)
- Reminder logs with sent/failed status and channel tracking
- Dashboard with live stats (total patients, sent today, scheduled today)
- Upcoming reminders view for the next 24 hours

## Tech Stack
- **Backend**: FastAPI (Python) with Motor (async MongoDB), APScheduler, Twilio SDK
- **Frontend**: React 19 + TailwindCSS + shadcn/ui + lucide-react
- **Database**: MongoDB
- **Messaging**: Twilio WhatsApp API

## Environment Variables

### Backend (`/app/backend/.env`)
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
TWILIO_ACCOUNT_SID="ACxxxx"
TWILIO_AUTH_TOKEN="xxxx"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
TWILIO_SMS_NUMBER=""
SCHEDULER_TIMEZONE="Asia/Kolkata"
```

### Frontend (`/app/frontend/.env`)
```
REACT_APP_BACKEND_URL=https://your-app.preview.emergentagent.com
```

## Local Setup

```bash
# Backend
cd /app/backend
pip install -r requirements.txt

# Frontend
cd /app/frontend
yarn install
```

Supervisor runs both services automatically.
- Backend: `0.0.0.0:8001`
- Frontend: `0.0.0.0:3000`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/session` | Exchange OAuth session_id |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/patients` | Create patient |
| GET | `/api/patients` | List patients |
| GET | `/api/patients/:id` | Get patient |
| PUT | `/api/patients/:id` | Update patient |
| DELETE | `/api/patients/:id` | Delete patient |
| GET | `/api/reminders/upcoming` | Next 24h reminders |
| GET | `/api/reminders/logs` | Reminder history |
| POST | `/api/reminders/test/:patient_id` | Send a test reminder now |
| GET | `/api/stats` | Dashboard stats |

## Twilio Setup

1. Sign up at https://twilio.com
2. In the Twilio Console, activate the **WhatsApp Sandbox** (Messaging → Try it out → Send a WhatsApp message)
3. Have each patient send the sandbox join phrase to the sandbox number to opt in (required in sandbox mode)
4. Copy `ACCOUNT_SID`, `AUTH_TOKEN`, and `WHATSAPP_NUMBER` (e.g. `whatsapp:+14155238886`) into `/app/backend/.env`
5. For production WhatsApp, get a Twilio-approved WhatsApp sender number

## Message Templates

**English:**
> Hi {name}, this is your reminder to take {medicine} ({dosage}) at {time}. Please take on an empty stomach. / You may take with food.

**Hindi:**
> नमस्ते {name}, यह आपकी दवा {medicine} ({dosage}) लेने की याद दिला रहा है। समय: {time}। कृपया खाली पेट लें। / भोजन के साथ ले सकते हैं।

## Scheduler
- Runs every minute (cron second=0)
- Checks all active patients for reminder times matching the current HH:MM (timezone-aware)
- Skips already-sent reminders for the same patient/time/day (idempotent)
- Uses `SCHEDULER_TIMEZONE` (default `Asia/Kolkata`)

## Deployment (Render / Any PaaS)
1. Set all env vars listed above
2. Backend start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
3. Frontend build: `yarn build && serve -s build`
