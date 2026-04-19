"""
Clinic Reminder Backend - FastAPI
Features: Google OAuth (Emergent), Patient CRUD, Reminder Engine (APScheduler + Twilio WhatsApp)
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Cookie, Form
from fastapi.responses import JSONResponse, Response as FastAPIResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta, date, time
import httpx
import phonenumbers
from twilio.rest import Client as TwilioClient
from twilio.base.exceptions import TwilioRestException
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from contextlib import asynccontextmanager
from zoneinfo import ZoneInfo

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# -------------------- CONFIG --------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
TWILIO_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP = os.environ.get("TWILIO_WHATSAPP_NUMBER", "")
TWILIO_SMS = os.environ.get("TWILIO_SMS_NUMBER", "")
SCHEDULER_TZ = os.environ.get("SCHEDULER_TIMEZONE", "Asia/Kolkata")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("clinic_reminder")

# -------------------- DB --------------------
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

# -------------------- Twilio --------------------
try:
    twilio_client = TwilioClient(TWILIO_SID, TWILIO_TOKEN) if TWILIO_SID and TWILIO_TOKEN else None
except Exception as e:
    logger.error(f"Twilio init error: {e}")
    twilio_client = None

# -------------------- MODELS --------------------
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class Patient(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: f"pat_{uuid.uuid4().hex[:12]}")
    owner_id: str
    name: str
    phone: str  # E.164 with +
    medicine: str
    dosage: Optional[str] = ""
    reminder_times: List[str]  # ["HH:MM", ...]
    frequency: Literal["once", "daily", "multiple"] = "daily"
    one_time_date: Optional[str] = None  # YYYY-MM-DD only for 'once'
    empty_stomach: bool = False
    language: Literal["en", "hi"] = "en"
    notes: Optional[str] = ""
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PatientCreate(BaseModel):
    name: str
    phone: str
    medicine: str
    dosage: Optional[str] = ""
    reminder_times: List[str]
    frequency: Literal["once", "daily", "multiple"] = "daily"
    one_time_date: Optional[str] = None
    empty_stomach: bool = False
    language: Literal["en", "hi"] = "en"
    notes: Optional[str] = ""
    active: bool = True

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    medicine: Optional[str] = None
    dosage: Optional[str] = None
    reminder_times: Optional[List[str]] = None
    frequency: Optional[Literal["once", "daily", "multiple"]] = None
    one_time_date: Optional[str] = None
    empty_stomach: Optional[bool] = None
    language: Optional[Literal["en", "hi"]] = None
    notes: Optional[str] = None
    active: Optional[bool] = None

class ReminderLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    owner_id: str
    patient_id: str
    patient_name: str
    medicine: str
    scheduled_time: str
    sent_at: datetime
    status: Literal["sent", "failed"]
    channel: Literal["whatsapp", "sms"]
    message: str
    error: Optional[str] = None

# -------------------- Utilities --------------------
def validate_phone(phone: str) -> str:
    """Return phone in E.164 format (+...). Raises HTTPException if invalid."""
    try:
        p = phonenumbers.parse(phone, None)
        if not phonenumbers.is_valid_number(p):
            raise ValueError("Invalid phone number")
        return phonenumbers.format_number(p, phonenumbers.PhoneNumberFormat.E164)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid phone number: {e}")


def build_message(patient: dict, time_str: str) -> str:
    """Build reminder message in patient's language."""
    lang = patient.get("language", "en")
    name = patient.get("name", "")
    medicine = patient.get("medicine", "")
    dosage = patient.get("dosage") or ""
    empty = patient.get("empty_stomach", False)

    if lang == "hi":
        empty_instr = "कृपया खाली पेट लें।" if empty else "भोजन के साथ ले सकते हैं।"
        dose_txt = f" ({dosage})" if dosage else ""
        reply_prompt = "\n\nकृपया उत्तर दें: *लिया* यदि दवा ले ली है, या *छोड़ा* यदि छोड़ दी।"
        return f"नमस्ते {name}, यह आपकी दवा {medicine}{dose_txt} लेने की याद दिला रहा है। समय: {time_str}। {empty_instr}{reply_prompt}"
    else:
        empty_instr = "Please take on an empty stomach." if empty else "You may take with food."
        dose_txt = f" ({dosage})" if dosage else ""
        reply_prompt = "\n\nPlease reply *TAKEN* if you took it, or *SKIP* if you missed it."
        return f"Hi {name}, this is your reminder to take {medicine}{dose_txt} at {time_str}. {empty_instr}{reply_prompt}"


async def send_whatsapp(patient: dict, time_str: str) -> dict:
    """Send WhatsApp via Twilio. Falls back to SMS on failure.
    Returns dict with status, channel, message, error."""
    msg = build_message(patient, time_str)
    to_phone = patient["phone"]
    result = {"status": "failed", "channel": "whatsapp", "message": msg, "error": None}

    if not twilio_client:
        result["error"] = "Twilio not configured"
        return result

    # Try WhatsApp first
    try:
        twilio_client.messages.create(
            from_=TWILIO_WHATSAPP,
            to=f"whatsapp:{to_phone}",
            body=msg,
        )
        result["status"] = "sent"
        result["channel"] = "whatsapp"
        return result
    except TwilioRestException as e:
        logger.warning(f"WhatsApp send failed for {to_phone}: {e}")
        result["error"] = f"WhatsApp: {str(e)[:200]}"

    # SMS fallback
    if TWILIO_SMS:
        try:
            twilio_client.messages.create(
                from_=TWILIO_SMS,
                to=to_phone,
                body=msg,
            )
            result["status"] = "sent"
            result["channel"] = "sms"
            result["error"] = None
            return result
        except TwilioRestException as e:
            logger.warning(f"SMS fallback failed for {to_phone}: {e}")
            result["error"] = f"{result.get('error','')} | SMS: {str(e)[:200]}"

    return result


async def log_reminder(owner_id: str, patient: dict, time_str: str, result: dict) -> str:
    log_id = f"log_{uuid.uuid4().hex[:12]}"
    doc = {
        "id": log_id,
        "owner_id": owner_id,
        "patient_id": patient["id"],
        "patient_name": patient["name"],
        "medicine": patient["medicine"],
        "patient_phone": patient["phone"],
        "scheduled_time": time_str,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "status": result["status"],
        "channel": result["channel"],
        "message": result["message"],
        "error": result.get("error"),
        "adherence_status": None,
    }
    await db.reminder_logs.insert_one(doc)
    return log_id


TAKEN_KEYWORDS = {"taken", "yes", "y", "ok", "done", "took", "त", "लिया", "हाँ", "हां", "जी"}
SKIPPED_KEYWORDS = {"skip", "skipped", "no", "n", "missed", "miss", "छोड़ा", "छोड़", "नहीं", "नही"}


def classify_reply(body: str) -> str:
    """Return 'taken', 'skipped', or 'unknown' based on message body."""
    if not body:
        return "unknown"
    text = body.strip().lower()
    # Check exact or containing tokens
    tokens = set(text.replace(".", " ").replace(",", " ").split())
    if tokens & TAKEN_KEYWORDS or any(k in text for k in TAKEN_KEYWORDS if len(k) > 2):
        return "taken"
    if tokens & SKIPPED_KEYWORDS or any(k in text for k in SKIPPED_KEYWORDS if len(k) > 2):
        return "skipped"
    return "unknown"


# -------------------- SCHEDULER --------------------
async def reminder_tick():
    """Runs every minute to check due reminders and send them."""
    try:
        tz = ZoneInfo(SCHEDULER_TZ)
        now = datetime.now(tz)
        current_hhmm = now.strftime("%H:%M")
        today_str = now.strftime("%Y-%m-%d")

        cursor = db.patients.find({"active": True}, {"_id": 0})
        patients = await cursor.to_list(length=5000)
        for pat in patients:
            times = pat.get("reminder_times", [])
            if current_hhmm not in times:
                continue
            freq = pat.get("frequency", "daily")
            if freq == "once" and pat.get("one_time_date") != today_str:
                continue

            # Deduplicate: check if already sent today at this time
            existing = await db.reminder_logs.find_one({
                "patient_id": pat["id"],
                "scheduled_time": current_hhmm,
                "sent_at": {"$regex": f"^{today_str}"},
                "status": "sent",
            })
            if existing:
                continue

            logger.info(f"Sending reminder: {pat['name']} / {pat['medicine']} @ {current_hhmm}")
            result = await send_whatsapp(pat, current_hhmm)
            await log_reminder(pat["owner_id"], pat, current_hhmm, result)
    except Exception as e:
        logger.exception(f"Scheduler tick error: {e}")


scheduler = AsyncIOScheduler(timezone=SCHEDULER_TZ)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(reminder_tick, "cron", second=0, id="reminder_tick", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started.")
    yield
    scheduler.shutdown(wait=False)
    mongo_client.close()


app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")


# -------------------- AUTH --------------------
async def get_current_user(request: Request) -> dict:
    """Get user from session_token cookie or Authorization Bearer header."""
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@api_router.post("/auth/session")
async def auth_session(request: Request, response: Response):
    """Exchange Emergent session_id for a persistent session_token cookie."""
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()

    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", existing.get("name", "")), "picture": data.get("picture", existing.get("picture"))}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    session_token = data["session_token"]
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7))
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )

    return {
        "user_id": user_id,
        "email": email,
        "name": data.get("name", ""),
        "picture": data.get("picture"),
        "session_token": session_token,
    }


@api_router.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "picture": user.get("picture"),
    }


@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie(key="session_token", path="/", samesite="none", secure=True)
    return {"ok": True}


# -------------------- PATIENTS --------------------
@api_router.post("/patients", response_model=Patient)
async def create_patient(payload: PatientCreate, user: dict = Depends(get_current_user)):
    phone_e164 = validate_phone(payload.phone)
    if not payload.reminder_times:
        raise HTTPException(status_code=400, detail="At least one reminder time required")
    for t in payload.reminder_times:
        try:
            datetime.strptime(t, "%H:%M")
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid time format: {t} (expected HH:MM)")
    if payload.frequency == "once" and not payload.one_time_date:
        raise HTTPException(status_code=400, detail="one_time_date required for 'once' frequency")

    data = payload.model_dump()
    data["phone"] = phone_e164
    patient = Patient(owner_id=user["user_id"], **data)
    doc = patient.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.patients.insert_one(doc)
    return patient


@api_router.get("/patients", response_model=List[Patient])
async def list_patients(user: dict = Depends(get_current_user)):
    cursor = db.patients.find({"owner_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(length=5000)
    for p in items:
        if isinstance(p.get("created_at"), str):
            p["created_at"] = datetime.fromisoformat(p["created_at"])
    return items


@api_router.get("/patients/{patient_id}", response_model=Patient)
async def get_patient(patient_id: str, user: dict = Depends(get_current_user)):
    p = await db.patients.find_one({"id": patient_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    if isinstance(p.get("created_at"), str):
        p["created_at"] = datetime.fromisoformat(p["created_at"])
    return p


@api_router.put("/patients/{patient_id}", response_model=Patient)
async def update_patient(patient_id: str, payload: PatientUpdate, user: dict = Depends(get_current_user)):
    existing = await db.patients.find_one({"id": patient_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "phone" in update_data:
        update_data["phone"] = validate_phone(update_data["phone"])
    if "reminder_times" in update_data:
        for t in update_data["reminder_times"]:
            try:
                datetime.strptime(t, "%H:%M")
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid time: {t}")

    await db.patients.update_one({"id": patient_id}, {"$set": update_data})
    p = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if isinstance(p.get("created_at"), str):
        p["created_at"] = datetime.fromisoformat(p["created_at"])
    return p


@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, user: dict = Depends(get_current_user)):
    res = await db.patients.delete_one({"id": patient_id, "owner_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"ok": True}


# -------------------- REMINDERS --------------------
@api_router.get("/reminders/upcoming")
async def upcoming_reminders(user: dict = Depends(get_current_user)):
    """Return next ~20 upcoming reminder events within 24 hours."""
    tz = ZoneInfo(SCHEDULER_TZ)
    now = datetime.now(tz)
    today_str = now.strftime("%Y-%m-%d")
    tomorrow_str = (now + timedelta(days=1)).strftime("%Y-%m-%d")

    cursor = db.patients.find({"owner_id": user["user_id"], "active": True}, {"_id": 0})
    patients = await cursor.to_list(length=5000)

    events = []
    for p in patients:
        for t in p.get("reminder_times", []):
            try:
                hh, mm = map(int, t.split(":"))
            except ValueError:
                continue
            freq = p.get("frequency", "daily")
            # Generate today and tomorrow entries
            for day_offset, day_str in [(0, today_str), (1, tomorrow_str)]:
                if freq == "once":
                    if p.get("one_time_date") != day_str:
                        continue
                dt = now.replace(hour=hh, minute=mm, second=0, microsecond=0) + timedelta(days=day_offset)
                if dt < now:
                    continue
                events.append({
                    "patient_id": p["id"],
                    "patient_name": p["name"],
                    "medicine": p["medicine"],
                    "scheduled_time": t,
                    "when_iso": dt.isoformat(),
                    "empty_stomach": p.get("empty_stomach", False),
                    "language": p.get("language", "en"),
                })
    events.sort(key=lambda x: x["when_iso"])
    return events[:30]


@api_router.get("/reminders/logs")
async def reminder_logs(limit: int = 100, user: dict = Depends(get_current_user)):
    cursor = db.reminder_logs.find({"owner_id": user["user_id"]}, {"_id": 0}).sort("sent_at", -1).limit(limit)
    items = await cursor.to_list(length=limit)
    return items


@api_router.post("/reminders/test/{patient_id}")
async def test_reminder(patient_id: str, user: dict = Depends(get_current_user)):
    """Manually trigger a reminder right now for testing."""
    p = await db.patients.find_one({"id": patient_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    tz = ZoneInfo(SCHEDULER_TZ)
    now_str = datetime.now(tz).strftime("%H:%M")
    result = await send_whatsapp(p, now_str)
    log_id = await log_reminder(user["user_id"], p, now_str, result)
    return {"status": result["status"], "channel": result["channel"], "error": result.get("error"), "log_id": log_id}


# -------------------- ADHERENCE (Two-way WhatsApp) --------------------
@api_router.post("/webhooks/twilio")
async def twilio_webhook(
    From: str = Form(""),
    Body: str = Form(""),
    To: str = Form(""),
    MessageSid: str = Form(""),
):
    """Twilio inbound webhook. Receives patient replies to reminders.
    Twilio posts application/x-www-form-urlencoded data. No auth required.
    Returns empty TwiML (Twilio-compatible)."""
    phone = From.replace("whatsapp:", "").strip()
    body_text = (Body or "").strip()
    logger.info(f"Inbound WhatsApp from {phone}: {body_text!r}")

    if not phone:
        return FastAPIResponse(content="<Response/>", media_type="application/xml")

    # Find patient by phone
    patient = await db.patients.find_one({"phone": phone}, {"_id": 0})
    if not patient:
        logger.info(f"No patient found for phone {phone}")
        return FastAPIResponse(content="<Response/>", media_type="application/xml")

    # Find most recent sent reminder log for this patient within last 24h (that has no adherence yet)
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    recent_log = await db.reminder_logs.find_one(
        {
            "patient_id": patient["id"],
            "status": "sent",
            "sent_at": {"$gte": cutoff},
            "adherence_status": None,
        },
        {"_id": 0},
        sort=[("sent_at", -1)],
    )

    status = classify_reply(body_text)
    record_id = f"adh_{uuid.uuid4().hex[:12]}"
    record = {
        "id": record_id,
        "owner_id": patient["owner_id"],
        "patient_id": patient["id"],
        "patient_name": patient["name"],
        "medicine": patient["medicine"],
        "phone": phone,
        "reminder_log_id": recent_log["id"] if recent_log else None,
        "scheduled_time": recent_log["scheduled_time"] if recent_log else None,
        "reply_body": body_text,
        "status": status,  # taken / skipped / unknown
        "message_sid": MessageSid,
        "responded_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.adherence_records.insert_one(record)

    if recent_log:
        await db.reminder_logs.update_one(
            {"id": recent_log["id"]}, {"$set": {"adherence_status": status}}
        )

    # Auto-reply acknowledgement
    ack_en = {
        "taken": "Great! We've logged that you took your medicine. Keep it up! 💚",
        "skipped": "Got it. We've logged this dose as skipped. Please consult your doctor if this happens often.",
        "unknown": "Thanks for your reply. Please reply TAKEN or SKIP so we can log your dose.",
    }
    ack_hi = {
        "taken": "बहुत अच्छा! हमने रिकॉर्ड कर लिया कि आपने दवा ले ली है। स्वस्थ रहें!",
        "skipped": "ठीक है, हमने इसे छोड़ी हुई खुराक के रूप में दर्ज किया है। यदि यह बार-बार हो तो डॉक्टर से सलाह लें।",
        "unknown": "उत्तर के लिए धन्यवाद। कृपया लिया या छोड़ा लिखें।",
    }
    lang = patient.get("language", "en")
    ack = (ack_hi if lang == "hi" else ack_en)[status]
    try:
        if twilio_client and TWILIO_WHATSAPP:
            twilio_client.messages.create(from_=TWILIO_WHATSAPP, to=f"whatsapp:{phone}", body=ack)
    except Exception as e:
        logger.warning(f"Ack send failed: {e}")

    return FastAPIResponse(content="<Response/>", media_type="application/xml")


@api_router.get("/adherence")
async def list_adherence(limit: int = 100, user: dict = Depends(get_current_user)):
    cursor = (
        db.adherence_records.find({"owner_id": user["user_id"]}, {"_id": 0})
        .sort("responded_at", -1)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


@api_router.get("/adherence/stats")
async def adherence_stats(user: dict = Depends(get_current_user)):
    """Return 7-day and today adherence rates."""
    tz = ZoneInfo(SCHEDULER_TZ)
    now_utc = datetime.now(timezone.utc)
    today_str = datetime.now(tz).strftime("%Y-%m-%d")
    week_ago_iso = (now_utc - timedelta(days=7)).isoformat()

    async def _rate(query: dict):
        taken = await db.adherence_records.count_documents({**query, "status": "taken"})
        skipped = await db.adherence_records.count_documents({**query, "status": "skipped"})
        unknown = await db.adherence_records.count_documents({**query, "status": "unknown"})
        total = taken + skipped + unknown
        rate = round((taken / total) * 100) if total else None
        return {"taken": taken, "skipped": skipped, "unknown": unknown, "total": total, "rate": rate}

    today = await _rate({"owner_id": user["user_id"], "responded_at": {"$regex": f"^{today_str}"}})
    week = await _rate({"owner_id": user["user_id"], "responded_at": {"$gte": week_ago_iso}})
    return {"today": today, "last_7_days": week}


# -------------------- STATS --------------------
@api_router.get("/stats")
async def stats(user: dict = Depends(get_current_user)):
    tz = ZoneInfo(SCHEDULER_TZ)
    today_str = datetime.now(tz).strftime("%Y-%m-%d")

    total_patients = await db.patients.count_documents({"owner_id": user["user_id"]})
    active_patients = await db.patients.count_documents({"owner_id": user["user_id"], "active": True})

    sent_today = await db.reminder_logs.count_documents({
        "owner_id": user["user_id"],
        "status": "sent",
        "sent_at": {"$regex": f"^{today_str}"},
    })
    failed_today = await db.reminder_logs.count_documents({
        "owner_id": user["user_id"],
        "status": "failed",
        "sent_at": {"$regex": f"^{today_str}"},
    })

    # Total reminders scheduled today (active patients' times on daily or once=today)
    cursor = db.patients.find({"owner_id": user["user_id"], "active": True}, {"_id": 0})
    pats = await cursor.to_list(length=5000)
    total_scheduled_today = 0
    for p in pats:
        freq = p.get("frequency", "daily")
        if freq == "once" and p.get("one_time_date") != today_str:
            continue
        total_scheduled_today += len(p.get("reminder_times", []))

    # Adherence today
    taken_today = await db.adherence_records.count_documents({
        "owner_id": user["user_id"],
        "status": "taken",
        "responded_at": {"$regex": f"^{today_str}"},
    })
    skipped_today = await db.adherence_records.count_documents({
        "owner_id": user["user_id"],
        "status": "skipped",
        "responded_at": {"$regex": f"^{today_str}"},
    })
    adherence_total = taken_today + skipped_today
    adherence_rate = round((taken_today / adherence_total) * 100) if adherence_total else None

    return {
        "total_patients": total_patients,
        "active_patients": active_patients,
        "reminders_sent_today": sent_today,
        "reminders_failed_today": failed_today,
        "reminders_scheduled_today": total_scheduled_today,
        "adherence_taken_today": taken_today,
        "adherence_skipped_today": skipped_today,
        "adherence_rate_today": adherence_rate,
    }


@api_router.get("/")
async def root():
    return {"message": "Clinic Reminder API", "version": "1.0"}


# -------------------- WIRE UP --------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
