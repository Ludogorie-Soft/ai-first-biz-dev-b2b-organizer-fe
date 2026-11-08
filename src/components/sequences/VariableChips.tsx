'use client'

import { useRef } from 'react'

export const SEQUENCE_VARIABLES = [
  '{{first_name}}',
  '{{last_name}}',
  '{{email}}',
  '{{full_name}}',
  '{{company_name}}',
  '{{position}}',
] as const

const VARIABLE_TOKEN = /^\{\{(?:first_name|last_name|email|full_name|company_name|position)\}\}$/i

/** Renders subject or body text with variable tokens called out. */
export function VariableText({ text }: { text: string }) {
  const parts = text.split(/(\{\{(?:first_name|last_name|email|full_name|company_name|position)\}\})/gi)
  return (
    <>
      {parts.map((part, index) =>
        VARIABLE_TOKEN.test(part) ? (
          <span
            key={index}
            className="rounded bg-indigo-50 px-1 py-px font-mono text-[0.85em] text-indigo-700"
          >
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  )
}

export function VariableChips({ onInsert }: { onInsert: (variable: string) => void }) {
  const draggedRef = useRef(false)

  return (
    <div className="flex flex-wrap gap-1.5">
      {SEQUENCE_VARIABLES.map((variable) => (
        <button
          key={variable}
          type="button"
          draggable
          onDragStart={(e) => {
            draggedRef.current = true
            e.dataTransfer.setData('text/plain', variable)
            e.dataTransfer.effectAllowed = 'copy'
          }}
          onDragEnd={() => {
            requestAnimationFrame(() => {
              draggedRef.current = false
            })
          }}
          onClick={() => {
            if (draggedRef.current) return
            onInsert(variable)
          }}
          className="cursor-grab active:cursor-grabbing px-2 py-0.5 rounded text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors select-none"
          title="Click to insert · Drag to field"
        >
          {variable}
        </button>
      ))}
    </div>
  )
}
