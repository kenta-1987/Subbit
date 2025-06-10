import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Link } from 'wouter';

export default function PaymentSuccess() {
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    // URLパラメータから決済情報を取得
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntentId = urlParams.get('payment_intent');
    const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');
    
    if (paymentIntentId) {
      // 決済状況を確認
      fetch(`/api/payment-status/${paymentIntentId}`)
        .then(response => response.json())
        .then(data => {
          if (data.status === 'succeeded') {
            setPaymentStatus('success');
          } else {
            setPaymentStatus('error');
          }
        })
        .catch(() => {
          setPaymentStatus('error');
        });
    } else {
      setPaymentStatus('error');
    }
  }, []);

  if (paymentStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
              <h2 className="text-xl font-semibold mb-2">決済状況を確認中...</h2>
              <p className="text-gray-600">少々お待ちください</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-2xl">×</span>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-red-600">決済エラー</h2>
              <p className="text-gray-600 mb-6">決済の処理に問題が発生しました</p>
              <div className="space-y-2">
                <Link href="/checkout">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    もう一度試す
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full">
                    ホームに戻る
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-600">決済完了</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              お支払いが正常に完了しました。<br />
              Subbitをご利用いただきありがとうございます。
            </p>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">利用開始について</h3>
              <p className="text-sm text-green-700">
                プランが有効になりました。すぐに動画の字幕生成をお試しいただけます。
              </p>
            </div>

            <div className="space-y-2">
              <Link href="/">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  字幕生成を開始
                </Button>
              </Link>
              <Link href="/account">
                <Button variant="outline" className="w-full">
                  アカウント設定
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}