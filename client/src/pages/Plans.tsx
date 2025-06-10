import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { PLAN_CONFIGS, PlanType } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  id: number;
  username: string;
  plan: PlanType;
  subscriptionStatus: string;
  monthlyUploads: number;
  currentPeriodEnd?: string;
}

export default function Plans() {
  const { toast } = useToast();
  
  const { data: user, isLoading } = useQuery<UserData>({
    queryKey: ["/api/user"],
  });

  const formatStorageSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${bytes / (1024 * 1024 * 1024)}GB`;
    }
    return `${bytes / (1024 * 1024)}MB`;
  };

  const handlePlanSelect = async (planType: PlanType) => {
    // 未登録ユーザーの場合は先にログインページに誘導
    if (!user) {
      toast({
        title: "アカウント登録が必要です", 
        description: "プランを選択するにはまずアカウント登録してください",
      });
      window.location.href = "/api/login";
      return;
    }

    if (planType === "free") {
      toast({
        title: "無料プラン",
        description: "現在のプランです",
      });
      return;
    }

    try {
      const planConfig = PLAN_CONFIGS[planType];
      const response = await apiRequest('POST', '/api/create-payment-intent', {
        amount: planConfig.price,
        currency: 'jpy',
        planType: planType
      });

      const data = await response.json();
      
      if (data.clientSecret) {
        // 決済ページに移動
        window.location.href = `/checkout?client_secret=${data.clientSecret}&plan=${planType}`;
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "決済の準備に失敗しました",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">料金プラン</h1>
        <p className="text-gray-600 mb-6">
          あなたのニーズに合ったプランをお選びください
        </p>
        {user && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
            <span className="text-sm text-gray-600">現在のプラン:</span>
            <Badge variant="default">{PLAN_CONFIGS[user.plan].name}</Badge>
            <span className="text-sm text-gray-600">
              今月の利用: {user.monthlyUploads}/{PLAN_CONFIGS[user.plan].monthlyUploads}本
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(PLAN_CONFIGS).map(([planKey, config]) => {
          const planType = planKey as PlanType;
          const isCurrentPlan = user?.plan === planType;
          const isPopular = planType === "creator";
          
          return (
            <Card 
              key={planType} 
              className={`relative cursor-pointer transition-all hover:shadow-lg flex flex-col h-full ${
                isPopular ? "ring-2 ring-orange-400" : ""
              } ${
                isCurrentPlan ? "bg-blue-50 border-blue-200 ring-2 ring-blue-400" : "hover:border-blue-300"
              }`}
              onClick={() => handlePlanSelect(planType)}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white">人気</Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{config.name}</CardTitle>
                <CardDescription className="text-2xl font-bold">
                  ¥{config.price.toLocaleString()}
                  <span className="text-sm font-normal text-gray-500">/月</span>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex flex-col flex-1">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">月{config.monthlyUploads}本まで</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      最大{Math.floor(config.maxDuration / 60)}分/本
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      保存容量: {formatStorageSize(config.storageLimit)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {config.hasWatermark ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm">
                      {config.hasWatermark ? "透かしあり" : "透かしなし"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {config.customSubtitles ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      {config.customSubtitles ? "サイズ・色変更可能" : "固定（変更不可）"}
                    </span>
                  </div>
                  
                  {config.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-xs">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6">
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "outline" : "default"}
                    disabled={isCurrentPlan}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlanSelect(planType);
                    }}
                  >
                    {!user ? "ログインして選択" : isCurrentPlan ? "現在のプラン" : "決済ページへ"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="mt-12 text-center text-sm text-gray-500">
        <p>すべてのプランには30日間の返金保証が含まれています</p>
        <p>プランはいつでも変更・キャンセル可能です</p>
      </div>
    </div>
  );
}