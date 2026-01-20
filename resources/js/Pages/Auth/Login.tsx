import { Button } from '@/Components/ui';
import InputError from '@/Components/InputError';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="ログイン" />

            <h1 className="text-2xl font-bold text-brand-dark text-center mb-6">
                ログイン
            </h1>

            {status && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm font-medium text-green-700 text-center">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        メールアドレス
                    </label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-coral focus:ring-2 focus:ring-brand-cream transition-colors"
                        autoComplete="username"
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    <InputError message={errors.email} className="mt-1" />
                </div>

                <div>
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        パスワード
                    </label>
                    <input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-coral focus:ring-2 focus:ring-brand-cream transition-colors"
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    <InputError message={errors.password} className="mt-1" />
                </div>

                <div className="flex items-center">
                    <input
                        id="remember"
                        type="checkbox"
                        name="remember"
                        checked={data.remember}
                        onChange={(e) => setData('remember', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-coral focus:ring-brand-coral"
                    />
                    <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                        ログイン状態を保持する
                    </label>
                </div>

                <Button type="submit" disabled={processing} loading={processing} fullWidth size="lg">
                    ログイン
                </Button>

                <div className="flex items-center justify-between text-sm">
                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-brand-muted hover:text-brand-coral transition-colors"
                        >
                            パスワードを忘れた方
                        </Link>
                    )}
                    <Link
                        href={route('register')}
                        className="text-brand-coral hover:text-brand-orange font-medium transition-colors"
                    >
                        新規登録はこちら
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
