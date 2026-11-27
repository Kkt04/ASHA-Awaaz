import secrets
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.mongodb import db_manager


@pytest.fixture(autouse=True)
def setup_db():
    db_manager.seed_demo_data()


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data


@pytest.mark.asyncio
async def test_extract_endpoint_success():
    payload = {
        "transcript": "Sunita, 7 mahine ki pregnant hai, BP 150 by 100 hai, pairon mein sujan hai aur iron ki goli nahi li.",
        "language": "hi"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/extract", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["extracted"]["patient_name"] == "Sunita"
        assert data["extracted"]["vitals"]["blood_pressure"]["systolic"] == 150
        assert "swelling_in_feet" in data["extracted"]["symptoms"]


@pytest.mark.asyncio
async def test_correct_endpoint_success():
    payload = {
        "current_data": {
            "patient_name": "Sunita",
            "category": "pregnant_woman",
            "patient_age": 25,
            "pregnancy_month": 6,
            "vitals": {
                "blood_pressure": {"systolic": 140, "diastolic": 90}
            },
            "symptoms": ["fever"],
            "medicines": [],
            "missing_fields": [],
            "uncertain_fields": [],
            "original_transcript": "Sunita, 25 years, 6 months pregnant"
        },
        "correction_text": "No, her age is 28, not 25. And she does not have fever.",
        "language": "en"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/correct", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["updated_data"]["patient_age"] == 28
        assert data["updated_data"]["patient_name"] == "Sunita"
        assert "fever" not in data["updated_data"]["symptoms"]
        assert "patient_age" in data["fields_changed"]
        assert "symptoms" in data["fields_changed"]


@pytest.mark.asyncio
async def test_extract_endpoint_invalid_short_transcript():
    payload = {
        "transcript": "a",
        "language": "hi"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/extract", json=payload)
        assert response.status_code in [400, 422]


@pytest.mark.asyncio
async def test_risk_check_endpoint():
    payload = {
        "patient_name": "Sunita",
        "category": "pregnant_woman",
        "pregnancy_month": 7,
        "vitals": {
            "blood_pressure": {"systolic": 155, "diastolic": 102}
        },
        "symptoms": ["swelling_in_feet"],
        "medicines": [],
        "missing_fields": [],
        "uncertain_fields": [],
        "original_transcript": "test"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/risk-check", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["is_high_risk"] is True
        assert len(data["danger_flags"]) > 0


@pytest.mark.asyncio
async def test_create_and_get_visit():
    visit_data = {
        "visit_id": "TEST_VISIT_001",
        "patient_name": "Test Patient",
        "worker_id": "ASHA_WORKER_001",
        "original_transcript": "Test Patient visit transcript",
        "language": "hi",
        "structured_data": {
            "patient_name": "Test Patient",
            "category": "pregnant_woman",
            "pregnancy_month": 5,
            "vitals": {
                "blood_pressure": {"systolic": 120, "diastolic": 80}
            },
            "symptoms": [],
            "medicines": [],
            "missing_fields": [],
            "uncertain_fields": [],
            "original_transcript": "Test Patient visit transcript"
        }
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create visit
        post_resp = await ac.post("/api/v1/visits", json=visit_data)
        assert post_resp.status_code == 200
        created = post_resp.json()
        assert created["visit_id"] == "TEST_VISIT_001"

        # Get visit by ID
        get_resp = await ac.get("/api/v1/visits/TEST_VISIT_001")
        assert get_resp.status_code == 200
        assert get_resp.json()["patient_name"] == "Test Patient"


@pytest.mark.asyncio
async def test_duplicate_sync_prevention():
    visit_item = {
        "visit_id": "SYNC_IDEMPOTENT_001",
        "patient_name": "Sunita Devi",
        "worker_id": "ASHA_WORKER_001",
        "original_transcript": "Sync test",
        "language": "hi",
        "structured_data": {
            "patient_name": "Sunita Devi",
            "category": "pregnant_woman",
            "pregnancy_month": 7,
            "vitals": {},
            "symptoms": [],
            "medicines": [],
            "missing_fields": [],
            "uncertain_fields": [],
            "original_transcript": "Sync test"
        }
    }
    sync_payload = {
        "visits": [visit_item, visit_item],  # duplicate in same payload
        "worker_id": "ASHA_WORKER_001"
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/sync", json=sync_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["synced_count"] == 1
        assert data["duplicates_skipped"] == 1


@pytest.mark.asyncio
async def test_patient_list_and_history():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        list_resp = await ac.get("/api/v1/patients")
        assert list_resp.status_code == 200
        patients = list_resp.json()
        assert len(patients) >= 3  # pre-seeded patients

        # Test history for PAT_001
        hist_resp = await ac.get("/api/v1/patients/PAT_001/history")
        assert hist_resp.status_code == 200


@pytest.mark.asyncio
async def test_worker_profile():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/v1/worker/me")
        assert resp.status_code == 200
        assert resp.json()["worker_id"] == "ASHA_WORKER_001"


@pytest.mark.asyncio
async def test_auth_flow_signup_login():
    test_password = f"SafeTest_{secrets.token_hex(8)}"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Signup new worker
        signup_payload = {
            "name": "Pooja Verma",
            "email": "pooja.asha@gov.in",
            "password": test_password,
            "role": "ASHA Health Worker",
            "village": "Rampur Ward 5",
            "preferred_language": "hi",
            "phone": "+91 98111 22233"
        }
        signup_resp = await ac.post("/api/v1/auth/signup", json=signup_payload)
        assert signup_resp.status_code == 201
        signup_data = signup_resp.json()
        assert "access_token" in signup_data
        assert signup_data["worker"]["name"] == "Pooja Verma"
        token = signup_data["access_token"]

        # 2. Duplicate signup should fail with 409 Conflict
        dup_resp = await ac.post("/api/v1/auth/signup", json=signup_payload)
        assert dup_resp.status_code in (400, 409)

        # 3. Login with correct credentials
        login_resp = await ac.post("/api/v1/auth/login", json={
            "email": "pooja.asha@gov.in",
            "password": test_password
        })
        assert login_resp.status_code == 200
        login_data = login_resp.json()
        assert "access_token" in login_data
        assert login_data["worker"]["email"] == "pooja.asha@gov.in"

        # 4. Login with invalid password should return 401
        wrong_pwd_resp = await ac.post("/api/v1/auth/login", json={
            "email": "pooja.asha@gov.in",
            "password": "WrongPassword_" + secrets.token_hex(4)
        })
        assert wrong_pwd_resp.status_code == 401

        # 5. Access /worker/me with Bearer token
        me_resp = await ac.get("/api/v1/worker/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["name"] == "Pooja Verma"

        # 6. Logout
        logout_resp = await ac.post("/api/v1/auth/logout")
        assert logout_resp.status_code == 200
        assert logout_resp.json()["status"] == "success"


@pytest.mark.asyncio
async def test_scenarios_normal_danger_warning_each_saved_exactly_once():
    """
    Acceptance Criteria Test:
    Every patient visit/case must be recorded and saved exactly once,
    regardless of its risk category:
    1. Normal case -> Save exactly 1 database record
    2. Dangerous/high-risk case -> Save exactly 1 database record
    3. Warning/moderate-risk case -> Save exactly 1 database record
    Risk detection must only determine risk status, NOT create additional records.
    """
    visits_col = db_manager.get_collection("visits")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Scenario 1: Normal Case (Child routine checkup)
        normal_case = {
            "visit_id": "CASE_NORMAL_001",
            "patient_name": "Meena Kumari",
            "worker_id": "ASHA_WORKER_001",
            "original_transcript": "Meena 3 years child, weight 14kg, normal checkup",
            "language": "en",
            "structured_data": {
                "patient_name": "Meena Kumari",
                "category": "child",
                "child_age_years": 3,
                "vitals": {"weight_kg": 14},
                "symptoms": [],
                "medicines": [],
                "missing_fields": [],
                "uncertain_fields": [],
                "original_transcript": "Meena 3 years child, weight 14kg, normal checkup"
            }
        }
        res_normal = await ac.post("/api/v1/visits", json=normal_case)
        assert res_normal.status_code == 200
        normal_doc = res_normal.json()
        assert normal_doc["visit_id"] == "CASE_NORMAL_001"
        assert normal_doc["risk_evaluation"]["is_high_risk"] is False
        # Verify exactly 1 database record exists
        count_normal = await visits_col.count_documents({"visit_id": "CASE_NORMAL_001"})
        assert count_normal == 1

        # Scenario 2: Dangerous/High-Risk Case (Preeclampsia: high BP + swelling)
        danger_case = {
            "visit_id": "CASE_DANGER_001",
            "patient_name": "Sunita Devi",
            "worker_id": "ASHA_WORKER_001",
            "original_transcript": "Sunita 7 months pregnant, BP 160/110, severe swelling",
            "language": "en",
            "structured_data": {
                "patient_name": "Sunita Devi",
                "category": "pregnant_woman",
                "pregnancy_month": 7,
                "vitals": {
                    "blood_pressure": {"systolic": 160, "diastolic": 110}
                },
                "symptoms": ["swelling_feet"],
                "medicines": [],
                "missing_fields": [],
                "uncertain_fields": [],
                "original_transcript": "Sunita 7 months pregnant, BP 160/110, severe swelling"
            }
        }
        res_danger = await ac.post("/api/v1/visits", json=danger_case)
        assert res_danger.status_code == 200
        danger_doc = res_danger.json()
        assert danger_doc["visit_id"] == "CASE_DANGER_001"
        assert danger_doc["risk_evaluation"]["is_high_risk"] is True
        # Verify exactly 1 database record exists, NOT multiple
        count_danger = await visits_col.count_documents({"visit_id": "CASE_DANGER_001"})
        assert count_danger == 1

        # Scenario 3: Warning/Moderate-Risk Case (Missed IFA iron tablet)
        warning_case = {
            "visit_id": "CASE_WARNING_001",
            "patient_name": "Rani Devi",
            "worker_id": "ASHA_WORKER_001",
            "original_transcript": "Rani 4 months pregnant, missed iron tablet",
            "language": "en",
            "structured_data": {
                "patient_name": "Rani Devi",
                "category": "pregnant_woman",
                "pregnancy_month": 4,
                "vitals": {
                    "blood_pressure": {"systolic": 118, "diastolic": 76}
                },
                "symptoms": [],
                "medicines": [
                    {"name": "iron_tablet", "status": "missed"}
                ],
                "missing_fields": [],
                "uncertain_fields": [],
                "original_transcript": "Rani 4 months pregnant, missed iron tablet"
            }
        }
        res_warning = await ac.post("/api/v1/visits", json=warning_case)
        assert res_warning.status_code == 200
        warning_doc = res_warning.json()
        assert warning_doc["visit_id"] == "CASE_WARNING_001"
        # Verify exactly 1 database record exists
        count_warning = await visits_col.count_documents({"visit_id": "CASE_WARNING_001"})
        assert count_warning == 1


@pytest.mark.asyncio
async def test_repeated_and_double_click_requests_idempotency():
    """
    Simulates rapid double-clicking of the Save button or multiple concurrent requests.
    Verify that 3 consecutive POST requests with the same visit_id:
    - Return 200 OK
    - Result in EXACTLY 1 database record in the collection
    """
    visits_col = db_manager.get_collection("visits")
    patients_col = db_manager.get_collection("patients")

    case_payload = {
        "visit_id": "CASE_DOUBLE_CLICK_001",
        "patient_name": "Pooja Sharma",
        "worker_id": "ASHA_WORKER_001",
        "original_transcript": "Pooja Sharma routine checkup",
        "language": "hi",
        "structured_data": {
            "patient_name": "Pooja Sharma",
            "category": "pregnant_woman",
            "pregnancy_month": 6,
            "vitals": {"blood_pressure": {"systolic": 120, "diastolic": 80}},
            "symptoms": [],
            "medicines": [],
            "missing_fields": [],
            "uncertain_fields": [],
            "original_transcript": "Pooja Sharma routine checkup"
        }
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1st click
        r1 = await ac.post("/api/v1/visits", json=case_payload)
        # 2nd click (double-click)
        r2 = await ac.post("/api/v1/visits", json=case_payload)
        # 3rd click (network retry)
        r3 = await ac.post("/api/v1/visits", json=case_payload)

        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r3.status_code == 200

        # Exact 1 record in database
        records_count = await visits_col.count_documents({"visit_id": "CASE_DOUBLE_CLICK_001"})
        assert records_count == 1

        # Patient total_visits is incremented only once
        patient = await patients_col.find_one({"name": "Pooja Sharma", "worker_id": "ASHA_WORKER_001"})
        assert patient["total_visits"] == 1


@pytest.mark.asyncio
async def test_editing_already_saved_case_updates_without_duplicate():
    """
    If a case is edited or corrected, it updates the existing record
    instead of inserting a new one.
    """
    visits_col = db_manager.get_collection("visits")

    initial_case = {
        "visit_id": "CASE_EDIT_001",
        "patient_name": "Geeta Devi",
        "worker_id": "ASHA_WORKER_001",
        "original_transcript": "Geeta Devi, BP 150/100",
        "language": "hi",
        "structured_data": {
            "patient_name": "Geeta Devi",
            "category": "pregnant_woman",
            "pregnancy_month": 5,
            "vitals": {"blood_pressure": {"systolic": 150, "diastolic": 100}},
            "symptoms": [],
            "medicines": [],
            "missing_fields": [],
            "uncertain_fields": [],
            "original_transcript": "Geeta Devi, BP 150/100"
        }
    }

    corrected_case = {
        "visit_id": "CASE_EDIT_001",
        "patient_name": "Geeta Devi",
        "worker_id": "ASHA_WORKER_001",
        "original_transcript": "Geeta Devi, BP corrected to 120/80",
        "language": "hi",
        "structured_data": {
            "patient_name": "Geeta Devi",
            "category": "pregnant_woman",
            "pregnancy_month": 5,
            "vitals": {"blood_pressure": {"systolic": 120, "diastolic": 80}},
            "symptoms": [],
            "medicines": [],
            "missing_fields": [],
            "uncertain_fields": [],
            "original_transcript": "Geeta Devi, BP corrected to 120/80"
        }
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Save initial
        r_init = await ac.post("/api/v1/visits", json=initial_case)
        assert r_init.status_code == 200
        assert r_init.json()["risk_evaluation"]["is_high_risk"] is True

        # Save corrected version with same visit_id
        r_corr = await ac.post("/api/v1/visits", json=corrected_case)
        assert r_corr.status_code == 200
        assert r_corr.json()["risk_evaluation"]["is_high_risk"] is False
        assert r_corr.json()["structured_data"]["vitals"]["blood_pressure"]["systolic"] == 120

        # Verify exactly 1 database record
        count = await visits_col.count_documents({"visit_id": "CASE_EDIT_001"})
        assert count == 1


@pytest.mark.asyncio
async def test_offline_save_followed_by_online_sync():
    """
    Offline saving followed by online sync does not create duplicate records.
    """
    visits_col = db_manager.get_collection("visits")

    offline_visit = {
        "visit_id": "CASE_OFFLINE_SYNC_001",
        "patient_name": "Sarita Kumari",
        "worker_id": "ASHA_WORKER_001",
        "original_transcript": "Sarita Kumari offline visit",
        "language": "hi",
        "structured_data": {
            "patient_name": "Sarita Kumari",
            "category": "pregnant_woman",
            "pregnancy_month": 8,
            "vitals": {},
            "symptoms": [],
            "medicines": [],
            "missing_fields": [],
            "uncertain_fields": [],
            "original_transcript": "Sarita Kumari offline visit"
        }
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. First sync or direct save
        resp1 = await ac.post("/api/v1/visits", json=offline_visit)
        assert resp1.status_code == 200

        # 2. Subsequent background sync payload containing the same visit
        sync_payload = {
            "visits": [offline_visit],
            "worker_id": "ASHA_WORKER_001"
        }
        resp_sync = await ac.post("/api/v1/sync", json=sync_payload)
        assert resp_sync.status_code == 200
        sync_data = resp_sync.json()
        assert sync_data["duplicates_skipped"] == 1
        assert sync_data["synced_count"] == 0
        assert "CASE_OFFLINE_SYNC_001" in sync_data["synced_ids"]

        # 3. Exactly 1 record in database
        count = await visits_col.count_documents({"visit_id": "CASE_OFFLINE_SYNC_001"})
        assert count == 1


@pytest.mark.asyncio
async def test_demo_account_login_success():
    """
    Verifies that the backend-managed demo session succeeds
    without client-side plain credentials.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/v1/auth/demo-login")
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["worker"]["worker_id"] == "ASHA_WORKER_001"
        assert data["worker"]["name"] == "Kavita Sharma"


@pytest.mark.asyncio
async def test_demo_account_wrong_password_rejected():
    """
    Verifies that incorrect credentials for any account are rejected.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/v1/auth/login", json={
            "email": "kavita.asha@gov.in",
            "password": "InvalidPassword_" + secrets.token_hex(4)
        })
        assert resp.status_code == 401
        assert "Invalid email or password" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_user_data_isolation_multi_tenant():
    """
    Comprehensive test for strict user data isolation:
    1. Demo User A logs in -> sees demo patients (Sunita, Aarav, Meena).
    2. New User B registers -> sees an EMPTY dashboard (0 patients, 0 visits).
    3. User B records a visit for their own patient -> only User B can see it.
    4. Demo User A cannot see User B's patient or visit.
    5. User B cannot view Demo User A's patient history.
    """
    user_b_pwd = f"UserBPass_{secrets.token_hex(8)}"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Demo User A via secure backend demo session
        login_a = await ac.post("/api/v1/auth/demo-login")
        assert login_a.status_code == 200
        token_a = login_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # User A sees demo patients
        patients_a = await ac.get("/api/v1/patients", headers=headers_a)
        assert patients_a.status_code == 200
        names_a = [p["name"] for p in patients_a.json()]
        assert "Sunita Devi" in names_a

        # 2. Register New User B (Anita)
        signup_b = await ac.post("/api/v1/auth/signup", json={
            "name": "Anita Devi",
            "email": "anita.asha@gov.in",
            "password": user_b_pwd,
            "role": "ASHA Health Worker",
            "village": "Village B",
            "phone": "+91 91111 22222"
        })
        assert signup_b.status_code == 201
        token_b = signup_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 3. User B must start with EMPTY patients and EMPTY visits
        patients_b = await ac.get("/api/v1/patients", headers=headers_b)
        assert patients_b.status_code == 200
        assert len(patients_b.json()) == 0  # Brand new user has 0 patients!

        visits_b = await ac.get("/api/v1/visits", headers=headers_b)
        assert visits_b.status_code == 200
        assert len(visits_b.json()) == 0  # Brand new user has 0 visits!

        # 4. User B records a visit for 'Anita Patient'
        visit_b_payload = {
            "visit_id": "VISIT_ANITA_001",
            "patient_name": "Anita Patient",
            "worker_id": "ASHA_FAKE_ID",  # Frontend cannot spoof worker_id!
            "original_transcript": "Anita Patient, 6 months pregnant, BP 120/80",
            "language": "hi",
            "structured_data": {
                "patient_name": "Anita Patient",
                "category": "pregnant_woman",
                "pregnancy_month": 6,
                "vitals": {"blood_pressure": {"systolic": 120, "diastolic": 80}},
                "symptoms": [],
                "medicines": [],
                "missing_fields": [],
                "uncertain_fields": [],
                "original_transcript": "Anita Patient, 6 months pregnant, BP 120/80"
            }
        }
        create_b = await ac.post("/api/v1/visits", json=visit_b_payload, headers=headers_b)
        assert create_b.status_code == 200
        # The backend derived worker_id from JWT token, not the fake one in payload!
        assert create_b.json()["worker_id"] == signup_b.json()["worker"]["worker_id"]

        # 5. User B now sees 1 patient and 1 visit
        patients_b_after = await ac.get("/api/v1/patients", headers=headers_b)
        assert len(patients_b_after.json()) == 1
        assert patients_b_after.json()[0]["name"] == "Anita Patient"

        visits_b_after = await ac.get("/api/v1/visits", headers=headers_b)
        assert len(visits_b_after.json()) == 1
        assert visits_b_after.json()[0]["visit_id"] == "VISIT_ANITA_001"

        # 6. User A CANNOT see User B's patient or visit
        patients_a_after = await ac.get("/api/v1/patients", headers=headers_a)
        names_a_after = [p["name"] for p in patients_a_after.json()]
        assert "Anita Patient" not in names_a_after

        visits_a_after = await ac.get("/api/v1/visits", headers=headers_a)
        visit_ids_a = [v["visit_id"] for v in visits_a_after.json()]
        assert "VISIT_ANITA_001" not in visit_ids_a

        # 7. User B CANNOT access User A's patient history
        cross_history = await ac.get("/api/v1/patients/PAT_001/history", headers=headers_b)
        assert cross_history.status_code == 404



