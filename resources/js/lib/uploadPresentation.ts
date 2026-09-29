import type { UploadItem } from '@/uploadQueue';
import type { ObservationSummary } from '@/types/models';

export function uploadLabel(item: UploadItem) {
    switch (item.phase) {
        case 'queued': return '写真の送信待ち';
        case 'preparing': return '写真を準備しています';
        case 'uploading': return `写真を送っています ${item.percent}%`;
        case 'confirming': return '保存を確認しています';
        case 'waiting': return item.attempted ? '保存を確認できません' : '接続を待っています';
        case 'error': return item.attempted ? '保存を確認できません' : '写真を追加できません';
        case 'saved': return item.message ? '結果を確認できません' : item.observation?.status === 'ready' ? '調べ終わりました' : item.observation?.status === 'failed' ? 'もう一度調べられます' : '名前や特徴を調べています';
    }
}

export function uploadDescription(item: UploadItem) {
    switch (item.phase) {
        case 'saved': return '写真は図鑑に保存されています。';
        case 'error': return item.attempted
            ? '写真が保存されたか確認できていません。下の案内を確認してください。'
            : '写真の追加を完了できませんでした。下の案内を確認してください。';
        case 'waiting': return item.attempted
            ? '保存を確認できていません。このタブを開いたまま、接続を確認してください。'
            : '接続が戻ると送信を再開します。保存が終わるまで、このタブを開いておいてください。';
        case 'confirming': return '写真の送信が終わり、保存されたか確認しています。このタブを開いておいてください。';
        case 'queued': return '前の写真の送信が終わると、この写真を送ります。保存が終わるまで、このタブを開いておいてください。';
        case 'preparing': return '送信できるように写真を準備しています。保存が終わるまで、このタブを開いておいてください。';
        case 'uploading': return '図鑑に戻っても送信は続きます。保存が終わるまで、このタブを開いておいてください。';
    }
}

export function canCancelUpload(item: UploadItem) {
    return !item.attempted && ['queued', 'waiting', 'error'].includes(item.phase);
}

export function savedUploadSummary(item: UploadItem): ObservationSummary | null {
    if (!item.observation) return null;
    return { ...item.observation, title: item.observation.title ?? '', thumb_url: item.observation.thumb_url ?? null, created_at: item.createdAt };
}
