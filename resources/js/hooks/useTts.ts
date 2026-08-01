import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 英語名読み上げ(TTS)の再生管理。
 * サーバー側 TTS は英語ボイス固定のため、日本語テキストは渡さないこと。
 */
export function useTts() {
    const [ttsLoading, setTtsLoading] = useState(false);
    const [ttsError, setTtsError] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const ttsCache = useRef<Map<string, string>>(new Map());

    useEffect(() => {
        return () => {
            audioRef.current?.pause();
            audioRef.current = null;
        };
    }, []);

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

    const resetTtsError = useCallback(() => setTtsError(false), []);

    return { playTts, ttsLoading, ttsError, resetTtsError };
}
