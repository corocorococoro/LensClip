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

            <p className="lens-kicker mb-2 text-center">Welcome back</p>
            <h1 className="mb-2 text-center text-2xl font-bold tracking-tight text-brand-ink">
                ログイン
            </h1>
            <p className="mb-6 text-center text-sm text-brand-muted">あなたの発見の続きを見にいきましょう。</p>

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
                        className="lens-field min-h-12 px-4 py-3"
                        autoComplete="username"
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
                        className="lens-field min-h-12 px-4 py-3"
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
                        className="h-4 w-4 rounded border-brand-line text-brand-primary focus:ring-brand-primary/25"
                    />
                    <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                        ログイン状態を保持する
                    </label>
                </div>

                <Button type="submit" disabled={processing} loading={processing} fullWidth size="lg">
                    ログイン
                </Button>

                {/* Divider */}
                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-2 text-gray-500">または</span>
                    </div>
                </div>

                {/* Google Login Button */}
                <a
                    href={route('auth.google.redirect')}
                    className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-brand-line bg-white px-4 py-3 font-semibold text-brand-ink transition-colors hover:bg-brand-sand-soft/50"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Googleで続ける
                </a>

                <div className="flex items-center justify-between text-sm">
                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-brand-muted transition-colors hover:text-brand-primary-dark"
                        >
                            パスワードを忘れた方
                        </Link>
                    )}
                    <Link
                        href={route('register')}
                        className="font-bold text-brand-primary-dark transition-colors hover:text-brand-primary"
                    >
                        新規登録はこちら
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
