"""In-memory stores for hackathon scope."""
from models import JobLead

# Scored job leads keyed by job id
job_store: dict[str, JobLead] = {}

# Raw scraped jobs from TinyFish keyed by board name — survives between scout runs
raw_cache: dict[str, list[dict]] = {}
