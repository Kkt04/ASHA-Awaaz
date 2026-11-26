from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from app.schemas.visit import BatchSyncRequest, BatchSyncResponse
from app.schemas.auth import WorkerProfile
from app.api.routes.visits import create_visit
from app.database.mongodb import db_manager
from app.api.deps import get_current_worker

router = APIRouter(prefix="/sync", tags=["Offline Batch Synchronization"])


@router.post("", response_model=BatchSyncResponse)
async def sync_offline_records(
    payload: BatchSyncRequest,
    current_worker: WorkerProfile = Depends(get_current_worker)
):
    """
    Idempotent batch synchronization for visits recorded while offline.
    Guarantees user data isolation: all synced records belong to the authenticated worker.
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

            # Force worker_id from authenticated session
            visit_item.worker_id = current_worker.worker_id
            created = await create_visit(visit_item, current_worker=current_worker)
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
