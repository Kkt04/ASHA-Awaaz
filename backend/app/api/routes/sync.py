from fastapi import APIRouter
from typing import List, Dict, Any
from app.schemas.visit import BatchSyncRequest, BatchSyncResponse
from app.api.routes.visits import create_visit
from app.database.mongodb import db_manager

router = APIRouter(prefix="/sync", tags=["Offline Batch Synchronization"])


@router.post("", response_model=BatchSyncResponse)
async def sync_offline_records(payload: BatchSyncRequest):
    """
    Idempotent batch synchronization for visits recorded while offline.
    Checks existing visit_id to prevent duplicates on network reconnection.
    """
    visits_col = db_manager.get_collection("visits")
    synced_ids: List[str] = []
    errors: List[Dict[str, Any]] = []
    duplicates_skipped = 0
    synced_count = 0
    failed_count = 0

    for visit_item in payload.visits:
        v_id = visit_item.visit_id
        try:
            if v_id:
                existing = await visits_col.find_one({"visit_id": v_id})
                if existing:
                    duplicates_skipped += 1
                    synced_ids.append(v_id)
                    continue

            created = await create_visit(visit_item)
            synced_ids.append(created.visit_id)
            synced_count += 1
        except Exception as e:
            failed_count += 1
            errors.append({"visit_id": v_id, "error": str(e)})

    return BatchSyncResponse(
        synced_count=synced_count,
        duplicates_skipped=duplicates_skipped,
        failed_count=failed_count,
        synced_ids=synced_ids,
        errors=errors
    )
