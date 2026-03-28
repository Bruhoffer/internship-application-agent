import { useCallback, useRef, useState } from 'react'
import type { CandidateProfile, JobLead, OpenClawMessage } from '../types'
import { useQueryClient } from '@tanstack/react-query'

interface InputRequest {
  jobId: string
  company: string
  fieldLabel: string
  maxLength: number
}

export function useOpenClaw() {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [inputRequest, setInputRequest] = useState<InputRequest | null>(null)
  const qc = useQueryClient()

  // Lazy connect — only called when user clicks Execute
  const connect = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${protocol}://${window.location.host}/ws/openclaw`)

      ws.onopen = () => {
        setConnected(true)
        resolve()
      }
      ws.onclose = () => setConnected(false)
      ws.onmessage = (event: MessageEvent<string>) => {
        try {
          const msg = JSON.parse(event.data) as OpenClawMessage
          handleMessage(msg)
        } catch {
          // ignore malformed frames
        }
      }

      wsRef.current = ws
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleMessage(msg: OpenClawMessage) {
    const { type, job_id, payload } = msg

    if (type === 'input_required') {
      setInputRequest({
        jobId: job_id,
        company: (payload?.company as string) ?? '',
        fieldLabel: (payload?.field_label as string) ?? 'Personal Statement',
        maxLength: (payload?.max_length as number) ?? 500,
      })
      updateJobStatus(job_id, 'awaiting')
    }

    if (type === 'status_update') {
      // Status updates are ephemeral; we could show a toast here
    }

    if (type === 'completed') {
      updateJobStatus(job_id, 'applied')
      setInputRequest(null)
    }

    if (type === 'error') {
      updateJobStatus(job_id, 'failed')
      setInputRequest(null)
    }

    if (type === 'status_update' && (payload?.message as string)?.includes('Executing')) {
      updateJobStatus(job_id, 'executing')
    }
  }

  function updateJobStatus(jobId: string, status: string) {
    qc.setQueryData<JobLead[]>(['jobs'], (prev = []) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: status as JobLead['status'] } : j)),
    )
  }

  function send(msg: OpenClawMessage) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }

  async function execute(job: JobLead, profile: CandidateProfile) {
    await connect()
    updateJobStatus(job.id, 'executing')
    send({ type: 'execute', job_id: job.id, payload: { job, profile } })
  }

  function submitStatement(jobId: string, text: string) {
    send({ type: 'statement_response', job_id: jobId, payload: { text } })
    setInputRequest(null)
  }

  function dismissInput() {
    setInputRequest(null)
  }

  return { connected, inputRequest, execute, submitStatement, dismissInput }
}
