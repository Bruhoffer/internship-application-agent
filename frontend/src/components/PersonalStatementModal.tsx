import { useState } from 'react'

interface PersonalStatementModalProps {
  company: string
  fieldLabel: string
  maxLength: number
  onSubmit: (text: string) => void
  onDismiss: () => void
}

export function PersonalStatementModal({
  company,
  fieldLabel,
  maxLength,
  onSubmit,
  onDismiss,
}: PersonalStatementModalProps) {
  const [text, setText] = useState('')

  function handleSubmit() {
    if (text.trim()) onSubmit(text.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg border border-green-700 rounded bg-black shadow-2xl shadow-green-950 space-y-4 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-green-600 uppercase tracking-widest">Input Required</div>
            <div className="text-green-300 font-bold mt-0.5">{company}</div>
          </div>
          <button
            onClick={onDismiss}
            className="text-green-800 hover:text-green-500 text-lg leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Prompt */}
        <div className="bg-green-950/20 border border-green-900 rounded p-3">
          <p className="text-green-400 text-sm">{fieldLabel}</p>
        </div>

        {/* Textarea */}
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, maxLength))}
            rows={6}
            placeholder="Type your response here..."
            className="w-full bg-green-950/10 border border-green-800 rounded p-3 text-green-300 text-sm placeholder-green-800 focus:outline-none focus:border-green-600 resize-none"
          />
          <div className="text-right text-xs text-green-800 mt-1">
            {text.length} / {maxLength}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onDismiss}
            className="px-4 py-1.5 text-sm text-green-700 border border-green-900 rounded hover:border-green-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="px-4 py-1.5 text-sm text-black bg-green-400 rounded hover:bg-green-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold"
          >
            Submit & Continue
          </button>
        </div>
      </div>
    </div>
  )
}
