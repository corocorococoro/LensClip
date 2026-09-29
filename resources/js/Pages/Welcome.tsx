import BrandMark from '@/Components/BrandMark';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

const samples = [
    { image: '/images/lp/sunflower.webp', width: 1024, height: 1024, title: 'ひまわり', category: '植物' },
    { image: '/images/lp/ladybug.webp', width: 2816, height: 1536, title: 'ななほしてんとう', category: '虫' },
    { image: '/images/lp/pinecone.webp', width: 1024, height: 1024, title: 'まつぼっくり', category: '植物' },
];
const steps = [
    { title: '写真を撮る・選ぶ', body: '見つけたものを撮影。端末にある写真からも選べます。', caption: '気になった一枚を', mode: 'photo' },
    { title: '名前や特徴を調べる', body: '写真をもとに調べます。説明や問いかけをきっかけに、実物もよく見てみよう。', caption: '名前と特徴を知る', mode: 'result' },
    { title: '自分たちの図鑑になる', body: '写真と調べた内容が図鑑に残ります。発見が少しずつ集まっていきます。', caption: '発見が集まっていく', mode: 'collection' },
] as const;

function SamplePhoto({ index, className = '' }: { index: number; className?: string }) {
    const sample = samples[index];
    return <img src={sample.image} alt={sample.title} width={sample.width} height={sample.height}
        loading="lazy" decoding="async" className={`aspect-square w-full object-cover ${className}`} />;
}

// Non-interactive examples follow the app's photo-first layout and labels.
function GuideExample({ compact = false }: { compact?: boolean }) {
    return <figure className="min-w-0 rounded-2xl border border-brand-line bg-white p-4 shadow-surface sm:p-5">
        <figcaption className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-bold text-brand-ink">図鑑</span>
            <span className="text-xs text-brand-muted">図鑑のイメージ</span>
        </figcaption>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {samples.map((sample, index) => <div key={sample.title} className="min-w-0 overflow-hidden rounded-xl border border-brand-line bg-white">
                <SamplePhoto index={index} />
                <div className="p-2 sm:p-3">
                    <p className={`${compact ? 'text-[11px]' : 'text-xs sm:text-sm'} break-words font-bold leading-relaxed`}>{sample.title}</p>
                    {!compact && <p className="mt-1 text-xs text-brand-muted">{sample.category}</p>}
                </div>
            </div>)}
        </div>
    </figure>;
}

const primaryClass = 'inline-flex min-h-13 items-center justify-center rounded-xl bg-brand-primary px-7 py-3.5 text-center text-base font-bold text-white shadow-sm transition hover:bg-brand-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary active:scale-[0.98]';
const headingClass = 'text-balance text-2xl font-bold leading-snug tracking-[-0.04em] sm:text-3xl lg:text-4xl';

export default function Welcome({ auth }: PageProps) {
    const signedIn = Boolean(auth?.user);
    const primaryHref = signedIn ? route('dashboard') : route('register');
    const primaryLabel = signedIn ? 'ホームへ' : '図鑑づくりをはじめる';

    return (
        <div className="min-h-screen bg-white font-sans text-brand-ink selection:bg-brand-turquoise/25">
            <Head title="LensClip｜写真でつくる、親子の図鑑">
                <meta name="description" content="いつもの道が、親子の冒険になる。LensClipは、見つけたものを写真から調べて、自分たちの図鑑をつくるアプリです。身近な花や虫をきっかけに、親子で夢中になる時間を。" />
            </Head>
            <a href="#main-content" className="sr-only z-[100] rounded-lg bg-white px-4 py-2 font-bold text-brand-primary-dark focus:not-sr-only focus:fixed focus:left-4 focus:top-4">本文へ移動</a>
            <header className="border-b border-brand-line/80 bg-white">
                <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-2 sm:px-8">
                    <Link href="/" className="flex items-center gap-2.5" aria-label="LensClip トップ">
                        <BrandMark className="h-9 w-9" compact />
                        <span className="text-lg font-bold tracking-[-0.03em]">LensClip</span>
                    </Link>
                    <Link href={signedIn ? route('dashboard') : route('login')} className="inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 text-sm font-bold text-brand-primary-dark transition hover:bg-brand-primary-soft">
                        {signedIn ? 'ホームへ' : 'ログイン'}
                    </Link>
                </div>
            </header>

            <main id="main-content">
                <section className="mx-auto grid max-w-6xl items-center gap-9 px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16 lg:grid-cols-2 lg:gap-12" aria-labelledby="hero-heading">
                    <div className="min-w-0">
                        <p className="mb-5 text-sm font-bold tracking-wide text-brand-primary-dark">写真でつくる、親子の図鑑。</p>
                        <h1 id="hero-heading" className="text-[clamp(2rem,4.5vw,3.5rem)] font-bold leading-[1.3] tracking-[-0.045em]">いつもの道が、<br />親子の冒険になる。</h1>
                        <div className="mt-6 space-y-3 text-sm leading-7 text-brand-muted sm:text-base sm:leading-8">
                            <p>道ばたの花も、足もとの小さな虫も。<br className="hidden sm:block" />気になったら、写真を撮って一緒に調べよう。</p>
                            <p>自分たちの図鑑が育つたび、<br className="hidden sm:block" />「今度は何を見つけよう」が、親子の楽しみになる。</p>
                        </div>
                        <div className="mt-7">
                            <Link href={primaryHref} className={`${primaryClass} w-full sm:w-auto`}>{primaryLabel}</Link>
                            {!signedIn && <p className="mt-2.5 text-xs text-brand-muted">アカウント登録に進みます。</p>}
                        </div>
                    </div>
                    <div className="min-w-0">
                        <img src="/images/lp/hero_bg_pc.webp" alt="道ばたで見つけたどんぐりに、親子で目を向ける様子" width={3168} height={1344} fetchPriority="high"
                            className="aspect-[4/3] w-full rounded-3xl object-cover object-right sm:aspect-[5/4]" />
                        <div className="mx-3 mt-4 sm:mx-6"><GuideExample compact /></div>
                    </div>
                </section>

                <section className="border-y border-brand-line bg-brand-canvas px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="discovery-heading">
                    <div className="mx-auto grid max-w-5xl items-center gap-9 md:grid-cols-2 md:gap-16">
                        <div>
                            <h2 id="discovery-heading" className={headingClass}>名前がわかると、<br />もう一度見たくなる。</h2>
                            <p className="mt-6 font-bold leading-8 text-brand-primary-dark">「こんな模様だったんだ」<br />「さっきの花と、少し違うね」</p>
                            <p className="mt-4 text-sm leading-8 text-brand-muted sm:text-base">名前や特徴を知ってから眺めると、気づくことがある。親も子も、つい見入ってしまう。いつもの景色に、話したくなることが増えていく。</p>
                        </div>
                        <figure className="overflow-hidden rounded-3xl border border-brand-line bg-white shadow-sm">
                            <SamplePhoto index={1} className="max-h-80" />
                            <figcaption className="p-5 sm:p-6">
                                <p className="text-xs font-semibold text-brand-muted">観察の問いかけの例</p>
                                <p className="mt-2 text-lg font-bold leading-relaxed">せなかの もようは、どんな かたち？</p>
                            </figcaption>
                        </figure>
                    </div>
                </section>

                <section className="px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="how-heading">
                    <div className="mx-auto max-w-6xl">
                        <h2 id="how-heading" className={`${headingClass} text-center`}>気になったものを、<br />図鑑の一枚に。</h2>
                        <ol className="mt-10 grid gap-8 md:grid-cols-3">
                            {steps.map((step, index) => <li key={step.mode} className="min-w-0">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-sm font-bold text-brand-primary-dark" aria-hidden="true">0{index + 1}</span>
                                    <h3 className="text-lg font-bold">{step.title}</h3>
                                </div>
                                <p className="mb-5 mt-3 text-sm leading-7 text-brand-muted md:min-h-[5.25rem]">{step.body}</p>
                                <figure className="rounded-2xl bg-brand-sand-soft/50 p-5">
                                    {step.mode === 'collection' ? <GuideExample compact /> : <div className="mx-auto max-w-[220px] overflow-hidden rounded-2xl border border-brand-line bg-white shadow-sm">
                                        <SamplePhoto index={0} />
                                        {step.mode === 'result' && <div className="p-3"><p className="font-bold">ひまわり</p><p className="mt-1 text-xs leading-6 text-brand-muted">きいろい はなびらが、ぐるっと ならんでいるね。</p></div>}
                                    </div>}
                                    <figcaption className="mt-4 text-center text-xs text-brand-muted">{step.caption}（イメージ）</figcaption>
                                </figure>
                            </li>)}
                        </ol>
                        <p className="mx-auto mt-8 max-w-2xl text-sm leading-7 text-brand-muted">名前や特徴はAIで調べます。候補が違うこともあるため、実物の特徴と見比べながら楽しんでください。</p>
                    </div>
                </section>

                <section className="bg-brand-canvas px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="guide-heading">
                    <div className="mx-auto grid max-w-6xl items-center gap-9 md:grid-cols-2 md:gap-14">
                        <div>
                            <h2 id="guide-heading" className={headingClass}>わが家の発見が、<br />一冊になっていく。</h2>
                            <p className="mt-6 text-sm leading-8 text-brand-muted sm:text-base">公園で見つけた花。帰り道で出会った虫。自分たちで撮った写真が並ぶと、図鑑は少しずつ特別なものに。</p>
                            <p className="mt-5 text-sm leading-8 text-brand-muted sm:text-base">「このとき、なかなか見つからなかったね」<br />一枚の写真から、その日の話がはじまる。</p>
                        </div>
                        <GuideExample />
                    </div>
                </section>

                <section className="px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="at-home-heading">
                    <div className="mx-auto max-w-5xl">
                        <h2 id="at-home-heading" className={`${headingClass} text-center`}>おうちでも、<br />発見のつづきを。</h2>
                        <p className="mx-auto mt-5 max-w-xl text-sm leading-8 text-brand-muted sm:text-base">見つけた写真でクイズをしたり、ひと月の発見を眺めたり。「また見つけたいね」が、次のお散歩につながっていく。</p>
                        <div className="mt-10 grid gap-6 md:grid-cols-2">
                            <article className="min-w-0 rounded-3xl border border-brand-line p-5 sm:p-7">
                                <p className="text-xs font-bold text-brand-primary-dark">発見クイズ</p>
                                <h3 className="mt-2 text-xl font-bold leading-relaxed">「これ、なんだっけ？」でひと遊び。</h3>
                                <p className="mt-3 text-sm leading-7 text-brand-muted">自分たちの写真がクイズに。答えを開きながら、親子で楽しめます。</p>
                                <figure className="mx-auto mt-6 max-w-[240px] overflow-hidden rounded-2xl border border-brand-line">
                                    <SamplePhoto index={1} />
                                    <figcaption className="bg-brand-primary-soft px-3 py-4 text-center text-sm font-bold">これ、なんだっけ？<span className="mt-1 block text-xs font-normal text-brand-muted">クイズのイメージ</span></figcaption>
                                </figure>
                                <p className="mt-5 text-xs leading-6 text-brand-muted">名前がついた、調べ終わった写真が3件から遊べます。</p>
                            </article>
                            <article className="min-w-0 rounded-3xl border border-brand-line p-5 sm:p-7">
                                <p className="text-xs font-bold text-brand-primary-dark">月刊図鑑</p>
                                <h3 className="mt-2 text-xl font-bold leading-relaxed">ひと月の「見つけた！」を、一冊に。</h3>
                                <p className="mt-3 text-sm leading-7 text-brand-muted">月ごとにまとまる図鑑。印刷して、親子でページをめくることもできます。</p>
                                <figure className="mx-auto mt-6 max-w-[240px] rounded-2xl border border-brand-line bg-brand-cream-soft p-4">
                                    <p className="mb-3 text-center font-bold">月刊図鑑</p>
                                    <SamplePhoto index={0} className="rounded-xl" />
                                    <figcaption className="mt-3 text-center text-xs text-brand-muted">月ごとの図鑑のイメージ</figcaption>
                                </figure>
                                <p className="mt-5 text-xs leading-6 text-brand-muted">印刷にはプリンターなどの印刷環境が必要です。</p>
                            </article>
                        </div>
                    </div>
                </section>

                <section className="border-y border-brand-line bg-brand-primary-soft px-5 py-16 text-center sm:px-8 sm:py-20" aria-labelledby="start-heading">
                    <div className="mx-auto max-w-xl">
                        <h2 id="start-heading" className={headingClass}>最初の一枚は、<br />何にしよう。</h2>
                        <p className="mt-5 text-sm leading-7 text-brand-muted sm:text-base">いつもの道で、親子の「気になる」を見つけにいこう。</p>
                        <Link href={primaryHref} className={`${primaryClass} mt-7`}>{primaryLabel}</Link>
                        {!signedIn && <div className="mt-3 text-xs text-brand-muted"><p>アカウント登録に進みます。</p><Link href={route('login')} className="mt-2 inline-flex min-h-11 items-center font-bold text-brand-primary-dark underline underline-offset-4">ログイン</Link></div>}
                    </div>
                </section>
            </main>

            <footer className="bg-white px-5 py-8 sm:px-8">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
                    <div className="flex items-center gap-2.5"><BrandMark className="h-8 w-8" compact /><span className="font-bold">LensClip</span></div>
                    <nav className="flex flex-wrap justify-center gap-x-6 text-xs font-semibold text-brand-muted" aria-label="利用条件">
                        <Link href={route('terms')} className="inline-flex min-h-11 items-center hover:text-brand-primary-dark">利用規約</Link>
                        <Link href={route('privacy-policy')} className="inline-flex min-h-11 items-center hover:text-brand-primary-dark">プライバシーポリシー</Link>
                    </nav>
                    <p className="text-xs text-brand-muted">© {new Date().getFullYear()} LensClip</p>
                </div>
            </footer>
        </div>
    );
}
