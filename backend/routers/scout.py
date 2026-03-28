from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
import json

from models import ScoutRequest, JobLead
from services.tinyfish_service import scout_jobs, make_job_lead
from services.scoring_service import score_job
from store import job_store, raw_cache

router = APIRouter(prefix="/api", tags=["scout"])


@router.post("/scout")
async def start_scout(
    request: ScoutRequest,
    refresh: bool = Query(default=False, description="Force re-scrape, ignoring cache"),
) -> StreamingResponse:
    """
    Trigger TinyFish to scout job boards.
    Streams NDJSON — each job is scored and yielded as it arrives.
    Uses cached raw results unless ?refresh=true.
    """
    async def generate():
        async for raw in scout_jobs(
            profile=request.profile,
            boards=request.boards,
            max_results=request.max_results,
            refresh=refresh,
        ):
            try:
                score = await score_job(request.profile, raw.get("description", ""))
            except Exception:
                score = 50.0

            job = make_job_lead(raw, float(score))
            job_store[job.id] = job
            yield json.dumps(job.model_dump()) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")


@router.delete("/scout/cache")
async def clear_cache() -> dict:
    """Clear the raw TinyFish scrape cache so the next scout re-scrapes."""
    raw_cache.clear()
    job_store.clear()
    return {"cleared": True}


@router.get("/jobs")
async def list_jobs() -> list[JobLead]:
    """Return all scouted jobs sorted by match score descending."""
    return sorted(job_store.values(), key=lambda j: j.match_score, reverse=True)


@router.patch("/jobs/{job_id}/status")
async def update_job_status(job_id: str, status: str) -> JobLead:
    """Update a job's application status."""
    job = job_store[job_id]
    job_store[job_id] = job.model_copy(update={"status": status})
    return job_store[job_id]
