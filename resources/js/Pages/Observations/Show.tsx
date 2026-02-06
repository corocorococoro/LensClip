import AppLayout from '@/Layouts/AppLayout';
import { Button, Card } from '@/Components/ui';
import LocationMap from '@/Components/LocationMap';
import type { Observation, Tag, CandidateCard, CategoryDefinition } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useRef, useCallback } from 'react';
import axios from 'axios';

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

const MagnifyingGlassIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
    </svg>
);

interface Props {
    observation: Observation;
    categories: CategoryDefinition[];
}

export default function Show({ observation, categories }: Props) {
    const [retrying, setRetrying] = useState(false);
    const [activeCandidateIndex, setActiveCandidateIndex] = useState(0);
    const [ttsLoading, setTtsLoading] = useState(false);
    const [editingCategory, setEditingCategory] = useState(false);
    const [categoryUpdating, setCategoryUpdating] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const currentCategory = categories?.find(c => c.id === observation.category) || categories?.[categories.length - 1];

    const handleCategoryChange = (newCategoryId: string) => {
        setCategoryUpdating(true);
        router.patch(`/observations/${observation.id}/category`, {
            category: newCategoryId,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingCategory(false);
                setCategoryUpdating(false);
            },
            onError: () => {
                setCategoryUpdating(false);
            },
        });
    };

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

    const playTts = useCallback(async (text: string) => {
        // Stop any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        setTtsLoading(true);
        try {
            const res = await axios.post('/tts', { text });
            const { url } = res.data;
            const audio = new Audio(url);
            audioRef.current = audio;
            await audio.play();
        } catch (error) {
            console.error('TTS playback failed:', error);
        } finally {
            setTtsLoading(false);
        }
    }, []);

    return (
        <AppLayout title={observation.title || 'けっか'}>
            <Head title={observation.title || 'けっか'} />

            <div className="flex flex-col items-center">
                {/* Main Image */}
                {/* Main Image */}
                <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-lg mb-6 group">
                    <img
                        src={displayImage}
                        alt={observation.title || '観察画像'}
                        width={400}
                        height={400}
                        loading="eager"
                        className="w-full aspect-square object-cover"
                    />
                    {/* Image Search Overlay */}
                    {observation.status === 'ready' && displayTitle && displayTitle !== '???' && (
                        <a
                            href={`https://www.google.com/search?tbm=isch&safe=active&q=${encodeURIComponent(displayTitle)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm pl-2.5 pr-3 py-1.5 rounded-full text-xs font-medium text-slate-600 shadow-sm hover:bg-white hover:text-indigo-600 transition-all flex items-center gap-1.5 opacity-90 hover:opacity-100 hover:shadow-md"
                            title="Google画像検索で確認する"
                        >
                            <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                            画像で確認
                        </a>
                    )}
                </div>

                {/* Title with fade transition */}
                {/* Title & Badge */}
                <div className="flex items-center justify-center gap-3 mb-1">
                    <h1 className="text-3xl font-bold text-gray-800">
                        {displayTitle}
                    </h1>
                    {observation.status === 'ready' && displayConfidence > 0 && (
                        <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${displayConfidence > 0.8
                                ? 'bg-emerald-100 text-emerald-700'
                                : displayConfidence > 0.5
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                        >
                            {Math.round(displayConfidence * 100)}%
                        </span>
                    )}
                </div>

                {/* English Word + TTS */}
                {observation.status === 'ready' && activeCard?.english_name && (
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <span className="text-lg text-slate-500 font-medium">
                            {activeCard.english_name
                                .split(/[\s-]+/)
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(' ')}
                        </span>
                        <button
                            onClick={() => playTts(activeCard.english_name!)}
                            disabled={ttsLoading}
                            className={`p-1.5 rounded-full transition-all duration-200 ${ttsLoading
                                ? 'text-gray-400 cursor-wait'
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95'
                                }`}
                            aria-label={`${activeCard.english_name}を読み上げる`}
                            title="発音を聞く"
                        >
                            {ttsLoading ? (
                                <SpinnerIcon className="w-4 h-4" />
                            ) : (
                                <SpeakerIcon className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                )}

                {/* Category Badge - Editable */}
                {observation.status === 'ready' && currentCategory && (
                    <div className="mb-4">
                        {!editingCategory ? (
                            <button
                                onClick={() => setEditingCategory(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors hover:opacity-80"
                                style={{
                                    backgroundColor: currentCategory.color + '20',
                                    color: currentCategory.color,
                                }}
                                title="カテゴリを変更"
                            >
                                <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: currentCategory.color }}
                                />
                                {currentCategory.name}
                                <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                        ) : (
                            <div className="flex flex-wrap gap-2 justify-center">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleCategoryChange(cat.id)}
                                        disabled={categoryUpdating}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                            cat.id === observation.category
                                                ? 'ring-2 ring-offset-1'
                                                : 'opacity-70 hover:opacity-100'
                                        } ${categoryUpdating ? 'cursor-wait' : ''}`}
                                        style={{
                                            backgroundColor: cat.color + '20',
                                            color: cat.color,
                                            ...(cat.id === observation.category ? { '--tw-ring-color': cat.color } as React.CSSProperties : {}),
                                        }}
                                    >
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: cat.color }}
                                        />
                                        {cat.name}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setEditingCategory(false)}
                                    className="px-3 py-1.5 rounded-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    キャンセル
                                </button>
                            </div>
                        )}
                    </div>
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

                {/* Location Map */}
                {observation.status === 'ready' && observation.latitude != null && observation.longitude != null && (
                    <LocationMap
                        latitude={observation.latitude}
                        longitude={observation.longitude}
                        className="mb-6"
                    />
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
