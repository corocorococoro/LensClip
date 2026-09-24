import type { UploadItem } from '@/uploadQueue';
import type { ObservationSummary } from '@/types/models';

export function uploadLabel(item: UploadItem) {
    switch (item.phase) {
        case 'queued': return '保存待ち';
        case 'preparing': return '写真を準備中';
        case 'uploading': return `写真を送信中 ${item.percent}%`;
        case 'confirming': return '保存を確認中';
        case 'waiting': return item.attempted ? '保存の確認待ち' : '接続待ち';
        case 'error': return item.attempted && item.retryable ? '保存を確認できません' : '写真を保存できません';
        case 'saved': return item.message ? '調査状況の確認待ち' : item.observation?.status === 'ready' ? '調査ができました' : item.observation?.status === 'failed' ? '調査を再試行できます' : '調べています';
    }
}

export function canCancelUpload(item: UploadItem) {
    return !item.attempted && ['queued', 'waiting', 'error'].includes(item.phase);
}

export function savedUploadSummary(item: UploadItem): ObservationSummary | null {
    if (!item.observation) return null;
    return { ...item.observation, title: item.observation.title ?? '', thumb_url: item.observation.thumb_url ?? null, created_at: item.createdAt };
}
