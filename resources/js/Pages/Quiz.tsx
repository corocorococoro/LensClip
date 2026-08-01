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
        <AppLayout title="はかせクイズ">
            <Head title="はかせクイズ" />

            <div className="mx-auto max-w-xl">
                <section className="mb-6">
                    <p className="lens-kicker mb-2">Quiz time</p>
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-[-0.04em] text-brand-ink">はかせクイズ</h1>
                            <p className="mt-2 text-sm leading-relaxed text-brand-muted">じぶんの ずかんから もんだいを だすよ。おやこで こたえあわせしてね。</p>
                        </div>
                        {questions.length > 0 && !finished && (
                            <span className="shrink-0 rounded-full bg-brand-primary-soft px-3 py-1.5 text-sm font-bold tabular-nums text-brand-primary-dark">
                                {currentIndex + 1} / {questions.length}
                            </span>
                        )}
                    </div>
                </section>

                {/* カテゴリで絞り込み */}
                <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="group" aria-label="なかまで えらぶ">
                    <button
                        type="button"
                        onClick={() => selectCategory(null)}
                        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition active:scale-95 ${activeCategory === null
                            ? 'bg-brand-primary text-white shadow-sm'
                            : 'border border-brand-line bg-white text-brand-ink hover:border-brand-sand'}`}
                    >
                        ぜんぶ
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
                                    <>この なかまの はっけんが 3 こ たまったら<br />クイズで あそべるよ。</>
                                ) : (
                                    <>はっけんが 3 こ たまったら<br />クイズで あそべるよ。</>
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
                                    ぜんぶから もんだいを だす
                                </button>
                            )}
                            <Link
                                href="/dashboard"
                                className="rounded-full bg-brand-primary px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-primary-dark active:scale-95"
                            >
                                あたらしい はっけんを しにいく
                            </Link>
                        </div>
                    </>
                ) : finished ? (
                    <section className="lens-surface flex flex-col items-center gap-4 px-6 py-12 text-center">
                        <span className="text-5xl" aria-hidden="true">🎉</span>
                        <h2 className="text-2xl font-bold text-brand-ink">よくできました!</h2>
                        <p className="text-sm leading-relaxed text-brand-muted">{questions.length} もん、ぜんぶ めくったよ。<br />また あそぼうね。</p>
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={handleRestart}
                                className="rounded-full bg-brand-primary px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-primary-dark active:scale-95"
                            >
                                もういちど あそぶ
                            </button>
                            <Link
                                href="/library"
                                className="rounded-full border border-brand-line bg-white px-6 py-2.5 text-sm font-bold text-brand-ink transition hover:border-brand-sand active:scale-95"
                            >
                                ライブラリを みる
                            </Link>
                        </div>
                    </section>
                ) : (
                    <section aria-label={`もんだい ${currentIndex + 1}`}>
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
                        <div className="mt-6 flex justify-center">
                            {flipped ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="rounded-full bg-brand-primary px-8 py-3 text-base font-bold text-white shadow-sm transition hover:bg-brand-primary-dark active:scale-95"
                                >
                                    {isLast ? 'おしまい!' : 'つぎの もんだい'}
                                </button>
                            ) : (
                                <p className="text-sm font-semibold text-brand-muted">しゃしんを タップして こたえを みてね</p>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
