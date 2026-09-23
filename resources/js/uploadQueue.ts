import axios from 'axios';
import { prepareImageUpload } from '@/lib/prepareImageUpload';

type Phase = 'queued' | 'preparing' | 'uploading' | 'confirming' | 'waiting' | 'error' | 'saved';
interface SavedObservation { id: string; status: 'processing' | 'ready' | 'failed'; title: string | null }
export interface UploadItem {
    id: string;
    ownerId: number;
    phase: Phase;
    percent: number;
    previewUrl: string;
    file: File | null;
    prepared: File | null;
    latitude: number | null;
    longitude: number | null;
    attempted: boolean;
    retryable: boolean;
    message: string | null;
    observation: SavedObservation | null;
}
const MAX_PENDING = 3;
const MAX_BYTES = 30 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const empty: UploadItem[] = [];
let items: UploadItem[] = empty;
let ownerId: number | null = null;
let running: string | null = null;
let generation = 0;
let controller: AbortController | null = null;
let notice: string | null = null;
let statusController: AbortController | null = null;
let statusFailures = 0;
let nextStatusCheck = 0;
let statusRetryAfter = 0;
let uploadRevision = 0;
let retryAfter = 0;
let sessionBlocked = false;
const listeners = new Set<() => void>();
export const subscribeUploads = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getUploads = () => items;
export const getServerUploads = () => empty;
export const getUploadNotice = () => notice;
export const getUploadRevision = () => uploadRevision;
export function showUploadNotice(message: string) { notice = message; emit(); }
function emit() { listeners.forEach(listener => listener()); }
function patch(id: string, values: Partial<UploadItem>) {
    items = items.map(item => item.id === id ? { ...item, ...values } : item);
    emit();
}
export function setUploadOwner(id: number | null) {
    if (id === ownerId && !sessionBlocked) return;
    generation++;
    controller?.abort();
    controller = null;
    statusController?.abort();
    statusController = null;
    statusFailures = 0;
    nextStatusCheck = 0;
    statusRetryAfter = 0;
    uploadRevision = 0;
    items.forEach(item => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); });
    items = [];
    notice = null;
    ownerId = id;
    running = null;
    retryAfter = 0;
    sessionBlocked = false;
    emit();
}
export function enqueueUpload(file: File, latitude: number | null, longitude: number | null): string | null {
    if (ownerId === null || sessionBlocked) { notice = 'ログインしてから写真を選んでください。'; emit(); return null; }
    const pending = items.filter(item => item.phase !== 'saved');
    if (pending.length >= MAX_PENDING || file.size + pending.reduce((sum, item) => sum + (item.file?.size ?? item.prepared?.size ?? 0), 0) > MAX_BYTES) {
        notice = '送信待ちの写真がいっぱいです。送信が終わってから追加してください。'; emit(); return null;
    }
    notice = null;
    // Completed notices are bounded; pending images are never silently dropped.
    const saved = items.filter(item => item.phase === 'saved').slice(-4);
    const id = crypto.randomUUID();
    items = [...pending, ...saved, {
        id, ownerId, phase: 'queued', percent: 0, previewUrl: URL.createObjectURL(file),
        file, prepared: null, latitude, longitude, attempted: false, retryable: true, message: null, observation: null,
    }];
    emit(); void pump(); return id;
}
function observationFrom(data: any): SavedObservation {
    const observation = data?.data ?? data;
    if (typeof observation?.id !== 'string' || !['processing', 'ready', 'failed'].includes(observation.status)) throw new Error('Invalid upload response');
    return { id: observation.id, status: observation.status, title: observation.title ?? null };
}
function saved(id: string, observation: SavedObservation) {
    const item = items.find(item => item.id === id);
    if (!item) return;
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    uploadRevision++;
    patch(id, { phase: 'saved', file: null, prepared: null, previewUrl: '', percent: 100, observation, message: null });
}
function blockSession() {
    sessionBlocked = true;
    controller?.abort();
    items = items.map(item => ({
        ...item, phase: item.phase === 'saved' ? 'saved' : 'error', retryable: false,
        message: item.phase === 'saved'
            ? 'ログイン状態が変わりました。ログインし直して解析状況を確認してください。'
            : 'ログイン状態が変わりました。ログインし直して写真を選んでください。',
    }));
    emit();
}
function fail(id: string, error: unknown) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if ([401, 403, 419].includes(status ?? 0)) { blockSession(); return; }
    if (status === 429) {
        const seconds = Number(axios.isAxiosError(error) ? error.response?.headers['retry-after'] : 60);
        retryAfter = Date.now() + (Number.isFinite(seconds) && seconds > 0 ? seconds : 60) * 1000;
    }
    const terminal = [409, 410, 413, 422].includes(status ?? 0);
    const messages: Record<number, string> = {
        409: '同じ送信IDの写真が既に保存されています。ライブラリを確認してください。',
        410: 'この写真の記録は削除されています。再送信しません。',
        413: '画像が大きすぎます。別の写真を選んでください。',
        422: '画像を送信できませんでした。JPEG・PNG・WebP・GIF形式で、圧縮後10MB以下の写真を選んでください。',
        429: '送信が混み合っています。しばらく待ってから再試行してください。',
    };
    patch(id, {
        phase: !navigator.onLine && !terminal ? 'waiting' : 'error', retryable: !terminal,
        message: messages[status ?? 0] ?? '送信結果を確認できませんでした。接続を確認して再試行してください。',
    });
}
async function pump() {
    if (running || ownerId === null || sessionBlocked) return;
    const item = items.find(item => item.phase === 'queued');
    if (!item) return;
    if (!navigator.onLine) { patch(item.id, { phase: 'waiting', message: '接続が戻ると再開します。' }); void pump(); return; }
    if (Date.now() < retryAfter) { patch(item.id, { phase: 'error', message: '少し待ってから再試行してください。' }); void pump(); return; }
    const epoch = generation;
    const active = () => epoch === generation && items.some(current => current.id === item.id);
    running = item.id;
    const abort = new AbortController(); controller = abort;
    try {
        let prepared = item.prepared;
        let latitude = item.latitude, longitude = item.longitude;
        if (!prepared) {
            patch(item.id, { phase: 'preparing' });
            try {
                const result = await prepareImageUpload(item.file!);
                if (!active()) return;
                prepared = result.file;
                latitude = result.gps?.latitude ?? latitude;
                longitude = result.gps?.longitude ?? longitude;
                if (prepared.size > MAX_UPLOAD_BYTES) {
                    patch(item.id, { phase: 'error', retryable: false, message: '圧縮後の画像が10MBを超えています。別の写真を選んでください。' }); return;
                }
                // Replace the original preview to release the large original File.
                URL.revokeObjectURL(item.previewUrl);
                patch(item.id, { file: null, prepared, latitude, longitude, previewUrl: URL.createObjectURL(prepared) });
            } catch {
                if (active()) patch(item.id, { phase: 'error', retryable: false, message: '写真の準備に失敗しました。別の写真を選んでください。' });
                return;
            }
        }
        if (item.attempted) {
            patch(item.id, { phase: 'confirming', message: null });
            try {
                const response = await axios.get(`/observations/uploads/${item.id}`, {
                    params: { upload_owner_id: item.ownerId }, headers: { Accept: 'application/json' }, signal: abort.signal, timeout: 30000,
                });
                if (active()) saved(item.id, observationFrom(response.data));
                return;
            } catch (error) {
                if (!axios.isAxiosError(error) || error.response?.status !== 404) throw error;
            }
        }
        if (!active()) return;
        const form = new FormData();
        form.append('image', prepared!); form.append('upload_id', item.id); form.append('upload_owner_id', String(item.ownerId));
        if (latitude !== null) form.append('latitude', String(latitude));
        if (longitude !== null) form.append('longitude', String(longitude));
        patch(item.id, { phase: 'uploading', percent: 0, attempted: true, message: null });
        const response = await axios.post('/observations', form, {
            headers: { Accept: 'application/json' }, signal: abort.signal, timeout: 180000,
            onUploadProgress: event => {
                if (!active() || controller !== abort) return;
                const phase = items.find(current => current.id === item.id)?.phase;
                if (phase !== 'uploading' && phase !== 'confirming') return;
                const percent = event.total ? Math.min(100, Math.round(event.loaded * 100 / event.total)) : 0;
                patch(item.id, { percent, phase: percent === 100 ? 'confirming' : 'uploading' });
            },
        });
        if (active()) saved(item.id, observationFrom(response.data));
    } catch (error) {
        if (active() && !sessionBlocked) fail(item.id, error);
    } finally {
        if (epoch === generation) { running = null; controller = null; void pump(); }
    }
}
export function retryUpload(id: string) {
    const item = items.find(item => item.id === id);
    if (!item || !['error', 'waiting'].includes(item.phase) || !item.retryable) return;
    patch(id, { phase: 'queued', message: null }); void pump();
}
export function dismissUpload(id: string) {
    const item = items.find(item => item.id === id);
    if (!item || running === id) return;
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    items = items.filter(current => current.id !== id); emit();
}
export function clearUploadNotice() { notice = null; emit(); }
export function resumeUploads() {
    if (!navigator.onLine) return;
    items.filter(item => item.phase === 'waiting').forEach(item => retryUpload(item.id));
    void refreshSavedUploads();
}
export async function refreshSavedUploads(force = false) {
    const pending = items.filter(item => item.phase === 'saved' && item.observation?.status === 'processing');
    if (sessionBlocked || statusController || !pending.length || !navigator.onLine || document.hidden || Date.now() < statusRetryAfter || (!force && Date.now() < nextStatusCheck)) return;
    const epoch = generation;
    const abort = new AbortController();
    statusController = abort;
    try {
        const response = await axios.get('/observations/statuses', {
            params: { ids: pending.map(item => item.observation!.id) }, headers: { Accept: 'application/json' }, timeout: 15000, signal: abort.signal,
        });
        if (epoch !== generation || sessionBlocked) return;
        if (!Array.isArray(response.data.observations)) throw new Error('Invalid status response');
        const values = response.data.observations.map(observationFrom) as SavedObservation[];
        statusFailures = 0;
        nextStatusCheck = Date.now() + 6000;
        for (const item of pending) {
            const observation = values.find(value => value.id === item.observation?.id);
            if (observation) {
                if (observation.status !== item.observation?.status) uploadRevision++;
                patch(item.id, { observation, message: null });
            } else dismissUpload(item.id);
        }
    } catch (error) {
        if (epoch !== generation || sessionBlocked) return;
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if ([401, 403, 419].includes(status ?? 0)) { blockSession(); return; }
        statusFailures++;
        const retry = Number(axios.isAxiosError(error) ? error.response?.headers['retry-after'] : 0);
        if (status === 429 && Number.isFinite(retry) && retry > 0) statusRetryAfter = Date.now() + retry * 1000;
        nextStatusCheck = Date.now() + Math.max(Math.min(60000, 6000 * 2 ** Math.min(statusFailures, 4)), Number.isFinite(retry) ? retry * 1000 : 0);
        for (const item of pending) {
            if (items.some(current => current.id === item.id)) patch(item.id, { message: '写真は保存済みですが、解析状況を確認できません。接続を確認して再確認してください。' });
        }
    } finally {
        if (statusController === abort) statusController = null;
    }
}
export function warnPendingUploads(event: BeforeUnloadEvent) {
    if (items.some(item => item.phase !== 'saved')) { event.preventDefault(); event.returnValue = ''; }
}
