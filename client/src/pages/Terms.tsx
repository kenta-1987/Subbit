import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">特定商取引法に基づく表記</h1>
          <p className="text-gray-600 mt-2">Subbit サービス利用規約</p>
        </div>

        <div className="space-y-6">
          {/* 販売業者 */}
          <Card>
            <CardHeader>
              <CardTitle>販売業者</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>販売業者：</strong>合同会社アイディアリアル</p>
                <p><strong>代表責任者：</strong>代表社員 坂本健太</p>
                <p><strong>所在地：</strong>〒116-0014 東京都荒川区東日暮里5-4-10 プラビア日暮里501</p>
                <p><strong>電話番号：</strong>080-4152-4165（受付時間：平日 9:00〜18:00）</p>
                <p><strong>メールアドレス：</strong>info@ideareal.co.jp</p>
                <p><strong>営業時間：</strong>平日 9:00〜18:00（土日祝を除く）</p>
              </div>
            </CardContent>
          </Card>

          {/* 販売価格 */}
          <Card>
            <CardHeader>
              <CardTitle>販売価格</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">月額プラン</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Freeプラン：無料</li>
                    <li>• Starterプラン：月額500円（税込）</li>
                    <li>• Creatorプラン：月額1,000円（税込）</li>
                    <li>• Proプラン：月額3,000円（税込）</li>
                  </ul>
                </div>
                <p className="text-sm text-gray-600">
                  ※ 価格は予告なく変更される場合があります
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 支払方法 */}
          <Card>
            <CardHeader>
              <CardTitle>支払方法</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>クレジットカード決済（Visa、Mastercard、American Express、JCB）</p>
                <p>決済処理はStripe Inc.を通じて安全に行われます。</p>
              </div>
            </CardContent>
          </Card>

          {/* 支払時期 */}
          <Card>
            <CardHeader>
              <CardTitle>支払時期</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>月額プランは申込み完了時に初回決済。以降は毎月同日に自動課金されます。</p>
              </div>
            </CardContent>
          </Card>

          {/* サービス提供時期 */}
          <Card>
            <CardHeader>
              <CardTitle>サービス提供時期</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>お支払い完了後、即時利用可能。アカウント登録完了後、制限が解除されます。</p>
              </div>
            </CardContent>
          </Card>

          {/* 返品・キャンセル */}
          <Card>
            <CardHeader>
              <CardTitle>返品・キャンセル</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>• キャンセルはマイページからいつでも可能</p>
                <p>• 次回更新日までサービスを継続利用できます</p>
                <p>• デジタルサービスのため、基本的に返金には応じられません</p>
                <p>• システム障害等、当社責任の場合は個別対応いたします</p>
              </div>
            </CardContent>
          </Card>

          {/* 対応ブラウザ */}
          <Card>
            <CardHeader>
              <CardTitle>対応ブラウザ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>最新版のGoogle Chrome、Firefox、Safari、Edge</p>
                <p className="text-sm text-gray-600">※Internet Explorerはサポート対象外</p>
              </div>
            </CardContent>
          </Card>

          {/* 免責事項 */}
          <Card>
            <CardHeader>
              <CardTitle>免責事項</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>サービス内容は予告なく変更される場合があります。</p>
                <p>ご利用により発生した損害に関して、当社は一切責任を負いません。</p>
              </div>
            </CardContent>
          </Card>

          {/* 準拠法・裁判管轄 */}
          <Card>
            <CardHeader>
              <CardTitle>準拠法・裁判管轄</CardTitle>
            </CardHeader>
            <CardContent>
              <p>本表記は日本法に準拠し、東京地方裁判所を専属的合意管轄とします。</p>
            </CardContent>
          </Card>

          {/* お問い合わせ先 */}
          <Card>
            <CardHeader>
              <CardTitle>お問い合わせ先</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>メール：info@ideareal.co.jp</p>
                <p>電話：080-4152-4165</p>
                <p>受付時間：平日 9:00〜18:00（土日祝を除く）</p>
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