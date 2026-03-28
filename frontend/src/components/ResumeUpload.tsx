import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import type { CandidateProfile } from '../types'
import { uploadResume } from '../lib/api'

interface ResumeUploadProps {
  profile: CandidateProfile | null
  onProfile: (p: CandidateProfile) => void
}

export function ResumeUpload({ profile, onProfile }: ResumeUploadProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return
      setLoading(true)
      setError(null)
      try {
        const parsed = await uploadResume(file)
        onProfile(parsed)
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : String(err)
        console.error('[ResumeUpload]', err)
        setError(msg || 'Upload failed.')
      } finally {
        setLoading(false)
      }
    },
    [onProfile],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: loading,
  })

  if (profile) {
    return (
      <div className="border border-green-800 rounded p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-green-300 text-sm font-bold">CANDIDATE PROFILE</span>
          <button
            onClick={() => onProfile({ name: '', email: '', gpa: 4.89, skills: [], experience: [], education: [], resumeText: '' })}
            className="text-xs text-green-700 hover:text-green-400 transition-colors"
          >
            [RESET]
          </button>
        </div>
        <div className="text-xs space-y-1 text-green-400">
          <div><span className="text-green-600">NAME  </span>{profile.name || '—'}</div>
          <div><span className="text-green-600">EMAIL </span>{profile.email || '—'}</div>
          <div><span className="text-green-600">GPA   </span>{profile.gpa}/5.0</div>
          <div>
            <span className="text-green-600">SKILLS</span>{' '}
            <span className="text-green-300">{profile.skills.slice(0, 8).join(' · ')}</span>
            {profile.skills.length > 8 && <span className="text-green-700"> +{profile.skills.length - 8}</span>}
          </div>
          {profile.experience.length > 0 && (
            <div>
              <span className="text-green-600">EXP   </span>
              {profile.experience.map((e) => `${e.role} @ ${e.company}`).join(' | ')}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded p-6 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-green-400 bg-green-950/20'
          : 'border-green-800 hover:border-green-600'
      } ${loading ? 'opacity-50 cursor-wait' : ''}`}
    >
      <input {...getInputProps()} />
      {loading ? (
        <p className="text-green-400 text-sm animate-pulse">Parsing resume...</p>
      ) : isDragActive ? (
        <p className="text-green-300 text-sm">Drop PDF here</p>
      ) : (
        <div className="space-y-1">
          <p className="text-green-600 text-xs uppercase tracking-widest">Resume Upload</p>
          <p className="text-green-400 text-sm">Drag & drop PDF or click to browse</p>
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  )
}
