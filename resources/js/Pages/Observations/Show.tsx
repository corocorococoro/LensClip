import AppLayout from '@/Layouts/AppLayout';
import { Button, Card } from '@/Components/ui';
import type { Observation, Tag, CandidateCard } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    observation: Observation;
}

export default function Show({ observation }: Props) {
    const [retrying, setRetrying] = useState(false);
    const [activeCandidateIndex, setActiveCandidateIndex] = useState(0);

    const aiJson = observation.ai_json || {};
    const candidateCards = aiJson.candidate_cards || [];
    const hasCandidates = candidateCards.length > 1;

    // アクティブな候補カード（存在しない場合はフォールバック）
    const activeCard: CandidateCard | null = candidateCards[activeCandidateIndex] || null;

    // フォールバック: candidate_cardsがない場合は従来データを使用
    const displayTitle = activeCard?.name || observation.title || '???';
    const displayKidFriendly = activeCard?.kid_friendly || observation.kid_friendly || observation.summary;
    const displayConfidence = activeCard?.confidence ?? observation.confidence ?? 0;
    const funFacts = activeCard?.fun_facts || aiJson.fun_facts || [];
    const safetyNotes = aiJson.safety_notes || [];
    const questions = activeCard?.questions || aiJson.questions || [];
    const lookFor = activeCard?.look_for || [];

    const displayImage = observation.cropped_url || observation.original_url;

    const handleRetry = () => {
        setRetrying(true);
        router.post(`/observations/${observation.id}/retry`);
    };

    const handleDelete = () => {
        if (confirm('この発見を削除しますか？')) {
            router.delete(`/observations/${observation.id}`);
        }
    };

    const handleCandidateSelect = (index: number) => {
        setActiveCandidateIndex(index);
    };

    return (
        <AppLayout title={observation.title || 'けっか'}>
            <Head title={observation.title || 'けっか'} />

            <div className="flex flex-col items-center">
                {/* Main Image */}
                <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-lg mb-6">
                    <img
                        src={displayImage}
                        alt={observation.title || '観察画像'}
                        width={400}
                        height={400}
                        loading="eager"
                        className="w-full aspect-square object-cover"
                    />
                </div>

                {/* Title with fade transition */}
                <h1
                    key={activeCandidateIndex}
                    className="text-3xl font-bold text-gray-800 mb-2 text-center"
                >
                    {displayTitle}
                </h1>

                {/* Confidence Badge */}
                {observation.status === 'ready' && displayConfidence > 0 && (
                    <div className="mb-2">
                        <span
                            className={`px-3 py-1 rounded-full text-sm font-medium tabular-nums ${displayConfidence > 0.8
                                ? 'bg-emerald-100 text-emerald-700'
                                : displayConfidence > 0.5
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                        >
                            {Math.round(displayConfidence * 100)}% じしん
                        </span>
                    </div>
                )}

                {/* Image Search Link - 画像で確認 */}
                {observation.status === 'ready' && displayTitle && displayTitle !== '???' && (
                    <a
                        href={`https://www.google.com/search?tbm=isch&safe=active&q=${encodeURIComponent(displayTitle)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors mb-4"
                    >
                        <span aria-hidden="true">🔍</span>
                        画像で確認
                        <span aria-hidden="true" className="text-xs">↗</span>
                    </a>
                )}

                {/* Candidate Selector - これかも？ */}
                {observation.status === 'ready' && hasCandidates && (
                    <div className="w-full bg-violet-50 border border-violet-100 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg" aria-hidden="true">🤔</span>
                            <span className="font-bold text-violet-700">これかも？</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                            {candidateCards.map((card, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleCandidateSelect(index)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 ${index === activeCandidateIndex
                                        ? 'bg-violet-600 text-white shadow-md'
                                        : 'bg-white text-violet-700 border border-violet-200 hover:bg-violet-100'
                                        }`}
                                >
                                    {card.name}
                                    <span className="ml-1 text-xs opacity-70">
                                        {Math.round(card.confidence * 100)}%
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Failed State */}
                {observation.status === 'failed' && (
                    <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-6 mb-6 text-center">
                        <div className="text-4xl mb-3">😢</div>
                        <h2 className="text-lg font-bold text-red-700 mb-2">しらべられなかった…</h2>
                        <p className="text-sm text-red-600 mb-4">
                            {observation.error_message || 'もういちどためしてね'}
                        </p>
                        <Button
                            onClick={handleRetry}
                            loading={retrying}
                            variant="primary"
                            disabled={retrying}
                        >
                            {retrying ? 'リトライちゅう…' : '🔄 もういちどしらべる'}
                        </Button>
                    </div>
                )}

                {/* Kid-friendly Description */}
                {observation.status === 'ready' && (
                    <Card
                        key={`card-${activeCandidateIndex}`}
                        className="w-full mb-4 bg-sky-50 border-sky-100"
                    >
                        <p className="text-lg text-sky-800 text-center leading-relaxed">
                            {displayKidFriendly}
                        </p>
                    </Card>
                )}

                {/* Look For - 見分けポイント */}
                {lookFor.length > 0 && (
                    <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl" aria-hidden="true">👀</span>
                            <span className="font-bold text-slate-700">みわけポイント</span>
                        </div>
                        <ul className="text-sm text-slate-600 space-y-1">
                            {lookFor.map((point, i) => (
                                <li key={i}>• {point}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Safety Notes - Always visible, prominent */}
                {safetyNotes.length > 0 && (
                    <div
                        className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4"
                        role="alert"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl" aria-hidden="true">⚠️</span>
                            <span className="font-bold text-amber-700">ちゅうい</span>
                        </div>
                        <ul className="text-sm text-amber-700 space-y-1">
                            {safetyNotes.map((note, i) => (
                                <li key={i}>• {note}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Fun Facts - Now always visible (no toggle) */}
                {funFacts.length > 0 && (
                    <div className="w-full bg-fuchsia-50 border border-fuchsia-100 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl" aria-hidden="true">💡</span>
                            <span className="font-bold text-fuchsia-700">まめちしき</span>
                        </div>
                        <ul className="text-sm text-fuchsia-700 space-y-2">
                            {funFacts.map((fact, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span aria-hidden="true">✨</span>
                                    <span>{fact}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Questions - Always visible */}
                {questions.length > 0 && (
                    <div className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl" aria-hidden="true">❓</span>
                            <span className="font-bold text-emerald-700">きいてみよう</span>
                        </div>
                        <ul className="text-sm text-emerald-700 space-y-1">
                            {questions.map((q, i) => (
                                <li key={i}>• {q}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Tags */}
                {observation.tags && observation.tags.length > 0 && (
                    <div className="w-full mb-6">
                        <div className="flex flex-wrap gap-2 justify-center">
                            {observation.tags.map((tag: Tag) => (
                                <Link
                                    key={tag.id}
                                    href={`/library?tag=${tag.name}`}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors"
                                >
                                    #{tag.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="w-full mb-8">
                    <Button href="/dashboard" variant="primary" fullWidth size="lg">
                        📷 ほかのものをしらべる
                    </Button>
                </div>

                {/* Metadata - subtle display */}
                {observation.status === 'ready' && (
                    <div className="w-full text-center text-xs text-gray-400 mb-4 space-y-0.5">
                        <div>
                            {new Date(observation.created_at).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </div>
                        {observation.gemini_model && (
                            <div className="opacity-60">
                                AI: {observation.gemini_model}
                            </div>
                        )}
                    </div>
                )}

                {/* Delete Button */}
                <button
                    onClick={handleDelete}
                    aria-label="この発見を削除"
                    className="text-red-400 hover:text-red-600 text-sm py-2 px-4 transition-colors"
                >
                    この発見を削除
                </button>
            </div>
        </AppLayout>
    );
}
