import axios from 'axios'
import type { CandidateProfile, JobLead } from '../types'

const http = axios.create({ baseURL: '' })

// Backend returns snake_case; map to camelCase for the frontend
function mapJob(raw: Record<string, unknown>): JobLead {
  return {
    id: raw.id as string,
    company: raw.company as string,
    role: raw.role as string,
    matchScore: (raw.match_score ?? raw.matchScore ?? 0) as number,
    applicationUrl: (raw.application_url ?? raw.applicationUrl ?? '') as string,
    location: (raw.location ?? '') as string,
    description: (raw.description ?? '') as string,
    status: (raw.status ?? 'pending') as JobLead['status'],
    foundAt: (raw.found_at ?? raw.foundAt ?? '') as string,
    board: (raw.board ?? '') as string,
  }
}

export async function uploadResume(file: File): Promise<CandidateProfile> {
  const form = new FormData()
  form.append('file', file)
  try {
    const { data } = await http.post<CandidateProfile>('/api/resume', form)
    return data
  } catch (err: unknown) {
    // Surface the FastAPI error detail if present
    const detail = (err as { response?: { data?: { detail?: string } } })
      ?.response?.data?.detail
    throw new Error(detail ?? 'Resume upload failed')
  }
}

export async function fetchJobs(): Promise<JobLead[]> {
  const { data } = await http.get<Record<string, unknown>[]>('/api/jobs')
  return data.map(mapJob)
}

export async function updateJobStatus(jobId: string, status: string): Promise<JobLead> {
  const { data } = await http.patch<JobLead>(`/api/jobs/${jobId}/status`, null, {
    params: { status },
  })
  return data
}

/**
 * Start a scouting run. Consumes the NDJSON stream and calls `onJob`
 * for each job as it arrives from the backend.
 */
export async function clearCache(): Promise<void> {
  await http.delete('/api/scout/cache')
}

export async function startScout(
  profile: CandidateProfile,
  onJob: (job: JobLead) => void,
  signal?: AbortSignal,
  maxResults = 10,
  refresh = false,
): Promise<void> {
  const url = refresh ? '/api/scout?refresh=true' : '/api/scout'
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile,
      boards: [],
      max_results: maxResults,
    }),
    signal,
  })

  if (!response.body) return

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.trim()) {
        try {
          onJob(mapJob(JSON.parse(line) as Record<string, unknown>))
        } catch {
          // malformed line — skip
        }
      }
    }
  }
}
