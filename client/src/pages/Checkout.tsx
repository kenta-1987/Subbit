import { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

// Stripe公開キーの設定
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('VITE_STRIPE_PUBLIC_KEY環境変数が設定されていません');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// 決済フォームコンポーネント
function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
      });

      if (error) {
        toast({
          title: "決済エラー",
          description: error.message || "決済に失敗しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "決済エラー",
        description: "決済処理中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            決済処理中...
          </>
        ) : (
          "支払いを完了する"
        )}
      </Button>
    </form>
  );
}

// 料金プラン（PLAN_CONFIGSと同期）
const PLANS = [
  {
    id: 'starter',
    name: 'Starterプラン',
    price: 500,
    features: [
      '月5本の動画処理',
      '最大10分/本',
      '透かしなし',
      '字幕カスタム',
      'Whisper自動字幕'
    ]
  },
  {
    id: 'creator',
    name: 'Creatorプラン', 
    price: 1000,
    features: [
      '月30本の動画処理',
      '最大10分/本',
      '透かしなし',
      '字幕カスタム',
      '画質選択',
      'Whisper自動字幕'
    ]
  },
  {
    id: 'pro',
    name: 'Proプラン',
    price: 3000,
    features: [
      '月50本の動画処理',
      '最大30分/本',
      '透かしなし',
      'Whisper自動字幕',
      '履歴保存',
      'チーム共有'
    ]
  }
];

export default function Checkout() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // URL パラメータから選択されたプランとclient_secretを取得
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    const clientSecretParam = urlParams.get('client_secret');
    
    if (planParam && clientSecretParam) {
      // 直接決済フォームに移動
      setSelectedPlan(planParam);
      setClientSecret(clientSecretParam);
    } else if (planParam) {
      // 従来の処理（プラン選択から決済準備）
      handlePlanSelect(planParam);
    }
  }, []);

  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId);
    setIsLoading(true);

    try {
      const plan = PLANS.find(p => p.id === planId);
      if (!plan) {
        throw new Error('プランが見つかりません');
      }

      const response = await apiRequest('POST', '/api/create-payment-intent', {
        amount: plan.price,
        currency: 'jpy'
      });

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error("Payment preparation error:", error);
      toast({
        title: "決済準備エラー",
        description: "StripeのAPIキーを設定してください。現在はテストモードでのみ動作します。",
        variant: "destructive",
      });
      setSelectedPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedPlan && clientSecret) {
    const plan = PLANS.find(p => p.id === selectedPlan);
    
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                {plan?.name} - ¥{plan?.price?.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Elements 
                stripe={stripePromise} 
                options={{ 
                  clientSecret,
                  appearance: {
                    theme: 'stripe'
                  }
                }}
              >
                <CheckoutForm />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            料金プランを選択
          </h1>
          <p className="text-gray-600">
            あなたに最適なプランを選んでください
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <Card key={plan.id} className="relative">
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  ¥{plan.price.toLocaleString()}
                  <span className="text-sm font-normal text-gray-600">/月</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading && selectedPlan === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      準備中...
                    </>
                  ) : (
                    "このプランを選択"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}