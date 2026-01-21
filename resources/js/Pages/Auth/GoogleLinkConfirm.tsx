import { Button } from '@/Components/ui';
import InputError from '@/Components/InputError';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface Props {
    email: string;
}

export default function GoogleLinkConfirm({ email }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('auth.google.link.process'));
    };

    return (
        <GuestLayout>
            <Head title="アカウント連携" />

            <h1 className="text-2xl font-bold text-brand-dark text-center mb-4">
                アカウント連携
            </h1>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-700">
                <p className="mb-2">
                    <strong>{email}</strong> はすでに登録されています。
                </p>
                <p>
                    パスワードを入力してGoogleアカウントと連携してください。
                </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
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
                        autoFocus
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    <InputError message={errors.password} className="mt-1" />
                </div>

                <Button type="submit" disabled={processing} loading={processing} fullWidth size="lg">
                    連携してログイン
                </Button>

                <div className="text-center text-sm text-gray-500">
                    <a
                        href={route('login')}
                        className="text-brand-coral hover:text-brand-orange transition-colors"
                    >
                        キャンセル
                    </a>
                </div>
            </form>
        </GuestLayout>
    );
}
