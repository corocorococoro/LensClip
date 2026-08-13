import type { CategoryDefinition, QuizQuestion } from '@/types/models';
import { useState } from 'react';

const SpeakerIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318 0-2.402.933H2.02v6.134h.086c.084.933 1.261.933 2.402.933h1.932l4.5 4.5c.945.945 2.56.276 2.56-1.06V4.06zM18.515 12a6.47 6.47 0 00-1.743-4.407.75.75 0 00-1.09 1.026 4.97 4.97 0 011.333 3.381 4.97 4.97 0 01-1.333 3.381.75.75 0 101.09 1.026A6.47 6.47 0 0018.515 12z" />
        <path d="M20.636 12a9.467 9.467 0 00-2.614-6.533.75.75 0 00-1.085 1.033 7.967 7.967 0 012.199 5.5 7.967 7.967 0 01-2.199 5.5.75.75 0 101.085 1.033A9.467 9.467 0 0020.636 12z" />
    </svg>
);

const SpinnerIcon = ({ className }: { className?: string }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

interface Props {
    question: QuizQuestion;
    flipped: boolean;
    onFlip: () => void;
    category?: CategoryDefinition;
    playTts: (text: string) => void;
    ttsLoading: boolean;
    ttsError: boolean;
}

/**
 * めくり式クイズカード。答えを表示しても、出題時と同じ大きさで写真を見せる。
 * 正誤判定はせず、「おぼえてた!」は演出のみ(保存しない)。
 */
export default function QuizFlipCard({ question, flipped, onFlip, category, playTts, ttsLoading, ttsError }: Props) {
    const [remembered, setRemembered] = useState(false);
    const englishDisplay = question.english_name
        ?.split(/[\s-]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    const funText = question.kid_friendly || question.fun_fact;

    if (!flipped) {
        return (
            <button
                type="button"
                onClick={onFlip}
                className="relative w-full overflow-hidden rounded-3xl border border-brand-line bg-white text-left shadow-surface transition active:scale-[0.99]"
            >
                {question.image_url ? (
                    <img
                        src={question.image_url}
                        alt="これなんだっけ?"
                        className="aspect-square w-full object-cover"
                        loading="eager"
                    />
                ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-brand-sand-soft text-6xl" role="img" aria-label="しゃしん">
                        📷
                    </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-5 pb-5 pt-14 text-center">
                    <span className="text-2xl font-bold text-white drop-shadow-sm">これ なんだっけ?</span>
                    <span className="mt-1 block text-sm font-semibold text-white/85">タップして こたえを みる</span>
                </div>
            </button>
        );
    }

    return (
        <article
            aria-live="polite"
            className="w-full overflow-hidden rounded-3xl border border-brand-line bg-white shadow-surface motion-safe:animate-[quiz-answer-in_300ms_ease-out]"
        >
            {question.image_url ? (
                <img src={question.image_url} alt={question.title} className="aspect-square w-full object-cover" loading="eager" />
            ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-brand-sand-soft text-6xl" role="img" aria-label={question.title}>
                    📷
                </div>
            )}
            <div className="flex flex-col items-center px-5 py-5 text-center sm:px-6 sm:py-6">
                {category && (
                    <span
                        className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold shadow-sm ring-1 ring-brand-line"
                        style={{ color: category.color }}
                    >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                        {category.name}
                    </span>
                )}
                <p className="text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">{question.title}</p>
                {englishDisplay && (
                    <span className="mt-1 inline-flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-500">{englishDisplay}</span>
                        <button
                            type="button"
                            onClick={() => playTts(question.english_name!)}
                            disabled={ttsLoading}
                            aria-label={`${question.english_name}を読み上げる`}
                            title="発音を聞く"
                            className={`min-h-9 min-w-9 rounded-full p-1.5 transition-colors duration-200 ${ttsLoading
                                ? 'cursor-wait text-gray-400'
                                : ttsError
                                    ? 'text-red-400 hover:bg-red-50 hover:text-red-500 active:scale-95'
                                    : 'text-brand-muted hover:bg-brand-primary-soft hover:text-brand-primary-dark active:scale-95'
                                }`}
                        >
                            {ttsLoading ? <SpinnerIcon className="h-4 w-4" /> : <SpeakerIcon className="h-4 w-4" />}
                        </button>
                    </span>
                )}
                {funText && (
                    <p className="mt-2 text-sm leading-relaxed text-brand-muted">{funText}</p>
                )}
                <div className="pt-4">
                    {remembered ? (
                        <span className="inline-flex animate-bounce items-center gap-1.5 rounded-full bg-brand-primary-soft px-5 py-2 text-sm font-bold text-brand-primary-dark">
                            <span aria-hidden="true">🌟</span>
                            やったね!おぼえてたね!
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setRemembered(true)}
                            className="rounded-full border-2 border-brand-primary/40 bg-white px-5 py-2 text-sm font-bold text-brand-primary-dark transition hover:bg-brand-primary-soft active:scale-95"
                        >
                            おぼえてた!
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}
