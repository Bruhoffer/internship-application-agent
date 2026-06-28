# internship-application-agent — AI Job Scout & Apply

A full-stack AI agent that scouts for internship/job opportunities from your resume and helps generate tailored personal statements.

Built at the tinyfish hackathon using the [OpenClaw](https://github.com/Bruhoffer/internship-application-agent) agentic framework.

---

## What It Does

1. **Upload your resume** — drag-and-drop a PDF; the backend parses it with PyMuPDF to extract your candidate profile
2. **Scout for leads** — the agent searches for relevant job openings and streams results into a live feed
3. **Review opportunities** — a real-time feed of job leads with titles, companies, and match context
4. **Generate personal statements** — click any lead to open a modal and generate a tailored personal statement

The backend agent runs as a multi-step loop. Mid-execution, it can pause and request human input via WebSocket (the "OpenClaw" protocol) — the frontend receives the prompt and lets you respond inline without restarting.

---

## Architecture

```
backend/
  main.py            FastAPI app — CORS, router mounting
  routers/
    scout.py         POST /scout — starts the scouting agent loop
    resume.py        POST /resume — parses uploaded PDF
    ws.py            WebSocket /ws — OpenClaw human-in-the-loop channel
  services/          Business logic (resume parsing, job search, statement generation)
  models.py          Pydantic schemas — CandidateProfile, JobLead
  store.py           In-memory job lead store (shared across requests)

frontend/
  src/
    App.tsx                     Dashboard — resume upload + scout controls
    components/
      ResumeUpload.tsx          Drag-and-drop PDF uploader
      ScoutFeed.tsx             Live job lead stream
      PersonalStatementModal    Statement generation modal
    hooks/
      useJobs.ts                TanStack Query hooks for job leads
      useOpenClaw.ts            WebSocket hook — receives agent input requests, sends responses
    lib/api.ts                  REST + streaming API calls
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI · Python |
| Agent framework | tinyfish / OpenClaw |
| PDF parsing | PyMuPDF |
| LLM | OpenAI |
| Streaming | WebSockets |
| Frontend | React 19 · TypeScript · Vite |
| Styling | Tailwind CSS v4 |
| Data fetching | TanStack Query |

---

## Setup

**Prerequisites:** Python 3.11+, Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in:

```env
OPENAI_API_KEY=sk-...
```

Run:

```bash
uvicorn backend.main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`.

---

## How the Agent Loop Works

1. Resume PDF is uploaded → `POST /resume` parses it into a `CandidateProfile`
2. `POST /scout` triggers the agent loop with the profile and a max-results limit
3. The agent searches for leads and streams each found job via the REST response
4. When the agent needs human clarification, it sends an `InputRequest` over the WebSocket
5. The `useOpenClaw` hook surfaces this as a prompt in the UI; the user's response is sent back over the same socket
6. The agent resumes, incorporating the human's input
