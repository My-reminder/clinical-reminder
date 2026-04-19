# Auth Testing Playbook for ClinicPulse

## Setup Test User & Session

```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: null,
  created_at: new Date().toISOString()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
  created_at: new Date().toISOString()
});
print('SESSION_TOKEN: ' + sessionToken);
print('USER_ID: ' + userId);
"
```

## Backend API Testing
```bash
# /api/auth/me
curl -X GET "$BACKEND/api/auth/me" -H "Authorization: Bearer $TOKEN"

# List patients
curl -X GET "$BACKEND/api/patients" -H "Authorization: Bearer $TOKEN"

# Create patient
curl -X POST "$BACKEND/api/patients" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "name": "Test Patient",
  "phone": "+919876543210",
  "medicine": "Paracetamol",
  "reminder_times": ["09:00"],
  "frequency": "daily",
  "empty_stomach": false,
  "language": "en"
}'
```

## Browser Testing (Playwright)
```python
await page.context.add_cookies([{
    "name": "session_token",
    "value": TOKEN,
    "domain": "clinic-reminder-2.preview.emergentagent.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto(f"{BACKEND}/dashboard")
```

## Data Structure
- `users`: `{ user_id, email, name, picture, created_at }` (NO _id exposed)
- `user_sessions`: `{ session_token, user_id, expires_at, created_at }`
- `patients`: `{ id, owner_id, name, phone (E.164), medicine, dosage, reminder_times[], frequency, one_time_date, empty_stomach, language, notes, active, created_at }`
- `reminder_logs`: `{ id, owner_id, patient_id, patient_name, medicine, scheduled_time, sent_at, status, channel, message, error }`

## Success Indicators
- `/api/auth/me` returns user data for valid token
- All CRUD endpoints work with Bearer token
- Dashboard loads with stats (not 401)
- Scheduler runs every minute (see backend logs for `reminder_tick`)
