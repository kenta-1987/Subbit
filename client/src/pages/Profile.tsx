import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { User, Mail, Lock, Shield, CreditCard, Calendar, Upload } from "lucide-react";
import { PLAN_CONFIGS } from "@shared/schema";

export default function Profile() {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [activeSection, setActiveSection] = useState("profile");

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        username: user.username,
        email: user.email
      }));
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user); // Update user data in auth context
        toast({
          title: "プロフィール更新",
          description: "プロフィール情報を更新しました",
        });
      } else {
        toast({
          title: "エラー",
          description: data.error || "更新に失敗しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "ネットワークエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "エラー",
        description: "新しいパスワードが一致しません",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFormData(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        }));
        toast({
          title: "パスワード変更",
          description: "パスワードを変更しました",
        });
      } else {
        toast({
          title: "エラー",
          description: data.error || "パスワード変更に失敗しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "ネットワークエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const currentPlan = PLAN_CONFIGS[user.plan as keyof typeof PLAN_CONFIGS];
  const formatDate = (date: Date | string | null) => {
    if (!date) return "未設定";
    return new Date(date).toLocaleDateString('ja-JP');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">プロフィール設定</h1>
            <p className="text-gray-600 mt-2">アカウント情報とセキュリティ設定を管理</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* サイドバーナビゲーション */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-4">
                  <nav className="space-y-2">
                    <button
                      onClick={() => setActiveSection("profile")}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                        activeSection === "profile" 
                          ? "bg-blue-100 text-blue-700" 
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <User className="h-4 w-4" />
                      基本情報
                    </button>
                    <button
                      onClick={() => setActiveSection("security")}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                        activeSection === "security" 
                          ? "bg-blue-100 text-blue-700" 
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Lock className="h-4 w-4" />
                      セキュリティ
                    </button>
                    <button
                      onClick={() => setActiveSection("subscription")}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                        activeSection === "subscription" 
                          ? "bg-blue-100 text-blue-700" 
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      サブスクリプション
                    </button>
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* メインコンテンツ */}
            <div className="lg:col-span-3 space-y-6">
              {/* 基本情報セクション */}
              {activeSection === "profile" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      基本情報
                    </CardTitle>
                    <CardDescription>
                      ユーザー名とメールアドレスを変更できます
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                            ユーザー名
                          </label>
                          <Input
                            id="username"
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="ユーザー名"
                          />
                        </div>
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            メールアドレス
                          </label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="メールアドレス"
                          />
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button type="submit" disabled={loading}>
                          {loading ? "更新中..." : "プロフィールを更新"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* セキュリティセクション */}
              {activeSection === "security" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        アカウントセキュリティ
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">メール認証</h4>
                          <p className="text-sm text-gray-600">
                            メールアドレスの認証状況
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.emailVerified ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                              認証済み
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                              未認証
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">アカウント作成日</h4>
                          <p className="text-sm text-gray-600">
                            {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        パスワード変更
                      </CardTitle>
                      <CardDescription>
                        セキュリティのため定期的にパスワードを変更することをお勧めします
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            現在のパスワード
                          </label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            placeholder="現在のパスワード"
                          />
                        </div>
                        <div>
                          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            新しいパスワード
                          </label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            placeholder="新しいパスワード"
                          />
                        </div>
                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                            新しいパスワード（確認）
                          </label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            placeholder="新しいパスワード（確認）"
                          />
                        </div>

                        <div className="pt-4">
                          <Button type="submit" disabled={loading}>
                            {loading ? "変更中..." : "パスワードを変更"}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* サブスクリプションセクション */}
              {activeSection === "subscription" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      サブスクリプション
                    </CardTitle>
                    <CardDescription>
                      現在のプランと使用状況を確認できます
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-6 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{currentPlan.name}プラン</h3>
                          <p className="text-sm text-gray-600">
                            {currentPlan.price === 0 ? "無料" : `月額 ¥${currentPlan.price.toLocaleString()}`}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          user.subscriptionStatus === "active" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {user.subscriptionStatus === "active" ? "有効" : "無効"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">月間アップロード制限</span>
                          <div className="font-medium">{currentPlan.monthlyUploads}回</div>
                        </div>
                        <div>
                          <span className="text-gray-600">今月の使用回数</span>
                          <div className="font-medium">{user.monthlyUploads}回</div>
                        </div>
                        <div>
                          <span className="text-gray-600">最大動画時間</span>
                          <div className="font-medium">{Math.floor(currentPlan.maxDuration / 60)}分</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">プラン特典</h4>
                      <ul className="space-y-2">
                        {currentPlan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {user.currentPeriodEnd && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">
                            次回更新日: {formatDate(user.currentPeriodEnd)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pt-4">
                      <Button variant="outline">
                        プランを変更
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}