import SEOHead from '../components/SEOHead'
import VisionReviewGrid from '../components/VisionReviewGrid'
import { useLocale } from '../hooks/useLocale'

export default function LabVisionReview() {
  const { isEnglish } = useLocale()

  return (
    <>
      <SEOHead title={isEnglish ? '50-Image Public Review' : '50 图视觉识别公开审阅'} />
      <section className="pb-20 pt-24 md:pb-28">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="mb-10 max-w-3xl">
            <span className="mb-2 block text-xs uppercase tracking-widest text-pitch-500">Vision Review</span>
            <h1 className="mb-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {isEnglish ? '50-image public review' : '50 图视觉识别公开审阅'}
            </h1>
            <p className="text-graphite-200 leading-relaxed">
              {isEnglish
                ? 'All 50 frozen images, questions, answer choices, ground truth, and results from the three tool chains are shown directly. Use the result, category, and difficulty filters to audit any slice.'
                : '50 张冻结题图、题面、选项、标准答案和三家调用链结果全部直接展开；可按答题结果、类别和难度组合筛选。'}
            </p>
            {isEnglish && (
              <p className="mt-3 text-sm text-graphite-400">
                Question wording, answer options, and frozen ground truth remain in the original Chinese so the public evidence is not silently rewritten in translation.
              </p>
            )}
          </div>
          <VisionReviewGrid showHeading={false} />
        </div>
      </section>
    </>
  )
}
