import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger(__name__)


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
        _id = doc_copy.get("_id") or str(uuid.uuid4())
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
            _id = existing["_id"]
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
        except Exception as e:
            logger.warning(f"Could not connect to MongoDB ({e}). Falling back to In-Memory Database store.")
            self.is_connected_to_mongo = False
            self.seed_demo_data()

    async def close_db(self):
        if self.client:
            self.client.close()

    def seed_demo_data(self):
        patients_col = self.get_collection("patients")
        visits_col = self.get_collection("visits")
        workers_col = self.get_collection("workers")
        now = datetime.now(timezone.utc)

        # Worker
        workers_col._data["WORKER_001"] = {
            "_id": "WORKER_001",
            "worker_id": "ASHA_WORKER_001",
            "name": "Kavita Sharma",
            "email": "kavita.asha@gov.in",
            "password_hash": "1952f9a02dfc6d05ff1b655de7e238f83cf3d9fd520c8ea556544ed614b048f3",
            "salt": "asha_salt_2026",
            "role": "ASHA Health Worker",
            "village": "Rampur (Sub-Centre Kalyanpur)",
            "phone": "+91 98765 12345",
            "preferred_language": "en",
            "created_at": now
        }

        # Demo Patient 1: Pregnant woman (High Risk)
        patients_col._data["PAT_001"] = {
            "_id": "PAT_001",
            "patient_id": "PAT_001",
            "worker_id": "ASHA_WORKER_001",
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
            "worker_id": "ASHA_WORKER_001",
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
            "worker_id": "ASHA_WORKER_001",
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

        logger.info("Demo database pre-seeded with 3 fictional patients.")


db_manager = DatabaseManager()
