import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">プライバシーポリシー</h1>
          <p className="text-gray-600 mt-2">個人情報の取扱いについて</p>
        </div>

        <div className="space-y-6">
          {/* 基本方針 */}
          <Card>
            <CardHeader>
              <CardTitle>基本方針</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                合同会社アイディアリアル（以下「当社」）は、ユーザーの個人情報保護の重要性を認識し、
                個人情報保護法及び関連法令を遵守し、適切な取扱いに努めます。
              </p>
            </CardContent>
          </Card>

          {/* 収集する個人情報 */}
          <Card>
            <CardHeader>
              <CardTitle>収集する個人情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">1. アカウント登録時</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                    <li>メールアドレス</li>
                    <li>ユーザー名</li>
                    <li>パスワード（暗号化して保存）</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">2. サービス利用時</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                    <li>アップロードされた動画ファイル</li>
                    <li>生成された字幕データ</li>
                    <li>利用履歴・操作ログ</li>
                    <li>IPアドレス・ブラウザ情報</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">3. 決済情報</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                    <li>クレジットカード情報（Stripeで管理）</li>
                    <li>請求先情報</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 利用目的 */}
          <Card>
            <CardHeader>
              <CardTitle>個人情報の利用目的</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm space-y-2">
                <li>サービスの提供・運営</li>
                <li>ユーザーサポート・お問い合わせ対応</li>
                <li>サービス改善・新機能開発</li>
                <li>利用状況の分析</li>
                <li>料金の請求・決済処理</li>
                <li>重要なお知らせの配信</li>
                <li>規約違反・不正利用の調査</li>
              </ul>
            </CardContent>
          </Card>

          {/* 第三者提供 */}
          <Card>
            <CardHeader>
              <CardTitle>第三者への提供</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm">
                  当社は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                  <li>法令に基づく場合</li>
                  <li>人の生命・身体・財産の保護のために必要な場合</li>
                  <li>公衆衛生の向上・児童の健全育成のために必要な場合</li>
                  <li>国の機関等への協力が必要な場合</li>
                </ul>
                <div>
                  <h4 className="font-semibold mb-2">業務委託先</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                    <li>Stripe Inc.（決済処理）</li>
                    <li>OpenAI（AI処理）</li>
                    <li>その他サービス運営に必要な業務委託先</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* データ保存・管理 */}
          <Card>
            <CardHeader>
              <CardTitle>データの保存・管理</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">保存期間</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                    <li>アカウント情報：アカウント削除まで</li>
                    <li>動画・字幕データ：ユーザーによる削除まで</li>
                    <li>利用履歴：3年間</li>
                    <li>決済情報：法令で定められた期間</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">セキュリティ対策</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                    <li>SSL/TLS暗号化通信</li>
                    <li>パスワードのハッシュ化</li>
                    <li>アクセス制御・認証システム</li>
                    <li>定期的なセキュリティ監査</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cookies */}
          <Card>
            <CardHeader>
              <CardTitle>Cookieの使用</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm">
                  当サービスでは、より良いユーザー体験の提供のためCookieを使用しています。
                </p>
                <div>
                  <h4 className="font-semibold mb-2">使用目的</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                    <li>ログイン状態の維持</li>
                    <li>ユーザー設定の保存</li>
                    <li>サービス利用状況の分析</li>
                  </ul>
                </div>
                <p className="text-sm text-gray-600">
                  ブラウザの設定でCookieを無効にできますが、一部機能が制限される場合があります。
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ユーザーの権利 */}
          <Card>
            <CardHeader>
              <CardTitle>ユーザーの権利</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm space-y-2">
                <li>個人情報の開示請求</li>
                <li>個人情報の訂正・削除請求</li>
                <li>個人情報の利用停止請求</li>
                <li>アカウントの削除</li>
              </ul>
              <p className="text-sm text-gray-600 mt-4">
                これらの請求については、サポートまでお問い合わせください。
              </p>
            </CardContent>
          </Card>

          {/* 改定 */}
          <Card>
            <CardHeader>
              <CardTitle>プライバシーポリシーの改定</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                当社は、法令の改正やサービス内容の変更に伴い、本ポリシーを改定することがあります。
                重要な変更については、サービス内での通知やメールでお知らせします。
              </p>
            </CardContent>
          </Card>

          {/* お問い合わせ */}
          <Card>
            <CardHeader>
              <CardTitle>お問い合わせ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  個人情報の取扱いに関するお問い合わせは、下記までご連絡ください。
                </p>
                <div className="text-sm">
                  <p><strong>合同会社アイディアリアル</strong></p>
                  <p>個人情報保護責任者：坂本健太</p>
                  <p>メールアドレス：info@ideareal.co.jp</p>
                  <p>受付時間：平日 9:00〜18:00（土日祝日を除く）</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 最終更新日 */}
          <Card>
            <CardContent className="text-center text-sm text-gray-600">
              最終更新日：2024年6月2日
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}