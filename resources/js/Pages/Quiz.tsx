import { EmptyState } from '@/Components/ui';
import QuizFlipCard from '@/Components/QuizFlipCard';
import { useTts } from '@/hooks/useTts';
import AppLayout from '@/Layouts/AppLayout';
import type { CategoryDefinition, QuizQuestion } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface Props {
    questions: QuizQuestion[];
    eligibleCount: number;
    categories: CategoryDefinition[];
    filters: { category: string | null };
}

export default function Quiz({ questions, eligibleCount, categories, filters }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [finished, setFinished] = useState(false);
    const { playTts, ttsLoading, ttsError, resetTtsError } = useTts();

    // カテゴリ切替や「もういちど」で新しい問題セットが届いたら、進行状態を最初に戻す
    // (リセットしないと旧 index が新セットの範囲外を指して落ちる)
    useEffect(() => {
        setCurrentIndex(0);
        setFlipped(false);
        setFinished(false);
    }, [questions]);

    const question = questions[currentIndex];
    const isLast = currentIndex === questions.length - 1;
    const activeCategory = filters.category;

    const selectCategory = (categoryId: string | null) => {
        router.get('/quiz', categoryId ? { category: categoryId } : {}, { preserveScroll: true });
    };

    const handleNext = () => {
        if (isLast) {
            setFinished(true);
            return;
        }
        setCurrentIndex((i) => i + 1);
        setFlipped(false);
        resetTtsError();
    };

    const handleRestart = () => {
        // 再訪問で新しいランダムセットを取得する(進行状態は questions 更新時にリセットされる)
        router.get('/quiz', activeCategory ? { category: activeCategory } : {});
    };

    return (
        <AppLayout title="発見クイズ">
            <Head title="発見クイズ" />

            <div className="mx-auto max-w-xl">
                <section className="mb-6">

                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-[-0.04em] text-brand-ink">発見クイズ</h1>
                            <p className="mt-2 text-sm leading-relaxed text-brand-muted">図鑑の写真で「これ、なんだっけ？」。親子で答えを見てみよう。</p>
                        </div>
                        {questions.length > 0 && !finished && (
                            <span className="shrink-0 rounded-full bg-brand-primary-soft px-3 py-1.5 text-sm font-bold tabular-nums text-brand-primary-dark">
                                {currentIndex + 1} / {questions.length}
                            </span>
                        )}
                    </div>
                </section>

                {/* カテゴリで絞り込み */}
                <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="group" aria-label="カテゴリで選ぶ">
                    <button
                        type="button"
                        onClick={() => selectCategory(null)}
                        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition active:scale-95 ${activeCategory === null
                            ? 'bg-brand-primary text-white shadow-sm'
                            : 'border border-brand-line bg-white text-brand-ink hover:border-brand-sand'}`}
                    >
                        すべて
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => selectCategory(cat.id)}
                            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition active:scale-95 ${activeCategory === cat.id
                                ? 'bg-brand-primary text-white shadow-sm'
                                : 'border border-brand-line bg-white text-brand-ink hover:border-brand-sand'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {questions.length === 0 ? (
                    <>
                        <EmptyState
                            icon="?"
                            message={
                                activeCategory ? (
                                    <>このカテゴリで、名前がついた調べ終わった写真が3件たまると遊べます。</>
                                ) : (
                                    <>名前がついた、調べ終わった写真が3件たまると遊べます。</>
                                )
                            }
                        />
                        <div className="mt-6 flex flex-col items-center gap-3">
                            {activeCategory !== null && (
                                <button
                                    type="button"
                                    onClick={() => selectCategory(null)}
                                    className="text-sm font-bold text-brand-primary-dark hover:text-brand-primary"
                                >
                                    すべてのカテゴリから遊ぶ
                                </button>
                            )}
                            <Link
                                href="/dashboard"
                                className="rounded-full bg-brand-primary px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-primary-dark active:scale-95"
                            >
                                ホームへ戻る
                            </Link>
                        </div>
                    </>
                ) : finished ? (
                    <section className="lens-surface flex flex-col items-center gap-4 px-6 py-12 text-center">
                        <span className="text-5xl" aria-hidden="true">🎉</span>
                        <h2 className="text-2xl font-bold text-brand-ink">また見返そう</h2>
                        <p className="text-sm leading-relaxed text-brand-muted">図鑑の写真を{questions.length}件見返しました。</p>
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={handleRestart}
                                className="rounded-full bg-brand-primary px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-primary-dark active:scale-95"
                            >
                                もう一度遊ぶ
                            </button>
                            <Link
                                href="/library"
                                className="rounded-full border border-brand-line bg-white px-6 py-2.5 text-sm font-bold text-brand-ink transition hover:border-brand-sand active:scale-95"
                            >
                                図鑑を見る
                            </Link>
                        </div>
                    </section>
                ) : (
                    <section aria-label={`写真 ${currentIndex + 1}`} className={flipped ? 'pb-24' : undefined}>
                        <QuizFlipCard
                            key={question.id}
                            question={question}
                            flipped={flipped}
                            onFlip={() => setFlipped(true)}
                            category={categories.find((c) => c.id === question.category)}
                            playTts={playTts}
                            ttsLoading={ttsLoading}
                            ttsError={ttsError}
                        />
                        {ttsError && (
                            <p className="mt-2 text-center text-xs text-red-400">音声を再生できませんでした</p>
                        )}
                        {flipped ? (
                            <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-40 flex justify-center px-4 sm:bottom-24">
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="pointer-events-auto w-full max-w-xs rounded-full bg-brand-primary px-8 py-3 text-base font-bold text-white shadow-lift ring-4 ring-brand-canvas/90 transition hover:bg-brand-primary-dark active:scale-95"
                                >
                                    {isLast ? '終わる' : '次の写真へ'}
                                </button>
                            </div>
                        ) : (
                            <div className="mt-6 flex justify-center">
                                <p className="text-sm font-semibold text-brand-muted">写真をタップすると、答えが見られます。</p>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
