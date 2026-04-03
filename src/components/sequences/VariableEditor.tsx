'use client'

import { forwardRef, useImperativeHandle, useRef } from 'react'
import { cn } from '@/lib/utils'

// Splits text on known template variables
const VAR_SPLIT = /({{(?:first_name|last_name|email|full_name|company_name|position)}})/g

export interface VariableEditorHandle {
  insertVariable: (variable: string) => void
  focus: () => void
}

interface Props {
  value: string
  onChange: (value: string) => void
  hasError?: boolean
  rows?: number
}

// Exact padding/font to match the shadcn Textarea (px-2.5 py-2, text-sm)
const SHARED: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: '0.875rem',
  lineHeight: '1.5rem',
  padding: '0.5rem 0.625rem',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  borderRadius: '0.5rem',
  boxSizing: 'border-box',
  margin: 0,
}

export const VariableEditor = forwardRef<VariableEditorHandle, Props>(
  ({ value, onChange, hasError, rows = 6 }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
      insertVariable(variable: string) {
        const ta = textareaRef.current
        if (!ta) return
        ta.focus()
        const start = ta.selectionStart ?? value.length
        const end = ta.selectionEnd ?? value.length
        const next = value.slice(0, start) + variable + value.slice(end)
        onChange(next)
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + variable.length
        })
      },
      focus() {
        textareaRef.current?.focus()
      },
    }))

    function syncScroll() {
      if (overlayRef.current && textareaRef.current) {
        overlayRef.current.scrollTop = textareaRef.current.scrollTop
      }
    }

    function handleDrop(e: React.DragEvent<HTMLTextAreaElement>) {
      e.preventDefault()
      const variable = e.dataTransfer.getData('text/plain')
      if (!variable || !variable.startsWith('{{')) return
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart ?? value.length
      const end = ta.selectionEnd ?? value.length
      const next = value.slice(0, start) + variable + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        ta.focus()
        ta.selectionStart = ta.selectionEnd = start + variable.length
      })
    }

    function renderHighlighted() {
      if (!value) return null
      return value.split(VAR_SPLIT).map((part, i) => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
          return (
            <mark
              key={i}
              style={{
                background: '#ddd6fe',   // indigo-200
                color: 'transparent',
                borderRadius: '3px',
                padding: '0 2px',
              }}
            >
              {part}
            </mark>
          )
        }
        return (
          <span key={i} style={{ color: 'transparent' }}>
            {part}
          </span>
        )
      })
    }

    return (
      // CSS grid stacking: overlay and textarea share the same cell
      <div style={{ display: 'grid' }}>
        {/* Highlight overlay — sits behind the transparent textarea */}
        <div
          ref={overlayRef}
          aria-hidden
          style={{
            ...SHARED,
            gridArea: '1 / 1',
            pointerEvents: 'none',
            overflow: 'hidden',
            border: '1px solid transparent',
            minHeight: `calc(${rows} * 1.5rem + 1rem)`,
          }}
        >
          {renderHighlighted()}
          {'\u200b'}
        </div>

        {/* Actual textarea — transparent bg so overlay shows through */}
        <textarea
          ref={textareaRef}
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            ...SHARED,
            gridArea: '1 / 1',
            background: 'transparent',
            color: '#0f172a',
            caretColor: '#0f172a',
            position: 'relative',
            resize: 'vertical',
          }}
          className={cn(
            'w-full outline-none transition-colors border border-input',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            hasError && 'border-red-300',
          )}
        />
      </div>
    )
  }
)

VariableEditor.displayName = 'VariableEditor'
