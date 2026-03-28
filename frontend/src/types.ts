export interface CandidateProfile {
  name: string
  email: string
  gpa: number // NUS GPA out of 5.0 — e.g. 4.89
  skills: string[]
  experience: ExperienceEntry[]
  education: EducationEntry[]
  resumeText: string // raw extracted text from PDF
}

export interface ExperienceEntry {
  company: string
  role: string
  duration: string
  description: string
}

export interface EducationEntry {
  institution: string
  degree: string
  field: string
  graduationYear: number
}

export type ApplicationStatus =
  | 'pending'     // Found, not yet actioned
  | 'executing'   // OpenClaw is filling the form
  | 'awaiting'    // OpenClaw needs human input (personal statement)
  | 'applied'     // Successfully submitted
  | 'failed'      // Error during submission
  | 'skipped'     // User chose to skip

export interface JobLead {
  id: string
  company: string
  role: string
  matchScore: number       // 0–100 from OpenAI scoring
  applicationUrl: string
  location: string
  description: string
  status: ApplicationStatus
  foundAt: string          // ISO timestamp
  board: string            // e.g. "LinkedIn", "MyCareersFuture", "Jobindex.dk"
}

// WebSocket message types for OpenClaw bridge
export type OpenClawMessageType =
  | 'execute'             // Frontend → backend: start automation
  | 'input_required'      // Backend → frontend: needs personal statement
  | 'statement_response'  // Frontend → backend: human-provided text
  | 'status_update'       // Backend → frontend: progress update
  | 'completed'           // Backend → frontend: application done
  | 'error'               // Backend → frontend: automation failed

export interface OpenClawMessage {
  type: OpenClawMessageType
  jobId: string
  payload?: Record<string, unknown>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
