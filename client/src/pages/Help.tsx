import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, Video, Upload, Edit, Download, Languages, Sparkles } from "lucide-react";

export default function Help() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
          <HelpCircle className="h-8 w-8 text-primary" />
          ヘルプ・使い方
        </h1>
        <p className="text-lg text-gray-600">
          Subbitの使い方とよくある質問
        </p>
      </div>

      <div className="grid gap-6">
        {/* 基本的な使い方 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              基本的な使い方
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <h3 className="font-medium">動画をアップロード</h3>
                <p className="text-gray-600 text-sm">MP4、MOV、AVI、MKV、WMV形式の動画ファイルをアップロードします（最大5GB）</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <h3 className="font-medium">AIテロップ生成</h3>
                <p className="text-gray-600 text-sm">OpenAI Whisper APIが音声を認識して自動的に字幕を生成します</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <h3 className="font-medium">テロップを編集</h3>
                <p className="text-gray-600 text-sm">テキスト、タイミング、文字サイズ、色などを自由に編集できます</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</div>
              <div>
                <h3 className="font-medium">翻訳・校正機能</h3>
                <p className="text-gray-600 text-sm">13言語への翻訳や日本語の校正・リライトが可能です</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">5</div>
              <div>
                <h3 className="font-medium">エクスポート</h3>
                <p className="text-gray-600 text-sm">完成した字幕をSRTファイルでダウンロードできます</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 機能紹介 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              主な機能
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Upload className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-medium">最大5GBまでのファイルサイズ（プランによる）</h3>
                  <p className="text-gray-600 text-sm">大容量動画ファイルもサポート</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-medium">AIによる自動テロップ生成</h3>
                  <p className="text-gray-600 text-sm">OpenAI Whisper APIによる高精度な音声認識</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Edit className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-medium">生成したテロップの編集と調整（文字サイズ、文字色）</h3>
                  <p className="text-gray-600 text-sm">プレビューを見ながらスタイルを自由に変更</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Languages className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-medium">テロップのエクスポート（TXT, CSV, SRT)</h3>
                  <p className="text-gray-600 text-sm">様々な形式で字幕ファイルを出力可能</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Upload className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-medium">テロップを含む動画のエクスポート</h3>
                  <p className="text-gray-600 text-sm">字幕付き動画として直接出力</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-medium">主要な動画形式をサポート</h3>
                  <p className="text-gray-600 text-sm">MP4、MOV、AVI、MKV等に対応</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Edit className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-medium">話者識別機能</h3>
                  <p className="text-gray-600 text-sm">複数話者の音声を自動で識別・分類</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Languages className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-medium">13ヶ国語翻訳・日本語リライト機能</h3>
                  <p className="text-gray-600 text-sm">多言語対応と自然な日本語への校正</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 翻訳・校正機能 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              翻訳・校正機能
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">日本語（校正・修正）</h3>
              <p className="text-gray-600 text-sm mb-2">
                音声認識で間違って認識された固有名詞や漢字変換を修正します：
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• 人名、地名、会社名などの固有名詞の正しい表記</li>
                <li>• 漢字変換の間違いを修正</li>
                <li>• より自然な日本語表現に調整</li>
                <li>• 句読点の適切な配置</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">多言語翻訳</h3>
              <p className="text-gray-600 text-sm">
                英語、中国語、韓国語、スペイン語、フランス語、ドイツ語、ポルトガル語、ロシア語、アラビア語、ヒンディー語、タイ語、ベトナム語に対応
              </p>
            </div>
          </CardContent>
        </Card>

        {/* よくある質問 */}
        <Card>
          <CardHeader>
            <CardTitle>よくある質問</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Q: 対応している動画形式は？</h3>
              <p className="text-gray-600 text-sm">A: MP4、MOV、AVI、MKV、WMV形式に対応しています。最大ファイルサイズは5GBです。</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Q: 音声認識の精度はどの程度？</h3>
              <p className="text-gray-600 text-sm">A: OpenAI Whisper APIを使用しており、日本語の音声認識において高い精度を実現しています。ただし、固有名詞などは校正機能で修正することをおすすめします。</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Q: 生成された字幕をダウンロードできますか？</h3>
              <p className="text-gray-600 text-sm">A: はい、SRT形式で字幕ファイルをダウンロードできます。多くの動画編集ソフトで利用可能です。</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Q: 処理時間はどの程度かかりますか？</h3>
              <p className="text-gray-600 text-sm">A: 動画の長さや音声の複雑さによりますが、通常数分から数十分程度で完了します。</p>
            </div>
          </CardContent>
        </Card>

        {/* 技術仕様 */}
        <Card>
          <CardHeader>
            <CardTitle>技術仕様</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-medium mb-2">対応形式</h3>
                <ul className="text-gray-600 space-y-1">
                  <li>• 動画: MP4, MOV, AVI, MKV, WMV</li>
                  <li>• 最大ファイルサイズ: 5GB</li>
                  <li>• 出力: SRT字幕ファイル</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">AI技術</h3>
                <ul className="text-gray-600 space-y-1">
                  <li>• 音声認識: OpenAI Whisper API</li>
                  <li>• 翻訳・校正: GPT-4o</li>
                  <li>• 対応言語: 日本語 + 12言語</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 注意事項 */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">⚠️ β版についてのご注意</CardTitle>
          </CardHeader>
          <CardContent className="text-amber-700 text-sm space-y-2">
            <p>現在β版のため、予期しないエラーや機能制限がある場合があります。</p>
            <p>サービス品質向上のため、ご利用には一定の制限を設けております。</p>
            <p>重要なデータは必ずバックアップを取ってからご利用ください。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}