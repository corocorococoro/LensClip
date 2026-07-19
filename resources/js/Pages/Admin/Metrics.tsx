import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';

interface FunnelWeek {
    weekStart: string;
    registered: number;
    firstObservation: number;
    secondObservation: number;
}

interface RetentionRow {
    day: number;
    eligible: number;
    retained: number;
}

interface Usage {
    month: string;
    activeUsers: number;
    totalAnalyses: number;
    median: number;
    p90: number;
    max: number;
}

interface AiCostModel {
    model: string;
    count: number;
    unitJpy: number | null;
    subtotalJpy: number | null;
}

interface AiCost {
    month: string;
    models: AiCostModel[];
    totalJpy: number;
    hasMissingUnitCost: boolean;
}

interface Props {
    funnel: FunnelWeek[];
    retention: RetentionRow[];
    usage: Usage;
    aiCost: AiCost;
}

const percent = (num: number, denom: number) =>
    denom > 0 ? `${Math.round((num / denom) * 100)}%` : '—';

export default function Metrics({ funnel, retention, usage, aiCost }: Props) {
    return (
        <AdminLayout title="メトリクス">
            <Head title="メトリクス" />

            <div className="space-y-8 max-w-4xl">
                {/* Activation funnel */}
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">アクティベーションファネル（週次コホート）</h2>
                    <p className="text-xs text-gray-500 mb-4">登録 → 初回記録 → 2件目記録</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-500 border-b">
                                    <th className="py-2 pr-4">登録週</th>
                                    <th className="py-2 pr-4 text-right">登録</th>
                                    <th className="py-2 pr-4 text-right">初回記録</th>
                                    <th className="py-2 pr-4 text-right">2件目</th>
                                    <th className="py-2 text-right">初回転換率</th>
                                </tr>
                            </thead>
                            <tbody>
                                {funnel.map((week) => (
                                    <tr key={week.weekStart} className="border-b border-gray-100">
                                        <td className="py-2 pr-4 tabular-nums">{week.weekStart}〜</td>
                                        <td className="py-2 pr-4 text-right tabular-nums">{week.registered}</td>
                                        <td className="py-2 pr-4 text-right tabular-nums">{week.firstObservation}</td>
                                        <td className="py-2 pr-4 text-right tabular-nums">{week.secondObservation}</td>
                                        <td className="py-2 text-right tabular-nums">{percent(week.firstObservation, week.registered)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Retention */}
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">継続率（記録作成ベースの近似）</h2>
                    <p className="text-xs text-gray-500 mb-4">
                        登録から N 日目に記録を作成したユーザーの割合。ログインではなく記録作成を活動とみなした近似値。
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                        {retention.map((row) => (
                            <div key={row.day} className="rounded-lg border border-gray-200 p-4 text-center">
                                <div className="text-xs font-semibold text-gray-500">D{row.day}</div>
                                <div className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                                    {percent(row.retained, row.eligible)}
                                </div>
                                <div className="mt-1 text-xs text-gray-500 tabular-nums">
                                    {row.retained} / {row.eligible} 人
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Usage distribution */}
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">利用量（{usage.month}）</h2>
                    <p className="text-xs text-gray-500 mb-4">今月のユーザーあたり記録件数（解析回数の近似）</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                        {[
                            { label: '記録したユーザー', value: usage.activeUsers },
                            { label: '解析合計', value: usage.totalAnalyses },
                            { label: '中央値', value: usage.median },
                            { label: 'p90', value: usage.p90 },
                            { label: '最大', value: usage.max },
                        ].map((item) => (
                            <div key={item.label} className="rounded-lg border border-gray-200 p-4">
                                <div className="text-xs font-semibold text-gray-500">{item.label}</div>
                                <div className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{item.value}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* AI cost */}
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">AI 実費概算（{aiCost.month}）</h2>
                    <p className="text-xs text-gray-500 mb-4">
                        解析完了件数 × モデル別単価（config/ai_costs.php）による概算。再解析等は含まれません。
                    </p>
                    {aiCost.models.length === 0 ? (
                        <p className="text-sm text-gray-500">今月の解析完了はまだありません。</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-gray-500 border-b">
                                        <th className="py-2 pr-4">モデル</th>
                                        <th className="py-2 pr-4 text-right">件数</th>
                                        <th className="py-2 pr-4 text-right">単価（円）</th>
                                        <th className="py-2 text-right">小計（円）</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {aiCost.models.map((row) => (
                                        <tr key={row.model} className="border-b border-gray-100">
                                            <td className="py-2 pr-4 font-mono text-xs">{row.model}</td>
                                            <td className="py-2 pr-4 text-right tabular-nums">{row.count}</td>
                                            <td className="py-2 pr-4 text-right tabular-nums">
                                                {row.unitJpy ?? <span className="text-amber-600">単価未設定</span>}
                                            </td>
                                            <td className="py-2 text-right tabular-nums">{row.subtotalJpy ?? '—'}</td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={3} className="py-2 pr-4 text-right text-xs font-semibold text-gray-500">
                                            合計（単価設定済みのみ）
                                        </td>
                                        <td className="py-2 text-right font-bold tabular-nums">{aiCost.totalJpy}</td>
                                    </tr>
                                </tbody>
                            </table>
                            {aiCost.hasMissingUnitCost && (
                                <p className="mt-2 text-xs text-amber-600">
                                    単価未設定のモデルがあります。config/ai_costs.php に単価を設定すると合計に反映されます。
                                </p>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}
