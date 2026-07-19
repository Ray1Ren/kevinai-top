import {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useLocale } from '../hooks/useLocale'

type ArticleLightboxProps = {
  children: ReactNode
  className?: string
}

type LightboxItem = {
  alt: string
  caption: string
  index: number
  src: string
}

const ZOOMABLE_SELECTOR = 'img:not([data-no-lightbox])'

export default function ArticleLightbox({ children, className = '' }: ArticleLightboxProps) {
  const { isEnglish } = useLocale()
  const rootRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const [item, setItem] = useState<LightboxItem | null>(null)

  const getImages = useCallback(
    () => Array.from(rootRef.current?.querySelectorAll<HTMLImageElement>(ZOOMABLE_SELECTOR) ?? []),
    [],
  )

  const openImage = (image: HTMLImageElement) => {
    const images = getImages()
    const index = images.indexOf(image)
    if (index < 0) return

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const figure = image.closest('figure')
    setItem({
      alt: image.alt,
      caption: figure?.querySelector('figcaption')?.textContent?.trim() ?? '',
      index,
      src: image.currentSrc || image.src,
    })
  }

  const showAt = useCallback((index: number) => {
    const images = getImages()
    if (!images.length) return
    const normalized = (index + images.length) % images.length
    const image = images[normalized]
    const figure = image.closest('figure')
    setItem({
      alt: image.alt,
      caption: figure?.querySelector('figcaption')?.textContent?.trim() ?? '',
      index: normalized,
      src: image.currentSrc || image.src,
    })
  }, [getImages])

  const close = useCallback(() => {
    setItem(null)
    window.requestAnimationFrame(() => previousFocusRef.current?.focus())
  }, [])

  useEffect(() => {
    const images = getImages()
    images.forEach((image) => {
      image.classList.add('article-zoomable-image')
      image.setAttribute('role', 'button')
      image.setAttribute('tabindex', '0')
      image.setAttribute(
        'aria-label',
        `${isEnglish ? 'View full-size image' : '查看大图'}${image.alt ? `：${image.alt}` : ''}`,
      )
    })

    return () => {
      images.forEach((image) => {
        image.classList.remove('article-zoomable-image')
        image.removeAttribute('role')
        image.removeAttribute('tabindex')
        image.removeAttribute('aria-label')
      })
    }
  }, [getImages, isEnglish])

  useEffect(() => {
    if (!item) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowLeft') showAt(item.index - 1)
      if (event.key === 'ArrowRight') showAt(item.index + 1)
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [close, item, showAt])

  const onRootClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target
    if (!(target instanceof HTMLImageElement) || !target.matches(ZOOMABLE_SELECTOR)) return
    openImage(target)
  }

  const onRootKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target
    if (!(target instanceof HTMLImageElement) || !target.matches(ZOOMABLE_SELECTOR)) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openImage(target)
  }

  const onTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null
  }

  const onTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!item || touchStartXRef.current === null) return
    const endX = event.changedTouches[0]?.clientX
    if (endX === undefined) return
    const distance = endX - touchStartXRef.current
    touchStartXRef.current = null
    if (Math.abs(distance) < 48) return
    showAt(item.index + (distance < 0 ? 1 : -1))
  }

  const imageCount = getImages().length

  return (
    <div ref={rootRef} className={`article-lightbox-root ${className}`} onClick={onRootClick} onKeyDown={onRootKeyDown}>
      {children}
      {item && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-3 py-4 backdrop-blur-sm sm:px-8 sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-label={isEnglish ? 'Full-size article image' : '文章大图预览'}
          onClick={(event) => {
            if (event.currentTarget === event.target) close()
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            ref={closeRef}
            type="button"
            className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/55 text-white transition-colors hover:bg-black/80 sm:right-6 sm:top-6"
            onClick={close}
            aria-label={isEnglish ? 'Close image' : '关闭大图'}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          {imageCount > 1 && (
            <>
              <button
                type="button"
                className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/75 sm:grid"
                onClick={() => showAt(item.index - 1)}
                aria-label={isEnglish ? 'Previous image' : '上一张图'}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/75 sm:grid"
                onClick={() => showAt(item.index + 1)}
                aria-label={isEnglish ? 'Next image' : '下一张图'}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </>
          )}

          <figure className="flex max-h-full max-w-full flex-col items-center justify-center">
            <img
              src={item.src}
              alt={item.alt}
              className="max-h-[calc(100dvh-7rem)] max-w-[calc(100vw-1.5rem)] select-none object-contain sm:max-w-[calc(100vw-8rem)]"
              draggable={false}
            />
            <figcaption className="mt-3 max-w-3xl px-4 text-center text-xs leading-relaxed text-white/70 sm:text-sm">
              {item.caption || item.alt}
              {imageCount > 1 && <span className="ml-2 text-white/40">{item.index + 1} / {imageCount}</span>}
            </figcaption>
          </figure>
        </div>,
        document.body,
      )}
    </div>
  )
}
