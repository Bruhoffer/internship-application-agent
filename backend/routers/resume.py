from fastapi import APIRouter, UploadFile, File, HTTPException
from models import CandidateProfile
from services.resume_service import parse_resume

router = APIRouter(prefix="/api", tags=["resume"])


@router.post("/resume", response_model=CandidateProfile)
async def upload_resume(file: UploadFile = File(...)) -> CandidateProfile:
    """Accept a PDF resume, extract text, and return a parsed CandidateProfile."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:  # 10 MB cap
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit.")

    return await parse_resume(pdf_bytes)
