import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJobs } from '../lib/api'
import type { JobLead } from '../types'

export function useJobs(scouting: boolean) {
  return useQuery<JobLead[]>({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
    refetchInterval: scouting ? 3000 : false,
    staleTime: 1000,
    initialData: [],
  })
}

/** Manually add a job to the local cache (from streaming scout). */
export function useAddJob() {
  const qc = useQueryClient()
  return (job: JobLead) => {
    qc.setQueryData<JobLead[]>(['jobs'], (prev = []) => {
      const exists = prev.some((j) => j.id === job.id)
      return exists ? prev : [...prev, job]
    })
  }
}
