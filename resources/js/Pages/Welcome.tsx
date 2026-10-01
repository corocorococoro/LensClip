import BrandMark from '@/Components/BrandMark';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import '../../css/landing.css';

function Arrow() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg>;
}

function StartLink({ signedIn }: { signedIn: boolean }) {
    return <div className="landing-action">
        <Link href={route(signedIn ? 'dashboard' : 'register')} className="landing-cta">
            <span>{signedIn ? 'ホームへ' : '親子の図鑑をはじめる'}</span><Arrow />
        </Link>
        <p className="landing-action-note">スマホにある写真から始められます</p>
    </div>;
}

export default function Welcome({ auth }: PageProps) {
    const signedIn = Boolean(auth?.user);

    return (
        <div className="landing">
            <Head title="LensClip｜写真でつくる、親子の図鑑">
                <meta name="description" content="いつもの散歩に、親子で夢中になる発見を。LensClipは、見つけたものを写真から調べて、自分たちの図鑑をつくるアプリです。スマホにある写真からも始められます。" />
                <link rel="preload" href="/fonts/lp-serif.woff" as="font" type="font/woff" crossOrigin="anonymous" />
                <link rel="preload" href="/fonts/lp-sans.woff" as="font" type="font/woff" crossOrigin="anonymous" />
            </Head>
            <a href="#main-content" className="landing-skip">本文へ移動</a>
            <header className="landing-header">
                <div className="landing-header-inner">
                    <Link href="/" className="landing-brand" aria-label="LensClip トップ"><BrandMark className="h-7 w-7" compact /><span>LensClip</span></Link>
                    <Link href={route(signedIn ? 'dashboard' : 'login')} className="landing-login">{signedIn ? 'ホームへ' : 'ログイン'}</Link>
                </div>
            </header>

            <main id="main-content">
                <section className="landing-hero landing-inner" aria-labelledby="hero-heading">
                    <div className="landing-hero-copy">
                        <p className="landing-eyebrow">写真でつくる、親子の図鑑。</p>
                        <h1 id="hero-heading"><span>いつもの散歩に、</span><span><span className="landing-phrase">親子で夢中になる</span><span className="landing-phrase">発見を。</span></span></h1>
                        <p className="landing-intro">見つけたものを写真から調べて、<br />自分たちの図鑑に。</p>
                    </div>
                    <figure className="landing-scene">
                        <img src="/images/lp/parent-child-clover.webp" width={1456} height={1088} fetchPriority="high" alt="公園のシロツメクサを、親も子も楽しそうにのぞきこむ場面のイメージ" />
                    </figure>
                    <div className="landing-hero-action"><StartLink signedIn={signedIn} /></div>
                </section>

                <section className="landing-proof" aria-labelledby="discovery-heading">
                    <div className="landing-inner landing-proof-inner">
                        <h2 id="discovery-heading" className="landing-kicker">撮った一枚から、こんな発見。</h2>
                        <img className="landing-flower" src="/images/lp/clover.webp" width={1456} height={1088} loading="lazy" decoding="async" alt="親子が見つけたシロツメクサの花と葉のイメージ" />
                        <div className="landing-discovery">
                            <figure className="landing-result">
                                <figcaption><span>LensClipで調べた結果</span><span>実画面の一部・サンプル</span></figcaption>
                                <img src="/images/lp/result-example.webp" width={716} height={450} loading="lazy" decoding="async" alt="シロツメクサ。ちいさな はなが、あつまっているね。一緒に見てみよう：はっぱは、どんな かたち？" />
                            </figure>
                            <div className="landing-thought">
                                <p><strong><span>ひとつの花だと思ったら、</span><span>小さな花の集まり。</span></strong></p>
                                <p>親も気になって、もう一度のぞきこむ。<br />次は葉っぱの形も、見てみたくなる。</p>
                            </div>
                            <p className="landing-ai-note">名前や特徴はAIの推定です。実物と見比べながら楽しんでください。</p>
                        </div>
                    </div>
                </section>

                <section className="landing-collection landing-inner" aria-labelledby="guide-heading">
                    <div>
                        <p className="landing-eyebrow">自分たちだけの一冊へ。</p>
                        <h2 id="guide-heading" className="landing-heading">いっしょに見つけた花が、<br />自分たちの図鑑に。</h2>
                        <p className="landing-copy">公園で、いっしょにのぞきこんだ花。そんな一枚が増えるたび、その日のことも話したくなる。</p>
                    </div>
                    <figure className="landing-guide">
                        <img src="/images/lp/guide-example.webp" width={716} height={442} loading="lazy" decoding="async" alt="図鑑の実画面の一部。見つけたシロツメクサと、別の日に見つけたひまわりが並ぶサンプル" />
                        <figcaption>図鑑の実画面の一部・サンプル</figcaption>
                    </figure>
                    <div className="landing-at-home">
                        <h3>おうちでも、発見のつづきを。</h3>
                        <p>自分たちの写真でクイズをしたり、月刊図鑑でひと月の発見を眺めたり。</p>
                    </div>
                </section>

                <section className="landing-close" aria-labelledby="start-heading">
                    <div className="landing-inner landing-close-inner">
                        <div>
                            <p className="landing-eyebrow">次の「おもしろいね」は、ここから。</p>
                            <h2 id="start-heading" className="landing-heading">スマホにある、<br />気になった一枚から。</h2>
                            <p className="landing-copy">前に撮った花の写真も、今日見つけた虫も。親子の図鑑を、つくりはじめよう。</p>
                        </div>
                        <StartLink signedIn={signedIn} />
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <div className="landing-inner landing-footer-inner">
                    <div className="landing-brand"><BrandMark className="h-7 w-7" compact /><span>LensClip</span></div>
                    <nav aria-label="利用条件">
                        <Link href={route('terms')}>利用規約</Link><Link href={route('privacy-policy')}>プライバシーポリシー</Link>
                    </nav>
                    <p>© {new Date().getFullYear()} LensClip</p>
                </div>
            </footer>
        </div>
    );
}
