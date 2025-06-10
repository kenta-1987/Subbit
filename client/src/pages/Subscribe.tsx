import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Check, Star, Zap, Crown, CreditCard } from "lucide-react";
import { PLAN_CONFIGS, type PlanType } from "@shared/schema";
import { STRIPE_PRICE_IDS } from "@shared/stripe-config";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useRoute } from "wouter";

// Stripe公開キーの確認
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ planKey, onComplete }: { planKey: string; onComplete: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast({
          title: "支払いに失敗しました",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "支払い完了",
          description: "サブスクリプションが開始されました！",
        });
        onComplete();
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "支払い処理中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
    
    setIsProcessing(false);
  };

  // planKeyからプランタイプを特定
  const planType = planKey as PlanType;
  const plan = PLAN_CONFIGS[planType];

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>プラン登録</CardTitle>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">{plan.name}</h3>
            <p className="text-2xl font-bold">
              ¥{plan.price.toLocaleString()}/月
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-gray-600">
            <p>• 月{plan.monthlyUploads}本までアップロード可能</p>
            <p>• 最大{Math.floor(plan.maxDuration / 60)}分/本</p>
            <p>• {plan.hasWatermark ? "透かしあり" : "透かしなし"}</p>
            {plan.features.map((feature: string, idx: number) => (
              <p key={idx}>• {feature}</p>
            ))}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />
            <Button 
              type="submit" 
              className="w-full"
              disabled={!stripe || isProcessing}
            >
              {isProcessing ? "処理中..." : `¥${plan.price}/月で登録する`}
            </Button>
          </form>
          
          <div className="text-xs text-gray-500 text-center">
            30日間の返金保証付き。いつでもキャンセル可能です。
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function Subscribe() {
  const [match, params] = useRoute('/subscribe');
  const [clientSecret, setClientSecret] = useState("");
  const [planType, setPlanType] = useState<PlanType>("starter");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const secret = urlParams.get('client_secret');
    const plan = urlParams.get('plan') as PlanType;
    
    if (secret) {
      setClientSecret(secret);
    }
    if (plan && plan in PLAN_CONFIGS) {
      setPlanType(plan);
    }
  }, []);

  if (!clientSecret) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" aria-label="Loading"/>
        <p className="mt-4">決済情報を準備しています...</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm planKey={planType} onComplete={() => window.location.href = "/"} />
    </Elements>
  );
}