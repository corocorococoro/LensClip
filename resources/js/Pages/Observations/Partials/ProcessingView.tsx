import { Button } from '@/Components/ui';
import ObservationPhoto from '@/Components/ObservationPhoto';
import PhotoBackLink from '@/Components/PhotoBackLink';
import type { Observation } from '@/types/models';
import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { useUploads } from '@/hooks/useUploads';
import { refreshSavedUploads } from '@/uploadQueue';

export default function ProcessingView({ observation }: { observation: Observation }) {
    const isCorrection = observation.processing_type === 'correction';
    const queued = useUploads().find(item => item.observation?.id === observation.id);
    const queuedStatus = queued?.observation?.status;
    const previousQueuedStatus = useRef(queuedStatus);
    const [needsCheck, setNeedsCheck] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (observation.status !== 'processing') return;
        let active = true;
        let source: EventSource | null = null;
        let checking = false;
        let cancelReload: (() => void) | undefined;
        const abort = new AbortController();
        const close = () => { source?.close(); source = null; };
        const reload = () => {
            if (!active || checking) return;
            checking = true; close();
            router.reload({ only: ['observation', 'categories'],
                onCancelToken: token => { cancelReload = () => token.cancel(); },
                onFinish: () => { checking = false; cancelReload = undefined; if (active) setNeedsCheck(true); },
            });
        };
        const connect = () => {
            close();
            if (!active || document.hidden) return;
            if (!navigator.onLine) { setNeedsCheck(true); return; }
            setNeedsCheck(false);
            source = new EventSource(`/observations/${observation.id}/stream`);
            source.addEventListener('ready', reload);
            source.addEventListener('failed', reload);
            source.addEventListener('timeout', () => { close(); if (active) setNeedsCheck(true); });
            source.onerror = () => {
                if (checking) return;
                checking = true;
                fetch(`/observations/${observation.id}`, { headers: { Accept: 'application/json' }, signal: abort.signal })
                    .then(response => { if (!response.ok) throw new Error('Status unavailable'); return response.json(); })
                    .then(data => { if (!active) return; checking = false; const status = (data.data ?? data).status;
                        if (status === 'ready' || status === 'failed') reload(); else setNeedsCheck(true);
                    })
                    .catch(() => { if (active) { checking = false; setNeedsCheck(true); } });
            };
        };
        const changed = previousQueuedStatus.current !== queuedStatus;
        previousQueuedStatus.current = queuedStatus;
        if (changed && queuedStatus && queuedStatus !== 'processing') reload(); else connect();
        window.addEventListener('online', connect);
        window.addEventListener('offline', connect);
        document.addEventListener('visibilitychange', connect);
        return () => { active = false; close(); abort.abort(); cancelReload?.();
            window.removeEventListener('online', connect); window.removeEventListener('offline', connect); document.removeEventListener('visibilitychange', connect);
        };
    }, [observation.id, observation.status, attempt, queuedStatus]);

    return <div className="mx-auto max-w-2xl">
        <PhotoBackLink />
        <div className="flex flex-col items-center">
            <ObservationPhoto src={observation.original_url || observation.thumb_url} />
            <div className="w-full max-w-xl" aria-live="polite">
                <p className="mb-2 text-sm font-semibold text-brand-primary-dark">図鑑に保存済み</p>
                <h1 className="text-2xl font-bold text-brand-ink">{isCorrection ? observation.title || '図鑑情報を更新しています' : 'これは何かな？ 調べています'}</h1>
                <p className="mt-3 text-sm leading-relaxed text-brand-muted">{isCorrection ? '正しい名前に合わせて説明を更新しています。' : '写真から名前や特徴を調べています。'}図鑑に戻って、ほかの写真を見ることもできます。</p>
                {(needsCheck || queued?.message) && <div role="alert" className="mt-5 rounded-xl bg-brand-cream-soft p-4 text-sm">
                    <p>{queued?.message || 'まだ結果を確認できていません。写真は保存されています。'}</p>
                    {queued?.retryable !== false && <Button className="mt-3" variant="secondary" onClick={() => { void refreshSavedUploads(true); setAttempt(value => value + 1); }}>状態を再確認</Button>}
                </div>}
            </div>
        </div>
    </div>;
}
