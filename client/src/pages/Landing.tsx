import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Zap, Globe, Shield, Star, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            <span className="text-blue-600">テロップに悩む時代、</span>
            終わりました。
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            AIが自動で字幕をつける、次世代の動画編集アプリ
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 py-3">
                無料で始める
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                ログイン
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            なぜSubbitを選ぶのか
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Zap className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>最大5GBまでのファイルサイズ</CardTitle>
                <CardDescription>
                  プランに応じて大容量動画ファイルに対応
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  主要な動画形式（MP4、MOV、AVI、MKV等）をサポートし、高画質動画も処理可能。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Globe className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle>AIによる自動テロップ生成</CardTitle>
                <CardDescription>
                  最新AI技術で高精度な音声認識を実現
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  OpenAI Whisperを使用し、話者識別機能付きで複数話者にも対応。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-purple-600 mb-2" />
                <CardTitle>テロップ編集と調整</CardTitle>
                <CardDescription>
                  文字サイズ、文字色を自由にカスタマイズ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  生成されたテロップの時間調整、スタイル変更、13ヶ国語翻訳・日本語リライト機能。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Additional Features Section */}
      <section className="py-16 px-4 bg-blue-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            サポートされる機能
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">最大5GBまでのファイルサイズ</h3>
                <p className="text-sm text-gray-600">プランによる大容量ファイル対応</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">AIによる自動テロップ生成</h3>
                <p className="text-sm text-gray-600">高精度な音声認識技術</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">テロップの編集と調整</h3>
                <p className="text-sm text-gray-600">文字サイズ、文字色のカスタマイズ</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">テロップのエクスポート</h3>
                <p className="text-sm text-gray-600">TXT, CSV, SRT形式での出力</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">テロップを含む動画エクスポート</h3>
                <p className="text-sm text-gray-600">完成動画として出力</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">主要な動画形式をサポート</h3>
                <p className="text-sm text-gray-600">MP4, MOV, AVI, MKV等に対応</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">話者識別機能</h3>
                <p className="text-sm text-gray-600">複数話者の自動識別</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold mb-2">13ヶ国語翻訳・日本語リライト機能</h3>
                <p className="text-sm text-gray-600">多言語対応とリライト機能</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            料金プラン
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Free</CardTitle>
                <CardDescription>お試し用</CardDescription>
                <div className="text-2xl font-bold">¥0</div>
                <div className="text-sm text-gray-500">月額</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• 月3回まで</li>
                  <li>• 最大5分の動画</li>
                  <li>• ウォーターマーク付き</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-blue-500 shadow-lg">
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <CardDescription>個人利用</CardDescription>
                <div className="text-2xl font-bold">¥500</div>
                <div className="text-sm text-gray-500">月額</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• 月5回まで</li>
                  <li>• 最大10分の動画</li>
                  <li>• ウォーターマークなし</li>
                  <li>• 字幕カスタマイズ</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Creator</CardTitle>
                <CardDescription>クリエイター向け</CardDescription>
                <div className="text-2xl font-bold">¥1,000</div>
                <div className="text-sm text-gray-500">月額</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• 月30回まで</li>
                  <li>• 最大10分の動画</li>
                  <li>• 画質選択可能</li>
                  <li>• 優先サポート</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <CardDescription>ビジネス利用</CardDescription>
                <div className="text-2xl font-bold">¥3,000</div>
                <div className="text-sm text-gray-500">月額</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• 月50回まで</li>
                  <li>• 最大30分の動画</li>
                  <li>• 履歴保存</li>
                  <li>• チーム共有</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            今すぐ始めましょう
          </h2>
          <p className="text-xl mb-8 opacity-90">
            無料プランで今すぐお試しいただけます。クレジットカード登録不要。
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              無料アカウント作成
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}