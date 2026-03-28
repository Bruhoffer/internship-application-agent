from pydantic import BaseModel, Field
from typing import Literal

ApplicationStatus = Literal[
    "pending", "executing", "awaiting", "applied", "failed", "skipped"
]

OpenClawMessageType = Literal[
    "execute", "input_required", "statement_response",
    "status_update", "completed", "error"
]


class ExperienceEntry(BaseModel):
    company: str
    role: str
    duration: str
    description: str


class EducationEntry(BaseModel):
    institution: str
    degree: str
    field: str
    graduation_year: int


class CandidateProfile(BaseModel):
    name: str = ""
    email: str = ""
    gpa: float = Field(default=4.89, ge=0, le=5)
    skills: list[str] = []
    experience: list[ExperienceEntry] = []
    education: list[EducationEntry] = []
    resume_text: str = ""


class JobLead(BaseModel):
    id: str
    company: str
    role: str
    match_score: float = Field(ge=0, le=100)
    application_url: str
    location: str
    description: str
    status: ApplicationStatus = "pending"
    found_at: str
    board: str


class ScoutRequest(BaseModel):
    profile: CandidateProfile
    boards: list[str] = ["LinkedIn", "MyCareersFuture", "Jobindex.dk"]
    max_results: int = Field(default=20, ge=1, le=50)


class OpenClawMessage(BaseModel):
    type: OpenClawMessageType
    job_id: str
    payload: dict = {}
