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
