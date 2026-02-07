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

            <div className="space-y-6">
                <div className="bg-white p-4 shadow sm:rounded-2xl sm:p-8 border border-[#F8D1D7]">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                        className="max-w-xl"
                    />
                </div>

                <div className="bg-white p-4 shadow sm:rounded-2xl sm:p-8 border border-[#F8D1D7]">
                    <UpdatePasswordForm className="max-w-xl" />
                </div>

                <div className="bg-white p-4 shadow sm:rounded-2xl sm:p-8 border border-[#F8D1D7]">
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
                                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#F5B8C1] to-[#8ECFE0] text-white rounded-xl font-bold shadow-lg hover:translate-y-[-2px] transition-all active:scale-95"
                            >
                                ログアウト
                            </button>
                        </form>
                    </div>
                </div>

                <div className="bg-white p-4 shadow sm:rounded-2xl sm:p-8 border border-[#F8D1D7]">
                    <DeleteUserForm className="max-w-xl" />
                </div>
            </div>
        </AppLayout>
    );
}
