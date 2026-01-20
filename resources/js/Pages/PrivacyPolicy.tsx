import GuestLayout from '@/Layouts/GuestLayout';
import { Head } from '@inertiajs/react';

export default function PrivacyPolicy() {
    return (
        <GuestLayout>
            <Head title="プライバシーポリシー" />

            <div className="text-gray-600 prose prose-sm max-w-none">
                <h1 className="text-xl font-bold text-gray-900 mb-4">プライバシーポリシー</h1>
                <p className="mb-4 text-xs text-gray-500">最終更新日：2026年1月20日</p>

                <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">第1条（目的）</h2>
                <p className="mb-4">
                    本プライバシーポリシーは、「LensClip」（運営：LensClip（運営者：河村信一））（以下「本サービス」といいます。）における、利用者（以下「ユーザー」といいます。）の個人情報の取扱いについて定めるものです。運営者は、ユーザーの個人情報を適切に保護し、ユーザーに安心して本サービスを利用していただくことを目的とします。
                </p>

                <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">第2条（個人情報の定義）</h2>
                <p className="mb-4">
                    本プライバシーポリシーにおいて「個人情報」とは、個人情報保護法に定める「個人情報」を指すものとし、氏名、住所、電話番号、メールアドレス、その他ユーザーを識別できる情報（当該情報のみでは識別できない場合であっても、他の情報と容易に照合することができ、それにより当該ユーザーを識別できるものを含みます。）をいいます。
                </p>

                <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">第3条（個人情報の取得）</h2>
                <p className="mb-2">1. 運営者は、ユーザーが本サービスを利用するにあたり、以下の個人情報を取得する場合があります。</p>
                <ol className="list-decimal pl-5 mb-4 space-y-1">
                    <li>メールアドレス（アカウント登録時など）</li>
                    <li>その他、本サービスの提供に必要な情報（ユーザーが任意に提供する場合）</li>
                </ol>
                <p className="mb-4">2. 運営者は、個人情報の取得にあたっては、適法かつ公正な手段を用い、利用目的を特定し、ユーザーの同意を得た上で取得します。</p>

                <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">第4条（個人情報の利用目的）</h2>
                <p className="mb-2">運営者は、取得した個人情報を以下の目的のために利用します。</p>
                <ol className="list-decimal pl-5 mb-4 space-y-1">
                    <li>本サービスの提供、運営、維持、改善のため</li>
                    <li>ユーザーからの問い合わせへの対応のため</li>
                    <li>本サービスに関するお知らせ、アップデート情報等の提供のため</li>
                    <li>ユーザーの利用状況を分析し、本サービスの改善や新サービスの開発に役立てるため</li>
                    <li>その他、上記利用目的に付随する目的のため</li>
                </ol>

                <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">第5条（個人情報の第三者提供）</h2>
                <p className="mb-2">1. 運営者は、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。</p>
                <p className="mb-2">2. ただし、以下の場合は、第三者への提供に該当しないものとします。</p>
                <ol className="list-decimal pl-5 mb-4 space-y-1">
                    <li>運営者が、利用目的の達成に必要な範囲内において、個人情報の取扱いの全部または一部を委託する場合。この場合、運営者は委託先に対して適切な監督を行います。</li>
                    <li>合併その他の事由による事業の承継に伴って個人情報が提供される場合。</li>
                </ol>

                <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">第6条（個人情報の安全管理措置）</h2>
                <p className="mb-2">1. 運営者は、個人情報の漏洩、滅失、毀損等を防止するため、必要な安全管理措置を講じます。</p>
                <p className="mb-4">2. 運営者は、個人情報の取扱いに関わる役員および従業員に対し、個人情報の重要性を認識させ、個人情報を適切に保護するための教育・訓練を実施します。</p>

                <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">第7条（個人情報の開示、訂正、削除等）</h2>
                <p className="mb-2">1. ユーザーは、自己の個人情報について、開示、訂正、追加、削除等を求める権利を有します。</p>
                <p className="mb-4">2. ユーザーが、自己の個人情報の開示、訂正、追加、削除等を希望される場合は、下記「お問い合わせ先」までご連絡ください。運営者は、本人確認の上、遅滞なく対応します。</p>

                <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">第8条（Cookie（クッキー）その他の技術の利用）</h2>
                <p className="mb-2">1. 本サービスでは、ユーザーの利便性向上、利用状況の分析等のために、Cookieその他の類似技術を利用する場合があります。</p>
                <p className="mb-2">2. Cookieは、ユーザーのコンピューターを識別することはできますが、ユーザー個人を特定できる情報は取得しません。</p>
                <p className="mb-4">3. ユーザーは、ブラウザの設定により、Cookieの受取を拒否することができます。ただし、その場合、本サービスの一部機能が利用できなくなる可能性があります。</p>

                <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">第9条（未成年者の個人情報）</h2>
                <p className="mb-4">未成年者が本サービスを利用する場合、保護者の同意を得た上で利用するものとします。運営者は、未成年者の個人情報の取扱いについて、特に配慮します。</p>

                <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">第10条（プライバシーポリシーの変更）</h2>
                <p className="mb-2">1. 運営者は、個人情報保護法その他関連法令の改正、または本サービスの提供条件の変更等に伴い、本プライバシーポリシーを予告なく変更することがあります。</p>
                <p className="mb-4">2. 変更後のプライバシーポリシーは、本サービス上に掲示された時点から効力を生じるものとします。</p>

                <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2">第11条（お問い合わせ先）</h2>
                <p className="mb-4">本プライバシーポリシーに関するお問い合わせは、以下の窓口までご連絡ください。</p>
                <div className="bg-gray-50 p-4 rounded-lg text-sm">
                    <p>河村信一</p>
                    <p>corocorococoro@gmail.com</p>
                </div>
            </div>
        </GuestLayout>
    );
}
