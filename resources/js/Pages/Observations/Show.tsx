import AppLayout from '@/Layouts/AppLayout';
import { Button, Card } from '@/Components/ui';
import type { Observation, Tag } from '@/types/models';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    observation: Observation;
}

export default function Show({ observation }: Props) {
    const [showFunFacts, setShowFunFacts] = useState(false);
    const [retrying, setRetrying] = useState(false);

    const aiJson = observation.ai_json || {};
    const funFacts = aiJson.fun_facts || [];
    const safetyNotes = aiJson.safety_notes || [];
    const questions = aiJson.questions || [];

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

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
                    {observation.title || '???'}
                </h1>

                {/* Confidence Badge */}
                {observation.status === 'ready' && observation.confidence > 0 && (
                    <div className="mb-4">
                        <span
                            className={`px-3 py-1 rounded-full text-sm font-medium tabular-nums ${observation.confidence > 0.8
                                ? 'bg-green-100 text-green-700'
                                : observation.confidence > 0.5
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                        >
                            {Math.round(observation.confidence * 100)}% じしん
                        </span>
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
                    <Card className="w-full mb-4 bg-blue-50 border-blue-100">
                        <p className="text-lg text-blue-800 text-center leading-relaxed">
                            {observation.kid_friendly || observation.summary}
                        </p>
                    </Card>
                )}

                {/* Safety Notes */}
                {safetyNotes.length > 0 && (
                    <div
                        className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4"
                        role="alert"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl" aria-hidden="true">
                                ⚠️
                            </span>
                            <span className="font-bold text-amber-700">ちゅうい</span>
                        </div>
                        <ul className="text-sm text-amber-700 space-y-1">
                            {safetyNotes.map((note, i) => (
                                <li key={i}>• {note}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Fun Facts */}
                {funFacts.length > 0 && (
                    <div className="w-full bg-purple-50 rounded-2xl overflow-hidden mb-4">
                        <button
                            onClick={() => setShowFunFacts(!showFunFacts)}
                            className="w-full p-4 flex items-center justify-between"
                            aria-expanded={showFunFacts}
                            aria-controls="fun-facts-content"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xl" aria-hidden="true">
                                    💡
                                </span>
                                <span className="font-bold text-purple-700">まめちしき</span>
                            </div>
                            <span
                                className={`text-purple-600 transition-transform duration-300 ${showFunFacts ? 'rotate-180' : ''}`}
                                aria-hidden="true"
                            >
                                ▼
                            </span>
                        </button>
                        <div
                            id="fun-facts-content"
                            className={`grid transition-all duration-300 ease-out ${showFunFacts ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                        >
                            <div className="overflow-hidden">
                                <ul className="text-sm text-purple-700 space-y-2 px-4 pb-4">
                                    {funFacts.map((fact, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span aria-hidden="true">✨</span>
                                            <span>{fact}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Questions */}
                {questions.length > 0 && (
                    <div className="w-full bg-green-50 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl" aria-hidden="true">
                                ❓
                            </span>
                            <span className="font-bold text-green-700">きいてみよう</span>
                        </div>
                        <ul className="text-sm text-green-700 space-y-1">
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
