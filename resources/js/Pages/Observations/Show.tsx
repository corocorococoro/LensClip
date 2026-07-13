import AppLayout from '@/Layouts/AppLayout';
import { Button, Card } from '@/Components/ui';
import Modal from '@/Components/Modal';
import LocationMap from '@/Components/LocationMap';
import ProcessingView from './Partials/ProcessingView';
import type { Observation, Tag, CandidateCard, CategoryDefinition } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useRef, useCallback, useEffect } from 'react';

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

const PencilIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
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
    const [ttsError, setTtsError] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [categoryUpdating, setCategoryUpdating] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const ttsCache = useRef<Map<string, string>>(new Map());

    useEffect(() => {
        return () => {
            audioRef.current?.pause();
            audioRef.current = null;
        };
    }, []);

    const currentCategory = categories?.find(c => c.id === observation.category) || categories?.[categories.length - 1];

    const handleCategoryChange = (newCategoryId: string) => {
        setCategoryUpdating(true);
        router.patch(`/observations/${observation.id}/category`, {
            category: newCategoryId,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowCategoryModal(false);
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

    // 検知クロップ（cropped_url）は縦長画像などで切り抜きが不自然になるため、
    // ライブラリのサムネイルと同じ全体写真を表示する
    const displayImage = observation.original_url || observation.thumb_url || undefined;

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
        setTtsError(false);
    };

    const playTts = useCallback(async (text: string) => {
        // Stop any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        setTtsError(false);
        setTtsLoading(true);
        try {
            // キャッシュにURLがあれば POST をスキップ
            let url = ttsCache.current.get(text);
            if (!url) {
                const res = await fetch('/tts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
                    },
                    body: JSON.stringify({ text }),
                });
                if (!res.ok) throw new Error('TTS request failed');
                const data = await res.json();
                url = data.url as string;
                ttsCache.current.set(text, url);
            }
            const audio = new Audio(url);
            audioRef.current = audio;
            await audio.play();
        } catch (error) {
            console.error('TTS playback failed:', error);
            ttsCache.current.delete(text); // エラー時はキャッシュを破棄してリトライ可能に
            setTtsError(true);
        } finally {
            setTtsLoading(false);
        }
    }, []);

    if (observation.status === 'processing') {
        return (
            <AppLayout title="しらべてます">
                <Head title="しらべてます" />
                <ProcessingView observation={observation} />
            </AppLayout>
        );
    }

    return (
        <AppLayout title={observation.title || 'けっか'}>
            <Head title={observation.title || 'けっか'} />

            <div className="mx-auto flex max-w-2xl flex-col items-center">
                {/* Main Image */}
                <div className="group relative mb-7 w-full max-w-xl overflow-hidden rounded-2xl border border-brand-line bg-white shadow-surface">
                    {displayImage ? (
                        <img
                            src={displayImage}
                            alt={observation.title || '観察画像'}
                            width={400}
                            height={400}
                            loading="eager"
                            className="w-full aspect-square object-cover"
                        />
                    ) : (
                        <div
                            className="w-full aspect-square flex items-center justify-center bg-gray-100 text-5xl"
                            role="img"
                            aria-label={observation.title || '観察画像'}
                        >
                            📷
                        </div>
                    )}

                    {/* Category Badge overlay (Top Left) - Interactive */}
                    {currentCategory && (
                        <div className="absolute top-3 left-3 z-10">
                            <button
                                onClick={() => setShowCategoryModal(true)}
                                className="group/badge inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold text-brand-ink shadow-sm backdrop-blur-md transition active:scale-95"
                                style={{
                                    color: currentCategory.color,
                                }}
                            >
                                <div
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: currentCategory.color }}
                                />
                                {currentCategory.name}
                                <PencilIcon className="w-3 h-3 opacity-40 ml-0.5 group-hover/badge:opacity-100 transition-opacity" />
                            </button>
                        </div>
                    )}

                    {/* Image Search Overlay */}
                    {observation.status === 'ready' && displayTitle && displayTitle !== '???' && (
                        <a
                            href={`https://www.google.com/search?tbm=isch&safe=active&q=${encodeURIComponent(displayTitle)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-3 right-3 flex min-h-10 items-center gap-1.5 rounded-full bg-white/95 py-1.5 pl-2.5 pr-3 text-xs font-bold text-brand-ink shadow-sm backdrop-blur-sm transition hover:text-brand-primary-dark hover:shadow-md"
                            title="Google画像検索で確認する"
                        >
                            <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                            画像で確認
                        </a>
                    )}
                </div>

                {/* Title with fade transition */}
                {/* Title & Badge */}
                <div className="mb-1 flex items-center justify-center gap-3 text-center">
                    <h1 className="text-3xl font-bold tracking-[-0.035em] text-brand-ink sm:text-4xl">
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
                    <div className="flex flex-col items-center gap-1 mb-6">
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-lg text-slate-500 font-medium">
                                {activeCard.english_name
                                    .split(/[\s-]+/)
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                    .join(' ')}
                            </span>
                            <button
                                onClick={() => playTts(activeCard.english_name!)}
                                disabled={ttsLoading}
                                className={`min-h-10 min-w-10 rounded-full p-1.5 transition-colors duration-200 ${ttsLoading
                                    ? 'text-gray-400 cursor-wait'
                                    : ttsError
                                        ? 'text-red-400 hover:text-red-500 hover:bg-red-50 active:scale-95'
                                        : 'text-brand-muted hover:bg-brand-primary-soft hover:text-brand-primary-dark active:scale-95'
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
                        {ttsError && (
                            <span className="text-xs text-red-400">音声を再生できませんでした</span>
                        )}
                    </div>
                )}


                {/* Candidate Selector - これかも？ */}
                {observation.status === 'ready' && hasCandidates && (
                    <div className="mb-4 w-full rounded-2xl border border-brand-line bg-brand-cream-soft p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-cream text-xs font-black text-brand-ink" aria-hidden="true">?</span>
                            <span className="font-bold text-brand-ink">これかも？</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                            {candidateCards.map((card, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleCandidateSelect(index)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 ${index === activeCandidateIndex
                                        ? 'bg-brand-primary text-white shadow-sm'
                                        : 'border border-brand-line bg-white text-brand-ink hover:border-brand-sand'
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
                    <div className="mb-6 w-full rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl font-black text-red-600">!</div>
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
                            {retrying ? 'リトライちゅう…' : 'もういちどしらべる'}
                        </Button>
                    </div>
                )}

                {/* Kid-friendly Description */}
                {observation.status === 'ready' && (
                    <Card
                        key={`card-${activeCandidateIndex}`}
                        className="mb-4 w-full border-brand-primary/15 bg-brand-primary-soft"
                    >
                        <p className="text-center text-lg font-medium leading-relaxed text-brand-ink">
                            {displayKidFriendly}
                        </p>
                    </Card>
                )}

                {/* Look For - 見分けポイント */}
                {lookFor.length > 0 && (
                    <div className="mb-4 w-full rounded-2xl border border-brand-line bg-white p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="h-2 w-2 rounded-full bg-brand-sand" aria-hidden="true" />
                            <span className="font-bold text-brand-ink">みわけポイント</span>
                        </div>
                        <ul className="space-y-1 pl-4 text-sm leading-relaxed text-brand-muted">
                            {lookFor.map((point, i) => (
                                <li key={i}>• {point}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Safety Notes - Always visible, prominent */}
                {safetyNotes.length > 0 && (
                    <div
                        className="mb-4 w-full rounded-2xl border border-brand-coral/25 bg-brand-coral-soft p-4"
                        role="alert"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-coral text-xs font-black text-white" aria-hidden="true">!</span>
                            <span className="font-bold text-red-800">ちゅうい</span>
                        </div>
                        <ul className="space-y-1 pl-4 text-sm leading-relaxed text-red-800">
                            {safetyNotes.map((note, i) => (
                                <li key={i}>• {note}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Fun Facts - Now always visible (no toggle) */}
                {funFacts.length > 0 && (
                    <div className="mb-4 w-full rounded-2xl border border-brand-sand/35 bg-brand-cream-soft p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg text-brand-sand" aria-hidden="true">✦</span>
                            <span className="font-bold text-brand-ink">まめちしき</span>
                        </div>
                        <ul className="space-y-2 text-sm leading-relaxed text-brand-muted">
                            {funFacts.map((fact, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-brand-sand" aria-hidden="true">•</span>
                                    <span>{fact}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Questions - Always visible */}
                {questions.length > 0 && (
                    <div className="mb-4 w-full rounded-2xl border border-brand-line bg-white p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary-soft text-xs font-black text-brand-primary-dark" aria-hidden="true">?</span>
                            <span className="font-bold text-brand-ink">きいてみよう</span>
                        </div>
                        <ul className="space-y-1 pl-4 text-sm leading-relaxed text-brand-muted">
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
                                    className="min-h-10 rounded-full border border-brand-line bg-white px-4 py-2 text-sm font-semibold text-brand-muted transition-colors hover:border-brand-sand hover:text-brand-ink"
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
                        ほかのものをしらべる
                    </Button>
                </div>

                {/* Metadata - subtle display */}
                {observation.status === 'ready' && (
                    <div className="mb-4 w-full space-y-0.5 text-center text-xs text-brand-muted/70">
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
                    className="min-h-11 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:text-red-700"
                >
                    この発見を削除
                </button>
            </div>

            {/* Category Selection Modal */}
            <Modal show={showCategoryModal} onClose={() => setShowCategoryModal(false)}>
                <div className="p-6">
                    <h2 className="mb-4 text-xl font-bold text-brand-ink">
                        カテゴリをへんこう
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryChange(cat.id)}
                                disabled={categoryUpdating}
                                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-bold transition-[opacity,box-shadow] sm:w-auto ${cat.id === observation.category
                                    ? 'ring-2 ring-offset-2'
                                    : 'hover:opacity-80'
                                    } ${categoryUpdating ? 'cursor-wait opacity-50' : ''}`}
                                style={{
                                    backgroundColor: cat.color + '20',
                                    color: cat.color,
                                    ...(cat.id === observation.category ? { '--tw-ring-color': cat.color } as React.CSSProperties : {}),
                                }}
                            >
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: cat.color }}
                                />
                                {cat.name}
                                {cat.id === observation.category && (
                                    <span className="ml-auto sm:ml-2 text-xs bg-white/50 px-2 py-0.5 rounded-full">
                                        選択中
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button
                            variant="secondary"
                            onClick={() => setShowCategoryModal(false)}
                        >
                            キャンセル
                        </Button>
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}
