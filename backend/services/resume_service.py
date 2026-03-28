"""
Resume parsing service — extracts text from PDF using PyMuPDF,
then uses OpenAI to structure the text into CandidateProfile fields.
"""
import json
import os

import fitz  # PyMuPDF
from openai import AsyncOpenAI

from models import CandidateProfile, ExperienceEntry, EducationEntry

client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))

PARSE_PROMPT = """Extract structured data from this resume text.

Resume:
{resume_text}

Return ONLY a JSON object with these fields:
{{
  "name": "<full name>",
  "email": "<email address>",
  "gpa": <float GPA on 5.0 scale, default 4.89 if not found>,
  "skills": ["<skill1>", "<skill2>", ...],
  "experience": [
    {{
      "company": "<company>",
      "role": "<job title>",
      "duration": "<e.g. Jun 2024 – Aug 2024>",
      "description": "<brief description>"
    }}
  ],
  "education": [
    {{
      "institution": "<university name>",
      "degree": "<e.g. Bachelor of Computing>",
      "field": "<e.g. Computer Science>",
      "graduation_year": <year as integer>
    }}
  ]
}}

Rules:
- If GPA is on a 4.0 scale, convert to 5.0 scale by multiplying by 1.25
- Extract up to 20 skills
- Extract up to 5 experience entries
- Use empty arrays if no data found
"""


def extract_text(pdf_bytes: bytes) -> str:
    """Extract raw text from PDF bytes using PyMuPDF."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = [page.get_text() for page in doc]
    doc.close()
    return "\n".join(pages)


async def parse_resume(pdf_bytes: bytes) -> CandidateProfile:
    """Extract text from PDF and parse into CandidateProfile via OpenAI."""
    resume_text = extract_text(pdf_bytes)

    if not os.environ.get("OPENAI_API_KEY"):
        # Return a stub profile when no API key is configured
        return CandidateProfile(
            name="Justin Y.",
            email="justin@example.com",
            gpa=4.89,
            skills=["Python", "TypeScript", "React", "FastAPI", "SQL"],
            experience=[
                ExperienceEntry(
                    company="Acme Corp",
                    role="Software Intern",
                    duration="Jun 2024 – Aug 2024",
                    description="Built internal tooling with Python and React.",
                )
            ],
            education=[
                EducationEntry(
                    institution="National University of Singapore",
                    degree="Bachelor of Computing",
                    field="Computer Science",
                    graduation_year=2026,
                )
            ],
            resume_text=resume_text,
        )

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": PARSE_PROMPT.format(resume_text=resume_text[:6000])}
        ],
        response_format={"type": "json_object"},
        max_tokens=1500,
        temperature=0.1,
    )

    data = json.loads(response.choices[0].message.content)
    return CandidateProfile(
        name=data.get("name", ""),
        email=data.get("email", ""),
        gpa=float(data.get("gpa", 4.89)),
        skills=data.get("skills", []),
        experience=[ExperienceEntry(**e) for e in data.get("experience", [])],
        education=[EducationEntry(**e) for e in data.get("education", [])],
        resume_text=resume_text,
    )
