import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    const handleLogout = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(route('logout'));
    };

    return (
        <AppLayout>
            <Head title="プロフィール" />

            <div className="mx-auto max-w-2xl space-y-5">
                <div className="mb-8">
                    <p className="lens-kicker mb-1">Account</p>
                    <h1 className="text-3xl font-bold tracking-[-0.04em] text-brand-ink">プロフィール</h1>
                </div>
                <div className="lens-surface p-5 sm:p-8">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                        className="max-w-xl"
                    />
                </div>

                <div className="lens-surface p-5 sm:p-8">
                    <UpdatePasswordForm className="max-w-xl" />
                </div>

                <div className="lens-surface p-5 sm:p-8">
                    <div className="max-w-xl">
                        <header>
                            <h2 className="text-lg font-medium text-gray-900">
                                ログアウト
                            </h2>

                            <p className="mt-1 text-sm text-gray-600">
                                アカウントからログアウトします。
                            </p>
                        </header>

                        <form onSubmit={handleLogout} className="mt-6">
                            <button
                                type="submit"
                                className="min-h-11 w-full rounded-xl border border-brand-line bg-white px-6 py-2.5 font-bold text-brand-ink shadow-sm transition hover:border-brand-sand hover:bg-brand-sand-soft/50 active:scale-[0.98] sm:w-auto"
                            >
                                ログアウト
                            </button>
                        </form>
                    </div>
                </div>

                <div className="rounded-2xl border border-red-200 bg-white p-5 sm:p-8">
                    <DeleteUserForm className="max-w-xl" />
                </div>
            </div>
        </AppLayout>
    );
}
