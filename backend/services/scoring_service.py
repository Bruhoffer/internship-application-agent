import os
import json
from openai import AsyncOpenAI
from models import CandidateProfile

client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

SCORE_PROMPT = """You are a career advisor evaluating internship fit.

Candidate Profile:
- Name: {name}
- GPA: {gpa}/5.0
- Skills: {skills}
- Experience: {experience}

Job Description:
{description}

Return ONLY a JSON object with:
{{
  "score": <integer 0-100>,
  "reason": "<one sentence explanation>"
}}

Score criteria:
- 80-100: Strong match (most skills align, relevant experience)
- 60-79: Good match (several skills align)
- 40-59: Partial match (some overlap)
- 0-39: Poor match
"""


async def score_job(profile: CandidateProfile, job_description: str) -> float:
    skills_str = ", ".join(profile.skills) if profile.skills else "Not specified"
    exp_str = "; ".join(
        f"{e.role} at {e.company}" for e in profile.experience
    ) if profile.experience else "No prior experience"

    prompt = SCORE_PROMPT.format(
        name=profile.name or "Candidate",
        gpa=profile.gpa,
        skills=skills_str,
        experience=exp_str,
        description=job_description[:2000],  # cap to save tokens
    )

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        max_tokens=150,
        temperature=0.2,
    )

    result = json.loads(response.choices[0].message.content)
    return float(result.get("score", 50))
