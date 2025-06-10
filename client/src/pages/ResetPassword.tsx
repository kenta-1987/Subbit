import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Lock, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState("");
  const { toast } = useToast();
  const [location] = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast({
        title: "エラー",
        description: "無効なリセットリンクです",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "エラー",
        description: "パスワードが一致しません",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast({
          title: "パスワード変更完了",
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

  const validatePassword = (password: string) => {
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^a-zA-Z0-9]/.test(password);
    
    const conditions = [hasLowercase, hasUppercase, hasNumber, hasSymbol];
    const metConditions = conditions.filter(Boolean).length;
    
    return {
      isValid: password.length >= 8 && metConditions >= 3,
      length: password.length >= 8,
      conditions: metConditions >= 3
    };
  };

  const passwordValidation = validatePassword(password);

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              パスワード変更完了
            </CardTitle>
            <CardDescription>
              新しいパスワードでログインできます
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Alert className="mb-4">
              <AlertDescription>
                パスワードが正常に変更されました。
                新しいパスワードでログインしてください。
              </AlertDescription>
            </Alert>

            <Link href="/login">
              <Button className="w-full">
                ログインページへ
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">無効なリンク</CardTitle>
            <CardDescription>
              パスワードリセットリンクが無効です
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                このリンクは無効か期限切れです。
                新しいリセットリンクを取得してください。
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Link href="/forgot-password">
                <Button className="w-full">
                  新しいリセットリンクを取得
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  ログインに戻る
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="h-6 w-6 text-blue-600" />
            新しいパスワード設定
          </CardTitle>
          <CardDescription>
            新しいパスワードを設定してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="新しいパスワード"
                required
              />
              {password && (
                <div className="mt-2 space-y-1 text-xs">
                  <div className={`flex items-center gap-2 ${passwordValidation.length ? 'text-green-600' : 'text-red-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${passwordValidation.length ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    8文字以上
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.conditions ? 'text-green-600' : 'text-red-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${passwordValidation.conditions ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    大文字、小文字、数字、記号のうち3つ以上
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード確認
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="パスワード確認"
                required
              />
              {confirmPassword && (
                <div className="mt-1 text-xs">
                  <div className={`flex items-center gap-2 ${password === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${password === confirmPassword ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    パスワードが一致{password === confirmPassword ? 'しています' : 'しません'}
                  </div>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
            >
              {loading ? "変更中..." : "パスワードを変更"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800">
              <ArrowLeft className="h-4 w-4 inline mr-1" />
              ログインに戻る
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}