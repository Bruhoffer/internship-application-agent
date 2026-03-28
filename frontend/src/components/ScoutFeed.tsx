import { useState } from 'react'
import type { CandidateProfile, JobLead } from '../types'
import { ExecutionCard } from './ExecutionCard'

interface ScoutFeedProps {
  jobs: JobLead[]
  profile: CandidateProfile | null
  scouting: boolean
  onExecute: (job: JobLead) => void
}

const FILTERS = ['all', 'pending', 'executing', 'awaiting', 'applied', 'failed'] as const
type Filter = (typeof FILTERS)[number]

export function ScoutFeed({ jobs, profile, scouting, onExecute }: ScoutFeedProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const displayed = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter)
  const counts = Object.fromEntries(
    FILTERS.map((f) => [f, f === 'all' ? jobs.length : jobs.filter((j) => j.status === f).length]),
  )

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-1 flex-wrap pb-3 border-b border-green-900 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              filter === f
                ? 'bg-green-900 text-green-300'
                : 'text-green-700 hover:text-green-500'
            }`}
          >
            {f.toUpperCase()} ({counts[f]})
          </button>
        ))}
        {scouting && (
          <span className="ml-auto text-xs text-yellow-400 animate-pulse">
            ⟳ Scouting...
          </span>
        )}
      </div>

      {/* Job grid */}
      {displayed.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-green-800 text-sm">
          {scouting ? 'Waiting for results...' : 'No jobs found. Start a scout run.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-y-auto flex-1 pr-1">
          {displayed.map((job) => (
            <ExecutionCard
              key={job.id}
              job={job}
              profile={profile}
              onExecute={onExecute}
            />
          ))}
        </div>
      )}
    </div>
  )
}
