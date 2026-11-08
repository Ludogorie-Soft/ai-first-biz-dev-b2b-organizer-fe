'use client'

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from '@/hooks/useTranslations'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const EDITOR_ONLY_ATTR = 'data-editor-only'

/** Uploaded HTML must never run in the app, so the frame forbids all scripts. */
const FRAME_CSP = "default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'; font-src https: data:"

function buildSrcDoc(html: string, hiddenTextLabel: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const csp = doc.createElement('meta')
  csp.httpEquiv = 'Content-Security-Policy'
  csp.content = FRAME_CSP
  csp.setAttribute(EDITOR_ONLY_ATTR, '')
  doc.head.prepend(csp)

  // Hidden preheaders appear in inbox previews, and usually name the original
  // recipient, so they have to be visible here to be edited.
  const hidden = '[style*="display:none"],[style*="display: none"]'
  const style = doc.createElement('style')
  style.setAttribute(EDITOR_ONLY_ATTR, '')
  style.textContent = `
    ${hidden} {
      display: block !important; max-height: none !important; height: auto !important;
      overflow: visible !important; opacity: 1 !important; visibility: visible !important;
      font-size: 12px !important; line-height: 1.4 !important; color: #713f12 !important;
      background: #fef9c3 !important; outline: 1px dashed #ca8a04; padding: 4px 6px; margin-bottom: 8px;
    }
    ${hidden.split(',').map((s) => `${s}::before`).join(',')} {
      content: ${JSON.stringify(`${hiddenTextLabel}: `)}; font-weight: bold;
    }
    a { cursor: text; }
    img { cursor: pointer; }
    img:not([src]), img[src=""] { min-width: 80px; min-height: 24px; outline: 1px dashed #dc2626; }
  `
  doc.head.append(style)

  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`
}

function replaceAllText(root: HTMLElement, search: string, replacement: string): number {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let count = 0
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const parts = node.data.split(search)
    if (parts.length > 1) {
      count += parts.length - 1
      node.data = parts.join(replacement)
    }
  }
  return count
}

export interface StyledHtmlEditorHandle {
  /** Returns false when there is no cursor position in the email to insert at. */
  insertVariable: (variable: string) => boolean
}

interface Props {
  /** Read once on mount. Remount with a new `key` to load different HTML. */
  initialHtml: string
  onChange: (html: string) => void
  height?: number
  onFocus?: () => void
}

export const StyledHtmlEditor = forwardRef<StyledHtmlEditorHandle, Props>(
  ({ initialHtml, onChange, height = 560, onFocus }, ref) => {
    const t = useTranslations()
    const frameRef = useRef<HTMLIFrameElement>(null)
    const savedRange = useRef<Range | null>(null)
    const [srcDoc] = useState(() => buildSrcDoc(initialHtml, t['sequences.templateHiddenText']))
    const [replaceAll, setReplaceAll] = useState(true)
    const [link, setLink] = useState<HTMLAnchorElement | null>(null)
    const [image, setImage] = useState<HTMLImageElement | null>(null)
    const [, forceRender] = useState(0)

    const getDoc = () => frameRef.current?.contentDocument ?? null

    function emitChange() {
      const doc = getDoc()
      if (!doc) return
      const clone = doc.documentElement.cloneNode(true) as HTMLElement
      clone.querySelectorAll(`[${EDITOR_ONLY_ATTR}]`).forEach((el) => el.remove())
      onChange(`<!DOCTYPE html>\n${clone.outerHTML}`)
    }

    function updateTargets(node: Node | null) {
      // nodeType, not instanceof: these nodes belong to the iframe's realm
      const el = node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement ?? null
      setLink(el?.closest('a') ?? null)
      setImage(el?.tagName === 'IMG' ? (el as HTMLImageElement) : null)
    }

    function handleLoad() {
      const doc = getDoc()
      if (!doc) return
      doc.designMode = 'on'
      doc.addEventListener('input', emitChange)
      doc.addEventListener('selectionchange', () => {
        const selection = doc.getSelection()
        if (selection && selection.rangeCount > 0) {
          savedRange.current = selection.getRangeAt(0).cloneRange()
        }
      })
      doc.addEventListener('click', (e) => {
        e.preventDefault()
        updateTargets(e.target as Node)
      })
      doc.addEventListener('keyup', () => updateTargets(doc.getSelection()?.anchorNode ?? null))
      // Plain text only: pasted markup would bring its own styling into the template
      doc.addEventListener('paste', (e) => {
        e.preventDefault()
        doc.execCommand('insertText', false, e.clipboardData?.getData('text/plain') ?? '')
      })
    }

    useImperativeHandle(ref, () => ({
      insertVariable(variable) {
        const doc = getDoc()
        const range = savedRange.current
        if (!doc || !range) return false

        frameRef.current?.contentWindow?.focus()
        const selection = doc.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        const selected = selection?.toString().trim() ?? ''
        if (selected && replaceAll) {
          const count = replaceAllText(doc.body, selected, variable)
          if (count > 0) {
            emitChange()
            toast.success(t['sequences.templateReplaced'].replace('{count}', String(count)))
            return true
          }
        }
        doc.execCommand('insertText', false, variable)
        return true
      },
    }))

    function setAttr(el: HTMLElement, name: string, value: string) {
      el.setAttribute(name, value)
      forceRender((n) => n + 1)
      emitChange()
    }

    return (
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={replaceAll}
            onChange={(e) => setReplaceAll(e.target.checked)}
            className="h-3.5 w-3.5 accent-indigo-600"
          />
          {t['sequences.templateReplaceAll']}
        </label>

        <iframe
          ref={frameRef}
          srcDoc={srcDoc}
          onLoad={handleLoad}
          onFocus={onFocus}
          title={t['sequences.templateEditorTitle']}
          style={{ height }}
          className="w-full rounded-lg border border-input bg-white"
        />

        {(link || image) && (
          <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:grid-cols-2">
            {link && (
              <div className="space-y-1">
                <Label className="text-xs">{t['sequences.templateLinkUrl']}</Label>
                <Input
                  className="h-8 text-xs"
                  value={link.getAttribute('href') ?? ''}
                  onChange={(e) => setAttr(link, 'href', e.target.value)}
                />
              </div>
            )}
            {image && (
              <div className="space-y-1">
                <Label className="text-xs">{t['sequences.templateImageUrl']}</Label>
                <Input
                  className="h-8 text-xs"
                  value={image.getAttribute('src') ?? ''}
                  onChange={(e) => setAttr(image, 'src', e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  },
)

StyledHtmlEditor.displayName = 'StyledHtmlEditor'
