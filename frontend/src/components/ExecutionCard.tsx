import type { CandidateProfile, JobLead } from '../types'

const STATUS_CONFIG: Record<
  JobLead['status'],
  { label: string; color: string; dot: string }
> = {
  pending:   { label: 'READY',     color: 'text-green-600',  dot: 'bg-green-700' },
  executing: { label: 'RUNNING',   color: 'text-yellow-400', dot: 'bg-yellow-400 animate-pulse' },
  awaiting:  { label: 'AWAITING',  color: 'text-orange-400', dot: 'bg-orange-400 animate-pulse' },
  applied:   { label: 'APPLIED',   color: 'text-cyan-400',   dot: 'bg-cyan-400' },
  failed:    { label: 'FAILED',    color: 'text-red-500',    dot: 'bg-red-500' },
  skipped:   { label: 'SKIPPED',   color: 'text-green-800',  dot: 'bg-green-900' },
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-cyan-400' : score >= 60 ? 'bg-green-400' : score >= 40 ? 'bg-yellow-500' : 'bg-red-600'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-20 bg-green-950 rounded overflow-hidden">
        <div className={`h-full ${color} rounded`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-green-500">{score.toFixed(0)}%</span>
    </div>
  )
}

interface ExecutionCardProps {
  job: JobLead
  profile: CandidateProfile | null
  onExecute: (job: JobLead) => void
}

export function ExecutionCard({ job, profile, onExecute }: ExecutionCardProps) {
  const cfg = STATUS_CONFIG[job.status]
  const busy = job.status === 'executing' || job.status === 'awaiting'
  const done = job.status === 'applied' || job.status === 'skipped'
  const canExecute = profile !== null && !busy && !done

  return (
    <div className="border border-green-900 rounded p-3 space-y-2 hover:border-green-700 transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-green-300 text-sm font-bold truncate">{job.company}</div>
          <div className="text-green-600 text-xs truncate">{job.role}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-xs text-green-700">
        <span>{job.location}</span>
        <span>{job.board}</span>
      </div>

      {/* Match score */}
      <ScoreBar score={job.matchScore} />

      {/* Description preview */}
      <p className="text-xs text-green-700 line-clamp-2 leading-relaxed">
        {job.description}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          disabled={!canExecute}
          onClick={() => onExecute(job)}
          className={`px-3 py-1 text-xs border rounded transition-colors ${
            canExecute
              ? 'border-green-600 text-green-400 hover:bg-green-900/40 cursor-pointer'
              : done
              ? 'border-cyan-900 text-cyan-800 cursor-default'
              : 'border-green-900 text-green-800 cursor-not-allowed'
          }`}
        >
          {job.status === 'applied' ? '✓ Applied' : job.status === 'executing' ? '⟳ Running' : job.status === 'awaiting' ? '⏳ Input' : '▶ Execute'}
        </button>
        <a
          href={job.applicationUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-green-700 hover:text-green-400 transition-colors"
        >
          [open ↗]
        </a>
      </div>
    </div>
  )
}
