import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger(__name__)

DEMO_WORKER_ID = "ASHA_WORKER_001"
DEMO_EMAIL = "kavita.asha@gov.in"
DEMO_SALT = "asha_salt_2026"
DEMO_PASSWORD_HASH = "1952f9a02dfc6d05ff1b655de7e238f83cf3d9fd520c8ea556544ed614b048f3"


class InMemoryCollection:
    """
    In-memory fallback collection replicating Motor async interface
    for offline execution and zero-dependency testing.
    """
    def __init__(self, name: str):
        self.name = name
        self._data: Dict[str, Dict[str, Any]] = {}

    async def insert_one(self, doc: Dict[str, Any]):
        doc_copy = dict(doc)
        _id = str(doc_copy.get("_id") or uuid.uuid4())
        doc_copy["_id"] = _id
        self._data[_id] = doc_copy
        class InsertResult:
            inserted_id = _id
        return InsertResult()

    async def find_one(self, filter_query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for item in self._data.values():
            match = True
            for k, v in filter_query.items():
                if item.get(k) != v:
                    match = False
                    break
            if match:
                return dict(item)
        return None

    def find(self, filter_query: Optional[Dict[str, Any]] = None):
        filter_query = filter_query or {}
        results = []
        for item in self._data.values():
            match = True
            for k, v in filter_query.items():
                if item.get(k) != v:
                    match = False
                    break
            if match:
                results.append(dict(item))

        class AsyncCursor:
            def __init__(self, items):
                self._items = items
            def sort(self, key, direction=-1):
                reverse = (direction == -1)
                self._items.sort(key=lambda x: str(x.get(key, "")), reverse=reverse)
                return self
            def limit(self, count):
                self._items = self._items[:count]
                return self
            async def to_list(self, length=None):
                if length is not None:
                    return self._items[:length]
                return self._items
            def __aiter__(self):
                self._iter = iter(self._items)
                return self
            async def __anext__(self):
                try:
                    return next(self._iter)
                except StopIteration:
                    raise StopAsyncIteration

        return AsyncCursor(results)

    async def update_one(self, filter_query: Dict[str, Any], update_doc: Dict[str, Any], upsert: bool = False):
        existing = await self.find_one(filter_query)
        if existing:
            _id = str(existing["_id"])
            if "$set" in update_doc:
                self._data[_id].update(update_doc["$set"])
            return True
        elif upsert:
            new_doc = dict(filter_query)
            if "$set" in update_doc:
                new_doc.update(update_doc["$set"])
            await self.insert_one(new_doc)
            return True
        return False

    async def count_documents(self, filter_query: Optional[Dict[str, Any]] = None) -> int:
        filter_query = filter_query or {}
        count = 0
        for item in self._data.values():
            match = True
            for k, v in filter_query.items():
                if item.get(k) != v:
                    match = False
                    break
            if match:
                count += 1
        return count


class DatabaseManager:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.is_connected_to_mongo = False
        self._in_memory_collections: Dict[str, InMemoryCollection] = {}
        # Pre-initialize in-memory collections with demo seed data for zero-latency testing
        self.seed_demo_data()

    def get_collection(self, name: str):
        if self.is_connected_to_mongo and self.db is not None:
            return self.db[name]
        if name not in self._in_memory_collections:
            self._in_memory_collections[name] = InMemoryCollection(name)
        return self._in_memory_collections[name]

    async def connect_db(self):
        try:
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                serverSelectionTimeoutMS=1500
            )
            # Ping database
            await self.client.admin.command('ping')
            self.db = self.client[settings.DATABASE_NAME]
            self.is_connected_to_mongo = True
            logger.info(f"Connected to MongoDB database: {settings.DATABASE_NAME}")
            # Ensure demo account & legacy record migrations exist in MongoDB
            await self.ensure_seed_data()
        except Exception as e:
            logger.warning(f"Could not connect to MongoDB ({e}). Falling back to In-Memory Database store.")
            self.is_connected_to_mongo = False
            self.seed_demo_data()

    async def close_db(self):
        if self.client:
            self.client.close()

    def seed_demo_data(self):
        """
        Synchronously seeds demo records into in-memory storage.
        """
        if "workers" not in self._in_memory_collections:
            self._in_memory_collections["workers"] = InMemoryCollection("workers")
        if "patients" not in self._in_memory_collections:
            self._in_memory_collections["patients"] = InMemoryCollection("patients")
        if "visits" not in self._in_memory_collections:
            self._in_memory_collections["visits"] = InMemoryCollection("visits")

        workers_col = self._in_memory_collections["workers"]
        patients_col = self._in_memory_collections["patients"]
        now = datetime.now(timezone.utc).isoformat()

        # Demo Worker: Kavita Sharma
        workers_col._data["WORKER_001"] = {
            "_id": "WORKER_001",
            "worker_id": DEMO_WORKER_ID,
            "name": "Kavita Sharma",
            "email": DEMO_EMAIL,
            "password_hash": DEMO_PASSWORD_HASH,
            "salt": DEMO_SALT,
            "role": "ASHA Health Worker",
            "village": "Rampur (Sub-Centre Kalyanpur)",
            "phone": "+91 98765 12345",
            "preferred_language": "en",
            "created_at": now,
            "updated_at": now
        }

        # Demo Patient 1: Pregnant woman (High Risk)
        patients_col._data["PAT_001"] = {
            "_id": "PAT_001",
            "patient_id": "PAT_001",
            "worker_id": DEMO_WORKER_ID,
            "name": "Sunita Devi",
            "category": "pregnant_woman",
            "age": 24,
            "village": "Rampur Ward 3",
            "phone": "9871234560",
            "total_visits": 1,
            "latest_risk_status": "danger",
            "created_at": now,
            "updated_at": now
        }

        # Demo Patient 2: Newborn baby (High Risk Fever)
        patients_col._data["PAT_002"] = {
            "_id": "PAT_002",
            "patient_id": "PAT_002",
            "worker_id": DEMO_WORKER_ID,
            "name": "Aarav Kumar (Navjat)",
            "category": "newborn",
            "age": 0,
            "village": "Rampur Ward 1",
            "phone": "9871234561",
            "total_visits": 1,
            "latest_risk_status": "danger",
            "created_at": now,
            "updated_at": now
        }

        # Demo Patient 3: Child (Normal Routine Checkup)
        patients_col._data["PAT_003"] = {
            "_id": "PAT_003",
            "patient_id": "PAT_003",
            "worker_id": DEMO_WORKER_ID,
            "name": "Meena Kumari",
            "category": "child",
            "age": 3,
            "village": "Rampur Ward 2",
            "phone": "9871234562",
            "total_visits": 1,
            "latest_risk_status": "normal",
            "created_at": now,
            "updated_at": now
        }

        logger.info("Demo database seeded with demo worker and 3 fictional patients.")

    async def ensure_seed_data(self):
        """
        Async idempotent seed mechanism for MongoDB or runtime instances.
        Ensures demo account exists with correct password hash and salt,
        and safely isolates any legacy unowned records.
        """
        workers_col = self.get_collection("workers")
        patients_col = self.get_collection("patients")
        visits_col = self.get_collection("visits")
        now = datetime.now(timezone.utc).isoformat()

        # 1. Ensure Demo Worker
        demo_worker = await workers_col.find_one({"email": DEMO_EMAIL})
        if not demo_worker:
            demo_worker = await workers_col.find_one({"worker_id": DEMO_WORKER_ID})

        demo_doc = {
            "worker_id": DEMO_WORKER_ID,
            "name": "Kavita Sharma",
            "email": DEMO_EMAIL,
            "password_hash": DEMO_PASSWORD_HASH,
            "salt": DEMO_SALT,
            "role": "ASHA Health Worker",
            "village": "Rampur (Sub-Centre Kalyanpur)",
            "phone": "+91 98765 12345",
            "preferred_language": "en",
            "created_at": now,
            "updated_at": now
        }

        if not demo_worker:
            demo_doc["_id"] = "WORKER_001"
            await workers_col.insert_one(demo_doc)
            logger.info("Demo worker account created in database.")
        else:
            # Update password hash, salt, and email to guarantee demo login succeeds
            await workers_col.update_one(
                {"worker_id": DEMO_WORKER_ID},
                {"$set": {
                    "email": DEMO_EMAIL,
                    "password_hash": DEMO_PASSWORD_HASH,
                    "salt": DEMO_SALT,
                    "updated_at": now
                }}
            )

        # 2. Ensure Demo Patients for ASHA_WORKER_001
        demo_patients = [
            {
                "_id": "PAT_001",
                "patient_id": "PAT_001",
                "worker_id": DEMO_WORKER_ID,
                "name": "Sunita Devi",
                "category": "pregnant_woman",
                "age": 24,
                "village": "Rampur Ward 3",
                "phone": "9871234560",
                "total_visits": 1,
                "latest_risk_status": "danger",
                "created_at": now,
                "updated_at": now
            },
            {
                "_id": "PAT_002",
                "patient_id": "PAT_002",
                "worker_id": DEMO_WORKER_ID,
                "name": "Aarav Kumar (Navjat)",
                "category": "newborn",
                "age": 0,
                "village": "Rampur Ward 1",
                "phone": "9871234561",
                "total_visits": 1,
                "latest_risk_status": "danger",
                "created_at": now,
                "updated_at": now
            },
            {
                "_id": "PAT_003",
                "patient_id": "PAT_003",
                "worker_id": DEMO_WORKER_ID,
                "name": "Meena Kumari",
                "category": "child",
                "age": 3,
                "village": "Rampur Ward 2",
                "phone": "9871234562",
                "total_visits": 1,
                "latest_risk_status": "normal",
                "created_at": now,
                "updated_at": now
            }
        ]

        for p in demo_patients:
            existing = await patients_col.find_one({"patient_id": p["patient_id"]})
            if not existing:
                await patients_col.insert_one(p)

        # 3. Safe Migration: Isolate any legacy unowned records so new users never see them
        # In MongoDB or In-Memory, if any patient/visit has missing worker_id, assign to DEMO_WORKER_ID
        if self.is_connected_to_mongo and self.db is not None:
            try:
                await self.db["patients"].update_many(
                    {"$or": [{"worker_id": {"$exists": False}}, {"worker_id": None}, {"worker_id": ""}]},
                    {"$set": {"worker_id": DEMO_WORKER_ID}}
                )
                await self.db["visits"].update_many(
                    {"$or": [{"worker_id": {"$exists": False}}, {"worker_id": None}, {"worker_id": ""}]},
                    {"$set": {"worker_id": DEMO_WORKER_ID}}
                )
            except Exception as e:
                logger.warning(f"Legacy migration skipped: {e}")


db_manager = DatabaseManager()
