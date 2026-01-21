import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface LogEntry {
    timestamp: string;
    environment: string;
    level: string;
    message: string;
    stack_trace: string | null;
}

interface Props {
    logs: LogEntry[];
    pagination: {
        current_page: number;
        has_more: boolean;
        total: number;
    };
    filters: {
        level: string;
        date: string;
    };
    levels: string[];
}

export default function Logs({ logs, pagination, filters, levels }: Props) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const handleFilterChange = (key: string, value: string) => {
        router.get(route('admin.logs'), {
            ...filters,
            [key]: value,
            page: 1,
        }, {
            preserveState: true,
        });
    };

    const handlePageChange = (page: number) => {
        router.get(route('admin.logs'), {
            ...filters,
            page,
        }, {
            preserveState: true,
        });
    };

    const getLevelColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'emergency':
            case 'alert':
            case 'critical':
            case 'error':
                return 'bg-red-100 text-red-800';
            case 'warning':
                return 'bg-yellow-100 text-yellow-800';
            case 'notice':
            case 'info':
                return 'bg-blue-100 text-blue-800';
            case 'debug':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <AdminLayout title="ログ閲覧">
            <Head title="ログ閲覧 - 管理画面" />

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            日付
                        </label>
                        <input
                            type="date"
                            value={filters.date}
                            onChange={(e) => handleFilterChange('date', e.target.value)}
                            className="rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            レベル
                        </label>
                        <select
                            value={filters.level}
                            onChange={(e) => handleFilterChange('level', e.target.value)}
                            className="rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            {levels.map((level) => (
                                <option key={level} value={level}>
                                    {level === 'all' ? 'すべて' : level.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <span className="text-sm text-gray-500">
                            {pagination.total} 件のログ
                        </span>
                    </div>
                </div>
            </div>

            {/* Log entries */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {logs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        ログが見つかりませんでした
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {logs.map((log, index) => (
                            <div key={index} className="p-4 hover:bg-gray-50">
                                <div className="flex items-start gap-3">
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(log.level)}`}
                                    >
                                        {log.level.toUpperCase()}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                            <span>{log.timestamp}</span>
                                            <span>•</span>
                                            <span>{log.environment}</span>
                                        </div>
                                        <p className="text-sm text-gray-900 break-words whitespace-pre-wrap">
                                            {log.message}
                                        </p>
                                        {log.stack_trace && (
                                            <div className="mt-2">
                                                <button
                                                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                                    className="text-xs text-blue-600 hover:text-blue-800"
                                                >
                                                    {expandedIndex === index ? '▲ スタックトレースを閉じる' : '▼ スタックトレースを表示'}
                                                </button>
                                                {expandedIndex === index && (
                                                    <pre className="mt-2 p-3 bg-gray-900 text-gray-100 text-xs rounded-lg overflow-x-auto">
                                                        {log.stack_trace}
                                                    </pre>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {(pagination.current_page > 1 || pagination.has_more) && (
                <div className="flex justify-center gap-2 mt-6">
                    <button
                        onClick={() => handlePageChange(pagination.current_page - 1)}
                        disabled={pagination.current_page <= 1}
                        className="px-4 py-2 rounded-lg bg-white shadow text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        ← 前へ
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-600">
                        ページ {pagination.current_page}
                    </span>
                    <button
                        onClick={() => handlePageChange(pagination.current_page + 1)}
                        disabled={!pagination.has_more}
                        className="px-4 py-2 rounded-lg bg-white shadow text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        次へ →
                    </button>
                </div>
            )}
        </AdminLayout>
    );
}
