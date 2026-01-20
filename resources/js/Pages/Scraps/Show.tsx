// @ts-nocheck
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Show({ auth, scrap }) {
    return (
        <AuthenticatedLayout
            user={auth.user}
        >
            <Head title={scrap.primary_name || '詳細'} />

            <div className="py-6 bg-[#FFFDFB] min-h-screen">
                <div className="max-w-2xl mx-auto px-4 sm:px-6">
                    {/* Back Button */}
                    <div className="mb-6">
                        <Link
                            href={route('dashboard')}
                            className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-[#FF6B6B] transition-colors font-bold"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                            <span>コレクションにもどる</span>
                        </Link>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-[#F5EDD6]">
                        {/* Image */}
                        <div className="aspect-square w-full relative">
                            <img
                                src={'/storage/' + scrap.image_path}
                                alt={scrap.primary_name}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Content */}
                        <div className="p-6 text-center">
                            <span className="inline-block bg-green-100 text-green-800 text-sm font-bold px-3 py-1 rounded-full mb-4">
                                {scrap.category_id === 1 ? 'しょくぶつ' :
                                    scrap.category_id === 2 ? 'むし' :
                                        scrap.category_id === 3 ? 'どうぶつ' :
                                            scrap.category_id === 4 ? 'のりもの' :
                                                'その他'}
                            </span>

                            <h1 className="text-4xl font-black text-gray-800 mb-4 tracking-wider">
                                {scrap.primary_name}
                            </h1>

                            <p className="text-xl text-gray-600 bg-gray-50 p-4 rounded-xl leading-relaxed font-bold">
                                {scrap.description || 'せつめいがないよ'}
                            </p>

                            <div className="mt-8 flex flex-wrap justify-center gap-2">
                                {scrap.tags.map((tag) => (
                                    <span key={tag.id} className="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-sm font-bold">
                                        #{tag.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-center pb-20">
                        <Link
                            href={route('dashboard')}
                            className="inline-block bg-orange-400 text-white font-bold py-4 px-12 rounded-full shadow-lg text-xl hover:bg-orange-500 transition"
                        >
                            あつめる！
                        </Link>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
