import BrandMark from '@/Components/BrandMark';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

const steps = [
    { number: '01', title: 'みつける', body: '散歩中、気になったものを撮るだけ。' },
    { number: '02', title: 'しらべる', body: 'AIが名前や特徴をすぐにお教えします。' },
    { number: '03', title: 'のこす', body: '自分だけの図鑑に保存して、あとから見返せます。' },
];

const samples = [
    { image: '/images/lp/sunflower.webp', width: 1024, height: 1024, title: 'ひまわり', label: 'なつのはな', note: 'おひさまのほうをむいているかな？' },
    { image: '/images/lp/ladybug.webp', width: 2816, height: 1536, title: 'ななほしてんとう', label: 'むし', note: 'せなかの ほしを かぞえてみよう。' },
    { image: '/images/lp/pinecone.webp', width: 1024, height: 1024, title: 'まつぼっくり', label: 'きのみ', note: 'うろこみたいな かたちは なんだろう？' },
];

export default function Welcome({ auth }: PageProps) {
    const primaryHref = auth?.user ? route('dashboard') : route('register');
    const primaryLabel = auth?.user ? '図鑑をひらく' : '無料ではじめる';

    return (
        <div className="min-h-screen bg-white font-sans text-brand-ink selection:bg-brand-turquoise/25">
            <Head title="LensClip - “これなに？”を学ぶ、親子図鑑" />
            <a href="#main-content" className="sr-only z-[100] rounded-lg bg-white px-4 py-2 font-bold text-brand-primary-dark focus:not-sr-only focus:fixed focus:left-4 focus:top-4">本文へ移動</a>

            <header className="fixed inset-x-0 top-0 z-50 border-b border-brand-line/80 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
                    <Link href="/" className="flex items-center gap-2.5" aria-label="LensClip トップ">
                        <BrandMark className="h-9 w-9" compact />
                        <span className="text-lg font-bold tracking-[-0.03em]">LensClip</span>
                    </Link>
                    <Link href={auth?.user ? route('dashboard') : route('login')} className="min-h-10 rounded-full px-4 py-2 text-sm font-bold text-brand-primary-dark transition hover:bg-brand-primary-soft">
                        {auth?.user ? '図鑑をひらく' : 'ログイン'}
                    </Link>
                </div>
            </header>

            <main id="main-content" className="pt-16">
                <section className="relative isolate flex min-h-[660px] items-center overflow-hidden sm:min-h-[720px]">
                    <picture className="absolute inset-0 -z-20">
                        <source media="(min-width: 640px)" srcSet="/images/lp/hero_bg_pc.webp" type="image/webp" />
                        <source media="(min-width: 640px)" srcSet="/images/lp/hero_bg_pc.png" />
                        <source srcSet="/images/lp/hero_bg_sp.webp" type="image/webp" />
                        <img src="/images/lp/hero_bg_sp.png" alt="" width={1536} height={2752} className="h-full w-full object-cover object-center" />
                    </picture>
                    <div className="absolute inset-0 -z-10 bg-white/60 sm:bg-gradient-to-r sm:from-white/95 sm:via-white/70 sm:to-white/15" />

                    <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
                        <div className="max-w-xl">
                            <p className="lens-kicker mb-5">子どもの目は、世界をひろげる。</p>
                            <h1 className="text-balance text-4xl font-bold leading-[1.15] tracking-[-0.055em] text-brand-ink sm:text-6xl">
                                「気になる」を、<br />育っていく図鑑に。
                            </h1>
                            <p className="mt-6 max-w-lg text-base font-medium leading-8 text-brand-muted sm:text-lg">
                                見つけて、名前を知って、あとから一緒に見返す。親子の日常の発見を、写真から始まる自分だけの図鑑へ。
                            </p>
                            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Link href={primaryHref} className="inline-flex min-h-13 items-center justify-center rounded-xl bg-brand-primary px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-primary/15 transition hover:bg-brand-primary-dark active:scale-[0.98]">
                                    {primaryLabel}
                                </Link>
                                {!auth?.user && (
                                    <Link href={route('login')} className="inline-flex min-h-12 items-center justify-center px-5 text-sm font-bold text-brand-ink transition hover:text-brand-primary-dark">
                                        すでにアカウントをお持ちの方
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-y border-brand-line bg-brand-canvas px-5 py-16 sm:px-8 sm:py-20">
                    <div className="mx-auto max-w-6xl">
                        <div className="mb-10 max-w-xl">
                            <p className="lens-kicker mb-2">How it works</p>
                            <h2 className="text-3xl font-bold tracking-[-0.04em]">発見が、知る体験につながる。</h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            {steps.map((step) => (
                                <article key={step.number} className="rounded-2xl border border-brand-line bg-white p-6 shadow-sm">
                                    <span className="text-xs font-bold tracking-[0.15em] text-brand-primary-dark">{step.number}</span>
                                    <h3 className="mt-8 text-xl font-bold">{step.title}</h3>
                                    <p className="mt-2 text-sm leading-7 text-brand-muted">{step.body}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-5 py-20 sm:px-8 sm:py-28">
                    <div className="mx-auto max-w-6xl">
                        <div className="mb-10 text-center">
                            <p className="lens-kicker mb-2">A growing collection</p>
                            <h2 className="text-balance text-3xl font-bold tracking-[-0.04em] sm:text-4xl">親子で作る、ちいさな発見の記録</h2>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-3">
                            {samples.map((sample) => (
                                <article key={sample.title} className="overflow-hidden rounded-2xl border border-brand-line bg-white shadow-surface">
                                    <div className="relative aspect-square overflow-hidden bg-brand-sand-soft">
                                        <img src={sample.image} alt={sample.title} width={sample.width} height={sample.height} loading="lazy" className="h-full w-full object-cover" />
                                        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-brand-ink shadow-sm backdrop-blur">{sample.label}</span>
                                    </div>
                                    <div className="p-5">
                                        <h3 className="text-xl font-bold">{sample.title}</h3>
                                        <p className="mt-2 text-sm leading-6 text-brand-muted">親子で観察：{sample.note}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-y border-brand-line bg-brand-primary-soft px-5 py-16 text-center sm:px-8 sm:py-20">
                    <div className="mx-auto max-w-xl">
                        <p className="lens-kicker mb-3">Your next discovery</p>
                        <h2 className="text-balance text-3xl font-bold tracking-[-0.04em]">次の「これなに？」を、残してみよう。</h2>
                        <Link href={primaryHref} className="mt-8 inline-flex min-h-13 items-center justify-center rounded-xl bg-brand-primary px-8 py-3.5 font-bold text-white shadow-sm transition hover:bg-brand-primary-dark active:scale-[0.98]">
                            {primaryLabel}
                        </Link>
                    </div>
                </section>
            </main>

            <footer className="bg-white px-5 py-10 sm:px-8">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
                    <div className="flex items-center gap-2.5"><BrandMark className="h-8 w-8" compact /><span className="font-bold">LensClip</span></div>
                    <nav className="flex gap-6 text-xs font-semibold text-brand-muted">
                        <Link href={route('terms')} className="hover:text-brand-primary-dark">利用規約</Link>
                        <Link href={route('privacy-policy')} className="hover:text-brand-primary-dark">プライバシーポリシー</Link>
                    </nav>
                    <p className="text-xs text-brand-muted/70">© {new Date().getFullYear()} LensClip</p>
                </div>
            </footer>
        </div>
    );
}
