'use client'

import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const VAR_PATTERN = /\{\{(?:first_name|last_name|email|full_name|company_name|position)\}\}/g

const VariableHighlight = Extension.create({
  name: 'variableHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decorations: ReturnType<typeof Decoration.inline>[] = []
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return
              const regex = new RegExp(VAR_PATTERN.source, 'g')
              let match: RegExpExecArray | null
              while ((match = regex.exec(node.text)) !== null) {
                decorations.push(
                  Decoration.inline(pos + match.index, pos + match.index + match[0].length, {
                    class: 'variable-highlight',
                  }),
                )
              }
            })
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Convert legacy plain-text bodies into HTML TipTap can edit. */
function toEditorContent(value: string): string {
  if (!value) return ''
  if (/<[a-z][\s\S]*>/i.test(value)) return value
  return value
    .split(/\n\n+/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/** TipTap empty doc is `<p></p>` — treat as empty for form validation. */
export function normalizeBodyHtml(html: string): string {
  const text = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/g, ' ')
    .trim()
  return text.length > 0 ? html : ''
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

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

export const VariableEditor = forwardRef<VariableEditorHandle, Props>(
  ({ value, onChange, hasError, rows = 6 }, ref) => {
    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          code: false,
          blockquote: false,
          horizontalRule: false,
          strike: false,
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            rel: 'noopener noreferrer',
            target: '_blank',
          },
        }),
        Placeholder.configure({
          placeholder: 'Write your email body…',
        }),
        VariableHighlight,
      ],
      content: toEditorContent(value),
      editorProps: {
        attributes: {
          class: cn(
            'sequence-body-editor focus:outline-none px-2.5 py-2 text-sm text-slate-900',
            'min-h-[calc(var(--editor-rows)*1.5rem+1rem)]',
          ),
          style: `--editor-rows: ${rows}`,
        },
        handleDrop(view, event) {
          const variable = event.dataTransfer?.getData('text/plain')
          if (!variable?.startsWith('{{')) return false
          event.preventDefault()
          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
          if (coords) {
            const tr = view.state.tr.insertText(variable, coords.pos)
            view.dispatch(tr)
          }
          return true
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChange(normalizeBodyHtml(ed.getHTML()))
      },
    })

    useImperativeHandle(ref, () => ({
      insertVariable(variable: string) {
        if (!editor) return
        editor.chain().focus().insertContent(variable).run()
      },
      focus() {
        editor?.commands.focus()
      },
    }))

    // Remount via parent `key` when opening a different step; this only
    // covers rare external value resets while the same editor instance is open.
    useEffect(() => {
      if (!editor || editor.isFocused) return
      const next = toEditorContent(value)
      if (normalizeBodyHtml(editor.getHTML()) !== normalizeBodyHtml(next)) {
        editor.commands.setContent(next, { emitUpdate: false })
      }
    }, [value, editor])

    function setLink() {
      if (!editor) return
      const previous = editor.getAttributes('link').href as string | undefined
      const url = window.prompt('Enter URL', previous || 'https://')
      if (url === null) return
      if (url.trim() === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
        return
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
    }

    return (
      <div
        className={cn(
          'rounded-lg border border-input overflow-hidden bg-background transition-colors',
          'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
          hasError && 'border-red-300',
        )}
      >
        <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-slate-50 px-1.5 py-1">
          <ToolbarButton
            active={editor?.isActive('bold')}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive('italic')}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive('underline')}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <ToolbarButton
            active={editor?.isActive('bulletList')}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor?.isActive('orderedList')}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <ToolbarButton active={editor?.isActive('link')} onClick={setLink} title="Link">
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().unsetLink().run()}
            title="Remove link"
            disabled={!editor?.isActive('link')}
          >
            <Unlink className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>

        <EditorContent editor={editor} />
      </div>
    )
  },
)

VariableEditor.displayName = 'VariableEditor'

function ToolbarButton({
  children,
  onClick,
  active,
  title,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  title: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition-colors',
        'hover:bg-slate-200/80 hover:text-slate-900',
        'disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-indigo-100 text-indigo-700',
      )}
    >
      {children}
    </button>
  )
}
