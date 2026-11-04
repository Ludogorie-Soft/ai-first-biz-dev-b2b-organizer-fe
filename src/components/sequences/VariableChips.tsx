'use client'

export const SEQUENCE_VARIABLES = [
  '{{first_name}}',
  '{{last_name}}',
  '{{email}}',
  '{{full_name}}',
  '{{company_name}}',
  '{{position}}',
] as const

export function VariableChips({ onInsert }: { onInsert: (variable: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SEQUENCE_VARIABLES.map((variable) => (
        <button
          key={variable}
          type="button"
          draggable
          onDragStart={(e) => e.dataTransfer.setData('text/plain', variable)}
          onClick={() => onInsert(variable)}
          className="cursor-grab active:cursor-grabbing px-2 py-0.5 rounded text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors select-none"
          title="Click to insert · Drag to field"
        >
          {variable}
        </button>
      ))}
    </div>
  )
}
