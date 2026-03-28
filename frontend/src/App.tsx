import { useState, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { CandidateProfile, JobLead } from './types'
import { useJobs, useAddJob } from './hooks/useJobs'
import { useOpenClaw } from './hooks/useOpenClaw'
import { startScout, clearCache } from './lib/api'
import { ResumeUpload } from './components/ResumeUpload'
import { ScoutFeed } from './components/ScoutFeed'
import { PersonalStatementModal } from './components/PersonalStatementModal'

const qc = new QueryClient()

function Dashboard() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null)
  const [scouting, setScouting] = useState(false)
  const [scoutError, setScoutError] = useState<string | null>(null)
  const [maxResults, setMaxResults] = useState(10)
  const abortRef = useRef<AbortController | null>(null)

  const { data: jobs = [] } = useJobs(scouting)
  const addJob = useAddJob()
  const { connected, inputRequest, execute, submitStatement, dismissInput } = useOpenClaw()

  async function handleScout() {
    if (!profile) return
    setScouting(true)
    setScoutError(null)
    abortRef.current = new AbortController()
    try {
      await startScout(profile, addJob, abortRef.current.signal, maxResults, false)
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setScoutError(err.message)
      }
    } finally {
      setScouting(false)
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    setScouting(false)
  }

  function handleExecute(job: JobLead) {
    if (!profile) return
    execute(job, profile)
  }

  const applied = jobs.filter((j) => j.status === 'applied').length
  const pending  = jobs.filter((j) => j.status === 'pending').length

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col">
      {/* Top bar */}
      <header className="border-b border-green-900 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-green-300 font-bold tracking-widest text-sm">JOB SCOUT</span>
          <span className="text-green-800 text-xs">v0.1 // tinyfish.ai</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-green-700">
            <span className="text-green-400">{jobs.length}</span> found
          </span>
          <span className="text-green-700">
            <span className="text-cyan-400">{applied}</span> applied
          </span>
          <span className="text-green-700">
            <span className="text-green-500">{pending}</span> pending
          </span>
        </div>
      </header>

      {/* Main grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 border-r border-green-900 flex flex-col gap-4 p-4 overflow-y-auto">
          <div>
            <p className="text-xs text-green-700 uppercase tracking-widest mb-2">Resume</p>
            <ResumeUpload profile={profile} onProfile={setProfile} />
          </div>

          <div>
            <p className="text-xs text-green-700 uppercase tracking-widest mb-2">Scout</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="text-green-700">Max results</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={maxResults}
                  disabled={scouting}
                  onChange={(e) => setMaxResults(Math.min(50, Math.max(1, Number(e.target.value))))}
                  className="w-16 bg-black border border-green-800 rounded px-2 py-0.5 text-green-300 text-xs text-right focus:outline-none focus:border-green-600 disabled:opacity-40"
                />
              </div>
              <button
                onClick={async () => {
                  if (!profile) return
                  setScouting(true)
                  setScoutError(null)
                  abortRef.current = new AbortController()
                  try {
                    await startScout(profile, addJob, abortRef.current.signal, maxResults, true)
                  } catch (err) {
                    if (err instanceof Error && err.name !== 'AbortError') setScoutError(err.message)
                  } finally {
                    setScouting(false)
                  }
                }}
                disabled={!profile || scouting}
                className="w-full py-1.5 text-xs border border-green-900 text-green-700 hover:border-green-700 hover:text-green-500 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↺ Re-scrape (refresh)
              </button>
              <button
                onClick={scouting ? handleStop : handleScout}
                disabled={!profile}
                className={`w-full py-2 text-sm border rounded transition-colors font-bold ${
                  scouting
                    ? 'border-yellow-700 text-yellow-400 hover:bg-yellow-950/20'
                    : profile
                    ? 'border-green-600 text-green-400 hover:bg-green-900/30 cursor-pointer'
                    : 'border-green-900 text-green-800 cursor-not-allowed'
                }`}
              >
                {scouting ? '■ STOP SCOUTING' : '▶ START SCOUT'}
              </button>
              {!profile && (
                <p className="text-xs text-green-800">Upload resume to enable scouting</p>
              )}
              {scoutError && (
                <p className="text-xs text-red-500">{scoutError}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          {jobs.length > 0 && (
            <div className="border border-green-900 rounded p-3 space-y-1.5">
              <p className="text-xs text-green-700 uppercase tracking-widest mb-2">Stats</p>
              {(['pending', 'executing', 'awaiting', 'applied', 'failed'] as const).map((s) => {
                const count = jobs.filter((j) => j.status === s).length
                return count > 0 ? (
                  <div key={s} className="flex justify-between text-xs">
                    <span className="text-green-700 uppercase">{s}</span>
                    <span className="text-green-400">{count}</span>
                  </div>
                ) : null
              })}
            </div>
          )}
        </aside>

        {/* Feed */}
        <main className="flex-1 flex flex-col overflow-hidden p-4">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <p className="text-xs text-green-700 uppercase tracking-widest">Job Feed</p>
            {scouting && (
              <span className="text-xs text-yellow-400 animate-pulse">
                ⟳ Scanning job boards...
              </span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <ScoutFeed
              jobs={jobs}
              profile={profile}
              scouting={scouting}
              onExecute={handleExecute}
            />
          </div>
        </main>
      </div>

      {/* Personal Statement Modal */}
      {inputRequest && (
        <PersonalStatementModal
          company={inputRequest.company}
          fieldLabel={inputRequest.fieldLabel}
          maxLength={inputRequest.maxLength}
          onSubmit={(text) => submitStatement(inputRequest.jobId, text)}
          onDismiss={dismissInput}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <Dashboard />
    </QueryClientProvider>
  )
}
