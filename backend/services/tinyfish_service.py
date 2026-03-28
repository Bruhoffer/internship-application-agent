"""
TinyFish service — uses AsyncTinyFish SDK to browse job boards and extract listings.

Pattern: /run-sse (streaming) via client.agent.stream()
  - STARTED / STREAMING_URL / PROGRESS / HEARTBEAT events are ignored for data
  - COMPLETE event carries result_json with extracted job listings
"""
import os
import uuid
import logging
from datetime import datetime, timezone

from tinyfish import AsyncTinyFish

from models import CandidateProfile, JobLead

logger = logging.getLogger(__name__)

def build_search_url(profile: CandidateProfile) -> str:
    """Build a Google Jobs search URL personalised to the candidate's skills."""
    from urllib.parse import urlencode
    top_skills = " OR ".join(profile.skills[:3]) if profile.skills else "software"
    query = f'internship ({top_skills}) Singapore 2025 OR 2026'
    # htl;jobs activates Google's native job-listing panel
    params = urlencode({"q": query, "ibp": "htl;jobs"})
    return f"https://www.google.com/search?{params}"


def build_extraction_goal(profile: CandidateProfile) -> str:
    skills_str = ", ".join(profile.skills[:5]) if profile.skills else "software engineering"
    return f"""
You are helping a student find internship opportunities.

Candidate skills: {skills_str}

Search the page for internship job listings relevant to this candidate.
If there are job cards or a job listing panel, click through to see more listings.
Navigate to additional pages or expand any "show more" sections if available.

Return a JSON object with a single key "jobs" containing an array of objects.
Each object must have these exact keys:
  - "company": company name (string)
  - "role": job title (string)
  - "url": direct link to apply or the job detail page (full URL, not a redirect)
  - "location": city and country (string)
  - "description": 1-2 sentence summary of the role and key requirements (string)

Extract up to 10 listings. If a field is unavailable use an empty string.
Always return valid JSON even if no listings are found (use an empty array).
"""


CACHE_KEY = "google_search"


async def scout_jobs(
    profile: CandidateProfile,
    boards: list[str],  # kept for API compatibility but ignored — we use Google search
    max_results: int,
    refresh: bool = False,
):
    """
    Async generator — builds a personalised Google Jobs search URL from the
    candidate profile, runs TinyFish against it, and yields job dicts one by one.
    Results are cached; pass refresh=True to force a fresh crawl.
    """
    from store import raw_cache

    if not refresh and CACHE_KEY in raw_cache:
        logger.info("Serving %d cached listings", len(raw_cache[CACHE_KEY]))
        for job in raw_cache[CACHE_KEY][:max_results]:
            yield job
        return

    client = AsyncTinyFish()
    search_url = build_search_url(profile)
    goal = build_extraction_goal(profile)
    print(f"\n{'='*60}")
    print(f"[SCOUT] Candidate: {profile.name or 'Unknown'}")
    print(f"[SCOUT] Skills used: {profile.skills[:5]}")
    print(f"[SCOUT] Search URL: {search_url}")
    print(f"[SCOUT] Goal:\n{goal}")
    print(f"{'='*60}\n")

    try:
        jobs = await _scrape_board(client, search_url, goal)
        raw_cache[CACHE_KEY] = jobs
        logger.info("Scraped %d listings (cached)", len(jobs))
        for job in jobs[:max_results]:
            yield job
    except Exception as exc:
        logger.error("TinyFish failed: %s", exc)
        logger.warning("Falling back to mock data")
        for job in _mock_jobs(profile, boards, max_results):
            yield job


async def _scrape_board(
    client: AsyncTinyFish,
    url: str,
    goal: str,
) -> list[dict]:
    """Run TinyFish against a URL and return all extracted job dicts.

    Reads the raw SSE event dict directly because the SDK's CompleteEvent.result_json
    is always None (SDK bug: aliases resultJson but API returns result).
    """
    from tinyfish._utils.sse_parser import async_parse_sse_line_stream

    body = {"goal": goal, "url": url, "browser_profile": "stealth"}
    raw_complete: dict | None = None

    lines = client.agent._post_stream("/v1/automation/run-sse", json=body)
    async for event_data in async_parse_sse_line_stream(lines):
        event_type = event_data.get("type")
        if event_type == "PROGRESS":
            logger.info("[TinyFish] %s", event_data.get("purpose", ""))
        elif event_type == "COMPLETE":
            raw_complete = event_data

    if raw_complete is None or raw_complete.get("status") != "COMPLETED":
        status = raw_complete.get("status") if raw_complete else "no-complete-event"
        raise RuntimeError(f"TinyFish run did not complete successfully (status={status})")

    result = raw_complete.get("result") or {}
    raw_jobs: list[dict] = result.get("jobs", [])

    from urllib.parse import urlparse
    source = urlparse(url).netloc or url

    normalised = []
    for job in raw_jobs:
        if not isinstance(job, dict):
            continue
        normalised.append({
            "company": str(job.get("company", "")).strip() or "Unknown",
            "role": str(job.get("role", "")).strip() or "Internship",
            "url": str(job.get("url", url)).strip() or url,
            "location": str(job.get("location", "")).strip(),
            "description": str(job.get("description", "")).strip(),
            "board": source,
        })

    return normalised


def _mock_jobs(
    profile: CandidateProfile,
    boards: list[str],
    max_results: int,
) -> list[dict]:
    """Hardcoded fallback listings used when TinyFish is unavailable."""
    skills = profile.skills or ["Python", "TypeScript", "React"]
    mock = [
        {
            "company": "GovTech Singapore",
            "role": "Software Engineering Intern",
            "url": "https://careers.tech.gov.sg/",
            "location": "Singapore",
            "description": (
                f"Build digital services for citizens. Skills: {', '.join(skills[:3])}. "
                "GPA min 3.5/5.0."
            ),
            "board": "MyCareersFuture",
        },
        {
            "company": "Sea Limited (Shopee)",
            "role": "Backend Engineering Intern",
            "url": "https://careers.sea.com/",
            "location": "Singapore",
            "description": (
                f"Work on high-scale distributed systems. "
                f"Proficiency in {skills[0] if skills else 'Python'} required."
            ),
            "board": "LinkedIn",
        },
        {
            "company": "Grab",
            "role": "Data Engineering Intern",
            "url": "https://grab.careers/",
            "location": "Singapore",
            "description": "Build data pipelines and ML infrastructure. Python, SQL, Spark.",
            "board": "LinkedIn",
        },
        {
            "company": "Novo Nordisk",
            "role": "Software Development Intern",
            "url": "https://www.novonordisk.com/careers.html",
            "location": "Copenhagen, Denmark",
            "description": (
                f"Develop internal tools for pharma R&D. "
                f"{', '.join(skills[:2])} experience helpful. GPA 4.0+ preferred."
            ),
            "board": "Jobindex.dk",
        },
        {
            "company": "Maersk",
            "role": "Digital Technology Intern",
            "url": "https://www.maersk.com/careers",
            "location": "Copenhagen, Denmark",
            "description": "Supply chain digitisation. Full-stack experience preferred.",
            "board": "Jobindex.dk",
        },
        {
            "company": "DBS Bank",
            "role": "Technology & Innovation Intern",
            "url": "https://www.dbs.com/careers/",
            "location": "Singapore",
            "description": "Fintech innovation. React, TypeScript, AWS/GCP skills valued.",
            "board": "MyCareersFuture",
        },
    ]
    return mock[:max_results]


def make_job_lead(raw: dict, score: float) -> JobLead:
    return JobLead(
        id=str(uuid.uuid4()),
        company=raw["company"],
        role=raw["role"],
        match_score=score,
        application_url=raw["url"],
        location=raw.get("location", ""),
        description=raw.get("description", ""),
        status="pending",
        found_at=datetime.now(timezone.utc).isoformat(),
        board=raw.get("board", "Unknown"),
    )
