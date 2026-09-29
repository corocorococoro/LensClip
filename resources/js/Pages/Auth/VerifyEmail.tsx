import PrimaryButton from '@/Components/PrimaryButton';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="メールアドレスを確認" />
            <h1 className="mb-4 text-2xl font-bold text-brand-ink">メールアドレスを確認</h1>

            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                登録したメールアドレスに確認メールを送りました。メール内のリンクを開いて、登録を完了してください。届いていない場合は、確認メールを再送できます。
            </div>

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-sm font-medium text-green-600 dark:text-green-400">
                    登録したメールアドレスに確認メールを再送しました。
                </div>
            )}

            <form onSubmit={submit}>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <PrimaryButton disabled={processing}>
                        確認メールを再送
                    </PrimaryButton>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:text-gray-100 dark:focus:ring-offset-gray-800"
                    >
                        ログアウト
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
