import { useState, type SyntheticEvent } from 'react'

type PromptState =
  | { status: 'idle' | 'loading'; content: '' }
  | { status: 'success'; content: string }
  | { status: 'error'; content: '' }

type FullPromptProps = {
  isEnglish: boolean
  promptPath: string
  summary: string
}

export default function FullPrompt({ isEnglish, promptPath, summary }: FullPromptProps) {
  const [prompt, setPrompt] = useState<PromptState>({ status: 'idle', content: '' })

  async function loadPrompt(force = false) {
    if (!force && (prompt.status === 'loading' || prompt.status === 'success')) return
    setPrompt({ status: 'loading', content: '' })

    try {
      const response = await fetch(promptPath)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const content = (await response.text()).trimEnd()
      if (!content) throw new Error('Empty prompt')
      setPrompt({ status: 'success', content })
    } catch {
      setPrompt({ status: 'error', content: '' })
    }
  }

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    if (event.currentTarget.open) void loadPrompt()
  }

  const lineCount = prompt.status === 'success' ? prompt.content.split('\n').length : 0
  const characterCount = prompt.status === 'success' ? prompt.content.length : 0

  return (
    <div
      className="overflow-hidden rounded-2xl border border-pitch-500/25 bg-graphite-900/35"
      data-full-prompt
      data-prompt-path={promptPath}
    >
      <div className="px-5 py-4 md:px-6">
        <p className="mb-2 text-[11px] font-medium tracking-[0.12em] text-pitch-500">
          {isEnglish ? 'Task summary · not the full prompt' : '任务摘要 · 不是完整 Prompt'}
        </p>
        <blockquote className="border-l-2 border-pitch-500 pl-4 text-sm leading-relaxed text-graphite-300">
          {summary}
        </blockquote>
      </div>

      <details className="group border-t border-white/5" onToggle={handleToggle}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-pitch-500 active:bg-white/[0.04] md:px-6 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-sm font-medium text-white">
              {isEnglish ? 'View the complete original prompt' : '查看完整原始 Prompt'}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-graphite-400">
              {isEnglish ? 'Original prompt in Chinese, shown without translation or edits.' : '直接读取本次实测原文，不做删改。'}
            </span>
          </span>
          <svg
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-pitch-500 transition-transform duration-200 group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
        </summary>

        <div className="border-t border-white/5 px-5 py-5 md:px-6" aria-live="polite">
          {prompt.status === 'loading' && (
            <div className="space-y-2" data-prompt-state="loading" role="status">
              <span className="sr-only">{isEnglish ? 'Loading the complete prompt…' : '完整 Prompt 加载中…'}</span>
              {[92, 76, 84, 60].map((width) => (
                <span
                  key={width}
                  className="block h-3 animate-pulse rounded-sm bg-white/5 motion-reduce:animate-none"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          )}

          {prompt.status === 'error' && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4" data-prompt-state="error" role="alert">
              <p className="text-sm text-red-300">
                {isEnglish ? 'The complete prompt could not be loaded.' : '完整 Prompt 加载失败。'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  className="text-sm font-medium text-pitch-400 underline decoration-pitch-500/40 underline-offset-4 transition-colors hover:text-pitch-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pitch-500 active:scale-[0.98]"
                  onClick={() => void loadPrompt(true)}
                >
                  {isEnglish ? 'Try again' : '重新加载'}
                </button>
                <a
                  className="text-sm text-graphite-300 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pitch-500"
                  href={promptPath}
                  rel="noreferrer"
                  target="_blank"
                >
                  {isEnglish ? 'Open the plain-text source' : '打开纯文本原文'}
                </a>
              </div>
            </div>
          )}

          {prompt.status === 'success' && (
            <div data-prompt-state="success">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-graphite-400">
                <span>
                  {isEnglish ? 'Original prompt (Chinese)' : '完整原始 Prompt'} · {lineCount.toLocaleString()} {isEnglish ? 'lines' : '行'} · {characterCount.toLocaleString()} {isEnglish ? 'characters' : '字符'}
                </span>
                <a
                  className="text-pitch-400 underline decoration-pitch-500/40 underline-offset-4 transition-colors hover:text-pitch-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pitch-500"
                  href={promptPath}
                  rel="noreferrer"
                  target="_blank"
                >
                  {isEnglish ? 'Open plain text' : '新窗口打开纯文本'}
                </a>
              </div>
              <pre
                className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/5 bg-graphite-950/75 p-4 font-mono text-xs leading-6 text-graphite-200 [overflow-wrap:anywhere] md:p-5"
                data-prompt-content
                lang="zh-CN"
              >
                {prompt.content}
              </pre>
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
