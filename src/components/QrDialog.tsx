import { useEffect, useId, useRef } from 'react'
import { useLocale } from '../hooks/useLocale'

interface QrDialogProps {
  open: boolean
  onClose: () => void
}

export default function QrDialog({ open, onClose }: QrDialogProps) {
  const { isEnglish } = useLocale()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const previousOverflow = document.body.style.overflow
    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus())

    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => onCloseRef.current()}
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-sm rounded-2xl bg-white p-4 pt-14 text-graphite-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={() => onCloseRef.current()}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-graphite-900 text-lg text-white transition-colors hover:bg-graphite-700"
          aria-label={isEnglish ? 'Close mini program code' : '关闭小程序码预览'}
        >
          ×
        </button>
        <h2 id={titleId} className="sr-only">{isEnglish ? 'One Kick WeChat mini program code' : '《一脚晋级》小程序码'}</h2>
        <img
          src="/assets/images/qr-code.png"
          alt={isEnglish ? 'One Kick WeChat mini program code' : '《一脚晋级》小程序码'}
          className="h-auto w-full"
        />
        <p className="mt-3 text-center text-sm text-graphite-800">
          {isEnglish
            ? 'Open WeChat, tap Scan, and point it at this code. One Kick will open inside WeChat.'
            : '用微信扫这个码，就能直接玩《一脚晋级》。'}
        </p>
      </div>
    </div>
  )
}
