"""
WebSocket endpoint — bridges the React frontend and the local OpenClaw daemon.

Message flow:
  Frontend → WS → Backend → OpenClaw daemon (via HTTP or local socket)
  OpenClaw → Backend → WS → Frontend

For hackathon purposes, the backend acts as the relay and also simulates
OpenClaw responses when no daemon is running.
"""
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from models import OpenClawMessage
from store import job_store

router = APIRouter(tags=["websocket"])

# Active WebSocket connections keyed by job_id
_connections: dict[str, WebSocket] = {}


@router.websocket("/ws/openclaw")
async def openclaw_ws(ws: WebSocket) -> None:
    await ws.accept()
    job_id: str | None = None

    try:
        while True:
            raw = await ws.receive_text()
            msg = OpenClawMessage.model_validate_json(raw)
            job_id = msg.job_id
            _connections[job_id] = ws

            if msg.type == "execute":
                await _handle_execute(ws, msg)

            elif msg.type == "statement_response":
                await _handle_statement(ws, msg)

    except WebSocketDisconnect:
        if job_id and job_id in _connections:
            del _connections[job_id]


async def _handle_execute(ws: WebSocket, msg: OpenClawMessage) -> None:
    """
    Simulate or relay an OpenClaw automation sequence.
    Replace with real OpenClaw daemon calls in production.
    """
    job_id = msg.job_id
    job = job_store.get(job_id)
    if not job:
        await _send(ws, "error", job_id, {"message": "Job not found"})
        return

    # Mark executing
    if job_id in job_store:
        job_store[job_id] = job_store[job_id].model_copy(update={"status": "executing"})

    await _send(ws, "status_update", job_id, {"message": "Opening application URL..."})
    await asyncio.sleep(1.5)

    await _send(ws, "status_update", job_id, {"message": "Filling in personal details..."})
    await asyncio.sleep(1.5)

    # Simulate hitting a personal statement field
    await _send(ws, "input_required", job_id, {
        "company": job.company,
        "field_label": "Why do you want to intern at " + job.company + "?",
        "max_length": 500,
    })
    if job_id in job_store:
        job_store[job_id] = job_store[job_id].model_copy(update={"status": "awaiting"})


async def _handle_statement(ws: WebSocket, msg: OpenClawMessage) -> None:
    """Resume form-filling after receiving a human-provided personal statement."""
    job_id = msg.job_id
    job = job_store.get(job_id)
    if not job:
        await _send(ws, "error", job_id, {"message": "Job not found"})
        return

    if job_id in job_store:
        job_store[job_id] = job_store[job_id].model_copy(update={"status": "executing"})

    await _send(ws, "status_update", job_id, {"message": "Submitting personal statement..."})
    await asyncio.sleep(1.5)

    await _send(ws, "status_update", job_id, {"message": "Reviewing and submitting application..."})
    await asyncio.sleep(2)

    if job_id in job_store:
        job_store[job_id] = job_store[job_id].model_copy(update={"status": "applied"})

    await _send(ws, "completed", job_id, {"message": "Application submitted successfully!"})


async def _send(
    ws: WebSocket,
    msg_type: str,
    job_id: str,
    payload: dict,
) -> None:
    msg = OpenClawMessage(type=msg_type, job_id=job_id, payload=payload)  # type: ignore[arg-type]
    await ws.send_text(msg.model_dump_json())
