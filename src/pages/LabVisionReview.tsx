import SEOHead from '../components/SEOHead'
import VisionReviewGrid from '../components/VisionReviewGrid'
import { useLocale } from '../hooks/useLocale'

export default function LabVisionReview() {
  const { isEnglish } = useLocale()

  return (
    <>
      <SEOHead title={isEnglish ? 'All 50 Image Answers' : '50 题识图结果'} />
      <section className="pb-20 pt-24 md:pb-28">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="mb-10 max-w-3xl">
            <span className="mb-2 block text-xs uppercase tracking-widest text-pitch-500">Vision Review</span>
            <h1 className="mb-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {isEnglish ? 'All 50 image answers' : '50 题逐题查看'}
            </h1>
            <p className="text-graphite-200 leading-relaxed">
              {isEnglish
                ? 'Every image, question, option, correct answer, and response from the three systems is on this page. Filter by result, category, or difficulty.'
                : '每道题的图片、题目、选项、标准答案和三家回答都在这里，可以按结果、类别或难度筛选。'}
            </p>
            {isEnglish && (
              <p className="mt-3 text-sm text-graphite-400">
                Questions, options, and correct answers remain in their original Chinese.
              </p>
            )}
          </div>
          <VisionReviewGrid showHeading={false} />
        </div>
      </section>
    </>
  )
}
