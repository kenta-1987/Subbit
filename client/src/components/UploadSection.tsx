import { Card, CardContent } from "@/components/ui/card";
import FileUploader from "./FileUploader";

interface UploadSectionProps {
  onUploadStart: () => void;
}

export default function UploadSection({ onUploadStart }: UploadSectionProps) {
  return (
    <Card className="bg-white shadow-md p-6 mb-8">
      <CardContent className="p-0">
        <div className="text-center mb-6">
          <div className="mb-2">
            <h2 className="text-xl font-bold text-gray-900 mb-1">テロップに悩む時代、終わりました。</h2>
            <p className="text-lg text-purple-600">AIが自動で字幕をつける、次世代の動画編集アプリ</p>
          </div>
          <div className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
            β版（ベータ版）
          </div>
        </div>
        
        {/* β版注意書き */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-amber-800 mb-2">⚠️ β版についてのご注意</h3>
          <div className="text-sm text-amber-700 space-y-1">
            <p>現在β版のため、予期しないエラーや機能制限がある場合があります。</p>
            <p>サービス品質向上のため、ご利用には一定の制限を設けております。</p>
            <p>重要なデータは必ずバックアップを取ってからご利用ください。</p>
          </div>
        </div>
        
        {/* ファイルサイズ制限の明記 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-green-800 mb-2">📁 ファイル制限</h3>
          <div className="text-sm text-green-700 space-y-1">
            <p><strong>対応ファイルサイズ：最大5GB</strong></p>
            <p>利用制限：アップロード1時間に3回まで / AI生成1時間に5回まで</p>
            <p>ファイルは自動的に分割してアップロードされます。</p>

          </div>
        </div>

        {/* 使い方説明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-3">使い方</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. 動画ファイルをアップロードします（最大5GB対応）</li>
            <li>2. 「AIテロップ生成」ボタンで自動字幕生成</li>
            <li>3. テキスト・色・サイズ・表示時間を編集</li>
            <li>4. 翻訳機能：13言語への翻訳と日本語校正・リライト</li>
            <li>5. リアルタイムプレビューで確認</li>
            <li>6. 動画エクスポートまたはテロップデータ出力</li>
          </ol>
        </div>

        {/* 注意事項 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-3">注意事項</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 大容量ファイルの処理には時間がかかる場合があります</li>
            <li>• AI音声認識の精度は音質により変動します</li>
            <li>• 生成されたテロップは必要に応じて手動調整してください</li>
            <li>• プレビューは最終出力の近似表示です</li>
            <li>• 著作権のある素材の使用にご注意ください</li>
          </ul>
        </div>
        
        <h2 className="text-2xl font-semibold mb-4">動画をアップロード</h2>
        <p className="text-neutral-500 mb-6">
          動画ファイルをアップロードしてテロップを自動生成します。対応する動画の容量は5GBまでです。
        </p>

        <FileUploader onUploadStart={onUploadStart} />

        <div className="border-t border-neutral-200 pt-4 mt-6">
          <h3 className="font-medium mb-2">サポートされる機能:</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-neutral-600">
            <li className="flex items-center">
              <i className="fas fa-check text-success mr-2"></i> 最大5GBまでのファイルサイズ
            </li>
            <li className="flex items-center">
              <i className="fas fa-check text-success mr-2"></i> AIによる自動テロップ生成
            </li>
            <li className="flex items-center">
              <i className="fas fa-check text-success mr-2"></i> テロップの編集と調整
            </li>
            <li className="flex items-center">
              <i className="fas fa-check text-success mr-2"></i> 日本語テキストのサポート
            </li>
            <li className="flex items-center">
              <i className="fas fa-check text-success mr-2"></i> テロップを含む動画のエクスポート
            </li>
            <li className="flex items-center">
              <i className="fas fa-check text-success mr-2"></i> 主要な動画形式をサポート
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
