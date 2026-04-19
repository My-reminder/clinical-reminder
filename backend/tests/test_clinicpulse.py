"""ClinicPulse backend API tests - auth, patients CRUD, reminders, stats."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://clinic-reminder-2.preview.emergentagent.com").rstrip("/")
TOKEN = "test_session_ci_1"
USER_ID = "test-user-ci-1"
AUTH = {"Authorization": f"Bearer {TOKEN}"}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", **AUTH})
    return s


@pytest.fixture(scope="module")
def patient_id(client):
    r = client.post(f"{BASE_URL}/api/patients", json={
        "name": "TEST_Patient_A", "phone": "+919876543210",
        "medicine": "Paracetamol", "dosage": "500mg",
        "reminder_times": ["09:00", "21:00"], "frequency": "daily",
        "empty_stomach": False, "language": "en",
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["phone"] == "+919876543210"
    assert data["owner_id"] == USER_ID
    pid = data["id"]
    yield pid
    client.delete(f"{BASE_URL}/api/patients/{pid}")


# -------- Auth --------
class TestAuth:
    def test_me_with_bearer(self, client):
        r = client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        d = r.json()
        assert d["user_id"] == USER_ID
        assert d["email"] == "test.clinic.ci@example.com"

    def test_me_missing_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer bogus-token-xxx"})
        assert r.status_code == 401

    def test_session_missing_id(self, client):
        r = client.post(f"{BASE_URL}/api/auth/session", json={})
        assert r.status_code == 400

    def test_session_invalid_id(self, client):
        r = client.post(f"{BASE_URL}/api/auth/session", json={"session_id": "invalid-xyz"})
        assert r.status_code == 401


# -------- Patients CRUD --------
class TestPatients:
    def test_create_invalid_phone(self, client):
        r = client.post(f"{BASE_URL}/api/patients", json={
            "name": "Bad", "phone": "abc123", "medicine": "X",
            "reminder_times": ["09:00"], "frequency": "daily",
        })
        assert r.status_code == 400

    def test_create_once_requires_date(self, client):
        r = client.post(f"{BASE_URL}/api/patients", json={
            "name": "Once", "phone": "+919876500001", "medicine": "X",
            "reminder_times": ["09:00"], "frequency": "once",
        })
        assert r.status_code == 400

    def test_create_invalid_time(self, client):
        r = client.post(f"{BASE_URL}/api/patients", json={
            "name": "T", "phone": "+919876500002", "medicine": "X",
            "reminder_times": ["25:99"], "frequency": "daily",
        })
        assert r.status_code == 400

    def test_create_multiple_frequency(self, client):
        r = client.post(f"{BASE_URL}/api/patients", json={
            "name": "TEST_Multi", "phone": "+919876500003", "medicine": "Vit",
            "reminder_times": ["08:00", "14:00", "20:00"], "frequency": "multiple",
            "language": "hi",
        })
        assert r.status_code == 200
        pid = r.json()["id"]
        assert len(r.json()["reminder_times"]) == 3
        client.delete(f"{BASE_URL}/api/patients/{pid}")

    def test_list_patients(self, client, patient_id):
        r = client.get(f"{BASE_URL}/api/patients")
        assert r.status_code == 200
        arr = r.json()
        assert any(p["id"] == patient_id and p["owner_id"] == USER_ID for p in arr)

    def test_list_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/patients")
        assert r.status_code == 401

    def test_get_patient(self, client, patient_id):
        r = client.get(f"{BASE_URL}/api/patients/{patient_id}")
        assert r.status_code == 200
        assert r.json()["id"] == patient_id

    def test_get_patient_not_found(self, client):
        r = client.get(f"{BASE_URL}/api/patients/pat_nonexistent")
        assert r.status_code == 404

    def test_update_patient_and_persist(self, client, patient_id):
        r = client.put(f"{BASE_URL}/api/patients/{patient_id}", json={
            "medicine": "Ibuprofen", "dosage": "200mg",
        })
        assert r.status_code == 200
        assert r.json()["medicine"] == "Ibuprofen"
        g = client.get(f"{BASE_URL}/api/patients/{patient_id}").json()
        assert g["medicine"] == "Ibuprofen"
        assert g["dosage"] == "200mg"

    def test_update_invalid_phone(self, client, patient_id):
        r = client.put(f"{BASE_URL}/api/patients/{patient_id}", json={"phone": "notaphone"})
        assert r.status_code == 400

    def test_delete_and_verify(self, client):
        c = client.post(f"{BASE_URL}/api/patients", json={
            "name": "TEST_Del", "phone": "+919876500004", "medicine": "X",
            "reminder_times": ["10:00"], "frequency": "daily",
        })
        pid = c.json()["id"]
        d = client.delete(f"{BASE_URL}/api/patients/{pid}")
        assert d.status_code == 200
        g = client.get(f"{BASE_URL}/api/patients/{pid}")
        assert g.status_code == 404


# -------- Reminders --------
class TestReminders:
    def test_upcoming(self, client, patient_id):
        r = client.get(f"{BASE_URL}/api/reminders/upcoming")
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        if len(arr) > 1:
            assert arr[0]["when_iso"] <= arr[1]["when_iso"]

    def test_test_send(self, client, patient_id):
        # Twilio sandbox will fail -> expect graceful failure with log entry
        r = client.post(f"{BASE_URL}/api/reminders/test/{patient_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] in ("sent", "failed")
        # Log entry should be present
        logs = client.get(f"{BASE_URL}/api/reminders/logs").json()
        assert any(l["patient_id"] == patient_id for l in logs)

    def test_test_send_unknown_patient(self, client):
        r = client.post(f"{BASE_URL}/api/reminders/test/pat_missing")
        assert r.status_code == 404

    def test_logs(self, client):
        r = client.get(f"{BASE_URL}/api/reminders/logs")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# -------- Stats --------
class TestStats:
    def test_stats_shape(self, client, patient_id):
        r = client.get(f"{BASE_URL}/api/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ("total_patients", "active_patients", "reminders_sent_today",
                  "reminders_failed_today", "reminders_scheduled_today"):
            assert k in d
        assert d["total_patients"] >= 1
        assert d["active_patients"] >= 1
