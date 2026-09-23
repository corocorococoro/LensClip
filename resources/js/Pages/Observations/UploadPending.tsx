import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { useSyncExternalStore } from 'react';
import { getServerUploads, getUploads, subscribeUploads } from '@/uploadQueue';

export default function UploadPending() {
    const items = useSyncExternalStore(subscribeUploads, getUploads, getServerUploads);
    const pending = items.some(item => item.phase !== 'saved');
    return (
        <AppLayout title="写真を保存">
            <Head title="写真を保存" />
            <div className="mx-auto max-w-md py-10 text-center">
                <h1 className="text-xl font-bold text-brand-dark">{pending ? '写真を図鑑に追加しています' : items.length ? '写真を保存しました' : '写真を撮る・選ぶ'}</h1>
                <p className="mt-4 text-sm leading-relaxed text-brand-muted">
                    {pending ? 'ライブラリに戻っても送信を続けます。次の写真を選ぶこともできます。' : items.length ? '上のリンクから記録を確認できます。次の写真を選ぶこともできます。' : '下のカメラボタンから写真を選んでください。'}
                </p>
                {pending && <p className="mt-2 text-xs text-brand-muted">保存が終わるまで、このタブを閉じたり再読み込みしたりしないでください。</p>}
                <Link href="/library" className="mt-6 inline-block rounded-xl bg-brand-primary px-6 py-3 font-bold text-white">ライブラリで待つ</Link>
            </div>
        </AppLayout>
    );
}
