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

            <h1 className="mb-4 text-center text-2xl font-bold tracking-tight text-brand-ink">
                アカウント連携
            </h1>

            <div className="mb-6 rounded-xl border border-brand-primary/20 bg-brand-primary-soft p-4 text-sm text-brand-primary-dark">
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
                        className="lens-field min-h-12 px-4 py-3"
                        autoComplete="current-password"
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
                        className="font-semibold text-brand-primary-dark transition-colors hover:text-brand-primary"
                    >
                        キャンセル
                    </a>
                </div>
            </form>
        </GuestLayout>
    );
}
