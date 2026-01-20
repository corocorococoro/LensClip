import { Button } from '@/Components/ui';
import InputError from '@/Components/InputError';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="新規登録" />

            <h1 className="text-2xl font-bold text-brand-dark text-center mb-6">
                新規登録
            </h1>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        おなまえ
                    </label>
                    <input
                        id="name"
                        name="name"
                        value={data.name}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-coral focus:ring-2 focus:ring-brand-cream transition-colors"
                        autoComplete="name"
                        autoFocus
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />
                    <InputError message={errors.name} className="mt-1" />
                </div>

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
                        onChange={(e) => setData('email', e.target.value)}
                        required
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
                        autoComplete="new-password"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    <InputError message={errors.password} className="mt-1" />
                </div>

                <div>
                    <label
                        htmlFor="password_confirmation"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        パスワード（確認）
                    </label>
                    <input
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-coral focus:ring-2 focus:ring-brand-cream transition-colors"
                        autoComplete="new-password"
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        required
                    />
                    <InputError message={errors.password_confirmation} className="mt-1" />
                </div>

                <Button type="submit" disabled={processing} loading={processing} fullWidth size="lg">
                    登録する
                </Button>

                <div className="text-center text-sm">
                    <span className="text-gray-500">すでにアカウントをお持ちの方は</span>{' '}
                    <Link
                        href={route('login')}
                        className="text-brand-coral hover:text-brand-orange font-medium transition-colors"
                    >
                        ログイン
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
