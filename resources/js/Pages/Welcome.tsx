import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

export default function Welcome({
    auth,
}: PageProps) {
    return (
        <div className="min-h-screen bg-[#FFFDFB] text-[#4A4A4A] font-sans selection:bg-[#FFE0CE]">
            <Head title="LensClip - “これなに？”を学ぶ、親子図鑑" />

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#FFFDFB]/80 backdrop-blur-md border-b border-[#F5EDD6]">
                <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B6B] to-[#FF9E7D] rounded-lg shadow-sm flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-[#2D2D2D]">LensClip</span>
                    </div>
                    <nav>
                        <Link
                            href={route('login')}
                            className="text-sm font-medium text-[#7D7D7D] hover:text-[#FF6B6B] transition-colors"
                        >
                            ログイン
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="pt-16 pb-20">
                {/* Hero Section */}
                <section className="px-6 pt-16 pb-12 text-center max-w-screen-md mx-auto">
                    <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-[#FFF0E5] text-[#FF823C] text-xs font-bold tracking-wider uppercase">
                        AIで、いつもの散歩をもっと楽しく
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-[#2D2D2D] leading-[1.2] mb-6">
                        “これなに？”が<br />増える時期に。
                    </h1>
                    <p className="text-lg text-[#6B6B6B] leading-relaxed mb-10">
                        散歩や公園が、毎日の<br className="sm:hidden" />“ちいさな学び”に変わる。
                    </p>
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={route('register')}
                            className="w-full sm:w-64 py-4 px-8 bg-gradient-to-r from-[#FF6B6B] to-[#FF823C] text-white rounded-2xl font-bold text-lg shadow-[0_8px_30px_rgb(255,107,107,0.3)] hover:translate-y-[-2px] transition-all active:scale-95 text-center"
                        >
                            無料ではじめる
                        </Link>

                        <div className="flex items-center gap-8 mt-4">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-full bg-[#F0F9FF] border border-[#BAE6FD] flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[#38BDF8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                </div>
                                <span className="text-[10px] font-bold text-[#94A3B8]">みつける</span>
                            </div>
                            <div className="w-4 h-[2px] bg-[#E2E8F0] mt-[-10px]"></div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[#22C55E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                </div>
                                <span className="text-[10px] font-bold text-[#94A3B8]">しらべる</span>
                            </div>
                            <div className="w-4 h-[2px] bg-[#E2E8F0] mt-[-10px]"></div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-full bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[#EF4444]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                                </div>
                                <span className="text-[10px] font-bold text-[#94A3B8]">のこす</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Steps Detail */}
                <section className="px-6 py-12 bg-[#FDFCF8] border-y border-[#F5EDD6]">
                    <div className="max-w-screen-md mx-auto space-y-10">
                        <div className="flex gap-6 items-start">
                            <div className="shrink-0 w-12 h-12 bg-white rounded-2xl shadow-sm border border-[#F5EDD6] flex items-center justify-center text-xl font-bold text-[#FF9E7D]">1</div>
                            <div>
                                <h3 className="text-xl font-bold text-[#2D2D2D] mb-1">みつける</h3>
                                <p className="text-[#7D7D7D]">散歩や公園で、気になったものを撮るだけ。</p>
                            </div>
                        </div>
                        <div className="flex gap-6 items-start">
                            <div className="shrink-0 w-12 h-12 bg-white rounded-2xl shadow-sm border border-[#F5EDD6] flex items-center justify-center text-xl font-bold text-[#FF9E7D]">2</div>
                            <div>
                                <h3 className="text-xl font-bold text-[#2D2D2D] mb-1">しらべる</h3>
                                <p className="text-[#7D7D7D]">AIが名前や特徴をすぐにお教えします。</p>
                            </div>
                        </div>
                        <div className="flex gap-6 items-start">
                            <div className="shrink-0 w-12 h-12 bg-white rounded-2xl shadow-sm border border-[#F5EDD6] flex items-center justify-center text-xl font-bold text-[#FF9E7D]">3</div>
                            <div>
                                <h3 className="text-xl font-bold text-[#2D2D2D] mb-1">のこす</h3>
                                <p className="text-[#7D7D7D]">スクラップに保存して、自分だけの図鑑を作ろう。</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Sample Scraps */}
                <section className="px-6 py-20 max-w-screen-md mx-auto text-center">
                    <h2 className="text-2xl font-bold text-[#2D2D2D] mb-12">親子で作る、ちいさな発見の記録</h2>

                    <div className="grid gap-8">
                        {/* Card 1 */}
                        <div className="bg-white p-4 rounded-[2rem] shadow-xl shadow-[#F5EDD6] border border-[#F5EDD6] text-left transform rotate-[-1deg] transition-transform hover:rotate-0">
                            <div className="aspect-[4/3] rounded-[1.5rem] bg-[#F1F5F9] overflow-hidden mb-4 relative">
                                <img src="/images/lp/sunflower.webp" className="w-full h-full object-cover" alt="ひまわり" />
                                <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold text-[#FF6B6B]">なつのはな</div>
                            </div>
                            <h4 className="text-xl font-bold text-[#2D2D2D] mb-2 px-2">ひまわり</h4>
                            <p className="text-sm text-[#FF823C] font-bold px-2 flex items-start gap-1">
                                <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                                <span>親子で観察：おひさまのほうをむいているかな？</span>
                            </p>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white p-4 rounded-[2rem] shadow-xl shadow-[#F5EDD6] border border-[#F5EDD6] text-left transform rotate-[1deg] transition-transform hover:rotate-0">
                            <div className="aspect-[4/3] rounded-[1.5rem] bg-[#F1F5F9] overflow-hidden mb-4 relative">
                                <img src="/images/lp/ladybug.webp" className="w-full h-full object-cover" alt="ななほしてんと" />
                                <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold text-[#FF6B6B]">むし</div>
                            </div>
                            <h4 className="text-xl font-bold text-[#2D2D2D] mb-2 px-2">ななほしてんと</h4>
                            <p className="text-sm text-[#FF823C] font-bold px-2 flex items-start gap-1">
                                <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                                <span>親子で観察：せなかの ほしを かぞえてみよう！</span>
                            </p>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white p-4 rounded-[2rem] shadow-xl shadow-[#F5EDD6] border border-[#F5EDD6] text-left transform rotate-[-0.5deg] transition-transform hover:rotate-0">
                            <div className="aspect-[4/3] rounded-[1.5rem] bg-[#F1F5F9] overflow-hidden mb-4 relative">
                                <img src="/images/lp/pinecone.webp" className="w-full h-full object-cover" alt="まつぼっくり" />
                                <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold text-[#FF6B6B]">きのみ</div>
                            </div>
                            <h4 className="text-xl font-bold text-[#2D2D2D] mb-2 px-2">まつぼっくり</h4>
                            <p className="text-sm text-[#FF823C] font-bold px-2 flex items-start gap-1">
                                <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                                <span>親子で観察：うろこみたいな かたちは なんだろう？</span>
                            </p>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="px-6 py-20 text-center bg-gradient-to-b from-[#FFFDFB] to-[#FFF0E5]">
                    <h2 className="text-2xl font-bold text-[#2D2D2D] mb-8">さあ、ちいさな冒険に出かけよう。</h2>
                    <div className="flex flex-col items-center gap-6">
                        <Link
                            href={route('register')}
                            className="w-full sm:w-64 py-4 px-8 bg-[#2D2D2D] text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-black transition-all active:scale-95 text-center"
                        >
                            無料ではじめる
                        </Link>
                        <Link
                            href={route('login')}
                            className="text-sm font-medium text-[#7D7D7D] hover:text-[#FF6B6B] transition-colors"
                        >
                            すでにアカウントをお持ちの方はこちら
                        </Link>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="px-6 py-12 border-t border-[#F5EDD6] bg-white">
                <div className="max-w-screen-xl mx-auto flex flex-col items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-[#FF6B6B] to-[#FF9E7D] rounded flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        </div>
                        <span className="font-bold text-[#2D2D2D]">LensClip</span>
                    </div>

                    <div className="flex gap-6 text-[10px] sm:text-xs font-medium text-[#94A3B8]">
                        <Link href={route('terms')} className="hover:text-[#FF6B6B]">利用規約</Link>
                        <Link href={route('privacy-policy')} className="hover:text-[#FF6B6B]">プライバシーポリシー</Link>
                    </div>

                    <p className="text-[10px] text-[#CBD5E1]">
                        &copy; {new Date().getFullYear()} LensClip
                    </p>
                </div>
            </footer>
        </div>
    );
}
